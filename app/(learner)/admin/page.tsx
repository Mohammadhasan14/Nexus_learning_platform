import Link from "next/link";
import { randomUUID } from "node:crypto";
import { staffData } from "@/modules/admin/data";
import {
  draftContentSchema,
  reviewMaterialSchema,
} from "@/modules/admin/schema";
import { reportSnapshotSchema } from "@/modules/reports/schema";
import { StaffForm, DraftEditor } from "@/components/admin/forms";
export const metadata = { title: "Editorial workspace — Nexus Learning" };
export default async function Admin({
  searchParams,
}: {
  searchParams: Promise<{ draft?: string }>;
}) {
  const query = await searchParams;
  const data = await staffData();
  const draft = data.drafts.find((d) => d.id === query.draft) ?? data.drafts[0];
  const sources = data.courses.filter(
    (c) =>
      c.review_status === "reviewed" &&
      !data.courses.some((n) => n.supersedes_id === c.id),
  );
  const material = draft
    ? await data.client.rpc("content_review_material", { draft: draft.id })
    : undefined;
  if (material?.error) throw new Error("Review material could not be loaded.");
  return (
    <>
      <p className="eyebrow">TRUSTED STAFF</p>
      <h1>Editorial workspace.</h1>
      <p>
        Revise lesson text, inspect the copied questions and keys, record your
        editorial review, then publish a new version. Existing enrolments and
        attempts stay with their original version. Scripted tutor guidance is
        not automatically extended to new versions.
      </p>
      <section className="card project-card">
        <h2>Create a lesson revision</h2>
        <StaffForm operation="create" id={randomUUID()}>
          <div className="field">
            <label htmlFor="draft-source">Reviewed source course</label>
            <select id="draft-source" name="source" required>
              {sources.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} · v{c.version}
                </option>
              ))}
            </select>
          </div>
          <button className="button button-primary" disabled={!sources.length}>
            Create draft
          </button>
        </StaffForm>
      </section>
      <nav aria-label="Content drafts" className="lesson-navigation">
        {data.drafts.map((d) => (
          <Link
            key={d.id}
            href={`/admin?draft=${d.id}`}
            aria-current={d.id === draft?.id ? "page" : undefined}
          >
            Draft {d.id.slice(0, 8)} ·{" "}
            {d.published_course ? "Published" : `revision ${d.revision}`}
          </Link>
        ))}
      </nav>
      {draft && (
        <section className="card project-card" aria-label="Selected draft">
          <h2>Lesson revision {draft.revision}</h2>
          <p>
            Source: {draft.source_course}. Questions, answer keys and project
            rubric are copied without changes; edits here change lesson text
            only.
          </p>
          {draft.published_course ? (
            <p>
              Published as {draft.published_course}. Create a new draft for
              further changes.
            </p>
          ) : (
            <DraftEditor
              key={`${draft.id}-${draft.revision}`}
              id={draft.id}
              revision={draft.revision}
              initial={draftContentSchema.parse(draft.content)}
            />
          )}
          <h3>Questions and grading material</h3>
          <p>
            Staff-only review material. Verify every copied key and explanation
            still agrees with the revised lessons.
          </p>
          {reviewMaterialSchema.parse(material?.data ?? []).map((q, i) => (
            <details className="project-revision" key={i}>
              <summary>
                {q.lesson} · {q.kind}
              </summary>
              <p>{q.prompt}</p>
              <ul>
                {q.options.map((o) => (
                  <li key={o.id}>
                    {o.id}: {o.label}
                  </li>
                ))}
              </ul>
              <p>Answer key: {q.answer}</p>
              <p>Hint: {q.hint}</p>
              <p>Explanation: {q.explanation}</p>
            </details>
          ))}
          {!draft.published_course && (
            <>
              <h3>Record editorial review</h3>
              <p>
                {draft.reviewed_revision === draft.revision
                  ? "This saved revision is reviewed."
                  : "Review is required for this saved revision."}{" "}
                Save any text changes before reviewing.
              </p>
              <StaffForm
                key={`review-${draft.id}-${draft.revision}`}
                operation="review"
                id={draft.id}
                expected={draft.revision}
              >
                <div className="field">
                  <label htmlFor="review-note">Review outcome</label>
                  <textarea
                    id="review-note"
                    name="note"
                    required
                    minLength={20}
                    maxLength={2000}
                    rows={3}
                  />
                </div>
                <label>
                  <input
                    type="checkbox"
                    name="confirmed"
                    value="yes"
                    required
                  />{" "}
                  I checked the saved lesson objectives, examples, questions and
                  grading material.
                </label>
                <button className="button button-secondary">
                  Record review
                </button>
              </StaffForm>
              <h3>Publish reviewed version</h3>
              <p>
                Editing invalidates review. Publishing creates new course,
                lesson, exercise and associated project versions; previous
                records remain intact.
              </p>
              <StaffForm
                operation="publish"
                id={draft.id}
                expected={draft.revision}
              >
                <label>
                  <input
                    type="checkbox"
                    name="confirmed"
                    value="yes"
                    required
                    disabled={draft.reviewed_revision !== draft.revision}
                  />{" "}
                  Publish this reviewed revision as a new course version.
                </label>
                <button
                  className="button button-primary"
                  disabled={draft.reviewed_revision !== draft.revision}
                >
                  Publish new version
                </button>
              </StaffForm>
            </>
          )}
        </section>
      )}
      <section aria-label="Report triage">
        <h2>Learner reports</h2>
        <p>
          Latest 100 reports. Your update will be visible to the reporter; keep
          it focused on the content issue.
        </p>
        {!data.reports.length && <p>No reports yet.</p>}
        {data.reports.map((report) => {
          const s = reportSnapshotSchema.parse(report.snapshot);
          return (
            <section className="card project-card" key={report.id}>
              <p className="eyebrow">
                {report.status} · COURSE V{s.course_version}
              </p>
              <h3>
                {s.title} · {s.response ? "Tutor response" : "Lesson"}
              </h3>
              <p>{report.message}</p>
              <details>
                <summary>Original content snapshot</summary>
                <p>{s.objective}</p>
                <p className="preserve-text">{s.body}</p>
                <pre>
                  <code>{s.example}</code>
                </pre>
                {s.response && (
                  <>
                    <p>{s.response.text}</p>
                    <small>{s.response.adapter}</small>
                  </>
                )}
              </details>
              <StaffForm
                key={`${report.id}-${report.revision}`}
                operation="triage"
                id={report.id}
                expected={report.revision}
              >
                <div className="field">
                  <label htmlFor={`status-${report.id}`}>Report status</label>
                  <select
                    id={`status-${report.id}`}
                    name="status"
                    defaultValue={report.status}
                  >
                    <option value="open">Open</option>
                    <option value="reviewing">Reviewing</option>
                    <option value="resolved">Resolved</option>
                    <option value="dismissed">Dismissed</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor={`note-${report.id}`}>
                    Update for the learner
                  </label>
                  <textarea
                    id={`note-${report.id}`}
                    name="note"
                    minLength={10}
                    maxLength={2000}
                    required
                    defaultValue={report.staff_note}
                  />
                </div>
                <button className="button button-secondary">
                  Update report
                </button>
              </StaffForm>
            </section>
          );
        })}
      </section>
      <section>
        <h2>Editorial audit</h2>
        <p>Latest 50 events. Full records remain in the database.</p>
        {data.audit.map((event) => (
          <details className="project-revision" key={event.id}>
            <summary>
              {event.action} · {event.created_at}
            </summary>
            <p>Actor: {event.actor ?? "Deleted staff account"}</p>
            <h3>Before</h3>
            <pre>{JSON.stringify(event.before_state, null, 2)}</pre>
            <h3>After</h3>
            <pre>{JSON.stringify(event.after_state, null, 2)}</pre>
          </details>
        ))}
      </section>
    </>
  );
}
