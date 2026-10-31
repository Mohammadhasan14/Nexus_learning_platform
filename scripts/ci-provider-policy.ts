import { basename, resolve } from "node:path";

/** Pure policy helpers; importing this module never starts a service. */
export function hostedProviderContext(
  env: Readonly<Record<string, string | undefined>>,
  cwd: string,
) {
  if (
    env.GITHUB_ACTIONS !== "true" ||
    env.RUNNER_ENVIRONMENT !== "github-hosted" ||
    env.RUNNER_OS !== "Linux" ||
    !/^\d+$/.test(env.GITHUB_RUN_ID ?? "") ||
    !/^\d+$/.test(env.GITHUB_RUN_ATTEMPT ?? "") ||
    !/^[a-f0-9]{40}$/.test(env.GITHUB_SHA ?? "") ||
    !env.GITHUB_WORKSPACE ||
    resolve(env.GITHUB_WORKSPACE) !== resolve(cwd) ||
    !env.RUNNER_TEMP
  )
    throw new Error("Provider acceptance requires a GitHub-hosted Linux job.");
  return {
    project: `nexus_studio_ci_${env.GITHUB_RUN_ID}_${env.GITHUB_RUN_ATTEMPT}`,
    run: env.GITHUB_RUN_ID!,
    attempt: env.GITHUB_RUN_ATTEMPT!,
    sha: env.GITHUB_SHA!,
    temporary: resolve(env.RUNNER_TEMP),
  };
}

/** Do not inherit provider credentials, hosted URLs or user Docker contexts. */
export function providerChildEnvironment(
  env: Readonly<Record<string, string | undefined>>,
) {
  const result: NodeJS.ProcessEnv = {
    CI: "true",
    NODE_ENV: "production",
    APP_ENV: "local",
    SUPABASE_PROJECT_ENV: "local",
    TUTOR_MODE: "scripted",
    LIVE_TUTOR_SMOKE: "false",
    DOCKER_HOST: "unix:///var/run/docker.sock",
    NEXT_TELEMETRY_DISABLED: "1",
  };
  for (const key of ["PATH", "HOME", "TMPDIR", "LANG", "RUNNER_TEMP"])
    if (env[key]) result[key] = env[key];
  return result;
}

export type SafeBrowserCase = {
  file: string;
  line: number;
  status: string;
  expected: string;
  durationMs: number;
};
export function browserCase(input: SafeBrowserCase): SafeBrowserCase {
  const file = basename(input.file);
  const statuses = ["passed", "failed", "timedOut", "skipped", "interrupted"];
  return {
    file: /^[a-z-]+\.spec\.ts$/.test(file) ? file : "unknown.spec.ts",
    line: Number.isSafeInteger(input.line) && input.line > 0 ? input.line : 0,
    status: statuses.includes(input.status) ? input.status : "failed",
    expected: statuses.includes(input.expected) ? input.expected : "failed",
    durationMs: Math.max(
      0,
      Math.min(3_600_000, Math.round(input.durationMs) || 0),
    ),
  };
}

/** A skipped M1/privacy/JS case must fail acceptance, even if Playwright exits 0. */
export function browserAcceptance(
  cases: SafeBrowserCase[],
  runnerError: boolean,
) {
  const optional = new Set(["live-tutor.spec.ts", "tutor-stream.spec.ts"]);
  const required = [
    "system-design.spec.ts",
    "privacy-controls.spec.ts",
    "privacy-export.spec.ts",
    "course-versions.spec.ts",
    "learning.spec.ts",
    "local-auth.spec.ts",
    "grading.spec.ts",
    "tutor.spec.ts",
    "token-usage.spec.ts",
  ];
  return (
    !runnerError &&
    required.every((file) =>
      cases.some((c) => c.file === file && c.status === "passed"),
    ) &&
    cases.filter(
      (c) => c.file === "system-design.spec.ts" && c.status === "passed",
    ).length >= 2 &&
    cases.every(
      (c) =>
        c.status === "passed" ||
        (c.status === "skipped" && optional.has(c.file)),
    )
  );
}
