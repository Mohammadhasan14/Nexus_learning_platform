import {
  FRAME_TIMEOUT_MS,
  PROTOCOL,
  isRun,
  isResult,
  type Result,
} from "../../runner/protocol.mjs";
import { runnerOrigin } from "./config";

/** All messages and output are untrusted. This controller has no grade/save API. */
export function runPractice(
  code: string,
  origin: string | undefined,
  signal: AbortSignal,
): Promise<Result> {
  const id = crypto.randomUUID();
  const run = { protocol: PROTOCOL, type: "run", id, code };
  const base = { protocol: PROTOCOL, type: "result" as const, id, lines: [] };
  const safeOrigin = runnerOrigin(origin, location.origin);
  if (!safeOrigin || !isRun(run))
    return Promise.resolve({
      ...base,
      status: "unavailable",
      message:
        "The isolated runner is not configured. You can still use the practice check.",
    });
  return new Promise((resolve) => {
    const frame = document.createElement("iframe");
    const channel = new MessageChannel();
    let settled = false;
    let sent = false;
    const finish = (result: Result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener("abort", cancel);
      channel.port1.postMessage({ type: "cancel", id });
      channel.port1.close();
      channel.port2.close();
      frame.remove();
      resolve(result);
    };
    const cancel = () =>
      finish({
        ...base,
        status: "cancelled",
        message: "Run stopped. Your code is kept.",
      });
    const timer = setTimeout(
      () =>
        finish({
          ...base,
          status: "unavailable",
          message:
            "The runner did not respond. Check that it is running and try again.",
        }),
      FRAME_TIMEOUT_MS,
    );
    frame.hidden = true;
    frame.title = "Isolated JavaScript practice";
    // allow-same-origin is required to load the worker on the separate runner origin.
    frame.sandbox.add("allow-scripts", "allow-same-origin");
    frame.referrerPolicy = "no-referrer";
    frame.src = `${safeOrigin}/frame.html#parent=${encodeURIComponent(location.origin)}`;
    channel.port1.onmessage = ({ data }) => {
      if (isResult(data) && data.id === id) finish(data);
      else
        finish({
          ...base,
          status: "error",
          message: "The runner returned an invalid result.",
        });
    };
    channel.port1.onmessageerror = () =>
      finish({
        ...base,
        status: "error",
        message: "The runner returned an unreadable result.",
      });
    frame.onload = () => {
      if (settled || sent) return;
      sent = true;
      try {
        frame.contentWindow?.postMessage(run, safeOrigin, [channel.port2]);
      } catch {
        finish({
          ...base,
          status: "unavailable",
          message: "The isolated runner could not connect. Your code is kept.",
        });
      }
    };
    frame.onerror = () =>
      finish({
        ...base,
        status: "unavailable",
        message: "The isolated runner could not load. Your code is kept.",
      });
    signal.addEventListener("abort", cancel, { once: true });
    if (signal.aborted) cancel();
    else document.body.append(frame);
  });
}
