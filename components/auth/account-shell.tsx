import Link from "next/link";
import { Brand } from "@/components/ui";

export function AccountShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="account-page">
      <header className="container account-header">
        <Brand />
        <Link href="/">
          Back to homepage <span aria-hidden="true">↗</span>
        </Link>
      </header>
      <main id="main-content" className="account-layout">
        <section className="account-intro">
          <p className="eyebrow">SMALL STEPS. BIG POSSIBILITIES.</p>
          <h1>
            Your next chapter
            <br />
            <span className="gradient-text">starts here.</span>
          </h1>
          <p>
            A little curiosity. A little practice. A space to make steady
            progress, on your terms.
          </p>
          <div className="account-art" aria-hidden="true">
            <span>✦</span>
            <i />
            <i />
          </div>
          <small>
            Accounts and preferences first. Lessons and projects are coming
            next.
          </small>
        </section>
        <section className="account-panel">{children}</section>
      </main>
    </div>
  );
}
export function AccountsUnavailable() {
  return (
    <div className="empty-state">
      <span className="feature-icon" aria-hidden="true">
        ◇
      </span>
      <h2>Accounts aren’t available here yet.</h2>
      <p>
        This environment is showing the public preview. Your learning space will
        be available once account services are connected.
      </p>
      <Link className="button button-secondary" href="/#learning-paths">
        Explore the learning preview
      </Link>
    </div>
  );
}
