import "server-only";
import { requireProfile } from "@/lib/auth/session";
import { redirect } from "next/navigation";
export async function reviewData() {
  const { client, user, profile } = await requireProfile("/reviews");
  if (!profile.onboarding_completed_at) redirect("/onboarding");
  const { data, error } = await client
    .from("review_schedule")
    .select("*")
    .eq("user_id", user.id)
    .order("due_date")
    .order("lesson_id");
  if (error) throw new Error("Reviews could not be loaded. Please retry.");
  return { reviews: data!, profile };
}
