// Shared by the trusted application controller and the isolated frame. No secrets.
export const PROTOCOL = "nexus-practice-v1";
export const MAX_CODE = 12_000;
export const MAX_LINES = 50;
export const MAX_LINE = 1_000;
export const MAX_OUTPUT = 8_000;
export const RUN_TIMEOUT_MS = 1_500;
export const FRAME_TIMEOUT_MS = 6_000;

/** @typedef {{protocol: string, type: "run", id: string, code: string}} Run */
/** @typedef {"completed" | "error" | "timeout" | "output-limit" | "unavailable" | "cancelled"} Status */
/** @typedef {{protocol: string, type: "result", id: string, status: Status, lines: string[], message: string}} Result */

/** @param {unknown} value @returns {value is Record<string, unknown>} */
function record(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
/** @param {unknown} value @returns {value is string} */
function requestId(value) {
  return (
    typeof value === "string" &&
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value)
  );
}
/** @param {unknown} value @returns {value is Run} */
export function isRun(value) {
  return (
    record(value) &&
    Object.keys(value).length === 4 &&
    value.protocol === PROTOCOL &&
    value.type === "run" &&
    requestId(value.id) &&
    typeof value.code === "string" &&
    value.code.length > 0 &&
    value.code.length <= MAX_CODE
  );
}
/** @param {unknown} value @returns {value is Result} */
export function isResult(value) {
  return (
    record(value) &&
    Object.keys(value).length === 6 &&
    value.protocol === PROTOCOL &&
    value.type === "result" &&
    requestId(value.id) &&
    typeof value.status === "string" &&
    [
      "completed",
      "error",
      "timeout",
      "output-limit",
      "unavailable",
      "cancelled",
    ].includes(value.status) &&
    typeof value.message === "string" &&
    value.message.length <= MAX_LINE &&
    Array.isArray(value.lines) &&
    value.lines.length <= MAX_LINES &&
    value.lines.every(
      (line) => typeof line === "string" && line.length <= MAX_LINE,
    ) &&
    value.lines.reduce((length, line) => length + line.length, 0) <= MAX_OUTPUT
  );
}
