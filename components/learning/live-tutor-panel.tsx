"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ReportForm } from "@/components/reports/report-form";
import { tutorEvents } from "@/modules/tutor/stream";
import type { TutorReply } from "@/modules/tutor/adapter";

type State = {
  message?: string;
  partial?: string;
  reply?: TutorReply;
  remaining?: number;
  saved?: boolean;
};
export function LiveTutorPanel({
  lesson,
  request,
}: {
  lesson: string;
  request: string;
}) {
  const [key, setKey] = useState(request);
  const [intent, setIntent] = useState("hint");
  const [state, setState] = useState<State>({});
  const [pending, setPending] = useState(false);
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);

  async function ask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (active.current || state.reply) return;
    const controller = new AbortController();
    active.current = controller;
    setPending(true);
    setState({ message: "Receiving guidance…" });
    const timer = setTimeout(() => controller.abort(), 35000);
    let feedback = "The reply was interrupted or could not be loaded.";
    try {
      const response = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        signal: controller.signal,
        body: JSON.stringify({ lesson, request: key, intent }),
      });
      if (!response.ok) {
        const failure = await response.json().catch(() => ({}));
        if (typeof failure.message === "string") feedback = failure.message;
        throw new Error("Unavailable");
      }
      if (!response.body) throw new Error("The reply was interrupted.");
      let partial = "";
      for await (const next of tutorEvents(response.body)) {
        if (next.type === "delta") {
          partial += next.text;
          if (partial.length > 6000)
            throw new Error("The reply was interrupted.");
          setState({ message: "Receiving guidance…", partial });
        } else if (next.type === "done") {
          if (next.request !== key)
            throw new Error("The reply could not be verified.");
          setState({
            reply: next.reply,
            remaining: next.remaining,
            saved: next.saved,
          });
        } else {
          feedback = next.message;
          throw new Error("Interrupted");
        }
      }
    } catch {
      setState({
        message: controller.signal.aborted
          ? "Guidance stopped. This request may still count toward today’s allowance. Recover a saved reply or choose another guidance option."
          : `${feedback} Recovering uses the same request and will not make a duplicate AI call.`,
      });
    } finally {
      clearTimeout(timer);
      active.current = null;
      setPending(false);
    }
  }

  return (
    <section className="tutor-panel" aria-labelledby="tutor-heading">
      <h3 id="tutor-heading">Lesson tutor</h3>
      <p className="eyebrow">LIVE AI · LOCAL TESTING</p>
      <p>
        Gemini receives this lesson and your selected guidance option. No notes,
        answers or profile details are sent. Free-tier content may be used to
        improve Google&apos;s products. AI can make mistakes and does not grade
        your work.
      </p>
      <p>
        Completed guidance is saved privately for response reports and removed
        with your account. A submitted report keeps a copy for staff review.
      </p>
      <form onSubmit={ask} className="account-form" aria-busy={pending}>
        <div className="field">
          <label htmlFor="tutor-intent">What would help?</label>
          <select
            id="tutor-intent"
            value={intent}
            disabled={pending}
            onChange={(e) => {
              setIntent(e.target.value);
              setKey(crypto.randomUUID());
              setState({});
            }}
          >
            <option value="hint">Give me a hint</option>
            <option value="explain">Explain the concept</option>
            <option value="example">Show a different example</option>
            <option value="reflect">Help me check my thinking</option>
          </select>
        </div>
        <button
          className="button button-secondary"
          disabled={pending || !!state.reply}
        >
          {pending
            ? "Receiving guidance…"
            : state.reply
              ? "Guidance loaded"
              : state.message
                ? "Recover saved reply"
                : "Ask lesson tutor"}
        </button>
        {pending && (
          <button
            className="button button-secondary"
            type="button"
            onClick={() => active.current?.abort()}
          >
            Cancel guidance
          </button>
        )}
      </form>
      <p role="status" aria-live="polite">
        {state.message || (state.reply ? "Guidance loaded." : "")}
      </p>
      {pending && state.partial && (
        <div className="tutor-reply" aria-live="off">
          <p className="eyebrow">INCOMPLETE · RECEIVING GUIDANCE</p>
          <p className="tutor-response-text">{state.partial}</p>
        </div>
      )}
      {state.reply && (
        <div className="tutor-reply">
          <p className="eyebrow">
            {state.reply.adapter === "scripted-live-fallback-1"
              ? "AI UNAVAILABLE · PREPARED GUIDANCE"
              : "AI-GENERATED GUIDANCE"}
          </p>
          <p className="tutor-response-text">{state.reply.text}</p>
          {state.reply.source && (
            <a href={state.reply.source.href}>
              Source: {state.reply.source.title}
            </a>
          )}
          <p>
            {state.remaining} tutor requests left today. Resets at midnight UTC.
          </p>
          {state.saved ? (
            <ReportForm lesson={lesson} request={key} tutorRequest={key} />
          ) : (
            <p>
              The reply could not be saved, so exact response reporting is
              unavailable. You can still report a lesson issue.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
