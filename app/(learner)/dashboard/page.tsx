import { projectData } from "@/modules/projects/data";
import { reviewData } from "@/modules/review/data";
import { learningData } from "@/modules/learning/data";
import { recommendation } from "@/modules/learning/rules";

import { Badge, ButtonLink, Card } from "@/components/ui";
export const metadata = { title: "Today — Nexus Learning" };
export default async function Dashboard() {
  const [data, review, projects] = await Promise.all([
    learningData(),
    reviewData(),
    projectData(),
  ]);
  const latestProject = projects.submissions[0];
  const due = review.reviews.filter((r) => r.due).length;
  const { profile } = data;
  const enrolled = data.courses.find(
    (c) => c.id === data.enrolments[0]?.course_id,
  );
  const step = enrolled ? recommendation(data, enrolled.id) : undefined;
  const today = new Intl.DateTimeFormat(profile.locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: profile.timezone,
  }).format(new Date());
  return (
    <>
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">{today}</p>
          <h1>
            Your next <span className="gradient-text">breakthrough</span>
            <br />
            starts here, {profile.display_name}.
          </h1>
          <p>Learn deeply. Build confidently. One small step at a time.</p>
        </div>
        <Badge>Preferences saved</Badge>
      </div>
      <div className="dashboard-grid">
        <Card className="next-step-card">
          <p className="eyebrow">YOUR NEXT STEP</p>
          <h2>{step?.lesson?.title ?? "Make room for your first lesson."}</h2>
          <p>
            {step?.reason ??
              "Choose a course and enrol to save your learning progress."}
          </p>
          <ButtonLink
            href={
              step?.lesson
                ? `/courses/${enrolled!.id}/${step.lesson.id}`
                : "/courses"
            }
          >
            {step?.complete
              ? "Revisit course"
              : step?.lesson
                ? "Continue learning"
                : "Open my courses"}{" "}
            <span aria-hidden="true">→</span>
          </ButtonLink>
          <small>
            Course versions keep your saved evidence separate. Review your
            practice and apply it in a project when you are ready.
          </small>
          <div className="dashboard-orbit" aria-hidden="true">
            ✦
          </div>
        </Card>
        <Card className="goal-card">
          <span className="feature-icon" aria-hidden="true">
            ◎
          </span>
          <h2>Your north star</h2>
          <p className="saved-goal">{profile.goal}</p>
          <div className="study-budget">
            <strong>
              {new Intl.NumberFormat(profile.locale).format(
                profile.daily_minutes,
              )}
            </strong>
            <span>minutes planned per day</span>
          </div>
          <ButtonLink href="/settings" secondary>
            Edit my preferences
          </ButtonLink>
        </Card>
        <Card className="dashboard-empty">
          <span className="feature-icon" aria-hidden="true">
            ↻
          </span>
          <h2>Room to remember.</h2>
          <p>
            {review.reviews.length
              ? `${due} reviews due in your timezone. Revisit a lesson to refresh its practice evidence.`
              : "No reviews scheduled yet. Your next practice attempt will schedule a reminder."}
          </p>
          <ButtonLink href="/reviews" secondary>
            Open reviews
          </ButtonLink>
        </Card>
        <Card className="dashboard-empty">
          <span className="feature-icon" aria-hidden="true">
            ◇
          </span>
          <h2>Build something real.</h2>
          <p>
            {latestProject
              ? `Your latest saved project revision is ${latestProject.revision}. Continue your milestones or revisit its completeness feedback.`
              : "Turn your course practice into a study planner. Save private milestone revisions against a versioned rubric."}
          </p>
          <ButtonLink href="/projects" secondary>
            Open projects <span aria-hidden="true">↗</span>
          </ButtonLink>
        </Card>
      </div>
      <div className="dashboard-note">
        <span aria-hidden="true">✧</span>
        <p>
          Prepared tutor guidance is available on reviewed lessons when enabled.
          Live AI remains disabled.
        </p>
      </div>
    </>
  );
}
