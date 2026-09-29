"use client";
import { useActionState, useState, useSyncExternalStore } from "react";
import { saveNote, type NoteState } from "@/modules/notes/actions";
const subscribe = () => () => {};
export function NoteEditor({
  lesson,
  initial,
  revision,
  request,
}: {
  lesson: string;
  initial: string;
  revision: number;
  request: string;
}) {
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const [body, setBody] = useState(initial),
    [base, setBase] = useState(revision),
    [saved, setSaved] = useState(initial);
  const [identity, setIdentity] = useState(request);
  const [state, action, pending] = useActionState(
    async (previous: NoteState, form: FormData): Promise<NoteState> => {
      try {
        const result = await saveNote(previous, form);
        if (result.success && result.revision) {
          setBase(result.revision);
          setSaved(String(form.get("body")));
          setIdentity(crypto.randomUUID());
        }
        return result;
      } catch {
        return {
          message:
            "Could not reach the server. Your text is kept. Retry without changing it to check the save safely.",
        };
      }
    },
    {},
  );
  return (
    <section className="card note-editor" aria-labelledby="private-note-title">
      <h2 id="private-note-title">Private lesson note</h2>
      <p>
        Only you can read this note in the app. It stays with this lesson
        version. Save explicitly before leaving; clearing the text and saving
        clears your note.
      </p>
      <noscript>Enable JavaScript to edit and save your private note.</noscript>
      <form
        action={action}
        aria-busy={pending}
        onReset={(e) => e.preventDefault()}
      >
        <input type="hidden" name="lesson" value={lesson} />
        <input type="hidden" name="expected" value={base} />
        <input type="hidden" name="request" value={identity} />
        <div className="field">
          <label htmlFor="lesson-note">Your note</label>
          <textarea
            id="lesson-note"
            name="body"
            rows={7}
            maxLength={10000}
            value={body}
            disabled={!hydrated || pending}
            aria-describedby="note-help"
            onChange={(e) => {
              setBody(e.target.value);
              setIdentity(crypto.randomUUID());
            }}
          />
        </div>
        <p id="note-help">
          {body.length} / 10,000 characters ·{" "}
          {body === saved ? "No unsaved changes" : "Unsaved changes"}
        </p>
        <button
          className="button button-secondary"
          disabled={!hydrated || pending || body === saved}
        >
          {pending ? "Saving…" : "Save note"}
        </button>
        <p role={state.success ? "status" : "alert"}>{state.message}</p>
      </form>
    </section>
  );
}
