"use server";
import { requireUser } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { z } from "zod";
export type ReportState = { message?: string; success?: boolean };
export async function sendReport(
  _state: ReportState,
  form: FormData,
): Promise<ReportState> {
  const { client } = await requireUser("/reports");
  const parsed = z
    .object({
      lesson: z.string().min(1).max(100),
      message: z.string().trim().min(10).max(2000),
      request: z.string().uuid(),
      tutor_request: z.string().uuid().optional(),
    })
    .safeParse({
      lesson: form.get("lesson"),
      message: form.get("message"),
      request: form.get("request"),
      tutor_request: form.get("tutor_request") || undefined,
    });
  if (!parsed.success)
    return { message: "Describe the issue in 10–2,000 characters." };
  const { error } = await client.rpc("report_content", parsed.data);
  if (error)
    return {
      message:
        "Could not send the report. Check lesson access and your connection, or try tomorrow if you have sent ten reports today. Your text is kept.",
    };
  revalidatePath("/reports");
  return {
    success: true,
    message:
      "Report saved with its content version. Track updates in My reports.",
  };
}
