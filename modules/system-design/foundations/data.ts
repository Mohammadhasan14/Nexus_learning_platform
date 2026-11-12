import "server-only";
import { notFound, redirect } from "next/navigation";
import { requireRenderProfile } from "@/lib/auth/render-session";
import { foundationStateSchema } from "./schema";
export async function foundationData(course: string, lesson: string) {
  const { client, user, profile } = await requireRenderProfile("/courses");
  if (!profile.onboarding_completed_at) redirect("/onboarding");
  const { data, error } = await client.rpc("get_studio_foundation", {
    course,
    lesson,
  });
  if (error?.code === "22023") notFound();
  if (error)
    throw new Error(
      "Your foundation lesson could not be loaded. Please retry.",
    );
  if (
    data &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    data.enrolled === false
  )
    return { owner: user.id, state: null, enrolled: false as const };
  const parsed = foundationStateSchema.safeParse(data);
  return {
    owner: user.id,
    state: parsed.success ? parsed.data : null,
    enrolled: true as const,
  };
}
