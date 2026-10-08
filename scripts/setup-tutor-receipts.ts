import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { localSupabase } from "./local-supabase";

// Explicit operator command. SQL receives its secret through stdin, never argv/logs.
try {
  const path = ".env.local";
  const existing = readFileSync(path, "utf8");
  const env = parseEnv(existing);
  if (
    env.APP_ENV !== "local" ||
    env.SUPABASE_PROJECT_ENV !== "local" ||
    !["127.0.0.1", "localhost"].includes(
      new URL(env.SUPABASE_URL ?? "").hostname,
    )
  )
    throw new Error("Local app configuration required");
  localSupabase(); // Assert a running local CLI project, never a linked database.
  const project = readFileSync("supabase/config.toml", "utf8").match(
    /^project_id\s*=\s*"([a-zA-Z0-9_-]+)"/m,
  )?.[1];
  if (!project) throw new Error("Local project identity required");
  const current = env.TUTOR_RECEIPT_SIGNING_KEY;
  if (current && !/^[a-f0-9]{64}$/.test(current))
    throw new Error("Invalid existing receipt key");
  const key = current || randomBytes(32).toString("hex");
  execFileSync(
    "docker",
    [
      "exec",
      "-i",
      `supabase_db_${project}`,
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    {
      input: `insert into tutor_private.receipt_keys(singleton,secret) values(true,'${key}') on conflict(singleton) do update set secret=excluded.secret;`,
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
  const updated =
    existing.replace(/^TUTOR_RECEIPT_SIGNING_KEY=.*\r?\n?/gm, "").trimEnd() +
    `\nTUTOR_RECEIPT_SIGNING_KEY=${key}\n`;
  writeFileSync(path, updated, { mode: 0o600 });
  console.log(
    "Local receipt signing configured. Restart npm run dev. No secret was displayed.",
  );
} catch {
  console.error(
    "Receipt setup failed. Check local configuration, Docker access and applied migrations. No credentials were printed.",
  );
  process.exitCode = 1;
}
