"use client";
import { useActionState, useState } from "react";
import {
  enrol,
  markRead,
  submit,
  type LearningState,
} from "@/modules/learning/actions";
export function EnrolForm({ course }: { course: string }) {
  const [state, action, pending] = useActionState(enrol, {});
  return (
    <form action={action}>
      <input type="hidden" name="course" value={course} />
      <button className="button button-primary" disabled={pending}>
        {pending ? "Saving…" : "Enrol in this version"}
      </button>
      <p role={state.success ? "status" : "alert"}>{state.message}</p>
    </form>
  );
}
export function ReadForm({ lesson }: { lesson: string }) {
  const [state, action, pending] = useActionState(markRead, {});
  return (
    <form action={action}>
      <input type="hidden" name="lesson" value={lesson} />
      <button className="button button-secondary" disabled={pending}>
        {pending ? "Saving…" : "Mark as read"}
      </button>
      <p role={state.success ? "status" : "alert"}>{state.message}</p>
    </form>
  );
}
async function submitWithRecovery(
  state: LearningState,
  form: FormData,
): Promise<LearningState> {
  try {
    return await submit(state, form);
  } catch {
    return {
      message:
        "Could not reach the server. Your selection is kept. Retry when connected.",
    };
  }
}
export function ExerciseForm({
  exercise,
  prompt,
  options,
  request,
}: {
  exercise: string;
  prompt: string;
  options: { id: string; label: string }[];
  request: string;
}) {
  const [state, action, pending] = useActionState(submitWithRecovery, {});
  const [attempt, setAttempt] = useState(request);
  const [answer, setAnswer] = useState("");
  const saved = state.success && state.request === attempt;
  return (
    <form
      action={action}
      className="account-form exercise-form"
      aria-busy={pending}
      onReset={(event) => event.preventDefault()}
    >
      <input type="hidden" name="exercise" value={exercise} />
      <input type="hidden" name="request" value={attempt} />
      <fieldset disabled={pending || saved}>
        <legend>{prompt}</legend>
        {options.map((o) => (
          <label className="exercise-option" key={o.id}>
            <input
              type="radio"
              name="submitted"
              value={o.id}
              checked={answer === o.id}
              onChange={() => setAnswer(o.id)}
              required
            />
            {o.label}
          </label>
        ))}
      </fieldset>
      {!saved && (
        <button className="button button-primary" disabled={pending || !answer}>
          {pending ? "Checking…" : "Check answer"}
        </button>
      )}
      <div role={state.success ? "status" : "alert"} aria-live="polite">
        {saved && <strong>{state.correct ? "Correct. " : "Not yet. "}</strong>}
        {(!state.success || saved) && state.message}
      </div>
      {state.message && !state.success && (
        <button
          type="button"
          className="button button-secondary"
          onClick={() => {
            setAttempt(crypto.randomUUID());
            setAnswer("");
          }}
        >
          Start a new attempt
        </button>
      )}
      {saved && (
        <button
          type="button"
          className="button button-secondary"
          onClick={() => {
            setAttempt(crypto.randomUUID());
            setAnswer("");
          }}
        >
          Try again
        </button>
      )}
    </form>
  );
}
