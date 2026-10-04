import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { loadEnvConfig } from "@next/env";
import { migrationDatabase } from "./database-harness";
import { parseTutorConfig } from "../modules/tutor/config";
import {
  tutorPromptVersion,
  tutorSystemInstruction,
} from "../modules/tutor/prompt";
import { geminiGuidance, type ReviewedContext } from "../modules/tutor/gemini";
import { evaluationCases, screenReply } from "../tests/evaluations/tutor-cases";

async function main() {
  const args = process.argv.slice(2);
  if (args.some((a) => a !== "--live" && !a.startsWith("--only=")))
    throw new Error("Use --live and optional --only=case-id,case-id");
  const live = args.includes("--live");
  const only = args
    .find((a) => a.startsWith("--only="))
    ?.slice(7)
    .split(",");
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
  const all = evaluationCases(lessons);
  if (only?.some((id) => !all.some((c) => c.id === id)))
    throw new Error("Unknown evaluation case ID");
  const cases = only ? all.filter((c) => only.includes(c.id)) : all;
  if (cases.length < 1 || cases.length > 16)
    throw new Error("Evaluation requires 1–16 cases");
  if (!live) {
    console.log(
      "Dry run: no provider calls. Use --live for a bounded real-model run.",
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
    version: 1,
    run,
    startedAt: new Date().toISOString(),
    finishedAt: "",
    model: config.model,
    promptVersion: tutorPromptVersion,
    promptSha256: createHash("sha256")
      .update(tutorSystemInstruction)
      .digest("hex"),
    adapterSha256: createHash("sha256")
      .update(await readFile("modules/tutor/gemini.ts"))
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
  await save();
  for (const [index, item] of cases.entries()) {
    if (index > 0) await delay(10000); // Conservative pacing; actual project quotas can still reject requests.
    let httpStatus: number | undefined;
    let providerRequests = 0;
    const start = Date.now();
    const reply = await geminiGuidance(
      config,
      item.context,
      item.intent,
      async (input, init) => {
        providerRequests++;
        report.attempted++;
        await save(); // Preserve uncertain usage before dispatch; never replay automatically.
        const response = await fetch(input, init);
        httpStatus = response.status;
        return response;
      },
    );
    const generated = reply.adapter === `gemini:${config.model}`;
    if (generated) report.completedLive++;
    report.results.push({
      ...item,
      providerRequests,
      httpStatus: httpStatus ?? null,
      elapsedMs: Date.now() - start,
      outcome: generated
        ? "Live reply — requires review"
        : "Unavailable — not a quality pass",
      reply,
      screening: generated ? screenReply(item, reply.text) : [],
      review: { status: "In review", reviewer: null, notes: null },
    });
    await save();
    console.log(
      `${item.id}: ${generated ? "live reply captured" : "unavailable; stopping"}`,
    );
    if (!generated) {
      report.stopped = true;
      break;
    }
  }
  const attemptedIds = new Set(report.results.map((r) => r.id));
  for (const item of cases)
    if (!attemptedIds.has(item.id))
      report.results.push({
        id: item.id,
        kind: item.kind,
        outcome: "Not run",
        review: { status: "Pending", reviewer: null, notes: null },
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
