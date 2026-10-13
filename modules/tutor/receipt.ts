import { createHmac } from "node:crypto";
import type { TokenUsage } from "./usage";
import type { TutorReply } from "./adapter";

/** Server-only capability: never exposed by a route or accepted as user text. */
export function signReceipt(
  key: string,
  owner: string,
  request: string,
  reply: TutorReply,
  usage?: TokenUsage,
) {
  if (!/^[a-f0-9]{64}$/.test(key))
    throw new Error("Receipt signing is not configured");
  const receipt = JSON.stringify({
    owner,
    request,
    reply,
    ...(usage ? { usage } : {}),
  });
  const signature = createHmac("sha256", key)
    .update(receipt, "utf8")
    .digest("hex");
  return { receipt, signature };
}
