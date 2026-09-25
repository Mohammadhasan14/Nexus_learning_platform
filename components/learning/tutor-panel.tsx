"use client";
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
  enabled,
}: {
  lesson: string;
  request: string;
  enabled: boolean;
}) {
  const [state, action, pending] = useActionState(recover, {});
  const [key, setKey] = useState(request);
  const [intent, setIntent] = useState("hint");
  const answered = state.request === key;
  return (
    <section className="tutor-panel" aria-labelledby="tutor-heading">
      <h3 id="tutor-heading">Lesson tutor</h3>
      <p className="eyebrow">
        {enabled ? "SCRIPTED DEMO · NO LIVE AI" : "TUTOR DISABLED"}
      </p>
      <p>
        {enabled
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
                : "Get scripted guidance"}
          </button>
          {state.message && (
            <p role="status" aria-live="polite">
              {state.message}
            </p>
          )}
          {answered && state.reply && (
            <div className="tutor-reply" role="status">
              <p>{state.reply.text}</p>
              {state.reply.source && (
                <a href={state.reply.source.href}>
                  Source: {state.reply.source.title}
                </a>
              )}
              <p>
                {state.remaining} scripted requests left today. Resets at
                midnight UTC.
              </p>
            </div>
          )}
        </form>
      )}
    </section>
  );
}
