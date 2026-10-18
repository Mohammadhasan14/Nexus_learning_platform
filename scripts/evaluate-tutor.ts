import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { loadEnvConfig } from "@next/env";
import { migrationDatabase } from "./database-harness";
import { parseTutorConfig } from "../modules/tutor/config";
import {
  tutorPromptVersion,
  tutorSystemInstruction,
} from "../modules/tutor/prompt";
import { geminiGuidance, type ReviewedContext } from "../modules/tutor/gemini";
import { evaluationCases } from "../tests/evaluations/tutor-cases";
import { collectEvaluation } from "./tutor-evaluation-run";
import {
  extendedEvaluationCases,
  extendedSuiteVersion,
} from "../tests/evaluations/tutor-extended-cases";
import {
  evaluationOptions,
  selectEvaluationCases,
} from "../tests/evaluations/tutor-options";
import { streamGemini } from "../modules/tutor/gemini-stream";
import type { TokenUsage } from "../modules/tutor/usage";
import { guidanceTextPolicyVersion } from "../modules/tutor/guidance-text";

async function main() {
  const { live, suite, only } = evaluationOptions(process.argv.slice(2));
  const db = await migrationDatabase();
  let lessons: ReviewedContext[];
  try {
    lessons = (
      await db.query<ReviewedContext>(
        `select l.id as lesson,l.course_id as course,l.title,l.objective,l.body,l.example,true as reviewed from public.lessons l join public.course_versions c on c.id=l.course_id where c.id='javascript-foundations-v2' and c.review_status='reviewed' order by l.position`,
      )
    ).rows;
  } finally {
    await db.close();
  }
  const cases = selectEvaluationCases(
    suite === "extended"
      ? extendedEvaluationCases(lessons)
      : evaluationCases(lessons),
    only,
  );
  const adapterPath =
    suite === "extended"
      ? "modules/tutor/gemini-stream.ts"
      : "modules/tutor/gemini.ts";
  if (!live) {
    console.log(
      "Dry run: no provider calls. Use --live for a bounded real-model run.",
    );
    console.log(
      `Suite: ${suite}; adapter: ${suite === "extended" ? "streaming" : "non-streaming"}; ${cases.length}/16 cases.`,
    );
    for (const c of cases)
      console.log(`${c.id} (${c.kind}): ${c.rubric.join(" ")}`);
    return;
  }
  loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
  const config = parseTutorConfig(process.env);
  if (config.mode !== "live")
    throw new Error(
      "Local live/free-tier configuration required. No requests sent.",
    );
  const directory = "test-results/tutor-evaluations";
  const run = new Date().toISOString().replace(/[:.]/g, "-");
  const output = `${directory}/${run}.json`;
  await mkdir(directory, { recursive: true });
  const redact = (value: string) =>
    value.replaceAll(config.apiKey, "[REDACTED]");
  const report = {
    version: 2,
    suite,
    suiteVersion:
      suite === "extended"
        ? extendedSuiteVersion
        : "bounded-guidance-baseline-1",
    adapterMode: suite === "extended" ? "streaming" : "non-streaming",
    outputPolicyVersion: guidanceTextPolicyVersion,
    outputPolicySha256: createHash("sha256")
      .update(await readFile("modules/tutor/guidance-text.ts"))
      .digest("hex"),
    run,
    startedAt: new Date().toISOString(),
    finishedAt: "",
    model: config.model,
    promptVersion: tutorPromptVersion,
    promptSha256: createHash("sha256")
      .update(tutorSystemInstruction)
      .digest("hex"),
    adapterSha256: createHash("sha256")
      .update(await readFile(adapterPath))
      .digest("hex"),
    casesSha256: createHash("sha256")
      .update(JSON.stringify(cases))
      .digest("hex"),
    requestCap: 16,
    attempted: 0,
    completedLive: 0,
    stopped: false,
    scope:
      "Synthetic seeded public lessons and adversarial fixtures. Offline runner bypasses application reservations; bounded operator evaluation, not a learner endpoint. No automatic retry or paid/hosted activation.",
    results: [] as Array<Record<string, unknown>>,
  };
  const save = async () =>
    writeFile(output, redact(JSON.stringify(report, null, 2)) + "\n");
  await collectEvaluation({
    cases,
    model: config.model,
    report,
    save,
    generate: async (item, transport) => {
      let usage: TokenUsage | undefined;
      const reply =
        suite === "extended"
          ? await streamGemini(
              config,
              item.context,
              item.intent,
              {
                signal: new AbortController().signal,
                onDelta() {},
                onUsage: (value) => {
                  usage = value;
                },
              },
              transport,
            )
          : await geminiGuidance(config, item.context, item.intent, transport);
      return { reply, usage };
    },
  });
  report.finishedAt = new Date().toISOString();
  await save();
  console.log(
    `Saved ${output}; ${report.completedLive}/${cases.length} live replies captured. Editorial review required.`,
  );
  if (report.stopped) process.exitCode = 1;
}
void main().catch(() => {
  console.error(
    "Evaluation failed. Check arguments, local configuration and the saved report. No credential values are logged.",
  );
  process.exitCode = 1;
});
