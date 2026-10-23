"use client";
import { useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useSubmissionFocus } from "@/components/ui/use-submission-focus";
import {
  privacySettings,
  type PrivacySettings,
} from "@/modules/privacy/schema";
const subscribe = () => () => {};

export function PrivacyControls({
  initial,
}: {
  initial: PrivacySettings | null;
}) {
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const [days, setDays] = useState(String(initial?.tutor_retention_days ?? 0));
  const [saved, setSaved] = useState(days);
  const [pending, setPending] = useState(false);
  const active = useRef(false);
  const [status, setStatus] = useState({ message: "", error: false });
  const [operation, setOperation] = useState("retention");
  const { formRef: sectionRef, onSubmit: rememberSubmission } =
    useSubmissionFocus<HTMLElement>(
      pending,
      status,
      operation === "clear" ? ".privacy-clear > summary" : "select",
    );
  async function change(
    input:
      | { intent: "retention"; days: number }
      | { intent: "clear"; confirmation: string },
  ) {
    if (active.current) return;
    rememberSubmission();
    setOperation(input.intent);
    active.current = true;
    setPending(true);
    setStatus({ message: "", error: false });
    try {
      const response = await fetch("/api/account/privacy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify(input),
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) {
        setStatus({
          error: true,
          message:
            response.status === 401
              ? "Sign in again to continue."
              : "The change could not be confirmed. Reload Settings before retrying.",
        });
        return;
      }
      if (input.intent === "retention") {
        const checked = privacySettings.parse((await response.json()).settings);
        setSaved(String(checked.tutor_retention_days ?? 0));
        setStatus({
          error: false,
          message:
            "Your tutor reply retention setting is saved. Replies already past this limit have been removed.",
        });
      } else
        setStatus({
          error: false,
          message:
            "Saved tutor replies were cleared. Learning progress and quota charges are unchanged. An open tutor tab may still display its current reply until closed or reloaded.",
        });
    } catch {
      setStatus({
        error: true,
        message:
          "The connection was interrupted. Reload Settings before retrying.",
      });
    } finally {
      active.current = false;
      setPending(false);
    }
  }
  return (
    <section
      ref={sectionRef}
      className="privacy-controls"
      aria-labelledby="privacy-controls-title"
    >
      <h2 id="privacy-controls-title">Tutor reply retention</h2>
      <p>
        Choose how long saved tutor replies stay in your account. Your learning
        progress, attempts and quota accounting are kept separately.
      </p>
      <p>
        Expired replies are removed when you use the tutor, reports, export or
        these controls, and during maintenance. Reported replies have a separate
        copy in your report; clearing tutor replies does not remove those
        reports. <Link href="/privacy">Read the privacy notice</Link>.
      </p>
      {!initial && (
        <p role="alert" className="form-message">
          Privacy settings could not be loaded. Reload Settings to try again.
        </p>
      )}
      <noscript>
        Enable JavaScript to change retention or clear replies.
      </noscript>
      <form
        className="account-form"
        aria-busy={pending}
        onSubmit={(event) => {
          event.preventDefault();
          void change({ intent: "retention", days: Number(days) });
        }}
      >
        <div className="field">
          <label htmlFor="tutor-retention">Keep saved tutor replies</label>
          <select
            id="tutor-retention"
            value={days}
            disabled={!ready || !initial || pending}
            onChange={(event) => setDays(event.target.value)}
          >
            <option value="0">Until I remove them</option>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
          </select>
        </div>
        <button
          className="button button-secondary"
          disabled={!ready || !initial || pending || days === saved}
        >
          Save retention setting
        </button>
      </form>
      <details className="privacy-clear">
        <summary>Clear saved tutor replies now</summary>
        <p>
          This permanently removes saved reply text, including replies from
          requests already in progress. It does not refund usage, remove filed
          reports, or erase copies you downloaded or keep open in a tab.
        </p>
        <form
          className="account-form"
          aria-busy={pending}
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const confirmation = String(
              new FormData(form).get("confirmation") ?? "",
            );
            if (confirmation === "CLEAR")
              void change({ intent: "clear", confirmation });
          }}
        >
          <div className="field">
            <label htmlFor="clear-confirmation">
              Type CLEAR to remove saved replies
            </label>
            <input
              id="clear-confirmation"
              name="confirmation"
              required
              pattern="CLEAR"
              autoComplete="off"
              disabled={!ready || !initial || pending}
            />
          </div>
          <button
            className="button button-secondary"
            disabled={!ready || !initial || pending}
          >
            Clear my saved replies
          </button>
        </form>
      </details>
      {status.message && (
        <p
          role={status.error ? "alert" : "status"}
          className={status.error ? "form-message" : "form-success"}
        >
          {status.message}
        </p>
      )}
    </section>
  );
}

