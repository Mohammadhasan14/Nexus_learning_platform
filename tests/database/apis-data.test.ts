import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { migrationDatabase } from "../../scripts/database-harness";
import { signDeletionProof } from "../../modules/privacy/proof";
import { apiFoundationIdentity as api } from "../../modules/system-design/foundations/api-content";
import { foundationIdentity as first } from "../../modules/system-design/foundations/content";
import { defaultExplorerConfig } from "../../modules/system-design/foundations/api-example";
import { foundationStateSchema } from "../../modules/system-design/foundations/schema";

test("APIs and data: additive upgrade, protected assessment and private position lifecycle", async (t) => {
  const db = await migrationDatabase("202611010001_studio_foundations.sql");
  t.after(() => db.close());
  const a = randomUUID(),
    b = randomUUID(),
    staff = randomUUID();
  await db.query("insert into auth.users(id) values($1),($2),($3)", [
    a,
    b,
    staff,
  ]);
  await db.exec("update public.profiles set goal='Learn campus APIs'");
  await db.query(
    "insert into public.staff_roles(user_id,role) values($1,'admin')",
    [staff],
  );
  const identity = async (user: string | null, role = "authenticated") => {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      user ?? "",
    ]);
    await db.exec(`set role ${role}`);
  };
  const call = async (sql: string, args: unknown[] = []) =>
    (await db.query<{ r: Record<string, unknown> }>(`select ${sql} r`, args))
      .rows[0].r;
  type Identity = { lesson: string; content: string; schema: string };
  const get = (i: Identity = api) =>
    call("public.get_studio_foundation($1,$2)", [
      "system-design-studio-v1",
      i.lesson,
    ]);
  const position = {
    section: "learn",
    step: 0,
    viewed: false,
    explorer: defaultExplorerConfig(),
  };
  const save = (
    doc: unknown = position,
    expected = 0,
    key = randomUUID(),
    i: Identity = api,
  ) =>
    call("public.save_studio_foundation($1,$2,$3,$4,$5,$6)", [
      i.lesson,
      i.content,
      i.schema,
      expected,
      key,
      JSON.stringify(doc),
    ]);
  const submit = (
    q = "api-read-one",
    kind = "attempt",
    choice: string | null = "get-one",
    key = randomUUID(),
    i: Identity = api,
  ) =>
    call("public.submit_studio_foundation($1,$2,$3,$4,$5,$6,$7)", [
      i.lesson,
      i.content,
      i.schema,
      q,
      kind,
      choice,
      key,
    ]);
  await identity(a);
  await call("public.enrol_course($1)", ["system-design-studio-v1"]);
  await call("public.enrol_course($1)", ["javascript-foundations-v1"]);
  await call("public.mark_lesson_read($1)", ["js-v1-values"]);
  await save(
    { section: "learn", step: 2, viewed: true },
    0,
    randomUUID(),
    first,
  );
  await submit("initiator", "attempt", "browser", randomUUID(), first);
  const old = await get(first);
  const reads = (await db.query("select * from public.lesson_reads")).rows;
  await db.exec("reset role");
  const oldKeys = (
    await db.query(
      "select * from learning_private.foundation_answer_keys order by question_id",
    )
  ).rows;
  await db.exec(
    await readFile(
      "supabase/migrations/202611050001_foundations_apis_data.sql",
      "utf8",
    ),
  );
  await t.test(
    "upgrade preserves published first-lesson keys, saved evidence and JavaScript records",
    async () => {
      assert.deepEqual(
        (
          await db.query(
            "select * from learning_private.foundation_answer_keys where lesson_id='web-request-v1' order by question_id",
          )
        ).rows,
        oldKeys,
      );
      await identity(a);
      assert.deepEqual(await get(first), old);
      assert.deepEqual(
        (await db.query("select * from public.lesson_reads")).rows,
        reads,
      );
      assert.equal(
        (
          await save(
            { section: "recap", step: 3, viewed: true },
            1,
            randomUUID(),
            first,
          )
        ).revision,
        2,
      );
    },
  );
  await t.test(
    "enrolment, identity and question associations fail closed without exposing keys",
    async () => {
      await identity(null, "anon");
      await assert.rejects(get(), /permission denied/);
      await identity(b);
      assert.deepEqual(await get(), { enrolled: false });
      await assert.rejects(save(), /Enrol/);
      await call("public.enrol_course($1)", ["system-design-studio-v1"]);
      await identity(a);
      await assert.rejects(
        db.exec("select * from learning_private.foundation_answer_keys"),
        /permission denied/,
      );
      for (const i of [
        { ...api, content: first.content },
        { ...api, schema: first.schema },
        { ...api, content: "future" },
      ])
        await assert.rejects(save(position, 0, randomUUID(), i), /Unsupported/);
      await assert.rejects(
        submit("initiator", "attempt", "browser"),
        /supported|Invalid/,
      );
      await assert.rejects(
        submit("api-read-one", "attempt", "get-one", randomUUID(), first),
        /supported|Invalid/,
      );
      await assert.rejects(submit("api-read-one", "grade", "true"), /Invalid/);
      await assert.rejects(
        submit("api-read-one", "hint", null),
        /Try the question/,
      );
    },
  );
  await t.test(
    "validated drafts save once, conflicts do not overwrite, lesson versions remain pinned",
    async () => {
      for (const bad of [
        { ...position, step: 1 },
        { ...position, owner: b },
        { ...position, response: { status: 201 } },
        { section: "learn", step: 0, viewed: false },
        { ...position, explorer: { ...position.explorer, title: null } },
        {
          ...position,
          explorer: { ...position.explorer, title: "x".repeat(81) },
        },
        {
          ...position,
          explorer: { ...position.explorer, title: "😀".repeat(41) },
        },
        {
          ...position,
          explorer: { ...position.explorer, eventId: "https://example.test" },
        },
        { ...position, explorer: { ...position.explorer, grade: true } },
      ])
        await assert.rejects(save(bad), /Invalid|limit/);
      const draft = {
        ...position,
        explorer: { scenario: "create", eventId: "evt_999", title: "" },
      };
      const key = randomUUID(),
        saved = await save(draft, 0, key);
      assert.equal(saved.revision, 1);
      assert.deepEqual(await save(draft, 0, key), saved);
      await assert.rejects(save(position, 0, key), /already used/);
      await assert.rejects(save(position), /newer/);
      assert.equal((await save(position, 1)).revision, 2);
      const state = foundationStateSchema.parse(await get());
      assert.deepEqual(state.identity, api);
      assert.deepEqual(state.saved?.position, position);
      assert.equal(state.evidence.length, 0);
      for (const sql of [
        "update public.studio_foundation_positions set revision=99",
        "delete from public.studio_foundation_positions",
        "insert into public.studio_foundation_positions select * from public.studio_foundation_positions",
      ])
        await assert.rejects(db.exec(sql), /permission denied/);
      for (const other of [b, staff]) {
        await identity(other);
        await call("public.enrol_course($1)", ["system-design-studio-v1"]);
        assert.equal((await get()).saved, null);
        assert.deepEqual(
          (await db.query("select * from public.studio_foundation_positions"))
            .rows,
          [],
        );
      }
      await identity(a);
    },
  );
  await t.test(
    "grading derives from protected keys; help/retry history and first attempts remain distinct",
    async () => {
      const key = randomUUID();
      const wrong = await submit("api-read-one", "attempt", "post-list", key);
      assert.equal(wrong.correct, false);
      assert.equal(wrong.independent, true);
      assert.equal(wrong.options, undefined);
      assert.deepEqual(
        await submit("api-read-one", "attempt", "post-list", key),
        wrong,
      );
      await assert.rejects(
        submit("api-read-one", "attempt", "get-one", key),
        /already used/,
      );
      assert.equal((await submit("api-read-one", "hint", "")).hintLevel, 1);
      assert.equal((await submit("api-read-one", "hint", null)).hintLevel, 2);
      await assert.rejects(submit("api-read-one", "hint", null), /Both hints/);
      assert.equal(
        Object.keys(
          (await submit("api-read-one", "explain", null)).options as object,
        ).length,
        3,
      );
      const retry = await submit();
      assert.equal(retry.correct, true);
      assert.equal(retry.independent, false);
      assert.equal(retry.attempt, 2);
      assert.equal(retry.hintLevel, 2);
      assert.equal(retry.explanationShown, true);
      for (const [q, answer] of [
        ["api-create-body", "title"],
        ["api-error-kind", "missing-invalid"],
        ["api-representation", "chosen-view"],
      ]) {
        const result = await submit(q, "attempt", answer);
        assert.equal(result.correct, true);
        assert.equal(result.independent, true);
      }
      assert.equal(foundationStateSchema.parse(await get()).evidence.length, 6);
      assert.deepEqual((await get(first)).evidence, old.evidence);
      await assert.rejects(
        db.exec("update public.studio_foundation_events set choice='get-one'"),
        /permission denied/,
      );
      await identity(b);
      assert.deepEqual((await get()).evidence, []);
      await identity(staff);
      assert.deepEqual(
        (await db.query("select * from public.studio_foundation_events")).rows,
        [],
      );
      await identity(a);
    },
  );
  await t.test(
    "export includes both lesson identities; signed deletion cascades only the synthetic owner",
    async () => {
      const exported = await call("public.export_learner_data()");
      const positions = exported.studio_foundation_positions as {
        lesson_id: string;
      }[];
      assert.equal(positions.length, 4);
      assert.equal(new Set(positions.map((p) => p.lesson_id)).size, 2);
      assert.equal((exported.studio_foundation_events as unknown[]).length, 9);
      assert.doesNotMatch(
        JSON.stringify(exported),
        /correct_choice|foundation_answer_keys/,
      );
      assert.equal(
        (await db.query("select * from public.attempts")).rows.length,
        0,
      );
      await identity(b);
      await save();
      await db.exec("reset role");
      const secret = randomBytes(32).toString("hex");
      await db.query(
        "insert into privacy_private.deletion_keys(secret) values($1)",
        [secret],
      );
      await identity(a);
      const proof = signDeletionProof(secret, a);
      await call("public.delete_learner_account($1,$2)", [
        proof.proof,
        proof.signature,
      ]);
      await db.exec("reset role");
      for (const table of [
        "studio_foundation_positions",
        "studio_foundation_events",
      ])
        assert.equal(
          (
            await db.query(`select * from public.${table} where user_id=$1`, [
              a,
            ])
          ).rows.length,
          0,
        );
      assert.equal(
        (
          await db.query(
            "select * from public.studio_foundation_positions where user_id=$1",
            [b],
          )
        ).rows.length,
        1,
      );
    },
  );
});
