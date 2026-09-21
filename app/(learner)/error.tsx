"use client";
import Link from "next/link";
export default function LearnerError({ reset }: { reset: () => void }) {
  return (
    <section className="preferences-panel" role="alert">
      <p className="eyebrow">LET’S TRY THAT AGAIN</p>
      <h1>We couldn’t open your learning space.</h1>
      <p>
        Your saved preferences haven’t been changed. Check your connection and
        try again.
      </p>
      <div className="hero-actions">
        <button className="button button-primary" onClick={reset}>
          Try again
        </button>
        <Link className="button button-secondary" href="/login">
          Return to sign in
        </Link>
      </div>
    </section>
  );
}
