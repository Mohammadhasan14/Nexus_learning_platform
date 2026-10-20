import {
  PROTOCOL,
  MAX_CODE,
  MAX_LINES,
  MAX_LINE,
  MAX_OUTPUT,
  RUN_TIMEOUT_MS,
  isRun,
  isResult,
} from "./protocol.mjs";

// This trusted frame never evaluates learner code. Only its disposable worker does.
const expectedParent = new URLSearchParams(location.hash.slice(1)).get(
  "parent",
);
let worker;
let port;
let timer;
let active = false;

function stop() {
  clearTimeout(timer);
  worker?.terminate();
  worker = undefined;
}

window.addEventListener("pagehide", stop);
window.addEventListener("message", (event) => {
  if (
    active ||
    parent === window ||
    event.source !== parent ||
    event.origin !== expectedParent ||
    event.origin === location.origin ||
    event.ports.length !== 1 ||
    !isRun(event.data)
  )
    return;

  active = true;
  const { id, code } = event.data;
  port = event.ports[0];
  const finish = (status, lines = [], message = "") => {
    stop();
    port.postMessage({
      protocol: PROTOCOL,
      type: "result",
      id,
      status,
      lines,
      message,
    });
    port.close();
  };
  port.onmessage = (message) => {
    if (message.data?.type === "cancel" && message.data?.id === id) {
      stop();
      port.close();
    }
  };
  timer = setTimeout(
    () =>
      finish(
        "timeout",
        [],
        "Stopped after 1.5 seconds. Check for a loop or an unfinished promise.",
      ),
    RUN_TIMEOUT_MS,
  );
  try {
    worker = new Worker("/worker.js");
    worker.onmessage = ({ data }) => {
      if (!isResult(data) || data.id !== id) {
        finish("error", [], "The runner returned an invalid message.");
        return;
      }
      finish(data.status, data.lines, data.message);
    };
    worker.onerror = (error) => {
      error.preventDefault();
      finish(
        "error",
        [],
        "JavaScript could not finish. Check your code and try again.",
      );
    };
    worker.onmessageerror = () =>
      finish("error", [], "The runner returned an unreadable message.");
    worker.postMessage({
      protocol: PROTOCOL,
      type: "run",
      id,
      code,
      limits: { MAX_CODE, MAX_LINES, MAX_LINE, MAX_OUTPUT },
    });
  } catch {
    finish(
      "unavailable",
      [],
      "JavaScript execution is unavailable in this browser.",
    );
  }
});
