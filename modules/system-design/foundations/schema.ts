import { z } from "zod";
import { foundationIdentity, questions } from "./content";
export const identitySchema = z
  .object({
    lesson: z.literal(foundationIdentity.lesson),
    content: z.literal(foundationIdentity.content),
    schema: z.literal(foundationIdentity.schema),
  })
  .strict();
export const sectionSchema = z.enum(["learn", "practice", "recap"]);
export const positionSchema = z
  .object({
    section: sectionSchema,
    step: z.number().int().min(0).max(3),
    viewed: z.boolean(),
  })
  .strict();
export const positionSaveSchema = z
  .object({
    identity: identitySchema,
    expected: z.number().int().min(0).max(1000),
    request: z.string().uuid(),
    position: positionSchema,
  })
  .strict();
export const questionIdSchema = z.enum([
  "initiator",
  "database-query",
  "request-response",
]);
export const practiceInputSchema = z
  .object({
    identity: identitySchema,
    question: questionIdSchema,
    kind: z.enum(["attempt", "hint", "explain"]),
    choice: z.string().max(40).nullable(),
    request: z.string().uuid(),
  })
  .strict()
  .superRefine((p, ctx) => {
    const options = questions.find((q) => q.id === p.question)!.options;
    if (
      p.kind === "attempt"
        ? !options.some((o) => o.id === p.choice)
        : p.choice !== null
    )
      ctx.addIssue({
        code: "custom",
        path: ["choice"],
        message: "Choose one of this question’s options before submitting.",
      });
  });
export const savedPositionSchema = z
  .object({
    revision: z.number().int().min(1).max(1000),
    savedAt: z.string(),
    position: positionSchema,
  })
  .strict();
export const practiceFeedbackSchema = z
  .object({
    question: questionIdSchema,
    kind: z.enum(["attempt", "hint", "explain"]),
    attempt: z.number().int().min(1).max(100),
    correct: z.boolean(),
    independent: z.boolean(),
    choice: z.string().nullable(),
    hintLevel: z.number().int().min(0).max(2),
    explanationShown: z.boolean(),
    message: z.string(),
    options: z.record(z.string(), z.string()).optional(),
  })
  .strict();
export const foundationStateSchema = z
  .object({
    enrolled: z.literal(true),
    identity: identitySchema,
    saved: savedPositionSchema.nullable(),
    evidence: z.array(practiceFeedbackSchema).max(400),
  })
  .strict();
export type Position = z.infer<typeof positionSchema>;
export type SavedPosition = z.infer<typeof savedPositionSchema>;
export type Feedback = z.infer<typeof practiceFeedbackSchema>;
export type FoundationState = z.infer<typeof foundationStateSchema>;
export function moveStep(step: number, command: "back" | "next" | "replay") {
  return command === "replay"
    ? 0
    : Math.max(0, Math.min(3, step + (command === "next" ? 1 : -1)));
}
