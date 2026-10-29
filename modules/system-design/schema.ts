import { z } from "zod";

export const studioCourse = "system-design-studio-v1";
export const scenarioId = "campus-events-v1";
export const schemaVersion = "worksheet-v1";
export const formulaVersion = "capacity-v1";

export const workloadFields = {
  dailyActiveUsers: {
    label: "Daily active users",
    min: 0,
    max: 100_000_000,
    integer: true,
    unit: "users",
    help: "People using the directory in one day. Zero models a quiet day.",
  },
  requestsPerUserPerDay: {
    label: "Requests / user / day",
    min: 0,
    max: 100_000,
    integer: false,
    unit: "requests",
    help: "Average requests each person makes in a day. A request asks a server to do something.",
  },
  peakFactor: {
    label: "Peak multiplier",
    min: 1,
    max: 100,
    integer: false,
    unit: "× average",
    help: "Peak traffic as a multiple of average traffic; 1 means no peak increase.",
  },
  readPercentage: {
    label: "Reads",
    min: 0,
    max: 100,
    integer: false,
    unit: "%",
    help: "Reads retrieve information; writes create or update it. The remaining percentage is writes.",
  },
  readResponseBytes: {
    label: "Read response size",
    min: 0,
    max: 10_000_000,
    integer: true,
    unit: "bytes",
    help: "Bytes the server sends back for each read. A response is the answer to a request.",
  },
  writePayloadBytes: {
    label: "Write payload size",
    min: 0,
    max: 10_000_000,
    integer: true,
    unit: "bytes",
    help: "Bytes retained per write in this simplified accumulation model.",
  },
  retentionDays: {
    label: "Retention",
    min: 0,
    max: 3650,
    integer: true,
    unit: "days",
    help: "Days of accumulated writes to retain. Zero means none retained.",
  },
} as const;
export type WorkloadKey = keyof typeof workloadFields;
const numeric = (key: WorkloadKey) => {
  const rule = workloadFields[key];
  const value = z.number().finite().min(rule.min).max(rule.max);
  return rule.integer ? value.int() : value;
};
export const workloadSchema = z
  .object({
    dailyActiveUsers: numeric("dailyActiveUsers"),
    requestsPerUserPerDay: numeric("requestsPerUserPerDay"),
    peakFactor: numeric("peakFactor"),
    readPercentage: numeric("readPercentage"),
    readResponseBytes: numeric("readResponseBytes"),
    writePayloadBytes: numeric("writePayloadBytes"),
    retentionDays: numeric("retentionDays"),
  })
  .strict()
  .superRefine((w, ctx) => {
    const bytes =
      w.dailyActiveUsers *
      w.requestsPerUserPerDay *
      (1 - w.readPercentage / 100) *
      w.writePayloadBytes *
      w.retentionDays;
    if (!Number.isFinite(bytes) || bytes > Number.MAX_SAFE_INTEGER)
      ctx.addIssue({
        code: "custom",
        path: ["retentionDays"],
        message:
          "Combined retained volume exceeds the supported precision limit. Reduce workload, payload or retention.",
      });
  });
export const worksheetSchema = z
  .object({
    functionalRequirements: z.string().max(4000),
    exclusions: z.string().max(2000),
    latencyTargetMs: z.number().finite().min(1).max(600_000),
    availabilityTargetPercent: z.number().finite().min(0).max(100),
    assumptions: z.string().max(2000),
    explanation: z.string().max(4000),
    workload: workloadSchema,
  })
  .strict();
export type Worksheet = z.infer<typeof worksheetSchema>;
export const identitySchema = z
  .object({
    scenario: z.literal(scenarioId),
    schema: z.literal(schemaVersion),
    formula: z.literal(formulaVersion),
  })
  .strict();
export const worksheetIdentity = {
  scenario: scenarioId,
  schema: schemaVersion,
  formula: formulaVersion,
} as const;
export const savedWorksheetSchema = z
  .object({
    revision: z.number().int().positive(),
    savedAt: z.string(),
    identity: identitySchema,
    worksheet: worksheetSchema,
  })
  .strict();
export type SavedWorksheet = z.infer<typeof savedWorksheetSchema>;
