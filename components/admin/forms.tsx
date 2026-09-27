"use client";
import { useActionState, useState } from "react";
import { staffAction, type StaffState } from "@/modules/admin/actions";
import type { DraftContent } from "@/modules/admin/schema";
async function recover(state: StaffState, form: FormData): Promise<StaffState> {
  try {
    return await staffAction(state, form);
  } catch {
    return {
      message:
        "Could not reach the server. Your text is kept. Reload before retrying an uncertain edit or review.",
    };
  }
}
export function StaffForm({
  operation,
  id,
  expected,
  children,
}: {
  operation: string;
  id: string;
  expected?: number;
  children: React.ReactNode;
}) {
  const [state, action, pending] = useActionState(recover, {});
  return (
    <form
      action={action}
      className="account-form"
      aria-busy={pending}
      onReset={(e) => e.preventDefault()}
    >
      <input type="hidden" name="operation" value={operation} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="expected" value={expected ?? 1} />
      <fieldset disabled={pending}>{children}</fieldset>
      <p role={state.success ? "status" : "alert"}>{state.message}</p>
    </form>
  );
}
export function DraftEditor({
  id,
  revision,
  initial,
}: {
  id: string;
  revision: number;
  initial: DraftContent;
}) {
  const [content, setContent] = useState(initial);
  return (
    <StaffForm operation="save" id={id} expected={revision}>
      <input type="hidden" name="content" value={JSON.stringify(content)} />
      {Object.entries(content).map(([lesson, values]) => (
        <fieldset key={lesson}>
          <legend>{values.title}</legend>
          {(["title", "objective", "body", "example"] as const).map((field) => (
            <div className="field" key={field}>
              <label htmlFor={`${id}-${lesson}-${field}`}>
                {field === "body"
                  ? "Lesson text"
                  : field === "example"
                    ? "Code example"
                    : field === "title"
                      ? "Lesson title"
                      : "Learning objective"}
              </label>
              <textarea
                id={`${id}-${lesson}-${field}`}
                value={values[field]}
                rows={field === "body" ? 6 : 3}
                maxLength={["body", "example"].includes(field) ? 12000 : 500}
                required
                onChange={(e) =>
                  setContent({
                    ...content,
                    [lesson]: { ...values, [field]: e.target.value },
                  })
                }
              />
            </div>
          ))}
        </fieldset>
      ))}
      <button className="button button-primary">Save draft changes</button>
    </StaffForm>
  );
}
