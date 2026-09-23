import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { format } from "prettier";

// Generate from the actual LOCAL provider, including relationships and RPC signatures.
async function main() {
  const generated = execFileSync(
    resolve("node_modules/.bin/supabase"),
    ["gen", "types", "typescript", "--local", "--schema", "public"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  const output = await format(
    "// Generated from local Supabase. Run npm run db:types; do not hand-edit.\n" +
      generated,
    { parser: "typescript" },
  );
  const target = "lib/supabase/database.types.ts";
  if (process.argv.includes("--check")) {
    if ((await readFile(target, "utf8")) !== output)
      throw new Error(
        "Database types drifted; apply local migrations and run npm run db:types",
      );
  } else await writeFile(target, output);
}
void main();
