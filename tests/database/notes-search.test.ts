import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { migrationDatabase } from "../../scripts/database-harness";
const a = "81000000-0000-0000-0000-000000000001",
  b = "81000000-0000-0000-0000-000000000002";
test("notes enforce owner privacy, prerequisite access, idempotency, conflicts and account cleanup", async () => {
  const db = await migrationDatabase();
  try {
    await db.exec(
      `insert into auth.users(id) values('${a}'),('${b}');update public.profiles set goal='Learn with private notes';insert into public.staff_roles(user_id,role) values('${b}','admin');`,
    );
    await db.exec("set role anon");
    await assert.rejects(
      db.query("select * from public.lesson_notes"),
      /permission denied/,
    );
    await assert.rejects(
      db.query("select public.save_lesson_note('js-v2-values','hi',0,$1)", [
        randomUUID(),
      ]),
      /permission denied/,
    );
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [a]);
    await db.exec("set role authenticated");
    const id = randomUUID();
    const save = (
      body = "My private note",
      expected = 0,
      request = id,
      lesson = "js-v2-values",
    ) =>
      db.query<{ saved: { revision: number; updated_at: string } }>(
        "select public.save_lesson_note($1,$2,$3,$4) saved",
        [lesson, body, expected, request],
      );
    await assert.rejects(save(), /Enrol/);
    await db.exec("select public.enrol_course('javascript-foundations-v2')");
    await assert.rejects(
      save("Locked", 0, randomUUID(), "js-v2-functions"),
      /prerequisite/,
    );
    await assert.rejects(save("x".repeat(10001)), /Invalid note/);
    const first = (await save()).rows[0].saved;
    assert.equal(first.revision, 1);
    assert.deepEqual((await save()).rows[0].saved, first);
    await assert.rejects(save("Different"), /identity already used/);
    await assert.rejects(save("Stale", 0, randomUUID()), /newer note/);
    assert.equal(
      (await save("Updated", 1, randomUUID())).rows[0].saved.revision,
      2,
    );
    assert.equal((await save("", 2, randomUUID())).rows[0].saved.revision, 3);
    assert.equal(
      (await db.query<{ body: string }>("select body from public.lesson_notes"))
        .rows[0].body,
      "",
    );
    await assert.rejects(
      db.exec("update public.lesson_notes set body='forged'"),
      /permission denied/,
    );
    await assert.rejects(
      db.exec("delete from public.lesson_notes"),
      /permission denied/,
    );
    await assert.rejects(
      db.query(
        "insert into public.lesson_notes(user_id,lesson_id,body,revision,request_id) values($1,'js-v2-values','forged',1,$2)",
        [b, randomUUID()],
      ),
      /permission denied/,
    );
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [b]);
    await db.exec("set role authenticated");
    assert.deepEqual(
      (await db.query("select * from public.lesson_notes")).rows,
      [],
    );
    await db.exec("select public.enrol_course('javascript-foundations-v2')");
    await save("Other owner", 0, randomUUID());
    assert.equal(
      (await db.query<{ body: string }>("select body from public.lesson_notes"))
        .rows[0].body,
      "Other owner",
    );
    await db.exec("reset role");
    await db.query("delete from auth.users where id=$1", [a]);
    assert.equal(
      (
        await db.query("select * from public.lesson_notes where user_id=$1", [
          a,
        ])
      ).rows.length,
      0,
    );
  } finally {
    await db.close();
  }
});
test("lesson search filters enrolment and prerequisites, treats wildcard input literally and preserves version destinations", async () => {
  const db = await migrationDatabase();
  try {
    await db.exec(
      `insert into auth.users(id) values('${a}'),('${b}');update public.profiles set goal='Find authorised lessons';`,
    );
    await db.exec("set role anon");
    await assert.rejects(
      db.query("select * from public.search_lessons('values')"),
      /permission denied/,
    );
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [a]);
    await db.exec("set role authenticated");
    const search = async (q: string) =>
      (
        await db.query<{ lesson_id: string; course_id: string; title: string }>(
          "select * from public.search_lessons($1)",
          [q],
        )
      ).rows;
    assert.deepEqual(await search("values"), []);
    await db.exec("select public.enrol_course('javascript-foundations-v2')");
    assert.deepEqual(
      (await search("VALUES")).map((l) => l.lesson_id),
      ["js-v2-values"],
    );
    assert.deepEqual(await search("functions"), []);
    assert.deepEqual(await search("%"), []);
    assert.deepEqual(await search("%%"), []);
    assert.deepEqual(await search("' OR 1=1 --"), []);
    assert.deepEqual(await search(""), []);
    assert.deepEqual(await search("x"), []);
    await assert.rejects(search("x".repeat(101)), /100 characters/);
    for (const [lesson, answer] of [
      ["values", "a"],
      ["conditions", "c"],
    ])
      await db.query("select public.submit_attempt($1,$2,$3)", [
        `js-v2-${lesson}-practice`,
        answer,
        randomUUID(),
      ]);
    assert.equal((await search("functions"))[0].lesson_id, "js-v2-functions");
    const older = (
      await db.query<{ id: string }>(
        "select id from public.course_versions where version=1 limit 1",
      )
    ).rows[0].id;
    await db.query("select public.enrol_course($1)", [older]);
    assert.ok((await search("values")).some((l) => l.course_id === older));
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [b]);
    await db.exec("set role authenticated");
    assert.deepEqual(await search("values"), []);
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub','',false)");
    await db.exec("set role authenticated");
    await assert.rejects(search("values"), /Sign in required/);
  } finally {
    await db.close();
  }
});
