/** Synthetic UI states only. No application imports, grading authority or real backend. */
import { randomUUID } from "node:crypto";
const course = {
  id: "javascript-foundations-v2",
  title: "Accessibility fixture course",
  summary: "Synthetic reviewed content for UI verification.",
  version: 2,
  review_status: "reviewed",
  supersedes_id: null,
};
const lessons = [
  {
    id: "js-v2-values",
    course_id: course.id,
    position: 1,
    title: "Fixture values",
    objective: "Trace the current value.",
    body: "Read the assignment, then trace the value.",
    example: "const minutes = 10;\nconsole.log(minutes + 5);",
    minutes: 5,
  },
  {
    id: "js-v2-functions",
    course_id: course.id,
    position: 2,
    title: "Fixture functions",
    objective: "Trace a returned value.",
    body: "A function can return a value.",
    example: "function double(n) { return n * 2; }",
    minutes: 5,
  },
];
const exercises = lessons.flatMap((l) =>
  ["practice", "diagnostic"].map((kind) => ({
    id: `${l.id}-${kind}`,
    lesson_id: l.id,
    kind,
    prompt: `Which value is produced in ${l.title}?`,
    options: [
      { id: "a", label: "15" },
      { id: "b", label: "10" },
    ],
  })),
);
const rubric = [
  {
    id: "values",
    title: "Choose your values",
    prompt: "Explain the binding and its type.",
  },
  {
    id: "conditions",
    title: "Choose an activity",
    prompt: "Explain both branches.",
  },
  {
    id: "functions",
    title: "Return a recommendation",
    prompt: "Explain the returned value.",
  },
];
const project = {
  id: "accessibility-project",
  course_id: course.id,
  title: "Fixture study planner",
  version: 1,
  brief: "Synthetic project for keyboard and feedback verification.",
  rubric,
};
const revisions = new Map<string, unknown[]>(),
  notes = new Map<string, { body: string; revision: number }>();
export function resetAccessibilityData() {
  revisions.clear();
  notes.clear();
}
export function accessibilityData(
  path: string,
  method: string,
  body: Record<string, unknown>,
  owner: string,
) {
  const stamp = new Date().toISOString();
  if (method === "GET") {
    const records: Record<string, unknown> = {
      course_versions: [course],
      lessons,
      exercises,
      enrolments: [
        { user_id: owner, course_id: course.id, enrolled_at: stamp },
      ],
      exercise_evidence: exercises.map((e) => ({
        user_id: owner,
        exercise_id: e.id,
        demonstrated: true,
        attempts: 1,
      })),
      project_versions: [project],
      project_submissions: revisions.get(owner) ?? [],
      lesson_notes: notes.has(owner) ? [notes.get(owner)] : [],
      review_schedule: [
        {
          user_id: owner,
          exercise_id: exercises[0].id,
          lesson_id: lessons[0].id,
          course_id: course.id,
          title: lessons[0].title,
          due: true,
          due_date: stamp.slice(0, 10),
          correct: true,
        },
      ],
      content_reports: [
        {
          id: "a2600000-0000-0000-0000-000000000001",
          user_id: owner,
          lesson_id: lessons[0].id,
          status: "open",
          message: "Synthetic saved issue for review.",
          staff_note: "",
          snapshot: {
            course: course.id,
            course_version: 2,
            lesson: lessons[0].id,
            title: lessons[0].title,
            objective: lessons[0].objective,
            body: lessons[0].body,
            example:
              'const label = "A deliberately long saved example to verify wrapping at narrow viewport widths without losing content or requiring a pointer.";',
            response: null,
          },
        },
      ],
      learning_outcome_summary: [
        {
          user_id: owner,
          course_id: course.id,
          initial_passed: 1,
          initial_checks: 1,
          delayed_passed: 0,
          delayed_checks: 0,
          practice_checks: 1,
        },
      ],
      learning_outcome_events: [
        {
          attempt_id: "a2600000-0000-0000-0000-000000000002",
          user_id: owner,
          course_id: course.id,
          lesson_id: lessons[0].id,
          kind: "practice",
          correct: true,
          recorded_tutor_use: false,
          prior_task_attempts: 0,
          elapsed_seconds: null,
          occurred_at: stamp,
        },
      ],
    };
    const table = path.replace("/rest/v1/", "");
    if (Object.hasOwn(records, table))
      return { status: 200, data: records[table] };
  }
  if (method === "POST") {
    if (path.endsWith("/submit_attempt"))
      return {
        status: 200,
        data: {
          id: randomUUID(),
          correct: body.submitted === "a",
          feedback: "Trace each assignment before checking the logged value.",
        },
      };
    if (path.endsWith("/submit_project")) {
      const revision = {
        id: randomUUID(),
        user_id: owner,
        project_id: project.id,
        revision: Number(body.base) + 1,
        base_revision: body.base,
        request_id: body.request,
        milestones: body.work,
        feedback: rubric.map((r) => ({
          id: r.id,
          title: r.title,
          message: "Detail recorded; compare against the rubric.",
        })),
        feedback_version: "completeness-v1",
        created_at: stamp,
      };
      revisions.set(owner, [revision, ...(revisions.get(owner) ?? [])]);
      return { status: 200, data: { revision: revision.revision } };
    }
    if (path.endsWith("/save_lesson_note")) {
      const note = {
        body: String(body.body),
        revision: Number(body.expected) + 1,
      };
      notes.set(owner, note);
      return { status: 200, data: { ...note, updated_at: stamp } };
    }
    if (path.endsWith("/report_content"))
      return { status: 200, data: randomUUID() };
    if (path.endsWith("/mark_lesson_read")) return { status: 200, data: null };
    if (path.endsWith("/use_scripted_tutor"))
      return {
        status: 200,
        data: {
          allowed: true,
          remaining: 19,
          lesson: lessons[0].id,
          course: course.id,
          title: lessons[0].title,
          reply: {
            text: "Trace the current value in order.",
            adapter: "scripted-foundations-1",
            source: {
              title: lessons[0].title,
              href: `/courses/${course.id}/${lessons[0].id}`,
            },
          },
        },
      };
    if (path.endsWith("/search_lessons"))
      return {
        status: 200,
        data: lessons
          .filter((l) =>
            l.title.toLowerCase().includes(String(body.query).toLowerCase()),
          )
          .map((l) => ({
            course_id: course.id,
            course_title: course.title,
            course_version: 2,
            lesson_id: l.id,
            title: l.title,
            objective: l.objective,
          })),
      };
  }
}
