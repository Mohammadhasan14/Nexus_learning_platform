import { z } from "zod";
export const privacySettings = z.object({
  tutor_retention_days: z.union([z.literal(30), z.literal(90)]).nullable(),
  replies_cleared_at: z.string().nullable(),
  updated_at: z.string().nullable(),
});
export type PrivacySettings = z.infer<typeof privacySettings>;
export const privacyChange = z.discriminatedUnion("intent", [
  z.object({
    intent: z.literal("retention"),
    days: z.union([z.literal(0), z.literal(30), z.literal(90)]),
  }),
  z.object({ intent: z.literal("clear"), confirmation: z.literal("CLEAR") }),
]);
export const deletionInput = z.object({
  password: z.string().min(1).max(128),
  confirmation: z.literal("DELETE"),
});
