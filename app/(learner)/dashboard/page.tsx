import { learningData } from "@/modules/learning/data";
import { recommendation } from "@/modules/learning/rules";

import { Badge, ButtonLink, Card } from "@/components/ui";
export const metadata = { title: "Today — Nexus Learning" };
export default async function Dashboard() {
  const data = await learningData();
  const { profile } = data;
  const enrolled = data.courses.find((c) =>
    data.enrolments.some((n) => n.course_id === c.id),
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
            Course content is an editorial preview. Reviews and projects arrive
            later.
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
            No reviews scheduled. Reviews will follow saved practice once
            lessons and review scheduling are available.
          </p>
          <Badge>Review scheduling · Phase 5</Badge>
        </Card>
        <Card className="dashboard-empty">
          <span className="feature-icon" aria-hidden="true">
            ◇
          </span>
          <h2>Build something real.</h2>
          <p>
            No projects started. Future projects will help you turn each new
            concept into something you can use.
          </p>
          <ButtonLink href="/#projects" secondary>
            Explore planned projects <span aria-hidden="true">↗</span>
          </ButtonLink>
        </Card>
      </div>
      <div className="dashboard-note">
        <span aria-hidden="true">✧</span>
        <p>
          Your learning space is taking shape. AI tutoring arrives in Phase 4;
          no live AI is connected here.
        </p>
      </div>
    </>
  );
}
