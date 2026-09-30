import "server-only";
import { requireProfile } from "@/lib/auth/session";
export async function outcomeData() {
  const { client, user, profile } = await requireProfile("/outcomes");
  const [summary, events, courses, lessons] = await Promise.all([
    client
      .from("learning_outcome_summary")
      .select("*")
      .eq("user_id", user.id)
      .order("course_id"),
    client
      .from("learning_outcome_events")
      .select("*")
      .eq("user_id", user.id)
      .order("occurred_at", { ascending: false })
      .order("attempt_id")
      .limit(20),
    client.from("course_versions").select("id,title,version"),
    client.from("lessons").select("id,title"),
  ]);
  if (summary.error || events.error || courses.error || lessons.error)
    throw new Error("Your outcomes could not be loaded. Please retry.");
  return {
    summary: summary.data!,
    events: events.data!,
    courses: courses.data!,
    lessons: lessons.data!,
    profile,
  };
}
