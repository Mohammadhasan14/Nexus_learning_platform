import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { localSupabase } from "../../scripts/local-supabase";
import { localSql } from "../support/local-sql";
test("staff publish reviewed immutable versions and triage exact learner report snapshots", async ({
  page,
  browser,
}) => {
  test.setTimeout(120_000);
  const backend = localSupabase(),
    options = { auth: { persistSession: false, autoRefreshToken: false } };
  const admin = createClient(backend.url, backend.serviceKey, options),
    learner = createClient(backend.url, backend.key, options);
  const id = randomUUID(),
    course = `editorial-fixture-${id}`,
    lesson = `fixture-lesson-${id}`;
  const email = `reporter-${id}@example.test`,
    staffEmail = `editor-${id}@example.test`,
    password = `Nexus-${randomUUID()}`;
  const users: string[] = [];
  const staffContext = await browser.newContext();
  const staffPage = await staffContext.newPage();
  try {
    for (const address of [email, staffEmail]) {
      const result = await admin.auth.admin.createUser({
        email: address,
        password,
        email_confirm: true,
        user_metadata: { role: "admin" },
      });
      expect(result.error).toBeNull();
      users.push(result.data.user!.id);
    }
    expect(
      (
        await admin
          .from("profiles")
          .update({ goal: "Check content and preserve report context" })
          .in("user_id", users)
      ).error,
    ).toBeNull();
    expect(
      (
        await admin
          .from("staff_roles")
          .insert({ user_id: users[1], role: "editor" })
      ).error,
    ).toBeNull();
    localSql(`insert into public.course_versions(id,title,summary,version,review_status,review_record) values('${course}','Editorial fixture ${id}','Temporary browser-test course',1,'reviewed','Synthetic test fixture');
insert into public.lessons(id,course_id,position,title,objective,body,example,minutes) select '${lesson}','${course}',1,title,objective,body,example,minutes from public.lessons where id='js-v2-values';
insert into public.exercises(id,lesson_id,kind,prompt,options) select 'fixture-${id}-'||kind,'${lesson}',kind,prompt,options from public.exercises where lesson_id='js-v2-values';
insert into learning_private.answer_keys(exercise_id,answer,hint,explanation) select 'fixture-${id}-'||e.kind,k.answer,k.hint,k.explanation from public.exercises e join learning_private.answer_keys k on k.exercise_id=e.id where e.lesson_id='js-v2-values';`);
    expect(
      (await learner.auth.signInWithPassword({ email, password })).error,
    ).toBeNull();
    expect(
      (
        await learner.rpc("enrol_course", {
          course: "javascript-foundations-v2",
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await learner.rpc("create_content_draft", {
          source: course,
          request: randomUUID(),
        })
      ).error,
    ).not.toBeNull();
    await page.goto("/login");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto("/admin");
    await expect(page.getByText("This page could not be found.")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Editorial workspace." }),
    ).toHaveCount(0);
    await page.goto("/courses/javascript-foundations-v2/js-v2-values");
    await page.getByText("Report a lesson issue", { exact: true }).click();
    const report = page.locator("details").filter({
      has: page.getByText("Report a lesson issue", { exact: true }),
    });
    await report
      .getByLabel("What needs attention?")
      .fill("Please clarify when the assignment replaces the old value.");
    await page.route("**/courses/**", async (route) => {
      if (route.request().method() === "POST") await route.abort();
      else await route.continue();
    });
    await report.getByRole("button", { name: "Send report" }).click();
    await expect(report.getByText(/Could not reach the server/)).toBeVisible();
    await page.unroute("**/courses/**");
    await report.getByRole("button", { name: "Send report" }).click();
    await expect(
      report.getByText(/Report saved with its content version/),
    ).toBeVisible();
    const tutor = page.getByRole("region", { name: "Lesson tutor" });
    await tutor.getByRole("button", { name: "Get scripted guidance" }).click();
    await expect(tutor.getByText(/Trace each assignment/)).toBeVisible();
    await tutor
      .getByText("Report this tutor response", { exact: true })
      .click();
    await tutor
      .getByLabel("What needs attention?")
      .fill("Please provide a clearer hint for this assignment sequence.");
    await tutor.getByRole("button", { name: "Send report" }).click();
    await expect(
      tutor.getByText(/Report saved with its content version/),
    ).toBeVisible();
    const reports = await learner.from("content_reports").select("*");
    expect(reports.error).toBeNull();
    expect(reports.data).toHaveLength(2);
    const tutorReport = reports.data!.find((r) => r.tutor_request)!;
    expect(
      (tutorReport.snapshot as { response: { adapter: string; text: string } })
        .response.adapter,
    ).toBe("scripted-foundations-1");
    await staffPage.goto("http://127.0.0.1:3103/login");
    await staffPage.getByLabel("Email address").fill(staffEmail);
    await staffPage.getByLabel("Password", { exact: true }).fill(password);
    await staffPage
      .getByRole("button", { name: "Sign in", exact: true })
      .click();
    await expect(staffPage).toHaveURL(/\/dashboard$/);
    await staffPage
      .getByRole("link", { name: "Editorial", exact: true })
      .click();
    await staffPage.getByLabel("Reviewed source course").selectOption(course);
    await staffPage
      .getByRole("button", { name: "Create draft", exact: true })
      .click();
    const selected = staffPage.getByRole("region", { name: "Selected draft" });
    await expect(
      selected.getByRole("heading", { name: "Lesson revision 1", exact: true }),
    ).toBeVisible();
    await expect(
      selected.getByRole("button", { name: "Publish new version" }),
    ).toBeDisabled();
    await selected
      .getByLabel("Lesson text", { exact: true })
      .fill(
        "A reviewed fixture explanation. Follow each assignment in order and record its current value before continuing.",
      );
    await selected.getByRole("button", { name: "Save draft changes" }).click();
    await expect(
      selected.getByRole("heading", { name: "Lesson revision 2", exact: true }),
    ).toBeVisible();
    await selected
      .getByLabel("Review outcome")
      .fill(
        "Reviewed the saved objectives, code example, two questions and their private grading keys.",
      );
    await selected.getByLabel(/I checked the saved lesson/).check();
    await selected.getByRole("button", { name: "Record review" }).click();
    await expect(
      selected.getByRole("button", { name: "Publish new version" }),
    ).toBeEnabled();
    await selected
      .getByLabel("Publish this reviewed revision as a new course version.")
      .check();
    await selected.getByRole("button", { name: "Publish new version" }).click();
    await expect(selected.getByText(/Published as course-/)).toBeVisible();
    const draft = (
      await admin
        .from("content_drafts")
        .select("*")
        .eq("source_course", course)
        .single()
    ).data!;
    expect((await learner.from("content_drafts").select("*")).data).toEqual([]);
    expect(
      (await learner.rpc("content_review_material", { draft: draft.id })).error,
    ).not.toBeNull();
    expect(
      (
        await admin
          .from("lessons")
          .select("*")
          .eq("course_id", draft.published_course)
      ).data![0].body,
    ).toContain("A reviewed fixture explanation");
    expect(
      (await admin.from("lessons").select("*").eq("id", lesson)).data![0].body,
    ).not.toContain("A reviewed fixture explanation");
    await staffPage
      .getByLabel("Report status")
      .first()
      .selectOption("resolved");
    await staffPage
      .getByLabel("Update for the learner")
      .first()
      .fill(
        "Checked the saved version and recorded a clarification for editorial review.",
      );
    await staffPage
      .getByRole("button", { name: "Update report" })
      .first()
      .click();
    await expect(
      staffPage.getByText("resolved · COURSE V2", { exact: true }),
    ).toBeVisible();
    await page.goto("/reports");
    await expect(
      page.getByText(/Staff update: Checked the saved version/),
    ).toBeVisible();
    await mkdir("../docs/verification/phase5-editorial", { recursive: true });
    for (const [name, p] of [
      ["reports", page],
      ["admin", staffPage],
    ] as const) {
      await p.reload();
      await p.keyboard.press("Tab");
      await expect(
        p.getByRole("link", { name: "Skip to content" }),
      ).toBeFocused();
      await p.keyboard.press("Enter");
      await expect(p.locator("main")).toBeFocused();
      await p.emulateMedia({ reducedMotion: "reduce" });
      expect(
        await p.evaluate(
          () => getComputedStyle(document.documentElement).scrollBehavior,
        ),
      ).toBe("auto");
      for (const width of [320, 768, 1440]) {
        await p.setViewportSize({ width, height: 900 });
        expect(
          await p.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        expect(
          (await new AxeBuilder({ page: p }).analyze()).violations,
        ).toEqual([]);
        await p.screenshot({
          path: `../docs/verification/phase5-editorial/${name}-${width}.png`,
          fullPage: true,
        });
      }
    }
    expect(
      (await admin.from("staff_roles").delete().eq("user_id", users[1])).error,
    ).toBeNull();
    await staffPage.reload();
    await expect(
      staffPage.getByText("This page could not be found."),
    ).toBeVisible();
  } finally {
    await staffContext.close();
    await learner.auth.signOut();
    // Remove only this run's synthetic catalogue and reports, including private keys.
    const owned = users.map((u) => `'${u}'`).join(",") || "null";
    localSql(`delete from public.report_audit where report_id in (select id from public.content_reports where user_id in (${owned}));
delete from public.content_reports where user_id in (${owned});
delete from public.content_audit where draft_id in (select id from public.content_drafts where source_course='${course}');
delete from public.content_drafts where source_course='${course}';
delete from public.project_versions where course_id in (select id from public.course_versions where id='${course}' or supersedes_id='${course}');
delete from learning_private.answer_keys where exercise_id in (select e.id from public.exercises e join public.lessons l on l.id=e.lesson_id join public.course_versions c on c.id=l.course_id where c.id='${course}' or c.supersedes_id='${course}');
delete from public.exercises where lesson_id in (select l.id from public.lessons l join public.course_versions c on c.id=l.course_id where c.id='${course}' or c.supersedes_id='${course}');
delete from public.lessons where course_id in (select id from public.course_versions where id='${course}' or supersedes_id='${course}');
delete from public.course_versions where supersedes_id='${course}';delete from public.course_versions where id='${course}';`);
    for (const uid of users) await admin.auth.admin.deleteUser(uid);
  }
});
