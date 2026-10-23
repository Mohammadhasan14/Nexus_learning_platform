import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { signDeletionProof } from "../../modules/privacy/proof";
import { deletionInput, privacyChange } from "../../modules/privacy/schema";
test("deletion capabilities bind action, owner, exact bytes and a short lifetime with separate nonces", () => {
  const key = "a".repeat(64),
    owner = "a9000000-0000-0000-0000-000000000001";
  const first = signDeletionProof(key, owner, 1_000_000);
  const payload = JSON.parse(first.proof);
  assert.equal(payload.owner, owner);
  assert.equal(payload.action, "delete-account-v1");
  assert.equal(payload.issued, 1000);
  assert.equal(payload.expires, 1060);
  assert.notEqual(
    payload.nonce,
    JSON.parse(signDeletionProof(key, owner, 1_000_000).proof).nonce,
  );
  assert.equal(
    first.signature,
    createHmac("sha256", key).update(first.proof).digest("hex"),
  );
  assert.notEqual(
    first.signature,
    createHmac("sha256", key)
      .update(first.proof.replace(owner, "b".repeat(36)))
      .digest("hex"),
  );
  assert.throws(() => signDeletionProof("", owner));
  assert.ok(Buffer.byteLength(first.proof) < 512);
});
test("privacy inputs require deliberate confirmation and allowlisted retention without echoing owner fields", () => {
  for (const days of [0, 30, 90])
    assert.equal(
      privacyChange.parse({ intent: "retention", days, user_id: "another" })
        .intent,
      "retention",
    );
  for (const days of [-1, 1, 365, null, "30"])
    assert.equal(
      privacyChange.safeParse({ intent: "retention", days }).success,
      false,
    );
  assert.equal(
    privacyChange.safeParse({ intent: "clear", confirmation: "clear" }).success,
    false,
  );
  assert.equal(
    deletionInput.safeParse({ confirmation: "DELETE", password: "" }).success,
    false,
  );
  assert.equal(
    deletionInput.safeParse({ confirmation: "delete", password: "secret" })
      .success,
    false,
  );
  assert.deepEqual(
    deletionInput.parse({
      confirmation: "DELETE",
      password: " spaces kept ",
      user_id: "other",
    }),
    { confirmation: "DELETE", password: " spaces kept " },
  );
});
