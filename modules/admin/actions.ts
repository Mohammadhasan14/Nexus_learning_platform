"use server";
import { requireUser } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { draftContentSchema } from "./schema";
export type StaffState = { message?: string; success?: boolean };
export async function staffAction(
  _state: StaffState,
  form: FormData,
): Promise<StaffState> {
  const { client } = await requireUser("/admin");
  const { data: staff, error: roleError } =
    await client.rpc("is_content_staff");
  if (roleError || !staff) return { message: "Staff access is required." };
  const operation = z
    .enum(["create", "save", "review", "publish", "triage"])
    .safeParse(form.get("operation"));
  const id = z.string().uuid().safeParse(form.get("id"));
  const expected = z.coerce
    .number()
    .int()
    .min(1)
    .safeParse(form.get("expected"));
  if (!operation.success || !id.success)
    return { message: "Reload the staff workspace and try again." };
  let result;
  if (operation.data === "create") {
    const source = z.string().min(1).max(100).safeParse(form.get("source"));
    if (!source.success) return { message: "Choose a reviewed course." };
    result = await client.rpc("create_content_draft", {
      source: source.data,
      request: id.data,
    });
  } else {
    if (!expected.success)
      return { message: "Reload to load the current revision." };
    if (operation.data === "save") {
      let raw: unknown;
      try {
        raw = JSON.parse(String(form.get("content")));
      } catch {
        return { message: "Draft text could not be read. Your text is kept." };
      }
      const content = draftContentSchema.safeParse(raw);
      if (!content.success)
        return {
          message: "Complete every lesson field within its character limit.",
        };
      result = await client.rpc("save_content_draft", {
        draft: id.data,
        expected: expected.data,
        content: content.data,
      });
    } else if (operation.data === "review") {
      const note = z
        .string()
        .trim()
        .min(20)
        .max(2000)
        .safeParse(form.get("note"));
      if (!note.success || form.get("confirmed") !== "yes")
        return {
          message:
            "Inspect the lesson text and all copied questions/keys, confirm the review and record its outcome.",
        };
      result = await client.rpc("review_content_draft", {
        draft: id.data,
        expected: expected.data,
        note: note.data,
      });
    } else if (operation.data === "publish") {
      if (form.get("confirmed") !== "yes")
        return { message: "Confirm publishing a new version." };
      result = await client.rpc("publish_content_draft", {
        draft: id.data,
        expected: expected.data,
      });
    } else {
      const status = z
        .enum(["open", "reviewing", "resolved", "dismissed"])
        .safeParse(form.get("status"));
      const note = z
        .string()
        .trim()
        .min(10)
        .max(2000)
        .safeParse(form.get("note"));
      if (!status.success || !note.success)
        return {
          message:
            "Choose a status and write an update of 10–2,000 characters.",
        };
      result = await client.rpc("triage_content_report", {
        report: id.data,
        expected: expected.data,
        status: status.data,
        note: note.data,
      });
    }
  }
  if (result.error)
    return {
      message:
        result.error.code === "40001"
          ? "This record changed. Copy unsaved text and reload before trying again."
          : "Could not complete the action. Check your staff access, revision and review status; a published successor cannot be replaced. Your text is kept.",
    };
  revalidatePath("/admin");
  revalidatePath("/reports");
  revalidatePath("/courses", "layout");
  revalidatePath("/projects");
  return {
    success: true,
    message:
      operation.data === "publish"
        ? "New course version published. Existing learner evidence is unchanged."
        : operation.data === "review"
          ? "Editorial review recorded for this revision."
          : operation.data === "triage"
            ? "Report updated. The learner can read your note."
            : operation.data === "save"
              ? "Draft saved. Review is required again before publishing."
              : "Draft created. Open it below to edit and review.",
  };
}
