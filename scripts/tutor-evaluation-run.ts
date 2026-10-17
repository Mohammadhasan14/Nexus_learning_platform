import { setTimeout as delay } from "node:timers/promises";
import type { TutorReply } from "../modules/tutor/adapter";
import type { TokenUsage } from "../modules/tutor/usage";
import {
  screenReply,
  type EvaluationCase,
} from "../tests/evaluations/tutor-cases";

export type CollectionState = {
  requestCap: number;
  attempted: number;
  completedLive: number;
  stopped: boolean;
  results: Array<Record<string, unknown>>;
};

/** Bounded operator collection; every actual reply still needs editorial review. */
export async function collectEvaluation(options: {
  cases: EvaluationCase[];
  model: string;
  report: CollectionState;
  save: () => Promise<void>;
  generate: (
    item: EvaluationCase,
    transport: typeof fetch,
  ) => Promise<{ reply: TutorReply; usage?: TokenUsage }>;
  transport?: typeof fetch;
  pause?: () => Promise<void>;
}) {
  const { cases, model, report, save } = options;
  if (
    cases.length < 1 ||
    cases.length > 16 ||
    report.requestCap !== 16 ||
    report.attempted !== 0 ||
    report.results.length
  )
    throw new Error("Fresh bounded evaluation required");
  await save();
  for (const [index, item] of cases.entries()) {
    if (index) await (options.pause ?? (() => delay(10000)))();
    let httpStatus: number | undefined;
    let providerRequests = 0;
    const start = Date.now();
    const transport: typeof fetch = async (input, init) => {
      if (providerRequests >= 1 || report.attempted >= report.requestCap)
        throw new Error("Evaluation dispatch cap reached");
      providerRequests++;
      report.attempted++;
      await save(); // Persist uncertain work before I/O; never retry automatically.
      const response = await (options.transport ?? fetch)(input, init);
      httpStatus = response.status;
      return response;
    };
    const { reply, usage } = await options.generate(item, transport);
    const generated =
      providerRequests === 1 && reply.adapter === `gemini:${model}`;
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
      usage: generated ? (usage ?? null) : null,
      screening: generated ? screenReply(item, reply.text) : [],
      review: {
        status: generated ? "In review" : "Pending",
        reviewer: null,
        notes: null,
      },
    });
    await save();
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
  await save();
}
