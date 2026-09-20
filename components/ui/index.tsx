import Link from "next/link";
import type { ReactNode } from "react";

export function ButtonLink({
  href,
  children,
  secondary = false,
}: {
  href: string;
  children: ReactNode;
  secondary?: boolean;
}) {
  return (
    <Link
      className={`button ${secondary ? "button-secondary" : "button-primary"}`}
      href={href}
    >
      {children}
    </Link>
  );
}
export function Badge({ children }: { children: ReactNode }) {
  return <span className="badge">{children}</span>;
}
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <article className={`card ${className}`}>{children}</article>;
}
export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Nexus Learning home">
      <span className="brand-mark" aria-hidden="true">
        N
      </span>
      <span>Nexus Learning</span>
    </Link>
  );
}
