/** Test-only HTTP double for Supabase Auth/PostgREST. Never imported by the application.
 * Exercises SSR cookies, forms and error UI; it does NOT prove real Supabase integration or RLS.
 */
import { createServer } from "node:http";
import { randomUUID, createHmac } from "node:crypto";
import type { Database } from "../../lib/supabase/database.types";
type Profile = Database["public"]["Tables"]["profiles"]["Row"];
const profiles = new Map<string, Profile>();
const sessions = new Map<
  string,
  { id: string; email: string; expires: number }
>();
const refreshes = new Map<string, { id: string; email: string }>();
let unavailable = false;
let profileOutage = false;
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
    profiles.clear();
    sessions.clear();
    refreshes.clear();
    unavailable = false;
    profileOutage = false;
    return respond(200, {});
  }
  if (url.pathname === "/__test/revoke") {
    sessions.clear();
    refreshes.clear();
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
  if (url.pathname === "/health") return respond(200, {});
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
  if (url.pathname === "/rest/v1/profiles") {
    if (profileOutage)
      return respond(503, {
        code: "fixture_outage",
        message: "Test-only storage outage",
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
