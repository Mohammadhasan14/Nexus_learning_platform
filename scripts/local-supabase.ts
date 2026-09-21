import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

/** Local CLI only. Never accepts a linked/remote project or prints credential values. */
export function localSupabase() {
  const status = JSON.parse(
    execFileSync(
      resolve("node_modules/.bin/supabase"),
      ["status", "--output", "json"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    ),
  );
  const url = status.API_URL;
  const key = status.PUBLISHABLE_KEY || status.ANON_KEY;
  const serviceKey = status.SERVICE_ROLE_KEY || status.SECRET_KEY;
  if (
    typeof url !== "string" ||
    !["127.0.0.1", "localhost"].includes(new URL(url).hostname) ||
    typeof key !== "string" ||
    typeof serviceKey !== "string"
  )
    throw new Error(
      "Expected running local Supabase with local API and test admin keys. Run npm run db:start.",
    );
  return { url, key, serviceKey };
}
