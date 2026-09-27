import { z } from "zod";
export const tutorReplySchema = z.object({
  text: z.string(),
  adapter: z.string(),
  source: z.object({ title: z.string(), href: z.string() }).optional(),
});
export const reportSnapshotSchema = z.object({
  course: z.string(),
  course_version: z.number(),
  lesson: z.string(),
  title: z.string(),
  objective: z.string(),
  body: z.string(),
  example: z.string(),
  response: tutorReplySchema.nullable(),
});
