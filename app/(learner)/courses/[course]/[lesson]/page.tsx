import Link from "next/link";
import { notFound } from "next/navigation";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { learningData, unlocked, passed } from "@/modules/learning/data";
import { ExerciseForm, ReadForm } from "@/components/learning/forms";
export default async function Lesson({
  params,
}: {
  params: Promise<{ course: string; lesson: string }>;
}) {
  const { course, lesson } = await params,
    data = await learningData();
  const item = data.lessons.find(
    (l) => l.id === lesson && l.course_id === course,
  );
  if (!item) notFound();
  const list = data.lessons.filter((l) => l.course_id === course);
  if (!unlocked(data, item))
    return (
      <>
        <h1>One step at a time.</h1>
        <p>
          Enrol in this course and pass the earlier practice checks to unlock
          this lesson.
        </p>
        <Link className="button button-primary" href="/courses">
          Return to courses
        </Link>
      </>
    );
  const exercise = data.exercises.find(
    (e) => e.lesson_id === lesson && e.kind === "practice",
  );
  const options = exercise
    ? z
        .array(z.object({ id: z.string(), label: z.string() }))
        .parse(exercise.options)
    : [];
  return (
    <>
      <Link href="/courses">← All courses</Link>
      <nav className="lesson-navigation" aria-label="Course lessons">
        {list.map((l) => (
          <Link
            key={l.id}
            aria-current={l.id === lesson ? "page" : undefined}
            href={`/courses/${course}/${l.id}`}
          >
            {l.position}. {l.title}
            {passed(data, l.id) ? " ✓" : !unlocked(data, l) ? " · Locked" : ""}
          </Link>
        ))}
      </nav>
      <div className="lesson-grid">
        <article>
          <p className="eyebrow">
            LESSON {item.position} · {item.minutes} MINUTES
          </p>
          <h1>{item.title}</h1>
          <p className="lesson-objective">{item.objective}</p>
          {item.body.split("\n\n").map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          <pre tabIndex={0} aria-label="JavaScript example">
            <code>{item.example}</code>
          </pre>
          {data.reads.some((r) => r.lesson_id === lesson) ? (
            <p>Reading saved ✓</p>
          ) : (
            <ReadForm lesson={lesson} />
          )}
          <p>
            Read status is separate from passing practice; neither proves broad
            mastery.
          </p>
        </article>
        <aside className="practice-panel" aria-label="Practice">
          <p className="eyebrow">PUT IT INTO PRACTICE</p>
          <h2>Check your understanding.</h2>
          {exercise && (
            <ExerciseForm
              key={exercise.id}
              exercise={exercise.id}
              prompt={exercise.prompt}
              options={options}
              request={randomUUID()}
            />
          )}
          <details>
            <summary>About the tutor</summary>
            <p>
              The AI tutor arrives in Phase 4. For now, use the example and
              feedback to guide your next attempt.
            </p>
          </details>
          <h3>Recent attempts</h3>
          <p>
            Showing up to five from your latest 50 attempts. Saved progress
            includes all attempts.
          </p>
          {data.attempts
            .filter((a) => a.exercise_id === exercise?.id)
            .slice(0, 5)
            .map((a) => (
              <p key={a.id}>
                {a.correct ? "Passed" : "Needs practice"} ·{" "}
                <time dateTime={a.created_at}>
                  {new Intl.DateTimeFormat(data.profile.locale, {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: data.profile.timezone,
                  }).format(new Date(a.created_at))}
                </time>
              </p>
            ))}
          {!data.attempts.some((a) => a.exercise_id === exercise?.id) && (
            <p>
              No attempts in your recent history. Your next check will appear
              here.
            </p>
          )}
        </aside>
      </div>
    </>
  );
}
