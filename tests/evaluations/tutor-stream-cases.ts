import type { ReviewedContext } from "../../modules/tutor/gemini";

export const streamContext: ReviewedContext = {
  lesson: "js-v2-values",
  course: "javascript-foundations-v2",
  title: "Values",
  reviewed: true,
  objective: "Trace assignments",
  body: "let permits reassignment; quoted numeric text is a string.",
  example: "let apples = 4;",
};
export const streamConfig = {
  apiKey: "synthetic-test-key",
  model: "gemini-3.1-flash-lite",
};
export const streamIntents = ["hint", "explain", "example", "reflect"] as const;
export const streamUsage = {
  promptTokenCount: 100,
  candidatesTokenCount: 20,
  thoughtsTokenCount: 5,
  cachedContentTokenCount: 10,
  totalTokenCount: 125,
};
export function streamFrame(
  text: string,
  finishReason?: string,
  usageMetadata?: unknown,
) {
  return `data: ${JSON.stringify({ candidates: [{ index: 0, content: { parts: [{ text }] }, finishReason }], usageMetadata })}\n\n`;
}
export type StreamCase = {
  id: string;
  status?: number;
  wire: string;
  expected: "fallback" | "measured" | "unknown";
};
/** Provider protocol fixtures, not samples of actual model quality. */
export const streamCases: StreamCase[] = [
  {
    id: "complete",
    wire: streamFrame("Synthetic guidance", "STOP", streamUsage),
    expected: "measured",
  },
  {
    id: "usage-tail",
    wire:
      streamFrame("Synthetic guidance", "STOP") +
      `data: ${JSON.stringify({ usageMetadata: streamUsage })}\n\n`,
    expected: "measured",
  },
  {
    id: "missing-usage",
    wire: streamFrame("Synthetic guidance", "STOP"),
    expected: "unknown",
  },
  {
    id: "tool-counter",
    wire: streamFrame("Synthetic guidance", "STOP", {
      ...streamUsage,
      toolUsePromptTokenCount: 1,
    }),
    expected: "unknown",
  },
  {
    id: "negative-counter",
    wire: streamFrame("Synthetic guidance", "STOP", {
      ...streamUsage,
      totalTokenCount: -1,
    }),
    expected: "unknown",
  },
  {
    id: "forged-total",
    wire: streamFrame("Synthetic guidance", "STOP", {
      ...streamUsage,
      totalTokenCount: 0,
    }),
    expected: "unknown",
  },
  {
    id: "fractional-counter",
    wire: streamFrame("Synthetic guidance", "STOP", {
      ...streamUsage,
      candidatesTokenCount: 0.5,
    }),
    expected: "unknown",
  },
  { id: "rate-limited", status: 429, wire: "", expected: "fallback" },
  { id: "provider-failure", status: 503, wire: "", expected: "fallback" },
  { id: "no-stop", wire: streamFrame("Partial"), expected: "fallback" },
  {
    id: "max-tokens",
    wire: streamFrame("Partial", "MAX_TOKENS", streamUsage),
    expected: "fallback",
  },
  {
    id: "safety",
    wire: 'data: {"promptFeedback":{"blockReason":"SAFETY"}}\n\n',
    expected: "fallback",
  },
  { id: "bad-json", wire: "data: nope\n\n", expected: "fallback" },
  {
    id: "unexpected-candidate",
    wire: 'data: {"candidates":[{"index":1,"content":{"parts":[{"text":"Wrong candidate"}]},"finishReason":"STOP"}]}\n\n',
    expected: "fallback",
  },
  {
    id: "truncated-after-stop",
    wire: streamFrame("Synthetic guidance", "STOP", streamUsage) + "data: {",
    expected: "fallback",
  },
  {
    id: "late-output",
    wire:
      streamFrame("Synthetic guidance", "STOP", streamUsage) +
      streamFrame("Late"),
    expected: "fallback",
  },
  {
    id: "frame-flood",
    wire: "data: {}\n\n".repeat(1001),
    expected: "fallback",
  },
  {
    id: "oversized-output",
    wire: streamFrame("x".repeat(6001), "STOP", streamUsage),
    expected: "fallback",
  },
];
export const syntheticTransport =
  (wire: string, status = 200): typeof fetch =>
  async () =>
    new Response(wire, {
      status,
      headers: { "Content-Type": "text/event-stream" },
    });
