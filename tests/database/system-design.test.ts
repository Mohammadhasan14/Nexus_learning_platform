import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { migrationDatabase } from "../../scripts/database-harness";
import { defaultWorksheet } from "../../modules/system-design/content";
import { signDeletionProof } from "../../modules/privacy/proof";

const course = "system-design-studio-v1",
  scenario = "campus-events-v1";
test("Studio preserves private versioned inputs, retries, conflicts, export and deletion", async (t) => {
  const db = await migrationDatabase();
  t.after(() => db.close());
  const a = randomUUID(),
    b = randomUUID(),
    staff = randomUUID();
  await db.query("insert into auth.users(id) values($1),($2),($3)", [
    a,
    b,
    staff,
  ]);
  await db.exec(
    "update public.profiles set goal='Study careful system design'",
  );
  await db.query(
    "insert into public.staff_roles(user_id,role) values($1,'admin')",
    [staff],
  );
  const identity = async (id: string | null, role = "authenticated") => {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      id ?? "",
    ]);
    await db.exec(`set role ${role}`);
  };
  const call = async (sql: string, args: unknown[] = []) =>
    (
      await db.query<{ result: Record<string, unknown> }>(
        `select ${sql} result`,
        args,
      )
    ).rows[0].result;
  const save = (
    document: unknown = defaultWorksheet,
    base = 0,
    key = randomUUID(),
    s = scenario,
  ) =>
    call("public.save_studio_worksheet($1,$2,$3,$4)", [
      s,
      base,
      key,
      JSON.stringify(document),
    ]);
  const get = () =>
    call("public.get_studio_workshop($1,$2)", [course, scenario]);
  await t.test(
    "course relationship, onboarding/enrolment and unsupported schemas are enforced",
    async () => {
      await identity(a);
      assert.deepEqual(await get(), { enrolled: false });
      await assert.rejects(save(), /Enrol/);
      await assert.rejects(
        call("public.get_studio_workshop($1,$2)", [
          "javascript-foundations-v2",
          scenario,
        ]),
        /Unknown/,
      );
      await call("public.enrol_course($1)", [course]);
      assert.equal((await get()).saved, null);
      await assert.rejects(
        save(defaultWorksheet, 0, randomUUID(), "campus-events-v2"),
        /Unsupported/,
      );
    },
  );
  const key = randomUUID();
  await t.test(
    "strict server-side fields, ranges, numerical precision and no client scores",
    async () => {
      for (const doc of [
        { ...defaultWorksheet, explanation: "😀".repeat(2001) },
        { ...defaultWorksheet, owner: b },
        { ...defaultWorksheet, correct: true },
        { ...defaultWorksheet, latencyTargetMs: 0 },
        { ...defaultWorksheet, explanation: "x".repeat(4001) },
        {
          ...defaultWorksheet,
          workload: { ...defaultWorksheet.workload, dailyActiveUsers: "" },
        },
        {
          ...defaultWorksheet,
          workload: { ...defaultWorksheet.workload, dailyActiveUsers: 1.5 },
        },
        {
          ...defaultWorksheet,
          workload: { ...defaultWorksheet.workload, peakFactor: 0 },
        },
        {
          ...defaultWorksheet,
          workload: { ...defaultWorksheet.workload, retentionDays: -1 },
        },
        {
          ...defaultWorksheet,
          workload: { ...defaultWorksheet.workload, readPercentage: 101 },
        },
        {
          ...defaultWorksheet,
          workload: {
            ...defaultWorksheet.workload,
            dailyActiveUsers: 1e8,
            requestsPerUserPerDay: 1e5,
            writePayloadBytes: 1e7,
            retentionDays: 3650,
          },
        },
      ])
        await assert.rejects(save(doc));
      assert.equal((await get()).saved, null);
    },
  );
  await t.test(
    "identical retries return original revision even after later saves; stale work never overwrites",
    async () => {
      const first = await save(defaultWorksheet, 0, key);
      assert.equal(first.revision, 1);
      assert.deepEqual(first.worksheet, defaultWorksheet);
      assert.deepEqual(first.identity, {
        scenario,
        schema: "worksheet-v1",
        formula: "capacity-v1",
      });
      assert.deepEqual(await save(defaultWorksheet, 0, key), first);
      await assert.rejects(
        save({ ...defaultWorksheet, explanation: "Changed payload" }, 0, key),
        /already used/,
      );
      await assert.rejects(save(defaultWorksheet, 1, key), /already used/);
      await assert.rejects(save(), /newer/);
      const newer = {
        ...defaultWorksheet,
        explanation:
          "Doubling the peak factor doubles peak rates, not retained writes.",
      };
      assert.equal((await save(newer, 1)).revision, 2);
      assert.deepEqual(await save(defaultWorksheet, 0, key), first);
      assert.equal(((await get()).saved as { revision: number }).revision, 2);
      await assert.rejects(
        db.query("update public.studio_worksheet_revisions set worksheet=$1", [
          JSON.stringify(defaultWorksheet),
        ]),
        /permission denied/,
      );
      await assert.rejects(
        db.query("delete from public.studio_worksheets"),
        /permission denied/,
      );
    },
  );
  await t.test(
    "other learners, unrelated staff and anonymous callers cannot read or attach owned revisions",
    async () => {
      for (const id of [b, staff]) {
        await identity(id);
        assert.equal(
          (await db.query("select * from public.studio_worksheets")).rows
            .length,
          0,
        );
        assert.equal(
          (await db.query("select * from public.studio_worksheet_revisions"))
            .rows.length,
          0,
        );
        await call("public.enrol_course($1)", [course]);
        assert.equal((await get()).saved, null);
        await assert.rejects(
          db.query(
            "insert into public.studio_worksheet_revisions(user_id,scenario_id,revision,base_revision,request_id,schema_version,formula_version,worksheet) values($1,$2,2,1,$3,'worksheet-v1','capacity-v1',$4)",
            [a, scenario, randomUUID(), JSON.stringify(defaultWorksheet)],
          ),
          /permission denied/,
        );
        await save({
          ...defaultWorksheet,
          explanation: `Private work for ${id}`,
        });
      }
      await identity(null, "anon");
      await assert.rejects(get(), /permission denied/);
      await assert.rejects(save(), /permission denied/);
      await identity(null);
      await assert.rejects(get(), /Sign in/);
    },
  );
  await t.test(
    "explicit export includes every owned revision, excludes other owners and retains existing format",
    async () => {
      await identity(a);
      const data = await call("public.export_learner_data()");
      assert.equal(data.format, "nexus-learner-export-v1");
      const revisions = data.studio_worksheet_revisions as {
        revision: number;
        worksheet: unknown;
      }[];
      assert.equal(revisions.length, 2);
      assert.deepEqual(revisions[0].worksheet, defaultWorksheet);
      assert.ok(!JSON.stringify(data).includes(`Private work for ${b}`));
      assert.ok(!JSON.stringify(data).includes("answer_keys"));
      await identity(staff);
      assert.equal(
        (await call("public.export_learner_data()"))
          .studio_worksheet_revisions instanceof Array,
        true,
      );
      assert.equal(
        (
          (await call("public.export_learner_data()"))
            .studio_worksheet_revisions as unknown[]
        ).length,
        1,
      );
    },
  );
  await t.test(
    "existing password-proof deletion cascades private worksheets without deleting another owner",
    async () => {
      await identity(a);
      const secret = randomBytes(32).toString("hex");
      const proof = signDeletionProof(secret, a);
      await db.exec("reset role");
      await db.query(
        "insert into privacy_private.deletion_keys(secret) values($1)",
        [secret],
      );
      await identity(a);
      await call("public.delete_learner_account($1,$2)", [
        proof.proof,
        proof.signature,
      ]);
      await db.exec("reset role");
      assert.equal(
        (
          await db.query(
            "select * from public.studio_worksheets where user_id=$1",
            [a],
          )
        ).rows.length,
        0,
      );
      assert.equal(
        (
          await db.query(
            "select * from public.studio_worksheet_revisions where user_id=$1",
            [a],
          )
        ).rows.length,
        0,
      );
      assert.equal(
        (
          await db.query(
            "select * from public.studio_worksheet_revisions where user_id=$1",
            [b],
          )
        ).rows.length,
        1,
      );
    },
  );
});

