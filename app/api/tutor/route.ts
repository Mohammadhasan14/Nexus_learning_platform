import { z } from "zod";
import { serverClient } from "@/lib/supabase/server";
import { accountsAvailable } from "@/lib/supabase/config";
import { tutorConfig } from "@/modules/tutor/server-only";
import { tutorInput } from "@/modules/tutor/adapter";
import { runLiveResponse } from "@/modules/tutor/live-response";
import { tutorReplySchema } from "@/modules/reports/schema";
import type { TutorEvent } from "@/modules/tutor/stream";

export const runtime = "nodejs";
const headers = {
  "Cache-Control": "no-store",
  "Content-Type": "application/x-ndjson",
  "X-Content-Type-Options": "nosniff",
  "X-Accel-Buffering": "no",
};
const errorResponse = (message: string, status: number) =>
  Response.json(
    { message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
const claimSchema = z.object({
  allowed: z.boolean(),
  reason: z.string().optional(),
  remaining: z.number().optional(),
  lesson: z.string().optional(),
  course: z.string().optional(),
  title: z.string().optional(),
  objective: z.string().optional(),
  body: z.string().optional(),
  example: z.string().optional(),
});

export async function POST(request: Request) {
  // Same-origin cookie POST only; never trust a browser-supplied owner or lesson body.
  // Next may normalise request.url to localhost despite a 127.0.0.1 Host.
  // Use the browser's actual target Host; never trust X-Forwarded-Host.
  if (
    request.headers.get("origin") !==
    `${new URL(request.url).protocol}//${request.headers.get("host")}`
  )
    return errorResponse(
      "Tutor requests must come from this application.",
      403,
    );
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return errorResponse("Invalid tutor request.", 415);
  if (!accountsAvailable())
    return errorResponse("Sign in to use the tutor.", 401);
  const config = tutorConfig();
  const signingKey = process.env.TUTOR_RECEIPT_SIGNING_KEY ?? "";
  if (config.mode !== "live" || !/^[a-f0-9]{64}$/.test(signingKey))
    return errorResponse(
      "Live tutor is unavailable. Continue with the lesson and practice feedback.",
      503,
    );
  const client = await serverClient();
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError || !auth.user)
    return errorResponse("Sign in to use the tutor.", 401);
  let input: z.infer<typeof tutorInput>;
  try {
    const reader = request.body?.getReader();
    if (!reader) throw new Error("Empty request");
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > 2048) throw new Error("Request too large");
        chunks.push(value);
      }
    } finally {
      await reader.cancel().catch(() => {});
      reader.releaseLock();
    }
    input = tutorInput.parse(
      JSON.parse(Buffer.concat(chunks).toString("utf8")),
    );
  } catch {
    return errorResponse("Choose one of the guidance options.", 400);
  }
  const { data: previous, error: readError } = await client.rpc(
    "read_live_tutor",
    input,
  );
  if (readError)
    return errorResponse(
      "Guidance could not be loaded. Check your lesson access and connection.",
      403,
    );
  const saved = z
    .object({ reply: tutorReplySchema, remaining: z.number() })
    .safeParse(previous);
  if (saved.success)
    return new Response(
      JSON.stringify({
        type: "done",
        ...saved.data,
        request: input.request,
        saved: true,
      }) + "\n",
      { headers },
    );
  const { data, error } = await client.rpc("claim_live_tutor", input);
  const parsed = claimSchema.safeParse(data);
  if (error || !parsed.success)
    return errorResponse(
      "Guidance could not be loaded. Check your lesson access and connection.",
      403,
    );
  const r = parsed.data;
  if (!r.allowed)
    return errorResponse(
      r.reason === "replay"
        ? "This request was already used and has no completed reply. Choose another guidance option for a new request."
        : r.reason === "limit"
          ? "Today’s tutor allowance is used up. It resets at midnight UTC. Lessons remain available."
          : "The tutor is disabled. Lessons remain available.",
      409,
    );
  if (
    !r.lesson ||
    !r.course ||
    !r.title ||
    !r.objective ||
    !r.body ||
    !r.example
  )
    return errorResponse(
      "Reviewed context is unavailable. Continue with the lesson.",
      503,
    );
  const context = {
    lesson: r.lesson,
    course: r.course,
    title: r.title,
    objective: r.objective,
    body: r.body,
    example: r.example,
    reviewed: true,
  };
  const controller = new AbortController();
  const abort = () => controller.abort();
  request.signal.addEventListener("abort", abort, { once: true });
  if (request.signal.aborted) abort();
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(output) {
      const send = (event: TutorEvent) => {
        controller.signal.throwIfAborted();
        output.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };
      try {
        await runLiveResponse({
          config,
          context,
          intent: input.intent,
          owner: auth.user!.id,
          request: input.request,
          signingKey,
          remaining: r.remaining,
          signal: controller.signal,
          emit: send,
          persist: async (signed) => {
            const result = await client.rpc("finish_live_tutor", {
              request: input.request,
              ...signed,
            });
            return !result.error && result.data === true;
          },
        });
      } catch {
        if (!controller.signal.aborted)
          send({
            type: "error",
            message:
              "The reply was interrupted. Recover a saved reply or choose another guidance option. Lessons remain available.",
          });
      } finally {
        request.signal.removeEventListener("abort", abort);
        if (!controller.signal.aborted) output.close();
        else {
          try {
            output.close();
          } catch {
            /* Client already disconnected. */
          }
        }
      }
    },
    cancel() {
      abort();
    },
  });
  return new Response(body, { headers });
}
