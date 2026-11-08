import { test } from "node:test";
import assert from "node:assert/strict";
import {
  hostedProviderContext,
  providerChildEnvironment,
  browserCase,
  browserAcceptance,
  failureDetails,
} from "../../scripts/ci-provider-policy";

const hosted = {
  GITHUB_ACTIONS: "true",
  RUNNER_ENVIRONMENT: "github-hosted",
  RUNNER_OS: "Linux",
  GITHUB_RUN_ID: "12345",
  GITHUB_RUN_ATTEMPT: "1",
  GITHUB_SHA: "a".repeat(40),
  GITHUB_WORKSPACE: process.cwd(),
  RUNNER_TEMP: "/tmp",
};
test("failure diagnostics expose public rule IDs and source locations without private payloads", () => {
  const canary = "private-cookie-token-email-canary";
  const detail = failureDetails(
    [
      {
        message: `expect failed: { "id": "page-has-heading-one", "html": "${canary}", "target": "${canary}" }, { "id": "landmark-unique", "html": "${canary}" }`,
        stack: `Error: ${canary}\n at tests/integration/notes-search.spec.ts:229:81\n at tests/integration/${canary}.spec.ts:9:1`,
        location: {
          file: "/workspace/tests/integration/notes-search.spec.ts",
          line: 229,
          column: 81,
        },
      },
    ],
    "notes-search.spec.ts",
  );
  assert.ok(!JSON.stringify(detail).includes(canary));
  assert.deepEqual(detail, {
    kind: "accessibility",
    rules: ["page-has-heading-one", "landmark-unique"],
    locations: [{ file: "notes-search.spec.ts", line: 229, column: 81 }],
  });
});
test("provider orchestration refuses local/self-hosted/mismatched contexts before startup", () => {
  assert.equal(
    hostedProviderContext(hosted, process.cwd()).project,
    "nexus_studio_ci_12345_1",
  );
  for (const env of [
    {},
    { ...hosted, RUNNER_ENVIRONMENT: "self-hosted" },
    { ...hosted, GITHUB_WORKSPACE: "/other" },
    { ...hosted, GITHUB_RUN_ID: "../unsafe" },
  ])
    assert.throws(() => hostedProviderContext(env, process.cwd()));
});
test("child processes cannot inherit production credentials or a remote Docker context", () => {
  const canary = "private-secret-canary";
  const env = providerChildEnvironment({
    PATH: "/bin",
    SUPABASE_ACCESS_TOKEN: canary,
    SUPABASE_URL: "https://shared.example",
    DATABASE_URL: canary,
    GITHUB_TOKEN: canary,
    DOCKER_HOST: "tcp://shared.example:2376",
    TUTOR_MODE: "live",
    LIVE_TUTOR_SMOKE: "true",
  });
  assert.ok(!JSON.stringify(env).includes(canary));
  assert.ok(!JSON.stringify(env).includes("shared.example"));
  assert.equal(env.TUTOR_MODE, "scripted");
  assert.equal(env.LIVE_TUTOR_SMOKE, "false");
});
test("browser report allowlist drops error payloads, attachments, stdout and private titles", () => {
  const canary = "private-token-cookie-email-canary";
  const safe = browserCase({
    file: "/workspace/tests/integration/system-design.spec.ts",
    line: 31,
    status: "passed",
    expected: "passed",
    durationMs: 12.5,
    ...{
      title: canary,
      errors: [{ message: canary }],
      stdout: canary,
      attachments: [{ body: canary }],
    },
  });
  assert.ok(!JSON.stringify(safe).includes(canary));
  assert.equal(safe.file, "system-design.spec.ts");
  assert.equal(browserCase({ ...safe, file: canary }).file, "unknown.spec.ts");
});
test("skipped Studio/privacy/token checks and runner errors cannot pass browser acceptance", () => {
  const files = [
    "system-design",
    "system-design",
    "foundations",
    "foundations",
    "apis-data",
    "apis-data",
    "privacy-controls",
    "privacy-export",
    "course-versions",
    "learning",
    "local-auth",
    "grading",
    "tutor",
    "token-usage",
  ];
  const cases = files.map((file) =>
    browserCase({
      file: `${file}.spec.ts`,
      line: 1,
      status: "passed",
      expected: "passed",
      durationMs: 1,
    }),
  );
  assert.equal(browserAcceptance(cases, false), true);
  assert.equal(browserAcceptance(cases, true), false);
  assert.equal(browserAcceptance(cases.slice(1), false), false);
  assert.equal(
    browserAcceptance(
      cases.filter((_, index) => index !== 4),
      false,
    ),
    false,
  );
  for (const index of [0, 2, 4, 6, 13]) {
    const skipped = cases.map((c, n) =>
      n === index ? { ...c, status: "skipped" } : c,
    );
    assert.equal(browserAcceptance(skipped, false), false);
  }
  assert.equal(
    browserAcceptance(
      [
        ...cases,
        browserCase({
          file: "live-tutor.spec.ts",
          line: 1,
          status: "skipped",
          expected: "skipped",
          durationMs: 0,
        }),
      ],
      false,
    ),
    true,
  );
});

test("fixture/performance diagnostics retain source coordinates while excluding private error contents", () => {
  const canary = "private-browser-canary";
  for (const suite of ["flows", "performance"]) {
    const result = failureDetails(
      [
        {
          message: `${canary} timeout`,
          stack: `at tests/${suite}/accounts.spec.ts:123:45\n${canary}`,
        },
      ],
      "accounts.spec.ts",
    );
    assert.deepEqual(result.locations, [
      { file: "accounts.spec.ts", line: 123, column: 45 },
    ]);
    assert.equal(result.kind, "timeout");
    assert.ok(!JSON.stringify(result).includes(canary));
  }
});
