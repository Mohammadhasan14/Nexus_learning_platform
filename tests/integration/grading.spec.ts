import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { localSupabase } from "../../scripts/local-supabase";

test("concurrent retries are atomic, private and bound to one payload", async () => {
  const backend = localSupabase();
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const admin = createClient(backend.url, backend.serviceKey, options);
  const users: string[] = [];
  try {
    const clients = [];
    for (let i = 0; i < 2; i++) {
      const email = `grading-${randomUUID()}@example.test`,
        password = `Nexus-test-${randomUUID()}`;
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      expect(error).toBeNull();
      users.push(data.user!.id);
      expect(
        (
          await admin
            .from("profiles")
            .update({ goal: "Learn JavaScript fundamentals" })
            .eq("user_id", data.user!.id)
        ).error,
      ).toBeNull();
      const client = createClient(backend.url, backend.key, options);
      expect(
        (await client.auth.signInWithPassword({ email, password })).error,
      ).toBeNull();
      clients.push(client);
    }
    const [a, b] = clients;
    expect(
      (await a.rpc("enrol_course", { course: "javascript-foundations-v1" }))
        .error,
    ).toBeNull();
    const payload = {
      exercise: "js-v1-values-practice",
      submitted: "b",
      request: randomUUID(),
    };
    const results = await Promise.all(
      Array.from({ length: 6 }, () => a.rpc("submit_attempt", payload)),
    );
    for (const r of results) {
      expect(r.error).toBeNull();
      expect(r.data).toEqual(results[0].data);
    }
    const attempts = await a
      .from("attempts")
      .select("id")
      .eq("request_id", payload.request);
    expect(attempts.data).toHaveLength(1);
    expect(
      (await a.rpc("submit_attempt", { ...payload, submitted: "a" })).error,
    ).not.toBeNull();
    expect((await b.from("attempts").select("*")).data).toEqual([]);
    expect((await b.from("exercise_evidence").select("*")).data).toEqual([]);
    expect((await a.from("answer_keys").select("*")).error).not.toBeNull();
    expect(
      (await a.schema("learning_private").from("answer_keys").select("*"))
        .error,
    ).not.toBeNull();
    expect(
      (
        await a.from("attempts").insert({
          user_id: users[0],
          exercise_id: payload.exercise,
          request_id: randomUUID(),
          answer: "a",
          correct: true,
          feedback: "forged",
        })
      ).error,
    ).not.toBeNull();
    expect(
      (
        await a.rpc("submit_attempt", {
          ...payload,
          request: randomUUID(),
          submitted: "not-an-option",
        })
      ).error,
    ).not.toBeNull();
    // A diagnostic can check a later topic but cannot unlock its practice prerequisite.
    expect(
      (
        await a.rpc("submit_attempt", {
          exercise: "js-v1-functions-diagnostic",
          submitted: "b",
          request: randomUUID(),
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await a.rpc("submit_attempt", {
          exercise: "js-v1-functions-practice",
          submitted: "b",
          request: randomUUID(),
        })
      ).error,
    ).not.toBeNull();
  } finally {
    for (const id of users) await admin.auth.admin.deleteUser(id);
  }
});
