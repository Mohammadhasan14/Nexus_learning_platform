import Link from "next/link";
import { notFound } from "next/navigation";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { learningData } from "@/modules/learning/data";
import { diagnosticEvidence, recommendation } from "@/modules/learning/rules";
import { ExerciseForm } from "@/components/learning/forms";
export const metadata = { title: "Starting check — Nexus Learning" };
export default async function Assessment({
  params,
}: {
  params: Promise<{ course: string }>;
}) {
  const { course } = await params;
  const data = await learningData();
  const item = data.courses.find((c) => c.id === course);
  if (!item) notFound();
  if (!data.enrolments.some((n) => n.course_id === course))
    return (
      <>
        <h1>Enrol before your starting check.</h1>
        <Link href="/courses">Choose a course</Link>
      </>
    );
  const lessons = data.lessons.filter((l) => l.course_id === course);
  const step = recommendation(data, course);
  return (
    <>
      <Link href="/courses">← All courses</Link>
      <p className="eyebrow">A SMALL STARTING POINT</p>
      <h1>What feels familiar?</h1>
      <p>
        Three questions about values, comparisons and return values. This is not
        a placement exam or a measure of overall JavaScript ability. You can
        skip it and begin the lessons. Retrying after feedback shows practice,
        not an independent assessment.
      </p>
      {item.review_status === "preview" && (
        <p>
          Earlier preview questions. The reviewed course is available from All
          courses.
        </p>
      )}
      {item.review_status === "reviewed" && (
        <p>
          Questions received AI-assisted editorial review. This is still a small
          learning check, not a validated placement test.
        </p>
      )}
      <section aria-label="Starting check summary" className="practice-panel">
        <h2>Your starting evidence</h2>
        <ul>
          {lessons.map((l) => {
            const evidence = diagnosticEvidence(data, l.id);
            return (
              <li key={l.id}>
                {l.title}:{" "}
                {evidence
                  ? evidence.demonstrated
                    ? "Answered correctly at least once"
                    : "Needs practice"
                  : "Not checked"}
              </li>
            );
          })}
        </ul>
        <p>{step.reason}</p>
        {step.lesson && (
          <Link
            className="button button-primary"
            href={`/courses/${course}/${step.lesson.id}`}
          >
            Continue to recommended lesson
          </Link>
        )}
      </section>
      <div className="course-grid">
        {lessons.map((l) => {
          const exercise = data.exercises.find(
            (e) => e.lesson_id === l.id && e.kind === "diagnostic",
          );
          if (!exercise) return null;
          const options = z
            .array(z.object({ id: z.string(), label: z.string() }))
            .parse(exercise.options);
          return (
            <section className="practice-panel" key={l.id}>
              <h2>{l.title}</h2>
              <ExerciseForm
                exercise={exercise.id}
                prompt={exercise.prompt}
                options={options}
                request={randomUUID()}
              />
            </section>
          );
        })}
      </div>
    </>
  );
}
