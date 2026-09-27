import { execFileSync } from "node:child_process";
import { localSupabase } from "../../scripts/local-supabase";
/** Test-only SQL for disposable fixtures in the known local Docker project. Never imported by app code. */
export function localSql(sql: string) {
  localSupabase(); // Fails unless this is the loopback development stack.
  return execFileSync(
    "docker",
    [
      "exec",
      "-i",
      "supabase_db_nexus_learning_platform",
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
