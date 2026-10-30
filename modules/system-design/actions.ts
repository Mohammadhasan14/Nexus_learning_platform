"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { serverClient } from "@/lib/supabase/server";
import { accountsAvailable } from "@/lib/supabase/config";
import { estimate, type Estimates } from "./estimation";
import {
  identitySchema,
  savedWorksheetSchema,
  studioCourse,
  scenarioId,
  worksheetSchema,
  type SavedWorksheet,
} from "./schema";

export type StudioResult = {
  status: "saved" | "loaded" | "error" | "conflict" | "session";
  message: string;
  saved?: SavedWorksheet;
  estimates?: Estimates;
};
const saveInput = z
  .object({
    identity: identitySchema,
    expected: z.number().int().min(0).max(1000),
    request: z.string().uuid(),
    worksheet: worksheetSchema,
  })
  .strict();
// sessionOwner only guards an account switch; SQL ownership always derives from verified auth.uid().
async function session(sessionOwner: string) {
  if (!accountsAvailable()) return null;
  const client = await serverClient();
  const { data, error } = await client.auth.getUser();
  return error || !data.user || data.user.id !== sessionOwner ? null : client;
}
const expired: StudioResult = {
  status: "session",
  message:
    "Your session expired or the signed-in account changed. Your inputs are kept. Sign in with the original account in another tab, then retry here.",
};
export async function saveWorksheet(
  sessionOwner: string,
  input: unknown,
): Promise<StudioResult> {
  const parsed = saveInput.safeParse(input);
  if (!parsed.success)
    return {
      status: "error",
      message:
        "Check the worksheet fields and supported version. Your inputs are kept.",
    };
  try {
    const client = await session(sessionOwner);
    if (!client) return expired;
    const p = parsed.data;
    estimate(p.worksheet.workload, p.identity.formula);
    const { data, error } = await client.rpc("save_studio_worksheet", {
      scenario: p.identity.scenario,
      expected: p.expected,
      request: p.request,
      document: p.worksheet,
    });
    if (error)
      return {
        status: error.code === "40001" ? "conflict" : "error",
        message:
          error.code === "40001"
            ? "A newer worksheet revision exists. Your draft is kept. Review the saved version before choosing how to continue."
            : error.code === "54000"
              ? "The revision limit was reached. Your draft is kept; download your saved work from Preferences."
              : "Could not confirm the save. Your inputs are kept. Retry unchanged to check the same save safely.",
      };
    const saved = savedWorksheetSchema.safeParse(data);
    if (!saved.success)
      return {
        status: "error",
        message:
          "The save response could not be read. Retry unchanged to check the save safely.",
      };
    const estimates = estimate(
      saved.data.worksheet.workload,
      saved.data.identity.formula,
    );
    revalidatePath("/courses");
    revalidatePath("/dashboard");
    return {
      status: "saved",
      message: `Revision ${saved.data.revision} saved. This records work, not a grade or course completion.`,
      saved: saved.data,
      estimates,
    };
  } catch {
    return {
      status: "error",
      message:
        "Could not confirm the save. Your inputs are kept. Retry unchanged safely.",
    };
  }
}
export async function loadSavedWorksheet(
  sessionOwner: string,
): Promise<StudioResult> {
  try {
    const client = await session(sessionOwner);
    if (!client) return expired;
    const { data, error } = await client.rpc("get_studio_workshop", {
      course: studioCourse,
      scenario: scenarioId,
    });
    if (
      error ||
      !data ||
      typeof data !== "object" ||
      Array.isArray(data) ||
      data.enrolled !== true
    )
      return {
        status: "error",
        message:
          "Could not load the saved worksheet. Your draft is kept; check your access and retry.",
      };
    const saved = savedWorksheetSchema.safeParse(data.saved);
    if (!saved.success)
      return {
        status: "error",
        message:
          "No supported saved revision could be loaded. Your draft is kept.",
      };
    return {
      status: "loaded",
      message: `Saved revision ${saved.data.revision} loaded for comparison. Your draft has not changed.`,
      saved: saved.data,
      estimates: estimate(
        saved.data.worksheet.workload,
        saved.data.identity.formula,
      ),
    };
  } catch {
    return {
      status: "error",
      message: "Could not load the saved worksheet. Your draft is kept; retry.",
    };
  }
}
