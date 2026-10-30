import type { LearningData } from "./data";
import { studioHref } from "@/modules/system-design/links";

export function passed(data: LearningData, lesson: string) {
  return data.evidence.some(
    (a) =>
      a.demonstrated &&
      data.exercises.some(
        (e) =>
          e.id === a.exercise_id &&
          e.lesson_id === lesson &&
          e.kind === "practice",
      ),
  );
}
export function unlocked(
  data: LearningData,
  lesson: LearningData["lessons"][number],
) {
  return (
    data.enrolments.some((n) => n.course_id === lesson.course_id) &&
    data.lessons
      .filter(
        (l) => l.course_id === lesson.course_id && l.position < lesson.position,
      )
      .every((l) => passed(data, l.id))
  );
}
export function diagnosticEvidence(data: LearningData, lesson: string) {
  const exercise = data.exercises.find(
    (e) => e.lesson_id === lesson && e.kind === "diagnostic",
  );
  return data.evidence.find((e) => e.exercise_id === exercise?.id);
}
export function recommendation(data: LearningData, course: string) {
  if (data.courses.find((c) => c.id === course)?.experience_kind === "studio") {
    const href = studioHref(course);
    const revision = data.worksheets.find(
      (w) => w.scenario_id === "campus-events-v1",
    )?.revision;
    return {
      lesson: undefined,
      href,
      title: "Campus event directory",
      complete: false,
      reason: revision
        ? `Worksheet revision ${revision} saved. Continue your work; saving is not a grade or course completion.`
        : "Open the requirements and capacity workshop. Save private work without a JavaScript practice prerequisite.",
    };
  }
  const lessons = data.lessons
    .filter((l) => l.course_id === course)
    .sort((a, b) => a.position - b.position);
  if (!data.enrolments.some((n) => n.course_id === course))
    return {
      lesson: undefined,
      reason: "Enrol to save your place in this course version.",
    };
  const lesson = lessons.find((l) => !passed(data, l.id));
  if (!lesson)
    return {
      lesson: lessons[0],
      reason:
        "All practice checks passed. Revisit any lesson; these checks do not prove broad mastery.",
      complete: true,
    };
  const evidence = diagnosticEvidence(data, lesson.id);
  const reason = evidence
    ? evidence.demonstrated
      ? "You answered this topic’s starting question correctly. Confirm it in practice; starting questions do not skip prerequisites."
      : "Your starting question showed a gap in this topic. Work through the example, then retry its practice."
    : "This is your earliest lesson without a passing practice attempt. Earlier prerequisite checks are satisfied.";
  return { lesson, reason, complete: false };
}

// New learners discover current versions; an enrolled older version remains resumable.
export function visibleCourses(
  data: Pick<LearningData, "courses" | "enrolments">,
) {
  const superseded = new Set(
    data.courses.map((c) => c.supersedes_id).filter(Boolean),
  );
  return data.courses.filter(
    (c) =>
      !superseded.has(c.id) ||
      data.enrolments.some((n) => n.course_id === c.id),
  );
}
