"use server";
import { accountsAvailable } from "@/lib/supabase/config";
import { serverClient } from "@/lib/supabase/server";
import { studioCourse } from "../schema";
import { foundationIdentity } from "./content";
import {
  foundationStateSchema,
  positionSaveSchema,
  practiceInputSchema,
  savedPositionSchema,
  practiceFeedbackSchema,
  type FoundationState,
  type SavedPosition,
  type Feedback,
  type FoundationIdentity,
  supportedIdentitySchema,
  positionMatchesIdentity,
} from "./schema";
export type FoundationResult = {
  status: "ok" | "error" | "session" | "conflict";
  message: string;
  state?: FoundationState;
  saved?: SavedPosition;
  feedback?: Feedback;
};
async function session(owner: string) {
  if (!accountsAvailable()) return null;
  const client = await serverClient();
  const { data, error } = await client.auth.getUser();
  return error || !data.user || data.user.id !== owner ? null : client;
}
const expired: FoundationResult = {
  status: "session",
  message:
    "Your session expired or the account changed. Your position and selections are kept in this tab. Sign in with the original account in another tab, then retry here.",
};
const failed: FoundationResult = {
  status: "error",
  message:
    "Could not confirm this action. Your position and selections are kept. Retry unchanged to check the same action safely.",
};
export async function saveFoundationPosition(
  owner: string,
  input: unknown,
): Promise<FoundationResult> {
  const p = positionSaveSchema.safeParse(input);
  if (!p.success)
    return {
      status: "error",
      message: "Check the supported lesson position. Your position is kept.",
    };
  try {
    const client = await session(owner);
    if (!client) return expired;
    const { identity, expected, request, position } = p.data;
    const { data, error } = await client.rpc("save_studio_foundation", {
      lesson: identity.lesson,
      content: identity.content,
      schema_id: identity.schema,
      expected,
      request,
      document: position,
    });
    if (error)
      return error.code === "40001"
        ? {
            status: "conflict",
            message:
              "Another tab saved a newer position. Your position is kept. Review it before choosing which position to save.",
          }
        : error.code === "54000"
          ? {
              status: "error",
              message:
                "The position revision limit was reached. Your current position is kept; export saved work from Preferences.",
            }
          : failed;
    const saved = savedPositionSchema.safeParse(data);
    return saved.success &&
      positionMatchesIdentity(identity, saved.data.position)
      ? {
          status: "ok",
          message: `Position saved · revision ${saved.data.revision}. This is not a grade.`,
          saved: saved.data,
        }
      : failed;
  } catch {
    return failed;
  }
}
export async function submitFoundationPractice(
  owner: string,
  input: unknown,
): Promise<FoundationResult> {
  const p = practiceInputSchema.safeParse(input);
  if (!p.success)
    return {
      status: "error",
      message: "Choose one of this question’s options before submitting.",
    };
  try {
    const client = await session(owner);
    if (!client) return expired;
    const { identity, question, kind, choice, request } = p.data;
    const { data, error } = await client.rpc("submit_studio_foundation", {
      lesson: identity.lesson,
      content: identity.content,
      schema_id: identity.schema,
      question,
      event_kind: kind,
      selected: choice ?? "",
      request,
    });
    if (error)
      return error.code === "54000"
        ? {
            status: "error",
            message:
              "The practice limit for this question was reached. Your previous evidence is kept.",
          }
        : failed;
    const feedback = practiceFeedbackSchema.safeParse(data);
    return feedback.success &&
      feedback.data.question === question &&
      feedback.data.kind === kind
      ? {
          status: "ok",
          message: feedback.data.message,
          feedback: feedback.data,
        }
      : failed;
  } catch {
    return failed;
  }
}
export async function loadFoundationPosition(
  owner: string,
  identity: FoundationIdentity = foundationIdentity,
): Promise<FoundationResult> {
  if (!supportedIdentitySchema.safeParse(identity).success) return failed;
  try {
    const client = await session(owner);
    if (!client) return expired;
    const { data, error } = await client.rpc("get_studio_foundation", {
      course: studioCourse,
      lesson: identity.lesson,
    });
    const parsed = foundationStateSchema.safeParse(data);
    return !error &&
      parsed.success &&
      parsed.data.identity.lesson === identity.lesson
      ? {
          status: "ok",
          message:
            "Saved position loaded for comparison. Your current position has not changed.",
          state: parsed.data,
        }
      : failed;
  } catch {
    return failed;
  }
}
