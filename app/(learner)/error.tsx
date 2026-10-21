"use client";
import Link from "next/link";
export default function LearnerError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const digest =
    typeof error.digest === "string" && /^\d{1,20}$/.test(error.digest)
      ? error.digest
      : undefined;
  return (
    <section className="preferences-panel" role="alert">
      <p className="eyebrow">LET’S TRY THAT AGAIN</p>
      <h1>We couldn’t open your learning space.</h1>
      <p>
        Your saved preferences haven’t been changed. Check your connection and
        try again.
      </p>
      {digest && <p>Error reference: {digest}</p>}
      <div className="hero-actions">
        <button className="button button-primary" onClick={retry}>
          Try again
        </button>
        <Link className="button button-secondary" href="/login">
          Return to sign in
        </Link>
      </div>
    </section>
  );
}
