"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brand } from "@/components/ui";
import { signOutAction } from "@/app/auth/actions";
import { useFormStatus } from "react-dom";
function SignOutButton() {
  const { pending } = useFormStatus();
  return (
    <button
      className="button button-secondary"
      type="submit"
      disabled={pending}
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
export function LearnerShell({
  children,
  staff = false,
}: {
  children: React.ReactNode;
  staff?: boolean;
}) {
  const path = usePathname();
  return (
    <div className="learner-shell">
      <a className="skip-link" href="#learner-content">
        Skip to content
      </a>
      <aside className="learner-sidebar">
        <Brand />
        <p className="eyebrow">YOUR WORKSPACE</p>
        <nav aria-label="Learner navigation">
          <Link
            href="/dashboard"
            aria-current={path === "/dashboard" ? "page" : undefined}
          >
            <span aria-hidden="true">⌂</span>Today
          </Link>
          <Link
            href="/settings"
            aria-current={path === "/settings" ? "page" : undefined}
          >
            <span aria-hidden="true">⚙</span>Preferences
          </Link>
          <Link
            href="/courses"
            aria-current={path.startsWith("/courses") ? "page" : undefined}
          >
            <span aria-hidden="true">◇</span>Courses
          </Link>
          <Link
            href="/reviews"
            aria-current={path === "/reviews" ? "page" : undefined}
          >
            <span aria-hidden="true">↻</span>Reviews
          </Link>
          <Link
            href="/projects"
            aria-current={path === "/projects" ? "page" : undefined}
          >
            <span aria-hidden="true">◇</span>Projects
          </Link>
          <Link
            href="/reports"
            aria-current={path === "/reports" ? "page" : undefined}
          >
            My reports
          </Link>
          {staff && (
            <Link
              href="/admin"
              aria-current={path === "/admin" ? "page" : undefined}
            >
              Editorial
            </Link>
          )}
        </nav>
        <div className="sidebar-bottom">
          <small>
            Small steps.
            <br />
            Lasting understanding.
          </small>
          <form action={signOutAction}>
            <SignOutButton />
          </form>
        </div>
      </aside>
      <div className="learner-main">
        <header className="workspace-header">
          <span>
            Workspace <span aria-hidden="true">/</span>{" "}
            {path === "/admin"
              ? "Editorial"
              : path === "/reports"
                ? "My reports"
                : path.startsWith("/courses")
                  ? "Learning"
                  : path === "/reviews"
                    ? "Reviews"
                    : path === "/projects"
                      ? "Projects"
                      : path === "/settings"
                        ? "Preferences"
                        : path === "/onboarding"
                          ? "Getting started"
                          : "Today"}
          </span>
          <span className="badge">Early learning space</span>
        </header>
        <main id="learner-content" tabIndex={-1} className="learner-content">
          {children}
        </main>
      </div>
    </div>
  );
}
