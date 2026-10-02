"use client";
import { ReportForm } from "@/components/reports/report-form";
import { useActionState, useState } from "react";
import { askTutor, type TutorState } from "@/modules/tutor/actions";
async function recover(state: TutorState, form: FormData): Promise<TutorState> {
  try {
    return await askTutor(state, form);
  } catch {
    return {
      message:
        "Could not reach the tutor. Retry when connected; your lesson and practice remain available.",
    };
  }
}
export function TutorPanel({
  lesson,
  request,
  mode,
}: {
  lesson: string;
  request: string;
  mode: "disabled" | "scripted" | "live";
}) {
  const [state, action, pending] = useActionState(recover, {});
  const [key, setKey] = useState(request);
  const [intent, setIntent] = useState("hint");
  const answered = state.request === key;
  const enabled = mode !== "disabled";
  const live = mode === "live";
  return (
    <section className="tutor-panel" aria-labelledby="tutor-heading">
      <h3 id="tutor-heading">Lesson tutor</h3>
      <p className="eyebrow">
        {live
          ? "LIVE AI · LOCAL TESTING"
          : enabled
            ? "SCRIPTED DEMO · NO LIVE AI"
            : "TUTOR DISABLED"}
      </p>
      <p>
        {live
          ? "Gemini receives this lesson and your selected guidance option. No notes, answers or profile details are sent. Free-tier content may be used to improve Google's products. AI can make mistakes and does not grade your work."
          : enabled
            ? "Choose prepared guidance for this reviewed lesson. No external AI calls or chat history; this tutor does not grade your work."
            : "Continue with the lesson, example and practice feedback. Tutor availability does not affect saved progress."}
      </p>
      {enabled && (
        <form
          action={action}
          className="account-form"
          aria-busy={pending}
          onReset={(e) => e.preventDefault()}
        >
          <input type="hidden" name="lesson" value={lesson} />
          <input type="hidden" name="request" value={key} />
          <div className="field">
            <label htmlFor="tutor-intent">What would help?</label>
            <select
              id="tutor-intent"
              name="intent"
              value={intent}
              disabled={pending}
              onChange={(e) => {
                setIntent(e.target.value);
                setKey(crypto.randomUUID());
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
            disabled={pending || answered}
          >
            {pending
              ? "Loading guidance…"
              : answered
                ? "Guidance loaded"
                : live
                  ? "Ask lesson tutor"
                  : "Get scripted guidance"}
          </button>
          {state.message && (
            <p role="status" aria-live="polite">
              {state.message}
            </p>
          )}
        </form>
      )}
      {answered && state.reply && (
        <div className="tutor-reply">
          <div role="status">
            {live && (
              <p className="eyebrow">
                {state.reply.adapter === "scripted-live-fallback-1"
                  ? "AI UNAVAILABLE · PREPARED GUIDANCE"
                  : "AI-GENERATED GUIDANCE"}
              </p>
            )}
            <p>{state.reply.text}</p>
            {state.reply.source && (
              <a href={state.reply.source.href}>
                Source: {state.reply.source.title}
              </a>
            )}
            <p>
              {state.remaining} {live ? "tutor" : "scripted"} requests left
              today. Resets at midnight UTC.
            </p>
          </div>
          {live ? (
            <p>
              Live replies are not saved in this testing version. Use the
              lesson’s report form for lesson issues; exact AI-response
              reporting is not available yet.
            </p>
          ) : (
            <ReportForm
              lesson={lesson}
              request={state.request!}
              tutorRequest={state.request!}
            />
          )}
        </div>
      )}
    </section>
  );
}
