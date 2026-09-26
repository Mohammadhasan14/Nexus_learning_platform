"use server";
import { requireUser } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { workSchema } from "./schema";
export type ProjectState = {
  message?: string;
  success?: boolean;
  request?: string;
};
export async function submitProject(
  _state: ProjectState,
  form: FormData,
): Promise<ProjectState> {
  const { client } = await requireUser("/projects");
  const parsed = z
    .object({
      project: z.string().max(100),
      request: z.string().uuid(),
      base: z.coerce.number().int().min(0),
      work: workSchema,
    })
    .safeParse({
      project: form.get("project"),
      request: form.get("request"),
      base: form.get("base"),
      work: {
        values: form.get("values"),
        conditions: form.get("conditions"),
        functions: form.get("functions"),
      },
    });
  if (!parsed.success)
    return {
      message: "Keep each milestone within 4,000 characters and try again.",
    };
  const { data, error } = await client.rpc("submit_project", parsed.data);
  if (error)
    return {
      message:
        error.code === "40001"
          ? "A newer revision exists. Copy your unsaved text, then reload to review it before saving again."
          : "Could not save. Check your course access and connection, and include at least one milestone. Your text is kept.",
    };
  const result = z.object({ revision: z.number() }).safeParse(data);
  if (!result.success)
    return {
      message:
        "The save response could not be read. Retry safely with the same text.",
    };
  revalidatePath("/projects");
  revalidatePath("/dashboard");
  return {
    success: true,
    request: parsed.data.request,
    message: `Revision ${result.data.revision} saved. Completeness feedback is available below; it is not a grade.`,
  };
}
