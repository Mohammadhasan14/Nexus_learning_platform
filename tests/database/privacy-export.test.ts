import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { migrationDatabase } from "../../scripts/database-harness";

const a = "a9000000-0000-0000-0000-000000000001";
const b = "a9000000-0000-0000-0000-000000000002";
const empty = "a9000000-0000-0000-0000-000000000003";
const collections = [
  "enrolments",
  "lesson_reads",
  "attempts",
  "lesson_notes",
  "project_submissions",
  "outcome_events",
  "content_reports",
  "tutor_requests",
  "daily_tutor_usage",
  "daily_token_usage",
] as const;
type Export = {
  format: string;
  exported_at: string;
  profile: { user_id: string; goal: string };
  staff_role: string | null;
} & Record<(typeof collections)[number], Record<string, unknown>[]>;

test("learner export enforces ownership, explicit fields and complete snapshot downloads", async (t) => {
  const db = await migrationDatabase();
  t.after(() => db.close());
  const identity = async (id: string | null, role = "authenticated") => {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      id ?? "",
    ]);
    await db.exec(`set role ${role}`);
  };
  const exportData = async () =>
    (
      await db.query<{ result: Export }>(
        "select public.export_learner_data() result",
      )
    ).rows[0].result;
  await db.exec(`insert into auth.users(id) values('${a}'),('${b}'),('${empty}');
    update public.profiles set goal='Keep my learning records private';
    insert into public.staff_roles(user_id,role) values('${b}','admin');
    alter table public.profiles add column future_private_field text default 'future-column-canary';
    insert into tutor_private.receipt_keys(secret) values(repeat('a',64));`);
  for (const id of [a, b]) {
    await identity(id);
    await db.exec(
      "select public.enrol_course('javascript-foundations-v2'); select public.mark_lesson_read('js-v2-values')",
    );
    await db.query("select public.save_lesson_note('js-v2-values',$1,0,$2)", [
      `note-${id}`,
      randomUUID(),
    ]);
    const tutor = randomUUID();
    await db.query(
      "select public.use_scripted_tutor('js-v2-values',$1,'hint')",
      [tutor],
    );
    await db.query("select public.report_content('js-v2-values',$1,$2,$3)", [
      `report-${id}`,
      randomUUID(),
      tutor,
    ]);
    // More than the provider's ordinary 1,000-row cap; no export pagination loss.
    await db.exec("reset role");
    await db.query(
      `insert into public.attempts(user_id,exercise_id,request_id,answer,correct,feedback)
      select $1,'js-v2-values-practice',gen_random_uuid(),'a',true,'Recorded answer'
      from generate_series(1,1005)`,
      [id],
    );
    await db.query(
      `insert into public.project_submissions(user_id,project_id,revision,request_id,base_revision,milestones,feedback)
      values($1,'study-planner-v1',1,gen_random_uuid(),0,jsonb_build_object('values',$2::text),'[]')`,
      [id, `project-${id}`],
    );
    await db.query(
      "insert into tutor_private.token_buckets(day,scope,charged) values(current_date,$1,123)",
      [id],
    );
  }
  await db.exec(
    "update public.content_reports set staff_note='staff-note-canary'; insert into tutor_private.token_buckets(day,scope,charged) values(current_date,'global',999999)",
  );

  await t.test(
    "anonymous, missing and nonexistent identities cannot export or select another owner",
    async () => {
      await identity(null, "anon");
      await assert.rejects(exportData(), /permission denied/);
      await identity(null);
      await assert.rejects(exportData(), /Sign in required/);
      await identity(randomUUID());
      await assert.rejects(exportData(), /Sign in required/);
      await identity(a);
      await assert.rejects(
        db.query("select public.export_learner_data($1::uuid)", [b]),
        /does not exist/,
      );
    },
  );
  await t.test(
    "learner A receives all own records and no secrets, future columns or other learner",
    async () => {
      await identity(a);
      const result = await exportData();
      assert.equal(result.format, "nexus-learner-export-v1");
      assert.ok(Number.isFinite(Date.parse(result.exported_at)));
      assert.equal(result.profile.user_id, a);
      assert.equal(result.staff_role, null);
      for (const key of collections) assert.ok(result[key].length > 0, key);
      assert.equal(result.attempts.length, 1005);
      assert.equal(result.outcome_events.length, 1005);
      assert.equal(result.lesson_notes[0].body, `note-${a}`);
      assert.equal(
        result.project_submissions[0].milestones &&
          (result.project_submissions[0].milestones as { values: string })
            .values,
        `project-${a}`,
      );
      assert.ok(result.tutor_requests[0].response_snapshot);
      assert.deepEqual(
        result.daily_token_usage.map((row) => row.charged),
        [123],
      );
      const text = JSON.stringify(result);
      for (const secret of [
        b,
        "staff-note-canary",
        "future-column-canary",
        "a".repeat(64),
        "999999",
        "answer_keys",
      ])
        assert.ok(!text.includes(secret), secret);
      await assert.rejects(
        db.query("select * from tutor_private.requests"),
        /permission denied/,
      );
    },
  );
  await t.test(
    "staff export remains own-only; a new learner has explicit empty collections",
    async () => {
      await identity(b);
      const staff = await exportData();
      assert.equal(staff.profile.user_id, b);
      assert.equal(staff.staff_role, "admin");
      assert.equal(staff.lesson_notes[0].body, `note-${b}`);
      assert.ok(!JSON.stringify(staff).includes(a));
      await identity(empty);
      const result = await exportData();
      for (const key of collections) assert.deepEqual(result[key], []);
      assert.equal(result.profile.user_id, empty);
    },
  );
  await t.test(
    "oversized exports fail as a whole and leave saved records intact",
    async () => {
      await db.exec("reset role");
      await db.query(
        "update tutor_private.requests set response_snapshot=jsonb_build_object('text',repeat('x',8388609)) where user_id=$1",
        [a],
      );
      await identity(a);
      await assert.rejects(exportData(), /Export exceeds download limit/);
      assert.equal(
        (
          await db.query<{ count: number }>(
            "select count(*)::int count from public.attempts",
          )
        ).rows[0].count,
        1005,
      );
    },
  );
  await t.test(
    "RPC catalog matches the typed no-argument JSON boundary and fixed search path",
    async () => {
      await db.exec("reset role");
      const { rows } = await db.query<{
        pronargs: number;
        typname: string;
        prosecdef: boolean;
        provolatile: string;
        proconfig: string[];
      }>(
        "select p.pronargs,t.typname,p.prosecdef,p.provolatile,p.proconfig from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_type t on t.oid=p.prorettype where n.nspname='public' and p.proname='export_learner_data'",
      );
      assert.deepEqual(rows, [
        {
          pronargs: 0,
          typname: "jsonb",
          prosecdef: true,
          provolatile: "v",
          proconfig: ['search_path=""'],
        },
      ]);
    },
  );
});
