/* global self */
// Served only on the isolated runner origin with its own restrictive CSP.
// No imports: learner-created imports, connections and nested workers are denied.
const send = self.postMessage.bind(self);
const closeWorker = self.close.bind(self);
const AsyncFunction = async function () {}.constructor;
const stringify = String;
const NativeError = Error;
let started = false;

self.onmessage = async ({ data }) => {
  if (started) return;
  started = true;
  const { protocol, id, code, limits } = data;
  const { MAX_CODE, MAX_LINES, MAX_LINE, MAX_OUTPUT } = limits;
  if (typeof code !== "string" || code.length > MAX_CODE) return closeWorker();
  const lines = [];
  let length = 0;
  let finished = false;
  const finish = (status, message = "") => {
    if (finished) return;
    finished = true;
    send({ protocol, type: "result", id, status, lines, message });
    closeWorker();
  };
  const log = (...values) => {
    let truncated = values.length > 10;
    // Avoid walking objects or invoking learner-controlled serialization hooks.
    const line = values
      .slice(0, 10)
      .map((value) => {
        const text =
          value === null
            ? "null"
            : typeof value === "object"
              ? "[object]"
              : typeof value === "function"
                ? "[function]"
                : stringify(value);
        if (text.length > MAX_LINE) truncated = true;
        return text.slice(0, MAX_LINE);
      })
      .join(" ");
    if (line.length > MAX_LINE) truncated = true;
    const bounded = line.slice(0, MAX_LINE);
    if (lines.length >= MAX_LINES || length + bounded.length > MAX_OUTPUT) {
      finish(
        "output-limit",
        "Output limit reached. Reduce how much your code logs.",
      );
      throw new NativeError("Output limit reached");
    }
    length += bounded.length;
    lines.push(bounded);
    if (truncated) {
      finish(
        "output-limit",
        "Output was shortened. Log fewer or smaller values.",
      );
      throw new NativeError("Output limit reached");
    }
  };
  Object.defineProperty(self, "console", {
    value: Object.freeze({ log, info: log, warn: log, error: log, debug: log }),
    writable: false,
    configurable: false,
  });
  try {
    // The only evaluation site: a disposable browser worker, never the app server.
    await new AsyncFunction('"use strict";\n' + code)();
    finish(
      "completed",
      lines.length ? "Run finished." : "Run finished with no console output.",
    );
  } catch (error) {
    const message =
      error instanceof NativeError
        ? error.message
        : "JavaScript threw an error.";
    finish("error", stringify(message).slice(0, MAX_LINE));
  }
};
