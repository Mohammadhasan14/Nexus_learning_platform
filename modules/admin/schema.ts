import { z } from "zod";
export const draftContentSchema = z.record(
  z.string(),
  z
    .object({
      title: z.string().min(1).max(500),
      objective: z.string().min(1).max(500),
      body: z.string().min(1).max(12000),
      example: z.string().min(1).max(12000),
    })
    .strict(),
);
export type DraftContent = z.infer<typeof draftContentSchema>;
export const reviewMaterialSchema = z.array(
  z.object({
    lesson: z.string(),
    kind: z.string(),
    prompt: z.string(),
    options: z.array(z.object({ id: z.string(), label: z.string() })),
    answer: z.string(),
    hint: z.string(),
    explanation: z.string(),
  }),
);
