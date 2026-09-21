"use client";
import { useState } from "react";
import { Brand, ButtonLink } from "@/components/ui";

export function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Brand />
        <button
          className="menu-toggle"
          aria-expanded={open}
          aria-controls="main-navigation"
          onClick={() => setOpen(!open)}
        >
          Menu <span aria-hidden="true">{open ? "−" : "+"}</span>
        </button>
        <nav
          id="main-navigation"
          aria-label="Main navigation"
          className={open ? "navigation is-open" : "navigation"}
          onClick={() => setOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              document
                .querySelector<HTMLButtonElement>(".menu-toggle")
                ?.focus();
            }
          }}
        >
          <a href="#how-it-works">How it works</a>
          <a href="#learning-paths">Learning paths</a>
          <a href="#projects">Projects</a>
          <a className="login-link" href="/login">
            Log in
          </a>
          <ButtonLink href="#learning-paths">
            Explore learning <span aria-hidden="true">↗</span>
          </ButtonLink>
        </nav>
      </div>
    </header>
  );
}
