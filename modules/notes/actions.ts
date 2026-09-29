"use server";
import { requireUser } from "@/lib/auth/session";
import { z } from "zod";
export type NoteState = {
  message?: string;
  revision?: number;
  success?: boolean;
};
export async function saveNote(
  _state: NoteState,
  form: FormData,
): Promise<NoteState> {
  const { client } = await requireUser("/courses");
  const parsed = z
    .object({
      lesson: z.string().min(1).max(100),
      body: z.string().max(10000),
      expected: z.coerce.number().int().min(0),
      request: z.string().uuid(),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      message: "Keep your note within 10,000 characters. Your text is kept.",
    };
  const { data, error } = await client.rpc("save_lesson_note", parsed.data);
  if (error)
    return {
      message:
        error.code === "40001"
          ? "A newer note exists. Copy your unsaved text, then reload to review the saved version before editing again."
          : "Could not save your note. Check your connection and lesson access, then retry. Your text is kept.",
    };
  const result = z
    .object({ revision: z.number().int().positive() })
    .safeParse(data);
  if (!result.success)
    return {
      message:
        "Could not read the save response. Retry with the same text to check the save safely.",
    };
  return {
    success: true,
    revision: result.data.revision,
    message: `Note saved · revision ${result.data.revision}.`,
  };
}
