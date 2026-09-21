import { test } from "node:test";
import assert from "node:assert/strict";
import { readBackendConfig } from "../../lib/config";
import {
  safeDestination,
  credentialsSchema,
  registrationSchema,
} from "../../lib/auth/validation";
import { profileSchema } from "../../modules/profile/validation";

const local = {
  APP_ENV: "local",
  SUPABASE_PROJECT_ENV: "local",
  SUPABASE_URL: "http://127.0.0.1:54321",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
};
test("environment guard fails closed on cross-environment and privileged configurations", () => {
  assert.equal(readBackendConfig({}), null);
  assert.equal(readBackendConfig(local)?.secureCookies, false);
  for (const changed of [
    { SUPABASE_PROJECT_ENV: "production" },
    { SUPABASE_URL: "https://production.supabase.co" },
    { VERCEL_ENV: "preview" },
    { SUPABASE_PUBLISHABLE_KEY: "sb_secret_bad" },
    { SUPABASE_PUBLISHABLE_KEY: "invalid" },
    { APP_ENV: "" },
  ])
    assert.throws(() => readBackendConfig({ ...local, ...changed }));
  const staging = {
    ...local,
    APP_ENV: "staging",
    SUPABASE_PROJECT_ENV: "staging",
    SUPABASE_URL: "https://stage.supabase.co",
    SUPABASE_EXPECTED_PROJECT_REF: "stage",
    SUPABASE_PRODUCTION_PROJECT_REF: "prod",
    VERCEL_ENV: "preview",
  };
  assert.equal(readBackendConfig(staging)?.secureCookies, true);
  assert.throws(() =>
    readBackendConfig({ ...staging, SUPABASE_PRODUCTION_PROJECT_REF: "stage" }),
  );
  assert.throws(() =>
    readBackendConfig({
      ...staging,
      APP_ENV: "production",
      SUPABASE_PROJECT_ENV: "production",
      SUPABASE_EXPECTED_PROJECT_REF: "prod",
      SUPABASE_URL: "https://prod.supabase.co",
    }),
  );
});
test("redirects accept only internal destinations", () => {
  for (const path of [
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "%2f%2fevil",
    "/auth/confirm",
    "/dashboard?next=https://evil.example",
    undefined,
  ])
    assert.equal(safeDestination(path), "/dashboard");
  assert.equal(safeDestination("/settings"), "/settings");
});
test("credentials bounded without trimming passwords", () => {
  assert.equal(
    credentialsSchema.parse({
      email: " a@example.com ",
      password: " spaces matter ",
    }).password,
    " spaces matter ",
  );
  assert.equal(
    registrationSchema.safeParse({ email: "a@example.com", password: "short" })
      .success,
    false,
  );
});
test("preferences validate timezones, goals, study limits and ignore forged ownership", () => {
  const good = {
    display_name: "Hasan",
    goal: "Build useful JavaScript apps",
    daily_minutes: "30",
    locale: "en-IN",
    timezone: "Asia/Kolkata",
  };
  assert.equal(
    profileSchema.parse({ ...good, user_id: "forged", role: "admin" })
      .daily_minutes,
    30,
  );
  assert.ok(
    !("user_id" in profileSchema.parse({ ...good, user_id: "forged" })),
  );
  for (const invalid of [
    { timezone: "Mars/Olympus" },
    { daily_minutes: "0" },
    { daily_minutes: "12.5" },
    { goal: "" },
    { display_name: " " },
    { locale: "xx" },
  ])
    assert.equal(
      profileSchema.safeParse({ ...good, ...invalid }).success,
      false,
    );
});
