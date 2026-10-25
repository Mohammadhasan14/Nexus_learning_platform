"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MAX_CODE, PROTOCOL, type Result } from "../../runner/protocol.mjs";
import { abortable } from "@/lib/browser/abortable";

export function PracticeRunner({
  example,
  origin,
}: {
  example: string;
  origin?: string;
}) {
  const id = useId();
  const [code, setCode] = useState(example);
  const [result, setResult] = useState<Result | null>(null);
  const [running, setRunning] = useState(false);
  const active = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      active.current?.abort();
      active.current = null;
    },
    [],
  );

  async function run() {
    const controller = new AbortController();
    active.current = controller;
    setRunning(true);
    setResult(null);
    try {
      const { runPractice } = await abortable(
        import("@/modules/practice/client"),
        controller.signal,
      );
      const reply = await runPractice(code, origin, controller.signal);
      if (active.current === controller) setResult(reply);
    } catch {
      if (active.current === controller)
        setResult({
          protocol: PROTOCOL,
          type: "result",
          id: "00000000-0000-0000-0000-000000000000",
          status: controller.signal.aborted ? "cancelled" : "unavailable",
          lines: [],
          message: controller.signal.aborted
            ? "Run stopped. Your code is kept."
            : "JavaScript could not start in this browser. Your code is kept.",
        });
    } finally {
      if (active.current === controller) {
        active.current = null;
        setRunning(false);
      }
    }
  }

  return (
    <section className="practice-runner" aria-labelledby={`${id}-heading`}>
      <h3 id={`${id}-heading`}>Try JavaScript</h3>
      <p id={`${id}-help`}>
        Edit the example and use console.log to see values. Runs are temporary
        and do not change your saved practice progress.
      </p>
      <div className="field">
        <label htmlFor={`${id}-code`}>JavaScript code</label>
        <textarea
          id={`${id}-code`}
          value={code}
          maxLength={MAX_CODE}
          rows={9}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          aria-describedby={`${id}-help`}
          disabled={running}
          onChange={(event) => {
            setCode(event.target.value);
            setResult(null);
          }}
        />
      </div>
      <div className="practice-runner-actions">
        <button
          type="button"
          className="button button-secondary"
          onClick={run}
          disabled={running || !code.trim()}
        >
          {running ? "Running…" : "Run code"}
        </button>
        {running && (
          <button
            type="button"
            className="button button-secondary"
            onClick={() => active.current?.abort()}
          >
            Stop run
          </button>
        )}
      </div>
      <p role="status" aria-live="polite">
        {running ? "Running JavaScript…" : result?.message}
      </p>
      {result && result.lines.length > 0 && (
        <pre tabIndex={0} aria-label="JavaScript output">
          <code>{result.lines.join("\n")}</code>
        </pre>
      )}
    </section>
  );
}
