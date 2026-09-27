"use server";
import { requireUser } from "@/lib/auth/session";
import { tutorInput, type TutorReply } from "./adapter";
import { z } from "zod";
import { tutorReplySchema } from "@/modules/reports/schema";
export type TutorState = {
  message?: string;
  reply?: TutorReply;
  request?: string;
  remaining?: number;
};
export async function askTutor(
  _state: TutorState,
  form: FormData,
): Promise<TutorState> {
  const { client } = await requireUser("/courses");
  const input = tutorInput.safeParse({
    lesson: form.get("lesson"),
    request: form.get("request"),
    intent: form.get("intent"),
  });
  if (!input.success)
    return { message: "Choose one of the scripted guidance options." };
  if (process.env.TUTOR_MODE !== "scripted")
    return {
      message:
        "The tutor is disabled. Continue with the lesson, example and practice feedback.",
    };
  const { data, error } = await client.rpc("use_scripted_tutor", input.data);
  if (error)
    return {
      message:
        "Guidance could not be loaded. Check your connection and lesson access, then retry. Your lesson remains available.",
    };
  const result = z
    .object({
      allowed: z.boolean(),
      remaining: z.number().optional(),
      reason: z.enum(["limit", "disabled"]).optional(),
      lesson: z.string().optional(),
      course: z.string().optional(),
      title: z.string().optional(),
      reply: tutorReplySchema.optional(),
    })
    .safeParse(data);
  if (!result.success)
    return {
      message:
        "The tutor is unavailable. Continue with the lesson and practice feedback.",
    };
  const r = result.data;
  if (!r.allowed)
    return {
      message:
        r.reason === "limit"
          ? "Today’s tutor allowance is used up. It resets at midnight UTC. Lessons and practice remain available."
          : "The tutor is disabled. Lessons and practice remain available.",
    };
  if (!r.lesson || !r.course || !r.title)
    return {
      message: "The tutor context is unavailable. Continue with the lesson.",
    };
  if (!r.reply)
    return {
      message:
        "The tutor response could not be loaded. Continue with the lesson.",
    };
  const reply = r.reply;
  return { reply, request: input.data.request, remaining: r.remaining };
}
