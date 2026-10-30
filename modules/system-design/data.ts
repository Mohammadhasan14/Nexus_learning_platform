import "server-only";
import { z } from "zod";
import { requireRenderProfile } from "@/lib/auth/render-session";
import { notFound, redirect } from "next/navigation";
import { identitySchema, savedWorksheetSchema } from "./schema";
import { estimate } from "./estimation";
export const workshopResponseSchema = z
  .object({
    enrolled: z.literal(true),
    identity: identitySchema,
    saved: savedWorksheetSchema.nullable(),
  })
  .strict();
export async function workshopData(course: string, scenario: string) {
  const { client, user, profile } = await requireRenderProfile("/courses");
  if (!profile.onboarding_completed_at) redirect("/onboarding");
  const { data, error } = await client.rpc("get_studio_workshop", {
    course,
    scenario,
  });
  if (error?.code === "22023") notFound();
  if (error)
    throw new Error("Your workshop could not be loaded. Please retry.");
  if (
    data &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    data.enrolled === false
  )
    return { enrolled: false as const, user: user.id };
  const parsed = workshopResponseSchema.safeParse(data);
  if (!parsed.success)
    return {
      enrolled: true as const,
      unsupported: true as const,
      user: user.id,
    };
  if (parsed.data.saved)
    estimate(
      parsed.data.saved.worksheet.workload,
      parsed.data.saved.identity.formula,
    );
  return {
    enrolled: true as const,
    unsupported: false as const,
    user: user.id,
    saved: parsed.data.saved,
  };
}
