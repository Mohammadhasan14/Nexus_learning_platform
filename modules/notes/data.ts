import "server-only";
import { requireUser } from "@/lib/auth/session";
export async function lessonNote(lesson: string) {
  const { client, user } = await requireUser("/courses");
  const { data, error } = await client
    .from("lesson_notes")
    .select("body,revision")
    .eq("user_id", user.id)
    .eq("lesson_id", lesson)
    .maybeSingle();
  return { note: data, error: !!error };
}
