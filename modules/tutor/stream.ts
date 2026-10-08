import { z } from "zod";
import { tutorReplySchema } from "../reports/schema";

export const tutorEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("delta"), text: z.string().max(6000) }),
  z.object({
    type: z.literal("done"),
    reply: tutorReplySchema,
    request: z.string().uuid(),
    remaining: z.number().optional(),
    saved: z.boolean(),
  }),
  z.object({ type: z.literal("error"), message: z.string() }),
]);
export type TutorEvent = z.infer<typeof tutorEventSchema>;

/** Incremental UTF-8 lines with a total wire limit; cancels unread bodies on exit. */
export async function* boundedLines(
  body: ReadableStream<Uint8Array>,
  limit = 64000,
) {
  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0,
    buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > limit) throw new Error("Response too large");
      buffer += decoder.decode(value, { stream: true });
      let end: number;
      while ((end = buffer.indexOf("\n")) >= 0) {
        yield buffer.slice(0, end).replace(/\r$/, "");
        buffer = buffer.slice(end + 1);
      }
    }
    buffer += decoder.decode();
    if (buffer) throw new Error("Interrupted frame");
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

export async function* sseObjects(body: ReadableStream<Uint8Array>) {
  let data: string[] = [];
  let count = 0;
  for await (const line of boundedLines(body)) {
    if (line === "") {
      if (data.length) {
        if (++count > 1000) throw new Error("Too many frames");
        yield JSON.parse(data.join("\n")) as unknown;
        data = [];
      }
    } else if (line.startsWith("data:")) {
      data.push(line.slice(5).replace(/^ /, ""));
    }
  }
  if (data.length) throw new Error("Interrupted event");
}

export async function* tutorEvents(body: ReadableStream<Uint8Array>) {
  let terminal = false;
  for await (const line of boundedLines(body)) {
    if (!line) continue;
    if (terminal) throw new Error("Unexpected trailing event");
    const event = tutorEventSchema.parse(JSON.parse(line));
    terminal = event.type !== "delta";
    yield event;
  }
  if (!terminal) throw new Error("Interrupted response");
}
