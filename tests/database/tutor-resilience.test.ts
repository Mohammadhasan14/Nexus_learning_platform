import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { migrationDatabase } from "../../scripts/database-harness";
import { runLiveResponse } from "../../modules/tutor/live-response";
import type { TutorIntent } from "../../modules/tutor/adapter";
import type { TutorEvent } from "../../modules/tutor/stream";
import {
  streamConfig,
  streamFrame,
  streamIntents,
  streamUsage,
  syntheticTransport,
} from "../evaluations/tutor-stream-cases";

async function fixture() {
  const db = await migrationDatabase();
  const owner = randomUUID(),
    signingKey = randomBytes(32).toString("hex");
  await db.query("insert into tutor_private.receipt_keys(secret) values($1)", [
    signingKey,
  ]);
  await db.query("insert into auth.users(id) values($1)", [owner]);
  await db.exec(
    `update public.profiles set goal='Test receipt boundaries'; update tutor_private.token_policy set user_daily=2500000; select set_config('request.jwt.claim.sub','${owner}',false); set role authenticated; select public.enrol_course('javascript-foundations-v2')`,
  );
  const claim = async (intent: TutorIntent = "hint") => {
    const request = randomUUID();
    const result = (
      await db.query<{
        result: {
          allowed: boolean;
          lesson: string;
          course: string;
          title: string;
          objective: string;
          body: string;
          example: string;
        };
      }>("select public.claim_live_tutor('js-v2-values',$1,$2) result", [
        request,
        intent,
      ])
    ).rows[0].result;
    assert.equal(result.allowed, true);
    return { request, intent, context: { ...result, reviewed: true } };
  };
  const persist = async (
    request: string,
    signed: { receipt: string; signature: string },
  ) => {
    await db.query("select public.finish_live_tutor($1,$2,$3)", [
      request,
      signed.receipt,
      signed.signature,
    ]);
    return true;
  };
  const read = async (request: string, intent: TutorIntent = "hint") =>
    (
      await db.query<{
        result: {
          reply: { text: string; adapter: string };
          usage: { total: number } | null;
          tokens: { charged: number };
        } | null;
      }>("select public.read_live_tutor('js-v2-values',$1,$2) result", [
        request,
        intent,
      ])
    ).rows[0].result;
  const overview = async () =>
    (
      await db.query<{ result: { charged: number } }>(
        "select public.get_tutor_usage() result",
      )
    ).rows[0].result;
  return { db, owner, signingKey, claim, persist, read, overview };
}

test("failed streams across every intent save prepared receipts while retaining unknown token charges", async () => {
  const f = await fixture();
  try {
    let expectedCharge = 0;
    for (const intent of streamIntents)
      for (const wire of [
        streamFrame("Partial"),
        streamFrame("Partial", "STOP", streamUsage) + "data: invalid\n\n",
      ]) {
        const { request, context } = await f.claim(intent);
        const events: TutorEvent[] = [];
        await runLiveResponse({
          config: streamConfig,
          context,
          intent,
          owner: f.owner,
          request,
          signingKey: f.signingKey,
          signal: new AbortController().signal,
          emit: (e) => events.push(e),
          persist: (s) => f.persist(request, s),
          transport: syntheticTransport(wire),
        });
        const saved = await f.read(request, intent);
        assert.equal(saved?.reply.adapter, "scripted-live-fallback-1");
        assert.notEqual(saved?.reply.text, "Partial");
        assert.equal(saved?.usage, null);
        expectedCharge += 65536;
        assert.equal((await f.overview()).charged, expectedCharge);
        const done = events.at(-1)!;
        assert.equal(done.type, "done");
        if (done.type === "done") assert.equal(done.saved, true);
      }
  } finally {
    await f.db.close();
  }
});

test("disconnect before completion retains the claim; disconnect racing save leaves one recoverable measured receipt", async () => {
  const f = await fixture();
  try {
    const first = await f.claim();
    const cancelled = new AbortController();
    let writes = 0;
    await assert.rejects(
      runLiveResponse({
        config: streamConfig,
        ...first,
        owner: f.owner,
        signingKey: f.signingKey,
        signal: cancelled.signal,
        emit: () => cancelled.abort(),
        persist: async (s) => {
          writes++;
          return f.persist(first.request, s);
        },
        transport: syntheticTransport(
          streamFrame("Partial") +
            streamFrame("Completed", "STOP", streamUsage),
        ),
      }),
    );
    assert.equal(writes, 0);
    assert.equal(await f.read(first.request), null);
    assert.equal((await f.overview()).charged, 65536);
    const second = await f.claim();
    const racing = new AbortController();
    const events: TutorEvent[] = [];
    await assert.rejects(
      runLiveResponse({
        config: streamConfig,
        ...second,
        owner: f.owner,
        signingKey: f.signingKey,
        signal: racing.signal,
        emit: (e) => events.push(e),
        persist: async (s) => {
          writes++;
          await f.persist(second.request, s);
          await f.persist(second.request, s); // replay must not double-refund.
          racing.abort();
          return true;
        },
        transport: syntheticTransport(
          streamFrame("Completed synthetic guidance", "STOP", streamUsage),
        ),
      }),
    );
    assert.equal(writes, 1);
    assert.ok(!events.some((e) => e.type === "done"));
    const recovered = await f.read(second.request);
    assert.equal(recovered?.reply.text, "Completed synthetic guidance");
    assert.equal(recovered?.usage?.total, 125);
    assert.equal((await f.overview()).charged, 65536 + 125);
    assert.deepEqual(await f.read(second.request), recovered);
    assert.equal((await f.overview()).charged, 65536 + 125);
  } finally {
    await f.db.close();
  }
});
