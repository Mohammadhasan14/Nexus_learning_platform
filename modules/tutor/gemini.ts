import { z } from "zod";
import { tutorSystemInstruction } from "./prompt";
import {
  scriptedTutor,
  tutorInput,
  type TutorContext,
  type TutorIntent,
  type TutorReply,
} from "./adapter";

export type ReviewedContext = TutorContext & {
  objective: string;
  body: string;
  example: string;
};
export const contextSchema = z.object({
  reviewed: z.literal(true),
  course: z.literal("javascript-foundations-v2"),
  lesson: z.enum(["js-v2-values", "js-v2-conditions", "js-v2-functions"]),
  title: z.string().trim().min(1).max(200),
  objective: z.string().trim().min(1).max(1000),
  body: z.string().trim().min(1).max(10000),
  example: z.string().trim().min(1).max(4000),
});
const responseSchema = z.object({
  promptFeedback: z.object({ blockReason: z.string().optional() }).optional(),
  candidates: z
    .array(
      z.object({
        finishReason: z.string(),
        content: z.object({
          parts: z.array(
            z.object({
              text: z.string().optional(),
              thought: z.boolean().optional(),
            }),
          ),
        }),
      }),
    )
    .min(1),
});

/** Called only from a server action after an atomic, single-use database claim. */
export async function geminiGuidance(
  config: { apiKey: string; model: string },
  context: ReviewedContext,
  intent: TutorIntent,
  transport: typeof fetch = fetch,
  timeoutMs = 12000,
): Promise<TutorReply> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const checked = contextSchema.parse(context);
    const checkedIntent = tutorInput.shape.intent.parse(intent);
    // Explicit selection excludes profile data, notes, attempts, exercises and grading keys.
    const lesson = {
      title: checked.title,
      objective: checked.objective,
      body: checked.body,
      example: checked.example,
    };
    const text = JSON.stringify({ intent: checkedIntent, lesson });
    if (text.length > 12000) throw new Error("Context too large");
    const response = await transport(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": config.apiKey,
        },
        cache: "no-store",
        redirect: "error",
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: tutorSystemInstruction,
              },
            ],
          },
          contents: [{ role: "user", parts: [{ text }] }],
          generationConfig: { maxOutputTokens: 768, temperature: 0.2 },
        }),
      },
    );
    if (!response.ok) throw new Error("Provider unavailable");
    // Bound the response body while retaining the abort signal until it is consumed.
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Empty response");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 64000) {
        await reader.cancel();
        throw new Error("Response too large");
      }
      chunks.push(value);
    }
    const raw = Buffer.concat(chunks).toString("utf8");
    const parsed = responseSchema.parse(JSON.parse(raw));
    const candidate = parsed.candidates[0];
    if (parsed.promptFeedback?.blockReason || candidate.finishReason !== "STOP")
      throw new Error("Incomplete response");
    const answer = candidate.content.parts
      .filter((p) => !p.thought)
      .map((p) => p.text ?? "")
      .join("\n")
      .trim();
    if (!answer || answer.length > 6000) throw new Error("Invalid response");
    return {
      text: answer,
      adapter: `gemini:${config.model}`,
      source: {
        title: context.title,
        href: `/courses/${context.course}/${context.lesson}`,
      },
    };
  } catch {
    if (!tutorInput.shape.intent.safeParse(intent).success)
      return {
        text: "The tutor request is unsupported. Continue with the lesson and practice feedback.",
        adapter: "scripted-live-fallback-1",
      };
    const fallback = await scriptedTutor.respond(context, intent);
    return { ...fallback, adapter: "scripted-live-fallback-1" };
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}