export function DeleteAccount({ available }: { available: boolean }) {
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const [pending, setPending] = useState(false);
  const active = useRef(false);
  const [message, setMessage] = useState("");
  const { formRef, onSubmit: rememberDeletion } = useSubmissionFocus(
    pending,
    message,
    'input[name="password"]',
  );
  return (
    <section
      className="privacy-controls account-deletion"
      aria-labelledby="delete-account-title"
    >
      <h2 id="delete-account-title">Delete your account</h2>
      <p>
        Download your learning data before deleting your account. Deletion is
        permanent.
      </p>
      <details>
        <summary>Review account deletion</summary>
        <p>
          Your sign-in account, private learning records, notes, projects, tutor
          history, preferences and reports you filed will be removed. You cannot
          sign in with this account afterward. Global usage totals and published
          course content remain. Staff audit text can remain with its account
          link removed.
        </p>
        <p>
          This does not erase downloaded files, copies in open tabs or provider
          logs and backups. <Link href="/privacy">Review what is retained</Link>
          .
        </p>
        {!available && (
          <p>
            Account deletion is temporarily unavailable in this environment.
          </p>
        )}
        <noscript>Enable JavaScript to delete your account.</noscript>
        <form
          ref={formRef}
          className="account-form"
          aria-busy={pending}
          onSubmit={async (event) => {
            event.preventDefault();
            if (active.current) return;
            rememberDeletion();
            const form = event.currentTarget;
            const values = new FormData(form);
            active.current = true;
            setPending(true);
            setMessage("");
            try {
              const response = await fetch("/api/account/delete", {
                method: "POST",
                credentials: "same-origin",
                cache: "no-store",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  password: values.get("password"),
                  confirmation: values.get("confirmation"),
                }),
                signal: AbortSignal.timeout(30_000),
              });
              if (response.ok && (await response.json()).deleted === true) {
                window.location.replace("/login?reason=deleted");
                return;
              }
              setMessage(
                response.status === 403
                  ? "Password verification failed. Re-enter your current password."
                  : response.status === 429
                    ? "Too many attempts. Wait before trying again."
                    : response.status === 401
                      ? "Sign in again to continue."
                      : "Deletion could not be confirmed. Check your account by signing in again before retrying.",
              );
            } catch {
              setMessage(
                "Deletion could not be confirmed. Check your account by signing in again before retrying.",
              );
            } finally {
              const password = form.elements.namedItem(
                "password",
              ) as HTMLInputElement | null;
              if (password) password.value = "";
              active.current = false;
              setPending(false);
            }
          }}
        >
          <div className="field">
            <label htmlFor="delete-password">Current password</label>
            <input
              id="delete-password"
              type="password"
              name="password"
              required
              maxLength={128}
              autoComplete="current-password"
              disabled={!ready || !available || pending}
            />
          </div>
          <div className="field">
            <label htmlFor="delete-confirmation">
              Type DELETE to confirm account deletion
            </label>
            <input
              id="delete-confirmation"
              name="confirmation"
              required
              pattern="DELETE"
              autoComplete="off"
              disabled={!ready || !available || pending}
            />
          </div>
          <button
            className="button button-secondary"
            disabled={!ready || !available || pending}
          >
            {pending ? "Deleting account…" : "Delete my account permanently"}
          </button>
        </form>
        {message && (
          <p role="alert" className="form-message">
            {message}
          </p>
        )}
      </details>
    </section>
  );
}
