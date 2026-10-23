"use client";
import { useEffect, useRef } from "react";

/** Restore a form's keyboard workflow, without pulling focus back from another task. */
export function useSubmissionFocus<T extends HTMLElement = HTMLFormElement>(
  pending: boolean,
  result: unknown,
  target: string,
) {
  const formRef = useRef<T>(null);
  const submitted = useRef(false),
    previous = useRef(result),
    next = useRef<string | null>(null),
    sawPending = useRef(false);
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    if (next.current) {
      form.querySelector<HTMLElement>(next.current)?.focus();
      next.current = null;
    }
    if (pending) {
      if (submitted.current) sawPending.current = true;
      return;
    }
    if (
      !submitted.current ||
      (!sawPending.current && previous.current === result)
    )
      return;
    submitted.current = false;
    sawPending.current = false;
    const active = document.activeElement;
    if (active === document.body || (active && form.contains(active)))
      form.querySelector<HTMLElement>(target)?.focus();
  });
  return {
    formRef,
    onSubmit: () => {
      submitted.current = true;
      previous.current = result;
      sawPending.current = false;
    },
    focusAfterRender: (selector: string) => {
      next.current = selector;
    },
  };
}
