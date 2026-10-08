import { createHmac } from "node:crypto";
import type { TutorReply } from "./adapter";

/** Server-only capability: never exposed by a route or accepted as user text. */
export function signReceipt(
  key: string,
  owner: string,
  request: string,
  reply: TutorReply,
) {
  if (!/^[a-f0-9]{64}$/.test(key))
    throw new Error("Receipt signing is not configured");
  const receipt = JSON.stringify({ owner, request, reply });
  const signature = createHmac("sha256", key)
    .update(receipt, "utf8")
    .digest("hex");
  return { receipt, signature };
}
