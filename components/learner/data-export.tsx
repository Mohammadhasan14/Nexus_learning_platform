"use client";
import { useRef, useState, useSyncExternalStore } from "react";
import { useSubmissionFocus } from "@/components/ui/use-submission-focus";

const subscribe = () => () => {};

export function DataExport() {
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const active = useRef(false);
  const [pending, setPending] = useState(false);
  const [state, setState] = useState({ message: "", error: false });
  const { formRef: sectionRef, onSubmit: rememberSubmission } =
    useSubmissionFocus<HTMLElement>(pending, state, "button");
  async function download() {
    if (active.current) return;
    rememberSubmission();
    active.current = true;
    setPending(true);
    setState({ message: "Preparing your download…", error: false });
    try {
      const response = await fetch("/api/account/export", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) {
        setState({
          error: true,
          message:
            response.status === 401
              ? "Sign in again, then retry your download."
              : response.status === 413
                ? "Your data exceeds the current download limit."
                : "Your data could not be downloaded. Please try again.",
        });
        return;
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = "nexus-learning-data.json";
      document.body.append(link);
      link.click();
      link.remove();
      // Give the browser time to acquire the blob before releasing it.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setState({ message: "Your download has started.", error: false });
    } catch {
      setState({
        message: "The download was interrupted. Please try again.",
        error: true,
      });
    } finally {
      active.current = false;
      setPending(false);
    }
  }
  return (
    <section
      ref={sectionRef}
      className="data-export"
      aria-labelledby="data-export-title"
    >
      <h2 id="data-export-title">Download your learning data</h2>
      <p id="data-export-description">
        Get a JSON file with your saved account details, preferences, learning
        history, notes, project revisions, reports and tutor replies and usage.
        Unsaved edits are not included. The file contains private information;
        keep it somewhere you trust.
      </p>
      <noscript>Enable JavaScript to download your data.</noscript>
      <button
        className="button button-secondary"
        type="button"
        disabled={!hydrated || pending}
        aria-describedby="data-export-description"
        onClick={download}
      >
        {pending ? "Preparing download…" : "Download my data"}
      </button>
      {state.message && (
        <p
          role={state.error ? "alert" : "status"}
          className={state.error ? "form-message" : "form-success"}
        >
          {state.message}
        </p>
      )}
    </section>
  );
}
