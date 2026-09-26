import Link from "next/link";
import { reviewData } from "@/modules/review/data";
export const metadata = { title: "Reviews — Nexus Learning" };
export default async function Reviews() {
  const { reviews, profile } = await reviewData();
  return (
    <>
      <p className="eyebrow">KEEP IT FRESH</p>
      <h1>Your review queue.</h1>
      <p>
        Based on your latest saved practice attempt: revisit tomorrow after an
        incorrect answer, or in three calendar days after a correct answer.
        Dates follow {profile.timezone}. Starting checks and reading do not
        schedule reviews.
      </p>
      <p>
        Practice again from the lesson to update its schedule. These reminders
        do not prove long-term mastery.
      </p>
      {!reviews.length ? (
        <div className="empty-state">
          <h2>No reviews yet.</h2>
          <p>Complete a practice check to schedule your first review.</p>
          <Link className="button button-primary" href="/courses">
            Open courses
          </Link>
        </div>
      ) : (
        <div className="review-list">
          {reviews.map((r) => (
            <section className="card review-card" key={r.exercise_id}>
              <p className="eyebrow">{r.due ? "DUE NOW" : "UPCOMING"}</p>
              <h2>{r.title}</h2>
              <p>
                Review date:{" "}
                <time dateTime={r.due_date ?? undefined}>{r.due_date}</time> ·{" "}
                {r.correct
                  ? "Last practice passed"
                  : "Last practice needs another try"}
              </p>
              <Link
                className="button button-secondary"
                href={`/courses/${r.course_id}/${r.lesson_id}`}
              >
                {r.due ? "Review lesson" : "Revisit early"}
              </Link>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
