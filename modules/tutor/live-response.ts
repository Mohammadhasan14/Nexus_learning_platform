import type { ReviewedContext } from "./gemini";
import type { TutorIntent } from "./adapter";
import type { TutorEvent } from "./stream";
import { streamGemini } from "./gemini-stream";
import { signReceipt } from "./receipt";

/** Publish completion only after attempting a trusted receipt write. */
export async function runLiveResponse(options: {
  config: { apiKey: string; model: string };
  context: ReviewedContext;
  intent: TutorIntent;
  owner: string;
  request: string;
  signingKey: string;
  remaining?: number;
  signal: AbortSignal;
  emit: (event: TutorEvent) => void;
  persist: (signed: { receipt: string; signature: string }) => Promise<boolean>;
  transport?: typeof fetch;
}) {
  const reply = await streamGemini(
    options.config,
    options.context,
    options.intent,
    {
      signal: options.signal,
      onDelta: (text) => options.emit({ type: "delta", text }),
    },
    options.transport,
  );
  options.signal.throwIfAborted();
  const signed = signReceipt(
    options.signingKey,
    options.owner,
    options.request,
    reply,
  );
  // A disconnect racing this write may leave a completed, recoverable receipt.
  const saved = await options.persist(signed);
  options.signal.throwIfAborted();
  options.emit({
    type: "done",
    reply,
    request: options.request,
    remaining: options.remaining,
    saved,
  });
}
