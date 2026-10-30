import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { localSupabase } from "../../scripts/local-supabase";
/** Test-only SQL. The operator must separately authorise this project's disposable runtime. */
export function localSql(sql: string) {
  localSupabase(); // Loopback is necessary; it does not establish disposability.
  const project = readFileSync("supabase/config.toml", "utf8").match(
    /^project_id\s*=\s*"([a-zA-Z0-9_-]+)"/m,
  )?.[1];
  if (!project) throw new Error("Local project identity required");
  return execFileSync(
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
      "-q",
    ],
    { input: sql, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
  );
}
