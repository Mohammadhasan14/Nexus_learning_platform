"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { runSearch } from "@/modules/search/actions";
import type { SearchResult } from "@/modules/search/data";
import { SearchResults } from "./results";
export function CommandMenu() {
  const dialog = useRef<HTMLDialogElement>(null),
    input = useRef<HTMLInputElement>(null),
    trigger = useRef<HTMLButtonElement>(null),
    opener = useRef<HTMLElement | null>(null),
    sequence = useRef(0);
  const [query, setQuery] = useState(""),
    [result, setResult] = useState<SearchResult | null>(null),
    [pending, setPending] = useState(false);
  const open = useCallback(() => {
    opener.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    dialog.current?.showModal();
    input.current?.focus();
  }, []);
  const close = useCallback(() => {
    sequence.current++;
    setPending(false);
    dialog.current?.close();
    (opener.current?.isConnected ? opener.current : trigger.current)?.focus();
  }, []);
  useEffect(() => {
    function keyboard(e: KeyboardEvent) {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === "k" &&
        !e.altKey &&
        !e.repeat
      ) {
        e.preventDefault();
        if (dialog.current?.open) {
          close();
        } else {
          open();
        }
      }
    }
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, [open, close]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const id = ++sequence.current;
    setPending(true);
    setResult(null);
    try {
      const found = await runSearch(query);
      if (sequence.current === id) setResult(found);
    } catch {
      if (sequence.current === id)
        setResult({
          items: [],
          more: false,
          error: "Could not reach search. Please retry.",
        });
    } finally {
      if (sequence.current === id) setPending(false);
    }
  }
  return (
    <>
      <button
        ref={trigger}
        className="button button-secondary"
        onClick={open}
        aria-haspopup="dialog"
        aria-keyshortcuts="Control+k Meta+k"
      >
        Quick search <kbd>⌘ / Ctrl K</kbd>
      </button>
      <dialog
        ref={dialog}
        className="command-menu"
        aria-labelledby="command-title"
        onKeyDown={(e) => {
          if (e.key !== "Tab") return;
          const controls = Array.from(
            e.currentTarget.querySelectorAll<HTMLElement>(
              "button:not(:disabled), input:not(:disabled), a[href]",
            ),
          );
          const first = controls[0],
            last = controls.at(-1);
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }}
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
        onClose={() => {
          sequence.current++;
          setPending(false);
        }}
      >
        <div className="command-heading">
          <h2 id="command-title">Quick search</h2>
          <button className="button button-secondary" onClick={close}>
            Close
          </button>
        </div>
        <p id="command-help">
          Search unlocked lessons and workspace actions. Tab through results and
          press Enter to open. Escape closes this menu.
        </p>
        <form onSubmit={submit} aria-busy={pending}>
          <div className="field">
            <label htmlFor="command-query">Find lessons and actions</label>
            <input
              ref={input}
              id="command-query"
              type="search"
              value={query}
              maxLength={100}
              aria-describedby="command-help"
              onChange={(e) => {
                sequence.current++;
                setPending(false);
                setResult(null);
                setQuery(e.target.value);
              }}
            />
          </div>
          <button className="button button-primary" disabled={pending}>
            {pending ? "Searching…" : "Find"}
          </button>
        </form>
        {pending && <p role="status">Searching your workspace…</p>}
        {result && <SearchResults result={result} onNavigate={close} />}
      </dialog>
    </>
  );
}
