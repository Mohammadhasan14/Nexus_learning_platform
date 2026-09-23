import "server-only";
import { requireProfile } from "@/lib/auth/session";
import { redirect } from "next/navigation";
export async function learningData() {
  const { client, user, profile } = await requireProfile("/courses");
  if (!profile.onboarding_completed_at) redirect("/onboarding");
  const results = await Promise.all([
    client.from("course_versions").select("*").order("title"),
    client.from("lessons").select("*").order("position"),
    client.from("exercises").select("*"),
    client.from("enrolments").select("*").eq("user_id", user.id),
    client.from("lesson_reads").select("*").eq("user_id", user.id),
    client
      .from("attempts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
    client.from("exercise_evidence").select("*").eq("user_id", user.id),
  ]);
  if (results.some((r) => r.error))
    throw new Error("Learning data could not be loaded. Please retry.");
  const [courses, lessons, exercises, enrolments, reads, attempts, evidence] =
    results;
  return {
    profile,
    courses: courses.data!,
    lessons: lessons.data!,
    exercises: exercises.data!,
    enrolments: enrolments.data!,
    reads: reads.data!,
    attempts: attempts.data!,
    evidence: evidence.data!,
  };
}
export type LearningData = Awaited<ReturnType<typeof learningData>>;
export { passed, unlocked } from "./rules";
