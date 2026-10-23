import { createHmac, randomUUID } from "node:crypto";

/** A separate, short-lived deletion capability. Never reuse the tutor receipt key. */
export function signDeletionProof(
  key: string,
  owner: string,
  now = Date.now(),
) {
  if (!/^[a-f0-9]{64}$/.test(key) || !/^[a-f0-9-]{36}$/.test(owner))
    throw new Error("Deletion proof configuration invalid");
  const issued = Math.floor(now / 1000);
  const proof = JSON.stringify({
    action: "delete-account-v1",
    owner,
    issued,
    expires: issued + 60,
    nonce: randomUUID(),
  });
  return {
    proof,
    signature: createHmac("sha256", Buffer.from(key, "utf8"))
      .update(proof)
      .digest("hex"),
  };
}
