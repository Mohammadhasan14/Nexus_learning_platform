import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID, createHmac } from "node:crypto";
import { migrationDatabase } from "../../scripts/database-harness";
import { signDeletionProof } from "../../modules/privacy/proof";
import { signReceipt } from "../../modules/tutor/receipt";
const a = "a8000000-0000-0000-0000-000000000001",
  b = "a8000000-0000-0000-0000-000000000002";
test("privacy controls preserve ownership, quota integrity, deletion proof and atomic cleanup", async (t) => {
  const db = await migrationDatabase();
  t.after(() => db.close());
  const key = randomBytes(32).toString("hex"),
    tutorKey = randomBytes(32).toString("hex");
  const lesson = "js-v2-values",
    course = "javascript-foundations-v2";
  const identity = async (id: string | null, role = "authenticated") => {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      id ?? "",
    ]);
    await db.exec(`set role ${role}`);
  };
  const scalar = async <T>(sql: string, args: unknown[] = []) =>
    (
      await db.query<{ result: T }>(
        `select value as result from (${sql}) q(value)`,
        args,
      )
    ).rows[0].result;
  const settings = () =>
    scalar<{ tutor_retention_days: number | null }>(
      "select public.get_privacy_settings()",
    );
  const scripted = (request: string = randomUUID()) =>
    scalar<{ allowed: boolean; reason?: string }>(
      "select public.use_scripted_tutor($1,$2,'hint')",
      [lesson, request],
    );
  const deleteAccount = (signed = signDeletionProof(key, a)) =>
    scalar<boolean>("select public.delete_learner_account($1,$2)", [
      signed.proof,
      signed.signature,
    ]);
  await db.exec(
    `insert into auth.users(id) values('${a}'),('${b}');update public.profiles set goal='Learn while keeping data private';`,
  );
  await db.query(
    "insert into privacy_private.deletion_keys(secret) values($1)",
    [key],
  );
  await db.query("insert into tutor_private.receipt_keys(secret) values($1)", [
    tutorKey,
  ]);
  const requests = new Map<string, string>();
  for (const id of [a, b]) {
    await identity(id);
    await scalar("select public.enrol_course($1)", [course]);
    await scalar("select public.mark_lesson_read($1)", [lesson]);
    await scalar(
      "select public.submit_attempt('js-v2-values-practice','a',$1)",
      [randomUUID()],
    );
    await scalar("select public.save_lesson_note($1,'A private note',0,$2)", [
      lesson,
      randomUUID(),
    ]);
    const request = randomUUID();
    requests.set(id, request);
    await scripted(request);
    await scalar(
      "select public.report_content($1,'Report preserves the selected reply',$2,$3)",
      [lesson, randomUUID(), request],
    );
  }
  await t.test(
    "anonymous and direct private access are denied; settings are owner-only",
    async () => {
      await identity(null, "anon");
      for (const call of [
        "select public.get_privacy_settings()",
        "select public.set_tutor_retention(30)",
        "select public.clear_tutor_replies('CLEAR')",
        "select public.delete_learner_account('','')",
      ])
        await assert.rejects(db.query(call), /permission denied/);
      await identity(null);
      await assert.rejects(settings(), /Sign in required/);
      await identity(a);
      assert.equal((await settings()).tutor_retention_days, null);
      for (const call of [
        "select * from privacy_private.deletion_keys",
        "select privacy_private.prune_expired_replies()",
        "select privacy_private.export_learner_data()",
      ])
        await assert.rejects(db.query(call), /permission denied/);
      await assert.rejects(
        scalar("select public.set_tutor_retention(1)"),
        /Invalid retention/,
      );
      await assert.rejects(
        scalar("select public.clear_tutor_replies('clear')"),
        /Confirmation/,
      );
      await scalar("select public.set_tutor_retention(30)");
      await identity(b);
      assert.equal((await settings()).tutor_retention_days, null);
    },
  );
  await t.test(
    "shorter retention removes old text at export and report boundaries without losing evidence or charges",
    async () => {
      await db.exec("reset role");
      await db.query(
        "update tutor_private.requests set reply_saved_at=statement_timestamp()-interval '30 days' where user_id=$1",
        [a],
      );
      const before = await scalar<number>(
        "select used from tutor_private.buckets where scope='global'",
      );
      await identity(a);
      const exported = await scalar<{
        tutor_requests: { response_snapshot: unknown }[];
        privacy_preferences: { tutor_retention_days: number };
      }>("select public.export_learner_data()");
      assert.equal(exported.tutor_requests[0].response_snapshot, null);
      assert.equal(exported.privacy_preferences.tutor_retention_days, 30);
      assert.equal((await scripted(requests.get(a)!)).reason, "replay");
      await assert.rejects(
        scalar(
          "select public.report_content($1,'Expired reply cannot be copied',$2,$3)",
          [lesson, randomUUID(), requests.get(a)],
        ),
        /saved tutor response/,
      );
      await scalar("select public.set_tutor_retention(90)");
      assert.equal(
        (
          await scalar<{ tutor_requests: { response_snapshot: unknown }[] }>(
            "select public.export_learner_data()",
          )
        ).tutor_requests[0].response_snapshot,
        null,
      );
      await db.exec("reset role");
      assert.equal(
        await scalar(
          "select used from tutor_private.buckets where scope='global'",
        ),
        before,
      );
      assert.equal(
        await scalar(
          "select count(*)::int from public.attempts where user_id=$1",
          [a],
        ),
        1,
      );
      assert.ok(
        await scalar(
          "select snapshot->'response' from public.content_reports where user_id=$1",
          [a],
        ),
      );
      assert.ok(
        await scalar(
          "select response_snapshot from tutor_private.requests where user_id=$1",
          [b],
        ),
      );
    },
  );
  const pending = randomUUID();
  const reply = {
    text: "Trace the value carefully.",
    adapter: "gemini:gemini-3.1-flash-lite",
    source: { title: "", href: `/courses/${course}/${lesson}` },
  };
  const usage = {
    input: 10,
    output: 5,
    thoughts: 0,
    cached: 0,
    total: 15,
    model: "gemini-3.1-flash-lite",
    promptVersion: "privacy-test-v1",
  };
  await t.test(
    "clear tombstones unfinished replies; a racing finish still accounts once without restoring text",
    async () => {
      await identity(a);
      reply.source.title = (
        await db.query<{ title: string }>(
          "select title from public.lessons where id=$1",
          [lesson],
        )
      ).rows[0].title;
      await scalar("select public.claim_live_tutor($1,$2,'hint')", [
        lesson,
        pending,
      ]);
      await db.exec("reset role");
      const charged = await scalar<number>(
        "select charged from tutor_private.token_buckets where scope='global'",
      );
      await identity(a);
      await scalar("select public.clear_tutor_replies('CLEAR')");
      await db.exec("reset role");
      assert.equal(
        await scalar(
          "select charged from tutor_private.token_buckets where scope='global'",
        ),
        charged,
      );
      await identity(a);
      const signed = signReceipt(tutorKey, a, pending, reply, usage);
      for (let i = 0; i < 2; i++)
        assert.equal(
          await scalar("select public.finish_live_tutor($1,$2,$3)", [
            pending,
            signed.receipt,
            signed.signature,
          ]),
          false,
        );
      assert.equal(
        await scalar("select public.read_live_tutor($1,$2,'hint')", [
          lesson,
          pending,
        ]),
        null,
      );
      await db.exec("reset role");
      assert.equal(
        await scalar(
          "select charged from tutor_private.token_buckets where scope='global'",
        ),
        charged - 65536 + 15,
      );
      assert.equal(
        await scalar(
          "select response_snapshot from tutor_private.requests where request_id=$1",
          [pending],
        ),
        null,
      );
      await identity(a);
      assert.equal((await scripted()).allowed, true);
    },
  );
  await t.test(
    "operator expiry removes only expired opted-in replies; exact age boundary is inclusive",
    async () => {
      await db.exec("reset role");
      await db.query(
        "update tutor_private.requests set reply_saved_at=statement_timestamp()-interval '90 days' where user_id=$1 and response_snapshot is not null",
        [a],
      );
      assert.equal(
        await scalar("select privacy_private.prune_expired_replies()"),
        1,
      );
      assert.equal(
        await scalar("select privacy_private.prune_expired_replies()"),
        0,
      );
      assert.ok(
        await scalar(
          "select response_snapshot from tutor_private.requests where user_id=$1",
          [b],
        ),
      );
      await identity(a);
      await scalar("select public.set_tutor_retention(0)");
      assert.equal((await settings()).tutor_retention_days, null);
    },
  );
  await t.test(
    "deletion rejects forgery, wrong owner, expiry and a different signed action",
    async () => {
      await identity(a);
      await assert.rejects(
        deleteAccount({ proof: "{}", signature: "0".repeat(64) }),
        /Invalid deletion proof/,
      );
      await assert.rejects(
        deleteAccount(signDeletionProof(key, b)),
        /Invalid deletion proof/,
      );
      await assert.rejects(
        deleteAccount(signDeletionProof(key, a, Date.now() - 61_000)),
        /Expired deletion proof/,
      );
      await assert.rejects(
        deleteAccount(signDeletionProof(key, a, Date.now() + 10_000)),
        /Expired deletion proof/,
      );
      const altered = signDeletionProof(key, a);
      altered.proof = altered.proof.replace(
        "delete-account-v1",
        "another-action",
      );
      altered.signature = createHmac("sha256", key)
        .update(altered.proof)
        .digest("hex");
      await assert.rejects(deleteAccount(altered), /Invalid deletion proof/);
      await identity(b);
      await assert.rejects(deleteAccount(), /Invalid deletion proof/);
    },
  );
  await t.test(
    "a provider FK failure rolls back report removal and every other deletion",
    async () => {
      await db.exec(
        "reset role;create table deletion_test_blocker(user_id uuid references auth.users(id));",
      );
      await db.query("insert into deletion_test_blocker values($1)", [a]);
      await identity(a);
      await assert.rejects(deleteAccount(), /foreign key constraint/);
      assert.equal(
        await scalar("select count(*)::int from public.content_reports"),
        1,
      );
      assert.equal(
        await scalar("select count(*)::int from public.profiles"),
        1,
      );
      await db.exec("reset role;drop table deletion_test_blocker");
    },
  );
  await t.test(
    "deletion removes learner text and owned reports, preserves other users and global accounting",
    async () => {
      await db.exec("reset role");
      const before = await scalar(
        "select jsonb_agg(to_jsonb(b)) from tutor_private.buckets b where scope='global'",
      );
      await db.query(
        "insert into public.staff_roles(user_id,role) values($1,'editor')",
        [a],
      );
      await db.query(
        "insert into public.content_audit(actor,action,after_state) values($1,'review','{\"note\":\"Published editorial history\"}')",
        [a],
      );
      await db.query(
        "insert into public.report_audit(report_id,actor,status,note) select id,$1,'reviewing','Audit of own report' from public.content_reports where user_id=$1",
        [a],
      );
      await identity(a);
      assert.equal(await deleteAccount(), true);
      await assert.rejects(settings(), /Sign in required/);
      await assert.rejects(deleteAccount(), /Sign in required/);
      await db.exec("reset role");
      for (const table of [
        "public.profiles",
        "public.enrolments",
        "public.lesson_reads",
        "public.attempts",
        "public.lesson_notes",
        "public.learning_outcome_events",
        "public.content_reports",
        "public.staff_roles",
        "tutor_private.requests",
        "tutor_private.buckets",
        "tutor_private.token_buckets",
        "privacy_private.preferences",
      ])
        assert.equal(
          await scalar(`select count(*)::int from ${table} where user_id=$1`, [
            a,
          ]),
          0,
          table,
        );
      assert.equal(
        await scalar("select count(*)::int from auth.users where id=$1", [a]),
        0,
      );
      assert.equal(
        await scalar("select count(*)::int from public.report_audit"),
        0,
      );
      assert.equal(
        await scalar("select actor from public.content_audit limit 1"),
        null,
      );
      assert.equal(
        await scalar(
          "select count(*)::int from public.content_reports where user_id=$1",
          [b],
        ),
        1,
      );
      assert.deepEqual(
        await scalar(
          "select jsonb_agg(to_jsonb(b)) from tutor_private.buckets b where scope='global'",
        ),
        before,
      );
    },
  );
});
