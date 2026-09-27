import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { migrationDatabase } from "../../scripts/database-harness";
import { scriptedTutor } from "../../modules/tutor/adapter";
const learner = "80000000-0000-0000-0000-000000000001",
  staff = "80000000-0000-0000-0000-000000000002",
  other = "80000000-0000-0000-0000-000000000003";
test("staff review gates immutable publishing, private keys and audited edits", async () => {
  const db = await migrationDatabase();
  try {
    await db.exec(
      `insert into auth.users(id,raw_user_meta_data) values('${learner}','{"role":"admin"}'),('${staff}','{}'); insert into public.staff_roles(user_id,role) values('${staff}','editor');`,
    );
    const identity = async (id: string) => {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        id,
      ]);
      await db.exec("set role authenticated");
    };
    const draft = randomUUID();
    await identity(learner);
    await assert.rejects(
      db.query("select public.create_content_draft($1,$2)", [
        "javascript-foundations-v2",
        draft,
      ]),
      /Staff required/,
    );
    assert.equal(
      (await db.query("select * from public.content_audit")).rows.length,
      0,
    );
    await assert.rejects(
      db.query("select public.content_review_material($1)", [draft]),
      /Staff required/,
    );
    await identity(staff);
    await db.query("select public.create_content_draft($1,$2)", [
      "javascript-foundations-v2",
      draft,
    ]);
    await db.query("select public.create_content_draft($1,$2)", [
      "javascript-foundations-v2",
      draft,
    ]);
    const content = (
      await db.query<{ content: Record<string, { body: string }> }>(
        "select content from public.content_drafts",
      )
    ).rows[0].content;
    await assert.rejects(
      db.query("select public.publish_content_draft($1,1)", [draft]),
      /Review this revision/,
    );
    await db.query("select public.review_content_draft($1,1,$2)", [
      draft,
      "Checked objectives, examples and every question against its key.",
    ]);
    content["js-v2-values"].body += "\n\nRead each assignment in sequence.";
    await db.query("select public.save_content_draft($1,1,$2::jsonb)", [
      draft,
      JSON.stringify(content),
    ]);
    await assert.rejects(
      db.query("select public.publish_content_draft($1,2)", [draft]),
      /Review this revision/,
    );
    await assert.rejects(
      db.query("select public.save_content_draft($1,1,$2::jsonb)", [
        draft,
        JSON.stringify(content),
      ]),
      /Draft changed/,
    );
    const material = (
      await db.query<{ result: unknown[] }>(
        "select public.content_review_material($1) result",
        [draft],
      )
    ).rows[0].result;
    assert.equal(material.length, 6);
    await db.query("select public.review_content_draft($1,2,$2)", [
      draft,
      "Verified the revised text, examples and all six copied grading keys.",
    ]);
    const published = (
      await db.query<{ id: string }>(
        "select public.publish_content_draft($1,2) id",
        [draft],
      )
    ).rows[0].id;
    assert.equal(
      (
        await db.query<{ id: string }>(
          "select public.publish_content_draft($1,2) id",
          [draft],
        )
      ).rows[0].id,
      published,
    );
    assert.equal(
      (
        await db.query("select * from public.lessons where course_id=$1", [
          published,
        ])
      ).rows.length,
      3,
    );
    assert.equal(
      (
        await db.query(
          "select * from public.project_versions where course_id=$1",
          [published],
        )
      ).rows.length,
      1,
    );
    const original = (
      await db.query<{ body: string }>(
        "select body from public.lessons where id='js-v2-values'",
      )
    ).rows[0].body;
    assert.ok(!original.endsWith("Read each assignment in sequence."));
    assert.equal(
      (
        await db.query(
          "select * from public.content_audit where action='publish'",
        )
      ).rows.length,
      1,
    );
    await assert.rejects(
      db.query("delete from public.content_audit"),
      /permission denied/,
    );
    await db.exec("reset role");
    await db.query("delete from public.staff_roles where user_id=$1", [staff]);
    await identity(staff);
    await assert.rejects(
      db.query("select public.publish_content_draft($1,2)", [draft]),
      /Staff required/,
    );
    assert.equal(
      (await db.query("select * from public.content_drafts")).rows.length,
      0,
    );
  } finally {
    await db.close();
  }
});
test("reports preserve lesson and actual tutor response snapshots with owner privacy and staff triage", async () => {
  const db = await migrationDatabase();
  try {
    await db.exec(
      `insert into auth.users(id) values('${learner}'),('${staff}'),('${other}'); update public.profiles set goal='Learn JavaScript carefully'; insert into public.staff_roles(user_id,role) values('${staff}','admin');`,
    );
    const identity = async (id: string) => {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        id,
      ]);
      await db.exec("set role authenticated");
    };
    await identity(learner);
    await db.exec("select public.enrol_course('javascript-foundations-v2')");
    const request = randomUUID();
    const receipt = (
      await db.query<{ result: { reply: unknown } }>(
        "select public.use_scripted_tutor('js-v2-values',$1,'hint') result",
        [request],
      )
    ).rows[0].result.reply;
    assert.deepEqual(
      receipt,
      await scriptedTutor.respond(
        {
          lesson: "js-v2-values",
          course: "javascript-foundations-v2",
          title: "Values and bindings",
          reviewed: true,
        },
        "hint",
      ),
    );
    for (const [topic, answer] of [
      ["values", "a"],
      ["conditions", "c"],
      ["functions", "b"],
    ]) {
      await db.query("select public.submit_attempt($1,$2,$3)", [
        `js-v2-${topic}-practice`,
        answer,
        randomUUID(),
      ]);
      const title = (
        await db.query<{ title: string }>(
          "select title from public.lessons where id=$1",
          [`js-v2-${topic}`],
        )
      ).rows[0].title;
      for (const intent of ["hint", "explain", "example", "reflect"] as const) {
        const generated = (
          await db.query<{ result: { reply: unknown } }>(
            "select public.use_scripted_tutor($1,$2,$3) result",
            [`js-v2-${topic}`, randomUUID(), intent],
          )
        ).rows[0].result.reply;
        assert.deepEqual(
          generated,
          await scriptedTutor.respond(
            {
              lesson: `js-v2-${topic}`,
              course: "javascript-foundations-v2",
              title,
              reviewed: true,
            },
            intent,
          ),
        );
      }
    }
    const key = randomUUID(),
      message = "Please clarify the explanation in this response.";
    const report = (
      await db.query<{ id: string }>(
        "select public.report_content('js-v2-values',$1,$2,$3) id",
        [message, key, request],
      )
    ).rows[0].id;
    assert.equal(
      (
        await db.query<{ id: string }>(
          "select public.report_content('js-v2-values',$1,$2,$3) id",
          [message, key, request],
        )
      ).rows[0].id,
      report,
    );
    await assert.rejects(
      db.query(
        "select public.report_content('js-v2-values','Changed message',$1,$2)",
        [key, request],
      ),
      /already used/,
    );
    await assert.rejects(
      db.query("select public.report_content('js-v2-values',$1,$2,$3)", [
        message,
        randomUUID(),
        randomUUID(),
      ]),
      /saved tutor response/,
    );
    await assert.rejects(
      db.query(
        "select public.triage_content_report($1,1,'resolved','A detailed resolution note')",
        [report],
      ),
      /Staff required/,
    );
    await identity(other);
    await db.exec("select public.enrol_course('javascript-foundations-v2')");
    assert.equal(
      (await db.query("select * from public.content_reports")).rows.length,
      0,
    );
    await assert.rejects(
      db.query("select public.report_content('js-v2-values',$1,$2,$3)", [
        message,
        randomUUID(),
        request,
      ]),
      /saved tutor response/,
    );
    await identity(staff);
    const snapshot = (
      await db.query<{
        snapshot: { response: unknown; course_version: number };
      }>("select snapshot from public.content_reports")
    ).rows[0].snapshot;
    assert.deepEqual(snapshot.response, receipt);
    assert.equal(snapshot.course_version, 2);
    await db.query(
      "select public.triage_content_report($1,1,'resolved','Reviewed the example and explained the assignment order.')",
      [report],
    );
    await assert.rejects(
      db.query(
        "select public.triage_content_report($1,1,'open','Reopened after further investigation')",
        [report],
      ),
      /Report changed/,
    );
    assert.equal(
      (await db.query("select * from public.report_audit")).rows.length,
      1,
    );
    await identity(learner);
    assert.equal(
      (
        await db.query<{ status: string }>(
          "select status from public.content_reports",
        )
      ).rows[0].status,
      "resolved",
    );
    await assert.rejects(
      db.query("update public.content_reports set snapshot='{}'"),
      /permission denied/,
    );
    for (let i = 0; i < 9; i++)
      await db.query("select public.report_content('js-v2-values',$1,$2)", [
        message,
        randomUUID(),
      ]);
    await assert.rejects(
      db.query("select public.report_content('js-v2-values',$1,$2)", [
        message,
        randomUUID(),
      ]),
      /Daily report limit/,
    );
  } finally {
    await db.close();
  }
});
