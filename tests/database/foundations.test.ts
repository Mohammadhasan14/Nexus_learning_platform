import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { migrationDatabase } from "../../scripts/database-harness";
import { signDeletionProof } from "../../modules/privacy/proof";
import { randomBytes } from "node:crypto";
const course = "system-design-studio-v1",
  lesson = "web-request-v1",
  content = "web-request-content-v1",
  schema = "foundation-position-v1";
test("foundations: trusted evaluation, private positions, support history and lifecycle", async (t) => {
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
    "update public.profiles set goal='Learn how a web request works'",
  );
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
  const get = () =>
    call("public.get_studio_foundation($1,$2)", [course, lesson]);
  const position = { section: "learn", step: 2, viewed: false };
  const save = (doc: unknown = position, expected = 0, key = randomUUID()) =>
    call("public.save_studio_foundation($1,$2,$3,$4,$5,$6)", [
      lesson,
      content,
      schema,
      expected,
      key,
      JSON.stringify(doc),
    ]);
  const practice = (
    question = "initiator",
    kind = "attempt",
    choice: string | null = "browser",
    key = randomUUID(),
  ) =>
    call("public.submit_studio_foundation($1,$2,$3,$4,$5,$6,$7)", [
      lesson,
      content,
      schema,
      question,
      kind,
      choice,
      key,
    ]);
  await t.test(
    "auth, enrolment, course and pinned versions gate every mutation",
    async () => {
      await identity(null, "anon");
      await assert.rejects(get(), /permission denied/);
      await identity(a);
      assert.deepEqual(await get(), { enrolled: false });
      await assert.rejects(save(), /Enrol/);
      await assert.rejects(
        call("public.get_studio_foundation($1,$2)", [
          "javascript-foundations-v2",
          lesson,
        ]),
        /Unknown/,
      );
      await call("public.enrol_course($1)", [course]);
      assert.deepEqual((await get()).evidence, []);
      await assert.rejects(
        call("public.save_studio_foundation($1,$2,$3,$4,$5,$6)", [
          lesson,
          "future",
          schema,
          0,
          randomUUID(),
          JSON.stringify(position),
        ]),
        /Unsupported/,
      );
      for (const bad of [
        { ...position, step: 4 },
        { ...position, step: -1 },
        { ...position, step: 0.5 },
        { ...position, viewed: "yes" },
        { ...position, section: null },
        { ...position, owner: b },
      ])
        await assert.rejects(save(bad), /Invalid/);
    },
  );
  await t.test(
    "position idempotency, conflict, immutable owner isolation",
    async () => {
      const key = randomUUID();
      const first = await save(position, 0, key);
      assert.equal(first.revision, 1);
      assert.deepEqual(await save(position, 0, key), first);
      await assert.rejects(
        save({ ...position, step: 3 }, 0, key),
        /already used/,
      );
      await assert.rejects(save(position), /newer/);
      assert.equal(
        (await save({ ...position, section: "recap", viewed: true }, 1))
          .revision,
        2,
      );
      assert.deepEqual(await save(position, 0, key), first);
      assert.equal(((await get()).saved as { revision: number }).revision, 2);
      await assert.rejects(
        db.exec("update public.studio_foundation_positions set revision=9"),
        /permission denied/,
      );
      await assert.rejects(
        db.exec("delete from public.studio_foundation_positions"),
        /permission denied/,
      );
      for (const other of [b, staff]) {
        await identity(other);
        await call("public.enrol_course($1)", [course]);
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
    "server keys cannot be read; only validated attempts reveal feedback; retry keys are immutable",
    async () => {
      await assert.rejects(
        db.exec("select * from learning_private.foundation_answer_keys"),
        /permission denied/,
      );
      await assert.rejects(
        practice("initiator", "hint", null),
        /Try the question/,
      );
      await assert.rejects(
        practice("initiator", "explain", null),
        /Try the question/,
      );
      for (const [q, k, c] of [
        ["unknown", "attempt", "browser"],
        ["initiator", "attempt", null],
        ["initiator", "attempt", "ask-reply"],
        ["initiator", "hint", "browser"],
        ["initiator", "grade", "true"],
      ])
        await assert.rejects(practice(q!, k!, c), /Invalid|supported/);
      const key = randomUUID();
      const wrong = await practice("initiator", "attempt", "database", key);
      assert.equal(wrong.correct, false);
      assert.equal(wrong.attempt, 1);
      assert.equal(wrong.independent, true);
      assert.equal(wrong.explanationShown, true);
      assert.equal(wrong.options, undefined);
      assert.deepEqual(
        await practice("initiator", "attempt", "database", key),
        wrong,
      );
      await assert.rejects(
        practice("initiator", "attempt", "browser", key),
        /already used/,
      );
      const hint = await practice("initiator", "hint", "");
      assert.equal(hint.hintLevel, 1);
      assert.equal((await practice("initiator", "hint", null)).hintLevel, 2);
      await assert.rejects(practice("initiator", "hint", null), /Both hints/);
      const explained = await practice("initiator", "explain", null);
      assert.equal(Object.keys(explained.options as object).length, 3);
      const retry = await practice("initiator", "attempt", "browser");
      assert.equal(retry.correct, true);
      assert.equal(retry.independent, false);
      assert.equal(retry.attempt, 2);
      assert.equal(retry.hintLevel, 2);
      for (const [q, answer] of [
        ["database-query", "server"],
        ["request-response", "ask-reply"],
      ]) {
        const first = await practice(q, "attempt", answer);
        assert.equal(first.correct, true);
        assert.equal(first.independent, true);
        assert.equal(first.attempt, 1);
      }
      const evidence = (await get()).evidence as {
        kind: string;
        question: string;
        attempt: number;
      }[];
      assert.equal(evidence.length, 5);
      assert.equal(
        evidence.find((e) => e.kind === "attempt" && e.question === "initiator")
          ?.attempt,
        2,
      );
      await assert.rejects(
        db.exec("update public.studio_foundation_events set choice='browser'"),
        /permission denied/,
      );
      for (const other of [b, staff]) {
        await identity(other);
        assert.deepEqual(
          (await db.query("select * from public.studio_foundation_events"))
            .rows,
          [],
        );
        assert.deepEqual((await get()).evidence, []);
      }
      await identity(a);
    },
  );
  await t.test(
    "export includes only this owner and deletion cascades without changing JS/workshop records",
    async () => {
      const exported = await call("public.export_learner_data()");
      assert.equal(
        (exported.studio_foundation_positions as unknown[]).length,
        2,
      );
      assert.equal((exported.studio_foundation_events as unknown[]).length, 7);
      assert.deepEqual(exported.studio_worksheets, []);
      assert.equal(
        (await db.query("select * from public.attempts")).rows.length,
        0,
      );
      assert.doesNotMatch(
        JSON.stringify(exported),
        /correct_choice|foundation_answer_keys/,
      );
      await identity(b);
      await save();
      const otherExport = await call("public.export_learner_data()");
      assert.equal(
        (otherExport.studio_foundation_events as unknown[]).length,
        0,
      );
      await identity(null, "authenticated");
      await assert.rejects(call("public.export_learner_data()"), /Sign in/);
      // Existing signed deletion-proof path, synthetic owner only; mirrors Studio lifecycle acceptance.
      await identity(a);
      const signingKey = randomBytes(32).toString("hex");
      await db.exec("reset role");
      await db.query(
        "insert into privacy_private.deletion_keys(secret) values($1)",
        [signingKey],
      );
      await identity(a);
      const proof = signDeletionProof(signingKey, a);
      await call("public.delete_learner_account($1,$2)", [
        proof.proof,
        proof.signature,
      ]);
      await db.exec("reset role");
      assert.equal(
        (
          await db.query(
            "select * from public.studio_foundation_positions where user_id=$1",
            [a],
          )
        ).rows.length,
        0,
      );
      assert.equal(
        (
          await db.query(
            "select * from public.studio_foundation_events where user_id=$1",
            [a],
          )
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
