import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  copyFileSync,
  rmSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { defaultWorksheet } from "../modules/system-design/content";
import {
  hostedProviderContext,
  providerChildEnvironment,
} from "./ci-provider-policy";

// GitHub-hosted only. Raw child output is discarded, never saved or forwarded.
const destination = "test-results/provider-artifacts";
type Stage = {
  name: string;
  passed: boolean;
  durationMs: number;
  exitCode: number | null;
};
async function main() {
  const context = hostedProviderContext(process.env, process.cwd());
  const privateDir = join(context.temporary, context.project);
  const marker = join(privateDir, "owned");
  const env = providerChildEnvironment(process.env);
  env.DOCKER_CONFIG = join(privateDir, "docker-config");
  const cli = resolve("node_modules/.bin/supabase");
  const stages: Stage[] = [];
  const digest = (value: string) =>
    createHash("sha256").update(value).digest("hex");
  function command(
    name: string,
    bin: string,
    args: string[],
    timeout = 300_000,
    input?: string,
  ) {
    const started = Date.now();
    const result = spawnSync(bin, args, {
      env,
      encoding: "utf8",
      stdio: [input === undefined ? "ignore" : "pipe", "pipe", "pipe"],
      input,
      timeout,
      maxBuffer: 32 * 1024 * 1024,
    });
    const passed = result.status === 0 && !result.error;
    stages.push({
      name,
      passed,
      exitCode: result.status,
      durationMs: Date.now() - started,
    });
    console.log(
      `${name}: ${passed ? "passed" : "failed"}. Raw output withheld.`,
    );
    return { passed, stdout: result.stdout ?? "" };
  }
  function required(
    name: string,
    bin: string,
    args: string[],
    timeout?: number,
  ) {
    if (!command(name, bin, args, timeout).passed)
      throw new Error("Required stage failed");
  }
  function sql(name: string, source: string) {
    const result = command(
      name,
      "docker",
      [
        "exec",
        "-i",
        `supabase_db_${context.project}`,
        "psql",
        "-U",
        "postgres",
        "-d",
        "postgres",
        "-At",
        "-v",
        "ON_ERROR_STOP=1",
      ],
      120_000,
      source,
    );
    if (!result.passed) throw new Error("Database verification failed");
    return result.stdout;
  }
  function cleanup() {
    if (!existsSync(marker)) return;
    if (readFileSync(marker, "utf8") !== context.project)
      throw new Error("Invalid cleanup ownership");
    const stopped = command(
      "cleanup",
      cli,
      ["stop", "--project-id", context.project, "--no-backup"],
      120_000,
    );
    // These exist only in this guarded fresh checkout, after ownership was recorded.
    rmSync(".env.local", { force: true });
    rmSync("supabase/.temp", { recursive: true, force: true });
    rmSync("supabase/.branches", { recursive: true, force: true });
    rmSync("test-results/integration", { recursive: true, force: true });
    copyFileSync(join(privateDir, "config.original"), "supabase/config.toml");
    let empty = stopped.passed;
    for (const [resource, args] of [
      ["containers", ["ps", "-aq"]],
      ["volumes", ["volume", "ls", "-q"]],
      ["networks", ["network", "ls", "-q"]],
    ] as const) {
      const verified = command(`cleanup-${resource}`, "docker", [
        ...args,
        "--filter",
        `label=com.supabase.cli.project=${context.project}`,
      ]);
      if (!verified.passed || verified.stdout.trim()) empty = false;
    }
    stages.push({
      name: "cleanup-inventory-empty",
      passed: empty,
      exitCode: null,
      durationMs: 0,
    });
    // No shared prune/image deletion: the entire GitHub-hosted VM is disposable.
    if (empty) rmSync(privateDir, { recursive: true, force: true });
  }
  if (process.argv.includes("--cleanup")) {
    cleanup();
    if (stages.some((s) => !s.passed)) process.exitCode = 1;
    return;
  }
  let types:
    | { originalSha256: string; generatedSha256: string; drift: boolean }
    | undefined;
  let migrationVersions: string[] = [];
  let tapCounts: { files: number; tests: number } | undefined;
  let browser: { accepted: boolean } | undefined;
  let completed = false;
  try {
    // Refuse existing config/state rather than guessing it is disposable.
    if (
      readdirSync(".").some((f) => f.startsWith(".env") && f !== ".env.example")
    )
      throw new Error("Existing environment files are not disposable");
    for (const file of [
      ".env",
      ".env.local",
      ".env.production",
      "supabase/.temp",
      "supabase/.branches",
      destination,
    ])
      if (existsSync(file)) throw new Error("Fresh checkout required");
    mkdirSync(privateDir, { recursive: false, mode: 0o700 });
    mkdirSync(env.DOCKER_CONFIG!, { mode: 0o700 });
    copyFileSync("supabase/config.toml", join(privateDir, "config.original"));
    writeFileSync(marker, context.project, { mode: 0o600 });
    const config = readFileSync("supabase/config.toml", "utf8");
    if (
      !/^project_id = "nexus_learning_platform"$/m.test(config) ||
      !/\[analytics\]\nenabled = true/.test(config)
    )
      throw new Error("Review provider configuration changes first");
    const expectedVersions = readdirSync("supabase/migrations")
      .filter((f) => /^\d{12,14}_.+\.sql$/.test(f))
      .map((f) => f.split("_")[0])
      .sort();
    if (
      expectedVersions.at(-1) !== "202611010001" ||
      expectedVersions.at(-2) !== "202610290001" ||
      expectedVersions.length < 2
    )
      throw new Error("Review migration scope before acceptance");
    writeFileSync(
      "supabase/config.toml",
      config
        .replace(
          /^project_id = "nexus_learning_platform"$/m,
          `project_id = "${context.project}"`,
        )
        .replace(
          /\[analytics\]\nenabled = true/,
          "[analytics]\nenabled = false",
        ),
    );
    required(
      "start",
      cli,
      [
        "start",
        "-x",
        "vector,logflare,studio,edge-runtime,realtime,storage-api,imgproxy,supavisor",
      ],
      600_000,
    );
    required(
      "migration-replay-prefix",
      cli,
      [
        "db",
        "reset",
        "--local",
        "--version",
        expectedVersions.at(-2)!,
        "--yes",
      ],
      240_000,
    );
    // Synthetic SQL upgrade fixture, distinct from the later real-Auth browser journey.
    const legacy = randomUUID();
    const legacyWorksheet = JSON.stringify(defaultWorksheet).replaceAll(
      "'",
      "''",
    );
    sql(
      "legacy-js-before-upgrade",
      `begin;
      insert into auth.users(id,email) values('${legacy}','legacy-${legacy}@example.test');
      update public.profiles set goal='Preserve legacy JavaScript learning' where user_id='${legacy}';
      set local role authenticated;
      select set_config('request.jwt.claim.sub','${legacy}',true);
      select public.enrol_course('javascript-foundations-v1');
      select public.mark_lesson_read('js-v1-values');
      select public.enrol_course('system-design-studio-v1');
      select public.save_studio_worksheet('campus-events-v1',0,'${randomUUID()}','${legacyWorksheet}'::jsonb);
      commit;`,
    );
    required("studio-migration-upgrade", cli, [
      "migration",
      "up",
      "--local",
      "--yes",
    ]);
    sql(
      "legacy-js-after-upgrade",
      `do $$ begin
      if not exists(select 1 from public.profiles where user_id='${legacy}' and goal='Preserve legacy JavaScript learning')
        or not exists(select 1 from public.enrolments where user_id='${legacy}' and course_id='javascript-foundations-v1')
        or not exists(select 1 from public.lesson_reads where user_id='${legacy}' and lesson_id='js-v1-values')
        or not exists(select 1 from public.course_versions where id='javascript-foundations-v1' and experience_kind='lessons')
        or not exists(select 1 from public.studio_worksheet_revisions where user_id='${legacy}' and scenario_id='campus-events-v1' and revision=1 and worksheet='${legacyWorksheet}'::jsonb)
      then raise exception 'Legacy JavaScript or worksheet evidence changed'; end if;
      end $$;
      delete from auth.users where id='${legacy}';`,
    );
    migrationVersions = sql(
      "migration-ledger",
      "select version from supabase_migrations.schema_migrations order by version;",
    )
      .trim()
      .split(/\r?\n/)
      .filter((v) => /^\d{12,14}$/.test(v));
    if (JSON.stringify(migrationVersions) !== JSON.stringify(expectedVersions))
      throw new Error("Studio migration not verified");
    required("migration-up-noop", cli, ["migration", "up", "--local", "--yes"]);
    for (const script of [
      "local-env.ts",
      "setup-tutor-receipts.ts",
      "setup-account-deletion.ts",
    ])
      required(script, process.execPath, [
        "--import",
        "tsx",
        `scripts/${script}`,
      ]);
    const tap = command("pgtap", "npm", ["run", "db:test:local"]);
    const counts = /Files=(\d+), Tests=(\d+)/.exec(tap.stdout);
    if (counts)
      tapCounts = { files: Number(counts[1]), tests: Number(counts[2]) };
    const typePath = "lib/supabase/database.types.ts";
    const original = readFileSync(typePath, "utf8");
    // Check committed declarations BEFORE generation. Drift keeps the job failed.
    command("committed-type-drift", "npm", ["run", "db:types:check"]);
    required("full-provider-type-generation", "npm", ["run", "db:types"]);
    const generated = readFileSync(typePath, "utf8");
    types = {
      originalSha256: digest(original),
      generatedSha256: digest(generated),
      drift: original !== generated,
    };
    if (types.drift)
      stages.push({
        name: "types-match-committed",
        passed: false,
        exitCode: null,
        durationMs: 0,
      });
    required("generated-type-recheck", "npm", ["run", "db:types:check"]);
    mkdirSync(destination, { recursive: true });
    // Generated schema declarations only: no database rows, dumps or credentials.
    copyFileSync(typePath, `${destination}/public-schema.types.ts`);
    required("build", "npm", ["run", "build"], 360_000);
    const tested = command(
      "provider-browser",
      "npm",
      [
        "run",
        "test:integration",
        "--",
        "--reporter=./tests/support/provider-reporter.ts",
      ],
      600_000,
    );
    const report = "test-results/provider-report/browser.json";
    if (existsSync(report)) {
      browser = JSON.parse(readFileSync(report, "utf8"));
      copyFileSync(report, `${destination}/browser.json`);
    }
    if (!tested.passed || browser?.accepted !== true)
      throw new Error("Browser acceptance not verified");
    completed = true;
  } catch {
    stages.push({
      name: "acceptance-incomplete",
      passed: false,
      exitCode: null,
      durationMs: 0,
    });
    console.error(
      "Provider acceptance incomplete; consult the sanitised stage report.",
    );
  } finally {
    try {
      cleanup();
    } catch {
      stages.push({
        name: "cleanup",
        passed: false,
        exitCode: null,
        durationMs: 0,
      });
    }
    const passed =
      completed && stages.every((s) => s.passed) && types?.drift === false;
    mkdirSync(destination, { recursive: true });
    const screenshotFiles = [
      "workshop-390.png",
      "workshop-1440.png",
      "foundations-390.png",
      "foundations-1440.png",
    ];
    const screenshotsPresent = screenshotFiles.every((file) =>
      existsSync(`test-results/verification/studio-provider/${file}`),
    );
    if (passed && screenshotsPresent) {
      for (const file of screenshotFiles) {
        copyFileSync(
          `test-results/verification/studio-provider/${file}`,
          `${destination}/${file}`,
        );
      }
    }
    if (passed && !screenshotsPresent)
      stages.push({
        name: "screenshots-missing",
        passed: false,
        exitCode: null,
        durationMs: 0,
      });
    const accepted = passed && stages.every((s) => s.passed);
    writeFileSync(
      `${destination}/acceptance.json`,
      JSON.stringify(
        {
          format: "studio-provider-acceptance-v1",
          accepted,
          environment: "ephemeral-github-hosted-linux-supabase",
          sha: context.sha,
          run: context.run,
          attempt: context.attempt,
          migrationVersions,
          types,
          tapCounts,
          stages,
          screenshots: accepted ? screenshotFiles : [],
          limits: [
            "Synthetic accounts only",
            "Cookie-session loss is not forced provider-side JWT expiry",
            "No hosted Supabase, physical device or screen-reader verification",
          ],
        },
        null,
        2,
      ),
    );
    if (!accepted) process.exitCode = 1;
  }
}
void main().catch(() => {
  console.error(
    "Provider acceptance refused or failed. Raw errors are not logged.",
  );
  process.exitCode = 1;
});
