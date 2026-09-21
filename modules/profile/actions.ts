"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import type { ActionState } from "@/lib/auth/validation";
import { profileSchema } from "./validation";

export async function savePreferences(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { client, user } = await requireUser("/settings");
  const values: Record<string, string> = {};
  for (const key of [
    "display_name",
    "goal",
    "daily_minutes",
    "locale",
    "timezone",
  ])
    values[key] =
      typeof form.get(key) === "string"
        ? String(form.get(key)).slice(0, 1000)
        : "";
  const parsed = profileSchema.safeParse(values);
  if (!parsed.success)
    return {
      errors: parsed.error.flatten().fieldErrors,
      values,
      message:
        "Check the highlighted fields. Your preferences haven’t been saved.",
    };
  try {
    const { data, error } = await client
      .from("profiles")
      .update(parsed.data)
      .eq("user_id", user.id)
      .select("user_id")
      .single();
    if (error || !data)
      return {
        values,
        message:
          "We couldn’t save your preferences. Your entries are still here; please try again.",
      };
  } catch {
    return {
      values,
      message:
        "The connection was interrupted. Your entries are still here; please try again.",
    };
  }
  revalidatePath("/dashboard");
  revalidatePath("/settings");
  if (form.get("intent") === "onboarding") redirect("/dashboard");
  return {
    values,
    success: true,
    message: "Your learning preferences are saved.",
  };
}
