import Link from "next/link";
import { outcomeData } from "@/modules/outcomes/data";
export const metadata = { title: "Learning outcomes — Nexus Learning" };
function rate(passed: number, total: number) {
  return total
    ? `${passed} / ${total} passed (${Math.round((passed / total) * 100)}%)`
    : "Not enough evidence yet";
}
export default async function Outcomes() {
  const data = await outcomeData();
  return (
    <>
      <p className="eyebrow">EVIDENCE OVER STREAKS</p>
      <h1>Your learning outcomes.</h1>
      <p>
        Private evidence from server-graded checks. Only checks saved since
        outcome tracking began appear here; earlier progress stays intact. Each
        course version stays separate.
      </p>
      <section className="card review-card" aria-labelledby="measure-title">
        <h2 id="measure-title">What these measures mean</h2>
        <p>
          <strong>First checks without recorded support:</strong> the first
          practice attempt in a lesson, with no earlier lesson attempts or
          recorded tutor request. This is a proxy for independent work: outside
          help and prior exposure are unknown.
        </p>
        <p>
          <strong>Delayed checks:</strong> practice repeated at least 24 elapsed
          hours after the previous correct attempt on that exercise, with no
          recorded tutor use for the lesson. Repeating a familiar question is
          not proof of retained understanding on unseen problems.
        </p>
        <p>
          Tutor use is conservatively counted if any request was recorded for
          the lesson before saving the attempt. Diagnostics and immediate
          retries do not enter these rates. Rates count qualifying attempts, not
          unique learners or all scheduled reviews; your timezone does not
          change the 24-hour threshold.
        </p>
        <p>
          Reading, project text length, time spent and streaks are not mastery
          measures. No private notes, submitted answers, project code or tutor
          messages are copied into these events.
        </p>
      </section>
      {!data.summary.length ? (
        <div className="empty-state">
          <h2>No outcomes recorded yet.</h2>
          <p>
            Complete a practice check to begin collecting evidence. Existing
            course progress is unchanged.
          </p>
          <Link className="button button-primary" href="/courses">
            Open courses
          </Link>
        </div>
      ) : (
        <div className="review-list">
          {data.summary.map((row) => {
            const course = data.courses.find((c) => c.id === row.course_id);
            return (
              <section key={row.course_id} className="card review-card">
                <h2>
                  {course?.title ?? "Course"} · v{course?.version}
                </h2>
                <dl>
                  <dt>First checks without recorded support</dt>
                  <dd>
                    {rate(row.initial_passed ?? 0, row.initial_checks ?? 0)}
                  </dd>
                  <dt>Delayed checks after a previous pass</dt>
                  <dd>
                    {rate(row.delayed_passed ?? 0, row.delayed_checks ?? 0)}
                  </dd>
                  <dt>All recorded practice checks</dt>
                  <dd>{row.practice_checks}</dd>
                </dl>
                <Link href="/reviews">Open review queue →</Link>
              </section>
            );
          })}
        </div>
      )}
      <h2>Recent evidence</h2>
      <p>
        Latest 20 events. The measures above use all your recorded events.
        Starting checks appear here for context but are excluded from practice
        rates.
      </p>
      <ol className="review-list outcome-events">
        {data.events.map((event) => {
          const lesson = data.lessons.find((l) => l.id === event.lesson_id),
            course = data.courses.find((c) => c.id === event.course_id);
          return (
            <li className="card review-card" key={event.attempt_id}>
              <Link href={`/courses/${event.course_id}/${event.lesson_id}`}>
                {lesson?.title ?? "Lesson"} · v{course?.version}
              </Link>
              <p>
                {event.kind === "practice" ? "Practice" : "Starting check"} ·{" "}
                {event.correct ? "Passed" : "Needs practice"}
              </p>
              <p>
                {event.recorded_tutor_use
                  ? "Earlier tutor request recorded"
                  : "No earlier tutor request recorded"}{" "}
                · {event.prior_task_attempts} earlier attempts on this task
              </p>
              <p>
                {event.elapsed_seconds === null
                  ? "First recorded attempt on this task"
                  : `${Math.floor(event.elapsed_seconds / 3600)} elapsed hours since the previous attempt`}
              </p>
              <time dateTime={event.occurred_at}>
                {new Intl.DateTimeFormat(data.profile.locale, {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: data.profile.timezone,
                }).format(new Date(event.occurred_at))}
              </time>
            </li>
          );
        })}
      </ol>
    </>
  );
}
