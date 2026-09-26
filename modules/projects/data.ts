import "server-only";
import { requireProfile } from "@/lib/auth/session";
import { redirect } from "next/navigation";
export async function projectData() {
  const { client, user, profile } = await requireProfile("/projects");
  if (!profile.onboarding_completed_at) redirect("/onboarding");
  const [projects, submissions] = await Promise.all([
    client.from("project_versions").select("*").order("title"),
    client
      .from("project_submissions")
      .select("*")
      .eq("user_id", user.id)
      .order("revision", { ascending: false }),
  ]);
  if (projects.error || submissions.error)
    throw new Error("Projects could not be loaded. Please retry.");
  return { projects: projects.data!, submissions: submissions.data!, profile };
}
