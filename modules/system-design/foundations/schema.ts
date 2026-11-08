import { z } from "zod";
import { foundationIdentity } from "./content";
import { apiFoundationIdentity } from "./api-content";
import { explorerConfigSchema } from "./api-example";
import { getFoundationLesson } from "./lessons";
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
export const apiIdentitySchema = z
  .object({
    lesson: z.literal(apiFoundationIdentity.lesson),
    content: z.literal(apiFoundationIdentity.content),
    schema: z.literal(apiFoundationIdentity.schema),
  })
  .strict();
export const supportedIdentitySchema = z.union([
  identitySchema,
  apiIdentitySchema,
]);
export type FoundationIdentity = z.infer<typeof supportedIdentitySchema>;
export const apiPositionSchema = z
  .object({
    section: sectionSchema,
    step: z.literal(0),
    viewed: z.boolean(),
    explorer: explorerConfigSchema,
  })
  .strict();
export const lessonPositionSchema = z.union([
  positionSchema,
  apiPositionSchema,
]);
export type LessonPosition = z.infer<typeof lessonPositionSchema>;
export function positionMatchesIdentity(
  identity: FoundationIdentity,
  position: LessonPosition,
) {
  return identity.lesson === apiFoundationIdentity.lesson
    ? apiPositionSchema.safeParse(position).success
    : positionSchema.safeParse(position).success;
}
export const positionSaveSchema = z
  .object({
    identity: supportedIdentitySchema,
    expected: z.number().int().min(0).max(1000),
    request: z.string().uuid(),
    position: lessonPositionSchema,
  })
  .strict()
  .refine((p) => positionMatchesIdentity(p.identity, p.position), {
    path: ["position"],
    message: "Use this lesson’s supported position schema.",
  });
export const questionIdSchema = z.enum([
  "initiator",
  "database-query",
  "request-response",
  "api-read-one",
  "api-create-body",
  "api-error-kind",
  "api-representation",
]);
export const practiceInputSchema = z
  .object({
    identity: supportedIdentitySchema,
    question: questionIdSchema,
    kind: z.enum(["attempt", "hint", "explain"]),
    choice: z.string().max(40).nullable(),
    request: z.string().uuid(),
  })
  .strict()
  .superRefine((p, ctx) => {
    const question = getFoundationLesson(p.identity.lesson).questions.find(
      (q) => q.id === p.question,
    );
    if (!question) {
      ctx.addIssue({
        code: "custom",
        path: ["question"],
        message: "Choose a question from this lesson.",
      });
      return;
    }
    const options = question.options;
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
    position: lessonPositionSchema,
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
    identity: supportedIdentitySchema,
    saved: savedPositionSchema.nullable(),
    evidence: z.array(practiceFeedbackSchema).max(400),
  })
  .strict()
  .superRefine((p, ctx) => {
    if (p.saved && !positionMatchesIdentity(p.identity, p.saved.position))
      ctx.addIssue({
        code: "custom",
        path: ["saved"],
        message: "Unsupported pinned position.",
      });
    const ids = getFoundationLesson(p.identity.lesson).questions.map(
      (q) => q.id,
    );
    if (p.evidence.some((e) => !ids.includes(e.question)))
      ctx.addIssue({
        code: "custom",
        path: ["evidence"],
        message: "Evidence belongs to another lesson.",
      });
  });
export type Position = z.infer<typeof positionSchema>;
export type SavedPosition = z.infer<typeof savedPositionSchema>;
export type Feedback = z.infer<typeof practiceFeedbackSchema>;
export type FoundationState = z.infer<typeof foundationStateSchema>;
export function moveStep(step: number, command: "back" | "next" | "replay") {
  return command === "replay"
    ? 0
    : Math.max(0, Math.min(3, step + (command === "next" ? 1 : -1)));
}
