/** Test-only HTTP double for Supabase Auth/PostgREST. Never imported by the application.
 * Exercises SSR cookies, forms and error UI; it does NOT prove real Supabase integration or RLS.
 */
import { createServer } from "node:http";
import { randomUUID, createHmac } from "node:crypto";
import type { Database } from "../../lib/supabase/database.types";
import {
  accessibilityData,
  resetAccessibilityData,
} from "./accessibility-data";
let accessibility = false;
type Profile = Database["public"]["Tables"]["profiles"]["Row"];
const profiles = new Map<string, Profile>();
const privacy = new Map<
  string,
  {
    tutor_retention_days: number | null;
    replies_cleared_at: string | null;
    updated_at: string | null;
  }
>();
const deletedEmails = new Set<string>();
let privacyOutage = false;
const sessions = new Map<
  string,
  { id: string; email: string; expires: number }
>();
const refreshes = new Map<string, { id: string; email: string }>();
let unavailable = false;
let profileOutage = false;
let runnerLesson = false;
let exportOutage = false;
const stamp = () => new Date().toISOString();
function identity(email: string) {
  const user = {
    id: createHmac("sha256", "test-fixture-only")
      .update(email)
      .digest("hex")
      .slice(0, 32)
      .replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, "$1-$2-$3-$4-$5"),
    email,
  };
  if (!profiles.has(user.id))
    profiles.set(user.id, {
      user_id: user.id,
      display_name: "Learner",
      goal: "",
      daily_minutes: 20,
      locale: "en",
      timezone: "UTC",
      onboarding_completed_at: null,
      created_at: stamp(),
      updated_at: stamp(),
    });
  return user;
}
function authUser(user: { id: string; email: string }) {
  return {
    ...user,
    aud: "authenticated",
    role: "authenticated",
    email_confirmed_at: stamp(),
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: {},
    identities: [],
    created_at: stamp(),
  };
}
function session(user: { id: string; email: string }) {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const head = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url");
  const body = Buffer.from(
    JSON.stringify({
      sub: user.id,
      aud: "authenticated",
      role: "authenticated",
      exp,
      iat: Math.floor(Date.now() / 1000),
      jti: randomUUID(),
    }),
  ).toString("base64url");
  const token = `${head}.${body}.${createHmac("sha256", "fixture-only-not-a-real-auth-key").update(`${head}.${body}`).digest("base64url")}`;
  const refresh_token = randomUUID();
  sessions.set(token, { ...user, expires: exp });
  refreshes.set(refresh_token, user);
  return {
    access_token: token,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: exp,
    refresh_token,
    user: authUser(user),
  };
}
const server = createServer(async (req, res) => {
  res.setHeader("content-type", "application/json");
  const url = new URL(req.url ?? "/", "http://127.0.0.1:54331");
  const respond = (status: number, body: unknown) => {
    res.statusCode = status;
    res.end(JSON.stringify(body));
  };
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = chunks.length
    ? JSON.parse(Buffer.concat(chunks).toString())
    : {};
  // Controls exist only inside this test process, bound to loopback.
  if (url.pathname === "/__test/reset") {
    accessibility = false;
    resetAccessibilityData();
    profiles.clear();
    privacy.clear();
    deletedEmails.clear();
    privacyOutage = false;
    sessions.clear();
    refreshes.clear();
    unavailable = false;
    profileOutage = false;
    runnerLesson = false;
    exportOutage = false;
    return respond(200, {});
  }
  if (url.pathname === "/__test/revoke") {
    sessions.clear();
    refreshes.clear();
    return respond(200, {});
  }
  if (url.pathname === "/__test/accessibility") {
    accessibility = !!body.value;
    return respond(200, {});
  }
  if (url.pathname === "/__test/runner-lesson") {
    runnerLesson = !!body.value;
    return respond(200, {});
  }
  if (url.pathname === "/__test/unavailable") {
    unavailable = !!body.value;
    return respond(200, {});
  }
  if (url.pathname === "/__test/profile-outage") {
    profileOutage = !!body.value;
    return respond(200, {});
  }
  if (url.pathname === "/__test/export-outage") {
    exportOutage = !!body.value;
    return respond(200, {});
  }
  if (url.pathname === "/__test/privacy-outage") {
    privacyOutage = !!body.value;
    return respond(200, {});
  }
  if (url.pathname === "/health") return respond(200, {});
  if (url.pathname === "/auth/v1/health")
    return respond(unavailable ? 503 : 200, {
      version: "private-health-canary",
      internal: "observability-private-canary",
    });
  if (unavailable)
    return respond(503, {
      message: "Test-only provider outage",
      code: "unexpected_failure",
    });
  if (url.pathname === "/auth/v1/token") {
    if (url.searchParams.get("grant_type") === "refresh_token") {
      const user = refreshes.get(body.refresh_token);
      if (!user)
        return respond(400, {
          error_code: "refresh_token_not_found",
          msg: "Expired test session",
        });
      return respond(200, session(user));
    }
    if (
      body.password !== "Nexus-test-password-2026" ||
      deletedEmails.has(body.email) ||
      !body.email?.endsWith("@example.test")
    )
      return respond(400, {
        error_code: "invalid_credentials",
        msg: "Invalid credentials",
      });
    return respond(200, session(identity(body.email)));
  }
  if (url.pathname === "/auth/v1/signup")
    return respond(200, {
      user: authUser(identity(body.email)),
      session: null,
    });
  if (url.pathname === "/auth/v1/verify") {
    if (body.type === "signup" && body.token_hash === "fixture-confirmation")
      return respond(200, session(identity("confirmed@example.test")));
    return respond(403, {
      error_code: "otp_expired",
      msg: "Expired fixture token",
    });
  }
  const token = req.headers.authorization?.replace("Bearer ", "") ?? "";
  const user = sessions.get(token);
  if (!user || user.expires < Date.now() / 1000)
    return respond(401, { code: "bad_jwt", msg: "Invalid session" });
  if (url.pathname === "/auth/v1/user") return respond(200, authUser(user));
  if (url.pathname === "/auth/v1/logout") {
    sessions.delete(token);
    return respond(204, null);
  }
  const ownPrivacy = () =>
    privacy.get(user.id) ?? {
      tutor_retention_days: null,
      replies_cleared_at: null,
      updated_at: null,
    };
  if (
    [
      "get_privacy_settings",
      "set_tutor_retention",
      "clear_tutor_replies",
      "delete_learner_account",
    ].some((name) => url.pathname === `/rest/v1/rpc/${name}`)
  ) {
    if (privacyOutage)
      return respond(503, { message: "privacy-private-error-canary" });
    if (url.pathname.endsWith("/get_privacy_settings"))
      return respond(200, ownPrivacy());
    if (url.pathname.endsWith("/set_tutor_retention")) {
      if (![0, 30, 90].includes(body.days)) return respond(400, {});
      const next = {
        ...ownPrivacy(),
        tutor_retention_days: body.days || null,
        updated_at: stamp(),
      };
      privacy.set(user.id, next);
      return respond(200, next);
    }
    if (url.pathname.endsWith("/clear_tutor_replies")) {
      if (body.confirmation !== "CLEAR") return respond(400, {});
      privacy.set(user.id, {
        ...ownPrivacy(),
        replies_cleared_at: stamp(),
        updated_at: stamp(),
      });
      return respond(200, true);
    }
    const expected = createHmac("sha256", "d".repeat(64))
      .update(body.proof ?? "")
      .digest("hex");
    const proof = JSON.parse(body.proof ?? "{}");
    if (
      expected !== body.signature ||
      proof.owner !== user.id ||
      proof.action !== "delete-account-v1" ||
      proof.expires <= Date.now() / 1000
    )
      return respond(403, {});
    profiles.delete(user.id);
    privacy.delete(user.id);
    deletedEmails.add(user.email);
    for (const [token, current] of sessions)
      if (current.id === user.id) sessions.delete(token);
    for (const [token, current] of refreshes)
      if (current.id === user.id) refreshes.delete(token);
    return respond(200, true);
  }
  if (url.pathname === "/rest/v1/rpc/export_learner_data") {
    if (exportOutage)
      return respond(503, { message: "export-private-error-canary" });
    if (Object.keys(body).length)
      return respond(400, { message: "No arguments" });
    return respond(200, {
      format: "nexus-learner-export-v1",
      exported_at: stamp(),
      profile: profiles.get(user.id),
      privacy_preferences: ownPrivacy(),
      staff_role: null,
      enrolments: [],
      lesson_reads: [],
      attempts: [],
      project_submissions: [],
      outcome_events: [],
      content_reports: [],
      tutor_requests: [],
      daily_tutor_usage: [],
      daily_token_usage: [],
      lesson_notes: [
        {
          lesson_id: "synthetic-lesson",
          body: `Private note for ${user.email}`,
        },
      ],
    });
  }
  if (url.pathname === "/rest/v1/profiles") {
    if (profileOutage)
      return respond(503, {
        code: "fixture_outage",
        message: "observability-private-canary",
      });
    const profile = profiles.get(user.id)!;
    if (req.method === "PATCH") {
      for (const key of [
        "display_name",
        "goal",
        "daily_minutes",
        "locale",
        "timezone",
      ] as const)
        Object.assign(profile, { [key]: body[key] ?? profile[key] });
      profile.onboarding_completed_at ??= stamp();
      profile.updated_at = stamp();
    }
    return respond(200, profile);
  }
  // Minimal synthetic lesson for testing the actual runner UI without Docker.
  if (accessibility) {
    const fixture = accessibilityData(
      url.pathname,
      req.method ?? "GET",
      body,
      user.id,
    );
    if (fixture) return respond(fixture.status, fixture.data);
  }
  if (runnerLesson && req.method === "GET") {
    const lesson = {
      id: "runner-test-values",
      course_id: "runner-test",
      position: 1,
      title: "Runner test lesson",
      objective: "Experiment with JavaScript values.",
      body: "A synthetic lesson used only by the browser test fixture.",
      example: "const minutes = 10;\nconsole.log(minutes + 5);",
      minutes: 5,
    };
    if (url.pathname === "/rest/v1/lessons") return respond(200, [lesson]);
    if (url.pathname === "/rest/v1/enrolments")
      return respond(200, [
        { user_id: user.id, course_id: "runner-test", enrolled_at: stamp() },
      ]);
    if (url.pathname === "/rest/v1/exercises")
      return respond(200, [
        {
          id: "runner-test-practice",
          lesson_id: lesson.id,
          kind: "practice",
          prompt: "Which value is logged?",
          options: [
            { id: "a", label: "15" },
            { id: "b", label: "10" },
          ],
        },
      ]);
  }
  if (
    [
      "course_versions",
      "lessons",
      "exercises",
      "enrolments",
      "lesson_reads",
      "attempts",
      "exercise_evidence",
      "review_schedule",
      "staff_roles",
      "content_reports",
      "lesson_notes",
      "learning_outcome_events",
      "learning_outcome_summary",
      "project_versions",
      "project_submissions",
    ].some((table) => url.pathname === `/rest/v1/${table}`)
  )
    return respond(200, []);
  return respond(404, { message: "Unsupported fixture request" });
});
server.listen(54331, "127.0.0.1");
for (const signal of ["SIGTERM", "SIGINT"] as const)
  process.on(signal, () => server.close(() => process.exit(0)));
