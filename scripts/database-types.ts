import { readFile, writeFile } from "node:fs/promises";
import { migrationDatabase } from "./database-harness";
import { format } from "prettier";
async function main() {
  const db = await migrationDatabase();
  type Column = {
    table_name: string;
    column_name: string;
    data_type: string;
    is_nullable: string;
    column_default: string | null;
  };
  const { rows } = await db.query<Column>(
    `select table_name,column_name,data_type,is_nullable,column_default from information_schema.columns where table_schema='public' order by table_name,ordinal_position`,
  );
  const tableNames = [...new Set(rows.map((r) => r.table_name))];
  const scalar = (r: Column) =>
    `${r.data_type === "integer" ? "number" : "string"}${r.is_nullable === "YES" ? " | null" : ""}`;
  const tables = tableNames.map((name) => {
    const columns = rows.filter((r) => r.table_name === name);
    return `${name}: { ${["Row", "Insert", "Update"].map((mode) => `${mode}: { ${columns.map((r) => `${r.column_name}${mode === "Update" || (mode === "Insert" && (r.column_default !== null || r.is_nullable === "YES")) ? "?" : ""}: ${scalar(r)};`).join("\n")} };`).join("\n")} Relationships: [] }`;
  });
  const output = await format(
    `// Generated from migration catalogs using scripts/database-types.ts. Do not hand-edit.\n// PGlite verifies public-schema structure; live Supabase verification remains separate.\nexport type Database = { public: { Tables: { ${tables.join(";\n")} }; Views: { [_ in never]: never }; Functions: { [_ in never]: never }; Enums: { [_ in never]: never }; CompositeTypes: { [_ in never]: never } } };`,
    { parser: "typescript" },
  );
  const target = "lib/supabase/database.types.ts";
  if (process.argv.includes("--check")) {
    if ((await readFile(target, "utf8")) !== output)
      throw new Error("Database types drifted; run npm run db:types");
  } else await writeFile(target, output);
  await db.close();
}
void main();
