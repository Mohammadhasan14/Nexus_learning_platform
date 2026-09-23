"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { z } from "zod";
export type LearningState = {
  message?: string;
  success?: boolean;
  correct?: boolean;
  request?: string;
};
const id = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9-]+$/);
export async function enrol(
  _state: LearningState,
  form: FormData,
): Promise<LearningState> {
  const { client } = await requireUser("/courses");
  const course = id.safeParse(form.get("course"));
  if (!course.success) return { message: "Choose an available course." };
  const { error } = await client.rpc("enrol_course", { course: course.data });
  if (error)
    return { message: "Could not enrol. Complete onboarding and try again." };
  revalidatePath("/courses");
  revalidatePath("/dashboard");
  return {
    success: true,
    message: "Enrolled. Your place is saved in this version.",
  };
}
export async function markRead(
  _state: LearningState,
  form: FormData,
): Promise<LearningState> {
  const { client } = await requireUser("/courses");
  const lesson = id.safeParse(form.get("lesson"));
  if (!lesson.success) return { message: "Choose an available lesson." };
  const { error } = await client.rpc("mark_lesson_read", {
    lesson: lesson.data,
  });
  if (error)
    return {
      message:
        "Could not save. Check enrolment and prerequisite practice, then retry.",
    };
  revalidatePath("/courses", "layout");
  return {
    success: true,
    message: "Reading saved. Practice evidence is tracked separately.",
  };
}
export async function submit(
  _state: LearningState,
  form: FormData,
): Promise<LearningState> {
  const { client } = await requireUser("/courses");
  const parsed = z
    .object({ exercise: id, submitted: id, request: z.string().uuid() })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return { message: "Choose an answer before submitting." };
  const { data, error } = await client.rpc("submit_attempt", parsed.data);
  if (error)
    return {
      message:
        "Could not save your answer. Check your connection and prerequisites, then retry. Your selection is kept.",
    };
  const result = z
    .object({
      id: z.string().uuid(),
      correct: z.boolean(),
      feedback: z.string(),
    })
    .safeParse(data);
  if (!result.success)
    return {
      message: "The result could not be read. Retry the same answer safely.",
    };
  revalidatePath("/courses", "layout");
  revalidatePath("/dashboard");
  return {
    success: true,
    correct: result.data.correct,
    message: result.data.feedback,
    request: parsed.data.request,
  };
}