test("Studio revision/byte limits fail explicitly without pruning history", async (t) => {
  const db = await migrationDatabase();
  t.after(() => db.close());
  const id = randomUUID();
  await db.query("insert into auth.users(id) values($1)", [id]);
  await db.query(
    "update public.profiles set goal='Preserve all saved worksheet revisions' where user_id=$1",
    [id],
  );
  await db.query(
    "insert into public.enrolments(user_id,course_id) values($1,$2)",
    [id, course],
  );
  const doc = {
    ...defaultWorksheet,
    functionalRequirements: "a".repeat(4000),
    exclusions: "b".repeat(2000),
    assumptions: "c".repeat(2000),
    explanation: "d".repeat(4000),
  };
  await db.query(
    "insert into public.studio_worksheets(user_id,scenario_id,revision) values($1,$2,1000)",
    [id, scenario],
  );
  await db.query(
    "insert into public.studio_worksheet_revisions(user_id,scenario_id,revision,base_revision,request_id,schema_version,formula_version,worksheet) select $1,$2,n,n-1,gen_random_uuid(),'worksheet-v1','capacity-v1',$3 from generate_series(1,1000) n",
    [id, scenario, JSON.stringify(doc)],
  );
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec("set role authenticated");
  await assert.rejects(
    db.query("select public.export_learner_data()"),
    /Export exceeds download limit/,
  );
  await assert.rejects(
    db.query("select public.save_studio_worksheet($1,1000,$2,$3)", [
      scenario,
      randomUUID(),
      JSON.stringify(defaultWorksheet),
    ]),
    /revision limit/,
  );
  assert.equal(
    (
      await db.query<{ count: number }>(
        "select count(*)::integer count from public.studio_worksheet_revisions",
      )
    ).rows[0].count,
    1000,
  );
});
