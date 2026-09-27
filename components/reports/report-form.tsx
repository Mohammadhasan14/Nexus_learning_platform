"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { sendReport, type ReportState } from "@/modules/reports/actions";
async function recover(
  state: ReportState,
  form: FormData,
): Promise<ReportState> {
  try {
    return await sendReport(state, form);
  } catch {
    return {
      message:
        "Could not reach the server. Your report text is kept; retry when connected.",
    };
  }
}
export function ReportForm({
  lesson,
  request,
  tutorRequest,
}: {
  lesson: string;
  request: string;
  tutorRequest?: string;
}) {
  const [state, action, pending] = useActionState(recover, {});
  const [text, setText] = useState(""),
    [key, setKey] = useState(request);
  return (
    <details className="report-form">
      <summary>
        {tutorRequest ? "Report this tutor response" : "Report a lesson issue"}
      </summary>
      <form
        action={action}
        className="account-form"
        onReset={(e) => e.preventDefault()}
        aria-busy={pending}
      >
        <input type="hidden" name="lesson" value={lesson} />
        <input type="hidden" name="request" value={key} />
        {tutorRequest && (
          <input type="hidden" name="tutor_request" value={tutorRequest} />
        )}
        <div className="field">
          <label htmlFor={`report-${request}`}>What needs attention?</label>
          <textarea
            id={`report-${request}`}
            name="message"
            minLength={10}
            maxLength={2000}
            required
            rows={4}
            value={text}
            disabled={pending || state.success}
            onChange={(e) => {
              setText(e.target.value);
              setKey(crypto.randomUUID());
            }}
          />
        </div>
        <p>
          Staff will receive your description and this content version
          {tutorRequest ? ", including the exact scripted response" : ""}.
          Include no passwords or other private details. Up to ten reports per
          UTC day.
        </p>
        <button
          className="button button-secondary"
          disabled={pending || state.success}
        >
          {pending
            ? "Sending…"
            : state.success
              ? "Report saved"
              : "Send report"}
        </button>
        <p role={state.success ? "status" : "alert"}>{state.message}</p>
        <Link href="/reports">My reports</Link>
      </form>
    </details>
  );
}
