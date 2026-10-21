export const REQUEST_ID_HEADER = "x-request-id";
const uuid =
  /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;

export function readRequestId(value: unknown): string | undefined {
  return typeof value === "string" && uuid.test(value) ? value : undefined;
}

export function safeErrorDigest(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  try {
    // Do not invoke getters or serialize the error, its message or stack.
    const digest = Object.getOwnPropertyDescriptor(error, "digest")?.value;
    return typeof digest === "string" && /^\d{1,20}$/.test(digest)
      ? digest
      : undefined;
  } catch {
    return undefined;
  }
}

const events = [
  "request.error",
  "backend.error",
  "config.error",
  "health.not_ready",
  "tutor.error",
] as const;
type ErrorMetadata = {
  event: (typeof events)[number];
  requestId?: string;
  method?: string;
  phase?: string;
  status?: number;
  durationMs?: number;
  digest?: string;
};

/** Construct an allowlisted record. Extra fields and arbitrary error objects are discarded. */
export function errorRecord(metadata: ErrorMetadata) {
  return {
    timestamp: new Date().toISOString(),
    level: "error",
    service: "nexus-learning",
    event: events.includes(metadata.event) ? metadata.event : "request.error",
    requestId: readRequestId(metadata.requestId) ?? crypto.randomUUID(),
    method: [
      "GET",
      "HEAD",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ].includes(metadata.method ?? "")
      ? metadata.method
      : "OTHER",
    phase: ["render", "route", "action", "proxy"].includes(metadata.phase ?? "")
      ? metadata.phase
      : "unknown",
    ...(Number.isInteger(metadata.status) &&
    metadata.status! >= 400 &&
    metadata.status! <= 599
      ? { status: metadata.status }
      : {}),
    ...(typeof metadata.durationMs === "number" &&
    Number.isFinite(metadata.durationMs) &&
    metadata.durationMs >= 0
      ? { durationMs: Math.min(60_000, Math.round(metadata.durationMs)) }
      : {}),
    ...(typeof metadata.digest === "string" &&
    /^\d{1,20}$/.test(metadata.digest)
      ? { digest: metadata.digest }
      : {}),
  };
}

/** Application-owned server error stream. Logging failure must not break recovery. */
export function logError(metadata: ErrorMetadata) {
  try {
    console.error(JSON.stringify(errorRecord(metadata)));
  } catch {
    /* No raw-error fallback. */
  }
}
