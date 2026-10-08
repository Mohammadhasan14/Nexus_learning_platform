import { z } from "zod";
import { contextSchema, type ReviewedContext } from "./gemini";
import {
  scriptedTutor,
  tutorInput,
  type TutorIntent,
  type TutorReply,
} from "./adapter";
import { tutorSystemInstruction } from "./prompt";
import { sseObjects } from "./stream";

const frameSchema = z.object({
  promptFeedback: z.object({ blockReason: z.string().optional() }).optional(),
  candidates: z
    .array(
      z.object({
        index: z.number().optional(),
        finishReason: z.string().optional(),
        content: z
          .object({
            parts: z.array(
              z.object({
                text: z.string().optional(),
                thought: z.boolean().optional(),
              }),
            ),
          })
          .optional(),
      }),
    )
    .max(1)
    .optional(),
});

/** One dispatch, bounded incremental output, natural STOP required before saving. */
export async function streamGemini(
  config: { apiKey: string; model: string },
  context: ReviewedContext,
  intent: TutorIntent,
  options: { signal: AbortSignal; onDelta: (text: string) => void },
  transport: typeof fetch = fetch,
  timeoutMs = 20000,
): Promise<TutorReply> {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  options.signal.addEventListener("abort", cancel, { once: true });
  const timer = setTimeout(cancel, timeoutMs);
  try {
    options.signal.throwIfAborted();
    const checked = contextSchema.parse(context);
    const checkedIntent = tutorInput.shape.intent.parse(intent);
    const text = JSON.stringify({
      intent: checkedIntent,
      lesson: {
        title: checked.title,
        objective: checked.objective,
        body: checked.body,
        example: checked.example,
      },
    });
    if (text.length > 12000) throw new Error("Context too large");
    const response = await transport(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:streamGenerateContent?alt=sse`,
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
          systemInstruction: { parts: [{ text: tutorSystemInstruction }] },
          contents: [{ role: "user", parts: [{ text }] }],
          generationConfig: { maxOutputTokens: 768, temperature: 0.2 },
        }),
      },
    );
    if (!response.ok || !response.body) throw new Error("Provider unavailable");
    let answer = "",
      stopped = false;
    for await (const raw of sseObjects(response.body)) {
      controller.signal.throwIfAborted();
      const frame = frameSchema.parse(raw);
      if (frame.promptFeedback?.blockReason)
        throw new Error("Blocked response");
      const candidate = frame.candidates?.[0];
      if (!candidate) continue; // Usage-only frames contain no learner text.
      if (candidate.index !== undefined && candidate.index !== 0)
        throw new Error("Unexpected candidate");
      const delta = (candidate.content?.parts ?? [])
        .filter((p) => !p.thought)
        .map((p) => p.text ?? "")
        .join("");
      if (stopped && (delta || candidate.finishReason))
        throw new Error("Output after completion");
      if (candidate.finishReason && candidate.finishReason !== "STOP")
        throw new Error("Incomplete response");
      answer += delta;
      if (answer.length > 6000) throw new Error("Output too large");
      if (delta) options.onDelta(delta);
      controller.signal.throwIfAborted();
      if (candidate.finishReason === "STOP") stopped = true;
    }
    controller.signal.throwIfAborted();
    if (!stopped || !answer.trim()) throw new Error("Incomplete response");
    return {
      text: answer.trim(),
      adapter: `gemini:${config.model}`,
      source: {
        title: checked.title,
        href: `/courses/${checked.course}/${checked.lesson}`,
      },
    };
  } catch {
    // A user/disconnect abort is not a completed fallback receipt.
    options.signal.throwIfAborted();
    if (!tutorInput.shape.intent.safeParse(intent).success)
      return {
        text: "The tutor request is unsupported. Continue with the lesson.",
        adapter: "scripted-live-fallback-1",
      };
    const fallback = await scriptedTutor.respond(context, intent);
    return { ...fallback, adapter: "scripted-live-fallback-1" };
  } finally {
    clearTimeout(timer);
    options.signal.removeEventListener("abort", cancel);
    controller.abort();
  }
}
