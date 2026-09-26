import Link from "next/link";
import { randomUUID } from "node:crypto";
import { projectData } from "@/modules/projects/data";
import { learningData, passed } from "@/modules/learning/data";
import {
  rubricSchema,
  feedbackSchema,
  workSchema,
} from "@/modules/projects/schema";
import { ProjectForm } from "@/components/projects/project-form";
export const metadata = { title: "Projects — Nexus Learning" };
export default async function Projects() {
  const [data, learning] = await Promise.all([projectData(), learningData()]);
  return (
    <>
      <p className="eyebrow">PUT YOUR LEARNING TO WORK</p>
      <h1>Your projects.</h1>
      <p>
        Build in small milestones. Save private revisions and compare each one
        against its rubric. Feedback checks completeness only; no AI, instructor
        grade or code execution is involved.
      </p>
      <div className="course-list">
        {data.projects.map((project) => {
          const rubric = rubricSchema.parse(project.rubric);
          const revisions = data.submissions.filter(
            (s) => s.project_id === project.id,
          );
          const latest = revisions[0];
          const unlocked =
            learning.enrolments.some(
              (n) => n.course_id === project.course_id,
            ) &&
            learning.lessons
              .filter((l) => l.course_id === project.course_id)
              .every((l) => passed(learning, l.id));
          return (
            <section className="card project-card" key={project.id}>
              <p className="eyebrow">RUBRIC VERSION {project.version}</p>
              <h2>{project.title}</h2>
              <p>{project.brief}</p>
              {!unlocked ? (
                <>
                  <p>
                    Pass all practice checks in the reviewed JavaScript v2
                    course to unlock this project.
                  </p>
                  <Link className="button button-secondary" href="/courses">
                    Continue course
                  </Link>
                </>
              ) : (
                <>
                  <h3>
                    {latest
                      ? `Continue from revision ${latest.revision}`
                      : "Start your first revision"}
                  </h3>
                  <ProjectForm
                    project={project.id}
                    base={latest?.revision ?? 0}
                    initial={
                      latest
                        ? workSchema.parse(latest.milestones)
                        : { values: "", conditions: "", functions: "" }
                    }
                    rubric={rubric}
                    request={randomUUID()}
                  />
                  <h3>Revision history</h3>
                  {!revisions.length && <p>No saved revisions yet.</p>}
                  {revisions.map((revision) => (
                    <details key={revision.id} className="project-revision">
                      <summary>
                        Revision {revision.revision} ·{" "}
                        {new Intl.DateTimeFormat(data.profile.locale, {
                          dateStyle: "medium",
                          timeStyle: "short",
                          timeZone: data.profile.timezone,
                        }).format(new Date(revision.created_at))}
                      </summary>
                      <p>
                        Completeness feedback · {revision.feedback_version} ·
                        rubric version {project.version}. More text is not proof
                        of correctness.
                      </p>
                      {feedbackSchema.parse(revision.feedback).map((f) => (
                        <div key={f.id}>
                          <h4>{f.title}</h4>
                          <p>{f.message}</p>
                          <pre
                            tabIndex={0}
                            aria-label={`Revision ${revision.revision}: ${f.title}`}
                          >
                            <code>
                              {workSchema.parse(revision.milestones)[
                                f.id as "values" | "conditions" | "functions"
                              ] || "Not included in this revision."}
                            </code>
                          </pre>
                        </div>
                      ))}
                    </details>
                  ))}
                </>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
