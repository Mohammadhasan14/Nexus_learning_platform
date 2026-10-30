/** Generate only M1 additions from the isolated migration catalog. Does not contact a provider.
 * Full Supabase generation/drift verification remains npm run db:types[:check] on an authorised stack.
 */
import ts from "typescript";
import { readFile, writeFile } from "node:fs/promises";
import { format } from "prettier";
import { migrationDatabase } from "./database-harness";
async function main() {
  const target = "lib/supabase/database.types.ts";
  const db = await migrationDatabase();
  try {
    const source = await readFile(target, "utf8");
    const ast = ts.createSourceFile(
      target,
      source,
      ts.ScriptTarget.Latest,
      true,
    );
    const alias = ast.statements.find(
      (n): n is ts.TypeAliasDeclaration =>
        ts.isTypeAliasDeclaration(n) && n.name.text === "Database",
    )!;
    const member = (node: ts.TypeLiteralNode, key: string) =>
      node.members.find(
        (n) => n.name?.getText(ast) === key,
      ) as ts.PropertySignature;
    const pub = member(alias.type as ts.TypeLiteralNode, "public")
      .type as ts.TypeLiteralNode;
    const tables = member(pub, "Tables").type as ts.TypeLiteralNode;
    const functions = member(pub, "Functions").type as ts.TypeLiteralNode;
    const replacements: { start: number; end: number; text: string }[] = [];
    const type = (udt: string) =>
      ["int2", "int4", "int8", "float4", "float8", "numeric"].includes(udt)
        ? "number"
        : udt === "bool"
          ? "boolean"
          : udt === "jsonb"
            ? "Json"
            : "string";
    for (const name of [
      "course_versions",
      "studio_scenario_versions",
      "studio_worksheets",
      "studio_worksheet_revisions",
    ]) {
      const cols = (
        await db.query<{
          column_name: string;
          udt_name: string;
          is_nullable: string;
          column_default: string | null;
        }>(
          "select column_name,udt_name,is_nullable,column_default from information_schema.columns where table_schema='public' and table_name=$1 order by column_name",
          [name],
        )
      ).rows;
      const rels = (
        await db.query<{
          name: string;
          columns: string[];
          relation: string;
          targets: string[];
        }>(
          `select c.conname name,array(select a.attname from unnest(c.conkey) with ordinality k(num,ord) join pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.num order by k.ord) columns, t.relname relation,array(select a.attname from unnest(c.confkey) with ordinality k(num,ord) join pg_attribute a on a.attrelid=c.confrelid and a.attnum=k.num order by k.ord) targets from pg_constraint c join pg_class t on t.oid=c.confrelid join pg_namespace n on n.oid=t.relnamespace where c.conrelid=('public.'||$1)::regclass and c.contype='f' and n.nspname='public' order by c.conname`,
          [name],
        )
      ).rows;
      const body = ["Row", "Insert", "Update"]
        .map(
          (mode) =>
            `${mode}: {${cols.map((c) => `${c.column_name}${mode === "Update" || (mode === "Insert" && (c.column_default !== null || c.is_nullable === "YES")) ? "?" : ""}: ${type(c.udt_name)}${c.is_nullable === "YES" ? " | null" : ""};`).join("")}};`,
        )
        .join("");
      const relationships = rels
        .map(
          (r) =>
            `{foreignKeyName:${JSON.stringify(r.name)}; columns:${JSON.stringify(r.columns)}; isOneToOne:false; referencedRelation:${JSON.stringify(r.relation)}; referencedColumns:${JSON.stringify(r.targets)};}`,
        )
        .join(",");
      const text = `${name}: {${body} Relationships:[${relationships}];};`;
      const old = member(tables, name);
      replacements.push(
        old
          ? { start: old.getStart(ast), end: old.end, text }
          : { start: tables.end - 1, end: tables.end - 1, text },
      );
    }
    for (const name of ["get_studio_workshop", "save_studio_worksheet"]) {
      const row = (
        await db.query<{ names: string[]; types: string[] }>(
          `select proargnames names,array(select t.typname from unnest(p.proargtypes::oid[]) with ordinality a(id,ord) join pg_type t on t.oid=a.id order by ord) types from pg_proc p join pg_namespace n on p.pronamespace=n.oid where n.nspname='public' and p.proname=$1`,
          [name],
        )
      ).rows[0];
      const text = `${name}: {Args:{${row.names
        .map((n, i) => ({ name: n, type: type(row.types[i]) }))
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((a) => `${a.name}:${a.type};`)
        .join("")}};Returns:Json;};`;
      const old = member(functions, name);
      replacements.push(
        old
          ? { start: old.getStart(ast), end: old.end, text }
          : { start: functions.end - 1, end: functions.end - 1, text },
      );
    }
    let output = source;
    for (const r of replacements.sort((a, b) => b.start - a.start))
      output = output.slice(0, r.start) + r.text + output.slice(r.end);
    output = output
      .replace(
        /^\/\/ Base generated[^\n]*\n\/\/ Run scripts[^\n]*\n/,
        "// Generated database types. Run npm run db:types; do not hand-edit.\n",
      )
      .replace(
        "// Generated from local Supabase. Run npm run db:types; do not hand-edit.",
        "// Generated database types. Run npm run db:types; do not hand-edit.",
      );
    // Match provider alphabetic member ordering while preserving unaffected definitions.
    const updated = ts.createSourceFile(
      target,
      output,
      ts.ScriptTarget.Latest,
      true,
    );
    const root = updated.statements.find(
      (n): n is ts.TypeAliasDeclaration =>
        ts.isTypeAliasDeclaration(n) && n.name.text === "Database",
    )!;
    const property = (node: ts.TypeLiteralNode, key: string) =>
      (
        node.members.find(
          (n) => n.name?.getText(updated) === key,
        ) as ts.PropertySignature
      ).type as ts.TypeLiteralNode;
    const publicType = property(root.type as ts.TypeLiteralNode, "public");
    for (const group of ["Functions", "Tables"]) {
      const node = property(publicType, group);
      const sorted = [...node.members]
        .sort((a, b) =>
          a.name!.getText(updated).localeCompare(b.name!.getText(updated)),
        )
        .map((n) => n.getText(updated))
        .join("\n");
      // Functions occurs after Tables, so replacing it first keeps the table positions valid.
      output =
        output.slice(0, node.getStart(updated)) +
        "{" +
        sorted +
        "}" +
        output.slice(node.end);
    }
    await writeFile(target, await format(output, { parser: "typescript" }));
    console.log(
      "M1 types generated from isolated catalog; no provider drift verification claimed.",
    );
  } finally {
    await db.close();
  }
}
void main();
