import { z } from "zod";
export const rubricSchema = z.array(
  z.object({ id: z.string(), title: z.string(), prompt: z.string() }),
);
export const feedbackSchema = z.array(
  z.object({ id: z.string(), title: z.string(), message: z.string() }),
);
export const workSchema = z
  .object({
    values: z.string().max(4000),
    conditions: z.string().max(4000),
    functions: z.string().max(4000),
  })
  .strict();
export type ProjectWork = z.infer<typeof workSchema>;
