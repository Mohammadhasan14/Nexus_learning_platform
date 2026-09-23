import { recommendation } from "@/modules/learning/rules";
import Link from "next/link";
import { learningData, passed } from "@/modules/learning/data";
import { Card, Badge } from "@/components/ui";
import { EnrolForm } from "@/components/learning/forms";
export const metadata = { title: "Courses — Nexus Learning" };
export default async function Courses() {
  const data = await learningData();
  return (
    <>
      <p className="eyebrow">BUILD A FOUNDATION</p>
      <h1>Your learning paths.</h1>
      <p>Short lessons. Focused practice. Progress you can return to.</p>
      <div className="course-grid">
        {data.courses.map((c) => {
          const lessons = data.lessons.filter((l) => l.course_id === c.id),
            enrolled = data.enrolments.some((n) => n.course_id === c.id);
          const step = recommendation(data, c.id);
          const next = step.lesson;
          return (
            <Card key={c.id}>
              <Badge>
                {c.review_status === "preview"
                  ? "Editorial preview"
                  : "Reviewed course"}{" "}
                · v{c.version}
              </Badge>
              <h2>{c.title}</h2>
              <p>{c.summary}</p>
              <p>
                {lessons.length} lessons ·{" "}
                {lessons.reduce((n, l) => n + l.minutes, 0)} estimated minutes
              </p>
              {c.review_status === "preview" && (
                <p>
                  Available for local evaluation. Human editorial approval is
                  pending.
                </p>
              )}
              {enrolled && next ? (
                <Link
                  className="button button-primary"
                  href={`/courses/${c.id}/${next.id}`}
                >
                  {step.complete ? "Revisit course" : "Continue learning"}
                </Link>
              ) : (
                <EnrolForm course={c.id} />
              )}
              {enrolled && (
                <>
                  <p>{step.reason}</p>
                  <Link href={`/courses/${c.id}/assessment`}>
                    Starting check
                  </Link>
                </>
              )}
              <p>
                {
                  lessons.filter((l) =>
                    data.reads.some((r) => r.lesson_id === l.id),
                  ).length
                }{" "}
                / {lessons.length} lessons marked as read
              </p>
              <p>
                {lessons.filter((l) => passed(data, l.id)).length} /{" "}
                {lessons.length} practice checks passed
              </p>
            </Card>
          );
        })}
      </div>
      {data.courses.length === 0 && (
        <p>No courses are available yet. Please check back later.</p>
      )}
    </>
  );
}
