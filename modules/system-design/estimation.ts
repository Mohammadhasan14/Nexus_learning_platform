import { formulaVersion, workloadSchema } from "./schema";

/** Arithmetic teaching model. No clocks, network, randomness, or sizing/grade inference. */
export function estimate(input: unknown, version: string = formulaVersion) {
  if (version !== formulaVersion)
    throw new Error("Unsupported capacity formula version.");
  const w = workloadSchema.parse(input);
  const readFraction = w.readPercentage / 100;
  const dailyRequests = w.dailyActiveUsers * w.requestsPerUserPerDay;
  const averageRps = dailyRequests / 86_400;
  const peakRps = averageRps * w.peakFactor;
  const peakReadRps = peakRps * readFraction;
  const peakWriteRps = peakRps * (1 - readFraction);
  const dailyWrites = dailyRequests * (1 - readFraction);
  const logicalRetainedWriteBytes =
    dailyWrites * w.writePayloadBytes * w.retentionDays;
  const peakReadEgressMbps =
    (peakReadRps * w.readResponseBytes * 8) / 1_000_000;
  return {
    dailyRequests,
    dailyWrites,
    averageRps,
    peakRps,
    peakReadRps,
    peakWriteRps,
    logicalRetainedWriteBytes,
    peakReadEgressMbps,
  };
}
export type Estimates = ReturnType<typeof estimate>;
