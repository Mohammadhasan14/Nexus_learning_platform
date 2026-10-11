import { z } from "zod";
import { tutorPromptVersion } from "./prompt";

const count = z.number().int().min(0).max(1000000);
export const tokenUsageSchema = z
  .object({
    input: count,
    output: count,
    thoughts: count,
    cached: count,
    total: count,
    model: z.string().regex(/^gemini-[a-z0-9.-]{1,80}$/),
    promptVersion: z.string().regex(/^[a-z0-9.-]{1,80}$/),
  })
  .strict()
  .refine(
    (v) => v.total === v.input + v.output + v.thoughts && v.cached <= v.input,
  );
export type TokenUsage = z.infer<typeof tokenUsageSchema>;
const providerUsage = z.object({
  promptTokenCount: count,
  candidatesTokenCount: count,
  thoughtsTokenCount: count.optional().default(0),
  cachedContentTokenCount: count.optional().default(0),
  toolUsePromptTokenCount: z.literal(0).optional(),
  totalTokenCount: count,
});

/** Final cumulative metadata, never a sum of streaming-frame counters. */
export function readTokenUsage(
  raw: unknown,
  model: string,
): TokenUsage | undefined {
  const parsed = providerUsage.safeParse(raw);
  if (!parsed.success) return undefined;
  const v = parsed.data;
  const result = tokenUsageSchema.safeParse({
    input: v.promptTokenCount,
    output: v.candidatesTokenCount,
    thoughts: v.thoughtsTokenCount,
    cached: v.cachedContentTokenCount,
    total: v.totalTokenCount,
    model,
    promptVersion: tutorPromptVersion,
  });
  return result.success ? result.data : undefined;
}

export const tokenAllowanceSchema = z.object({
  limit: z.number().int().nonnegative(),
  charged: z.number().int().nonnegative(),
  remaining: z.number().int().nonnegative(),
});
export type TokenAllowance = z.infer<typeof tokenAllowanceSchema>;

/** Detect malformed/decreasing cumulative counters without invalidating useful text. */
export class UsageTracker {
  private invalid = false;
  private previous: Record<string, number> = {};
  observe(raw: unknown) {
    if (raw === undefined) return;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      this.invalid = true;
      return;
    }
    for (const field of [
      "promptTokenCount",
      "candidatesTokenCount",
      "thoughtsTokenCount",
      "cachedContentTokenCount",
      "totalTokenCount",
      "toolUsePromptTokenCount",
    ]) {
      const value = (raw as Record<string, unknown>)[field];
      if (value === undefined) continue;
      if (!count.safeParse(value).success) {
        this.invalid = true;
        continue;
      }
      const n = value as number;
      if (this.previous[field] !== undefined && n < this.previous[field])
        this.invalid = true;
      this.previous[field] = n;
    }
  }
  finish(raw: unknown, model: string) {
    return this.invalid ? undefined : readTokenUsage(raw, model);
  }
}
