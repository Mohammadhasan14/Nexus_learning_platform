"use client";
import { useActionState } from "react";
import { loginAction, registerAction } from "@/app/auth/actions";
import type { ActionState } from "@/lib/auth/validation";

export function AuthForm({
  mode,
  next = "/dashboard",
}: {
  mode: "login" | "register";
  next?: string;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    mode === "login" ? loginAction : registerAction,
    {},
  );
  const signup = mode === "register";
  return (
    <form action={action} className="account-form" aria-busy={pending}>
      <input type="hidden" name="next" value={next} />
      {state.message && (
        <p
          className={state.success ? "form-success" : "form-message"}
          role={state.success ? "status" : "alert"}
        >
          {state.message}
        </p>
      )}
      <div className="field">
        <label htmlFor="email">Email address</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          defaultValue={state.values?.email}
          aria-invalid={!!state.errors?.email}
          aria-describedby={state.errors?.email ? "email-error" : undefined}
        />
        <small id="email-error">{state.errors?.email?.[0]}</small>
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={signup ? "new-password" : "current-password"}
          required
          minLength={signup ? 12 : 1}
          maxLength={128}
          aria-invalid={!!state.errors?.password}
          aria-describedby={
            signup ? "password-hint password-error" : "password-error"
          }
        />
        {signup && (
          <small id="password-hint">
            Use at least 12 characters. A memorable passphrase works well.
          </small>
        )}
        <small id="password-error">{state.errors?.password?.[0]}</small>
      </div>
      <button
        className="button button-primary"
        type="submit"
        disabled={pending}
      >
        {pending ? "Please wait…" : signup ? "Create account" : "Sign in"}
        <span aria-hidden="true">→</span>
      </button>
    </form>
  );
}
