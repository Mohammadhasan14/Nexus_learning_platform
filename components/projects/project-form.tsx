"use client";
import { useActionState, useState } from "react";
import { submitProject, type ProjectState } from "@/modules/projects/actions";
import type { ProjectWork } from "@/modules/projects/schema";
async function recover(
  state: ProjectState,
  form: FormData,
): Promise<ProjectState> {
  try {
    return await submitProject(state, form);
  } catch {
    return {
      message:
        "Could not reach the server. Your text is kept; retry when connected.",
    };
  }
}
export function ProjectForm({
  project,
  base,
  initial,
  rubric,
  request,
}: {
  project: string;
  base: number;
  initial: ProjectWork;
  rubric: { id: string; title: string; prompt: string }[];
  request: string;
}) {
  const [state, action, pending] = useActionState(recover, {});
  const [work, setWork] = useState(initial);
  const [key, setKey] = useState(request);
  const saved = state.success && state.request === key;
  return (
    <form
      action={action}
      className="account-form"
      aria-busy={pending}
      onReset={(e) => e.preventDefault()}
    >
      <input type="hidden" name="project" value={project} />
      <input type="hidden" name="base" value={base} />
      <input type="hidden" name="request" value={key} />
      {rubric.map((item) => (
        <div className="field" key={item.id}>
          <label htmlFor={`${project}-${item.id}`}>{item.title}</label>
          <p id={`${project}-${item.id}-help`}>{item.prompt}</p>
          <textarea
            id={`${project}-${item.id}`}
            name={item.id}
            rows={5}
            maxLength={4000}
            aria-describedby={`${project}-${item.id}-help`}
            disabled={pending || saved}
            value={work[item.id as keyof ProjectWork]}
            onChange={(e) => {
              setWork({ ...work, [item.id]: e.target.value });
              setKey(crypto.randomUUID());
            }}
          />
        </div>
      ))}
      <p>
        Private revision · up to 4,000 characters per milestone. Code is stored
        as text, not executed. Keep a local copy of unsaved work.
      </p>
      <button className="button button-primary" disabled={pending || saved}>
        {pending
          ? "Saving revision…"
          : saved
            ? "Revision saved"
            : "Save revision"}
      </button>
      {saved && (
        <button
          type="button"
          className="button button-secondary"
          onClick={() => {
            setKey(crypto.randomUUID());
          }}
        >
          Start next revision
        </button>
      )}
      <p role={state.success ? "status" : "alert"}>{state.message}</p>
    </form>
  );
}
