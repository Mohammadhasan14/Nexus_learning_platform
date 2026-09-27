import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { reportSnapshotSchema } from "@/modules/reports/schema";
export const metadata = { title: "My reports — Nexus Learning" };
export default async function Reports() {
  const { client, user } = await requireUser("/reports");
  const { data, error } = await client
    .from("content_reports")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error("Reports could not be loaded. Please retry.");
  return (
    <>
      <p className="eyebrow">HELP IMPROVE THE LESSONS</p>
      <h1>My reports.</h1>
      <p>
        Report an issue from a lesson or a scripted tutor response. The original
        content version is kept with your description. Showing your latest 100
        reports.
      </p>
      {!data?.length ? (
        <div className="empty-state">
          <h2>No reports yet.</h2>
          <Link className="button button-secondary" href="/courses">
            Open courses
          </Link>
        </div>
      ) : (
        <div className="review-list">
          {data.map((report) => {
            const snapshot = reportSnapshotSchema.parse(report.snapshot);
            return (
              <section className="card review-card" key={report.id}>
                <p className="eyebrow">{report.status}</p>
                <h2>{snapshot.title}</h2>
                <p>
                  Course version {snapshot.course_version} ·{" "}
                  {snapshot.response ? "Tutor response" : "Lesson"}
                </p>
                <p>{report.message}</p>
                {report.staff_note && <p>Staff update: {report.staff_note}</p>}
                <details>
                  <summary>Content saved with this report</summary>
                  <p>{snapshot.objective}</p>
                  <p className="preserve-text">{snapshot.body}</p>
                  <pre>
                    <code>{snapshot.example}</code>
                  </pre>
                  {snapshot.response && (
                    <>
                      <h3>Scripted response</h3>
                      <p>{snapshot.response.text}</p>
                      <small>{snapshot.response.adapter}</small>
                    </>
                  )}
                </details>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
