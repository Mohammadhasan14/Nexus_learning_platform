import { test } from "node:test";
import assert from "node:assert/strict";
import { migrationDatabase } from "../../scripts/database-harness";

const a = "00000000-0000-0000-0000-000000000001";
const b = "00000000-0000-0000-0000-000000000002";
const staff = "00000000-0000-0000-0000-000000000003";

test("Phase 2 migrations enforce ownership, column permissions and trusted staff assignment", async (t) => {
  const db = await migrationDatabase();
  t.after(() => db.close());
  await db.exec(
    `insert into auth.users (id,raw_user_meta_data) values ('${a}','{"role":"admin"}'),('${b}','{}'),('${staff}','{}'); insert into public.staff_roles (user_id,role) values ('${staff}','editor');`,
  );
  const identity = async (id: string | null, role = "authenticated") => {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [
      id ?? "",
    ]);
    await db.exec(`set role ${role}`);
  };
  await t.test(
    "anonymous users cannot read profiles or staff roles",
    async () => {
      await identity(null, "anon");
      await assert.rejects(
        db.query("select * from public.profiles"),
        /permission denied/,
      );
      await assert.rejects(
        db.query("select * from public.staff_roles"),
        /permission denied/,
      );
    },
  );
  await t.test(
    "user A sees only A; user metadata cannot assign staff",
    async () => {
      await identity(a);
      assert.deepEqual(
        (await db.query("select user_id from public.profiles")).rows,
        [{ user_id: a }],
      );
      assert.equal(
        (await db.query("select * from public.staff_roles")).rows.length,
        0,
      );
      assert.equal(
        (
          await db.query(
            "update public.profiles set goal='Steal another profile' where user_id=$1 returning user_id",
            [b],
          )
        ).rows.length,
        0,
      );
    },
  );
  await t.test(
    "own preferences save, onboarding timestamp is derived, ownership/timestamps cannot be forged",
    async () => {
      await identity(a);
      const result = await db.query<{
        goal: string;
        onboarding_completed_at: string | null;
      }>(
        "update public.profiles set goal='Build accessible websites',daily_minutes=30,timezone='Asia/Kolkata',locale='en-IN' where user_id=$1 returning goal,onboarding_completed_at",
        [a],
      );
      assert.equal(result.rows[0].goal, "Build accessible websites");
      assert.ok(result.rows[0].onboarding_completed_at);
      await assert.rejects(
        db.query("update public.profiles set user_id=$1", [b]),
        /permission denied/,
      );
      await assert.rejects(
        db.query("update public.profiles set onboarding_completed_at=null"),
        /permission denied/,
      );
      await assert.rejects(
        db.query("update public.profiles set created_at=now()"),
        /permission denied/,
      );
    },
  );
  await t.test(
    "database rejects malformed preferences even if app validation is bypassed",
    async () => {
      for (const assignment of [
        "daily_minutes=0",
        "daily_minutes=21",
        "goal='short'",
        "display_name=''",
        "timezone='fake/zone'",
        "locale='anything'",
      ]) {
        await assert.rejects(
          db.query(
            `update public.profiles set ${assignment} where user_id=$1`,
            [a],
          ),
          /constraint|Invalid timezone/,
        );
      }
    },
  );
  await t.test("user B cannot read A or delete/create profiles", async () => {
    await identity(b);
    assert.deepEqual(
      (await db.query("select user_id from public.profiles")).rows,
      [{ user_id: b }],
    );
    assert.equal(
      (await db.query("select * from public.profiles where user_id=$1", [a]))
        .rows.length,
      0,
    );
    await assert.rejects(
      db.query("delete from public.profiles"),
      /permission denied/,
    );
    await assert.rejects(
      db.query("insert into public.profiles(user_id) values ($1)", [a]),
      /permission denied/,
    );
  });
  await t.test(
    "staff sees their role but no other private profiles; roles cannot be self-assigned",
    async () => {
      await identity(staff);
      assert.deepEqual(
        (await db.query("select user_id from public.profiles")).rows,
        [{ user_id: staff }],
      );
      assert.deepEqual(
        (await db.query("select role from public.staff_roles")).rows,
        [{ role: "editor" }],
      );
      await assert.rejects(
        db.query("update public.staff_roles set role='admin'"),
        /permission denied/,
      );
      await identity(a);
      await assert.rejects(
        db.query(
          "insert into public.staff_roles(user_id,role) values ($1,'admin')",
          [a],
        ),
        /permission denied/,
      );
      await assert.rejects(
        db.query("select public.create_learner_profile()"),
        /permission denied|trigger/,
      );
    },
  );
  await t.test(
    "identity deletion cascades and ownership queries are indexed",
    async () => {
      await db.exec("reset role");
      await db.query("delete from auth.users where id=$1", [staff]);
      assert.equal(
        (
          await db.query("select * from public.staff_roles where user_id=$1", [
            staff,
          ])
        ).rows.length,
        0,
      );
      const indexes = await db.query(
        "select indexname from pg_indexes where schemaname='public'",
      );
      assert.equal(indexes.rows.length, 2);
    },
  );
});
