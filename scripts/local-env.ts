import { writeFileSync } from "node:fs";
import { localSupabase } from "./local-supabase";
const { url, key } = localSupabase();
// Exclusive create deliberately preserves an existing developer environment file.
writeFileSync(
  ".env.local",
  `APP_ENV=local\nSUPABASE_PROJECT_ENV=local\nSUPABASE_URL=${url}\nSUPABASE_PUBLISHABLE_KEY=${key}\n`,
  { flag: "wx", mode: 0o600 },
);
console.log(
  "Created local-only .env.local without privileged keys. Existing files are never overwritten.",
);
