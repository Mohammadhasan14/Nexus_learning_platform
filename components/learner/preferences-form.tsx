"use client";
import { useActionState } from "react";
import { savePreferences } from "@/modules/profile/actions";
import { locales } from "@/modules/profile/validation";
import type { ActionState } from "@/lib/auth/validation";
import type { Database } from "@/lib/supabase/database.types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export function PreferencesForm({
  profile,
  timezones,
  onboarding = false,
}: {
  profile: Profile;
  timezones: string[];
  onboarding?: boolean;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    savePreferences,
    {},
  );
  const current = (key: keyof Profile) =>
    state.values?.[key] ?? String(profile[key] ?? "");
  const described = (key: string) =>
    state.errors?.[key] ? `${key}-error` : undefined;
  return (
    <form
      action={action}
      className="account-form preferences-form"
      aria-busy={pending}
    >
      <input
        type="hidden"
        name="intent"
        value={onboarding ? "onboarding" : "settings"}
      />
      {state.message && (
        <p
          className={state.success ? "form-success" : "form-message"}
          role={state.success ? "status" : "alert"}
        >
          {state.message}
        </p>
      )}
      <div className="field">
        <label htmlFor="display_name">What should we call you?</label>
        <input
          id="display_name"
          name="display_name"
          autoComplete="nickname"
          required
          maxLength={60}
          defaultValue={current("display_name")}
          aria-invalid={!!state.errors?.display_name}
          aria-describedby={described("display_name")}
        />
        <small id="display_name-error">{state.errors?.display_name?.[0]}</small>
      </div>
      <div className="field">
        <label htmlFor="goal">What would you like to achieve?</label>
        <textarea
          id="goal"
          name="goal"
          required
          minLength={10}
          maxLength={500}
          rows={3}
          placeholder="For example, build a website for an idea I care about."
          defaultValue={current("goal")}
          aria-invalid={!!state.errors?.goal}
          aria-describedby={described("goal")}
        />
        <small id="goal-error">{state.errors?.goal?.[0]}</small>
      </div>
      <div className="field">
        <label htmlFor="daily_minutes">Daily study time (minutes)</label>
        <input
          id="daily_minutes"
          name="daily_minutes"
          type="number"
          min={5}
          max={240}
          step={5}
          required
          defaultValue={current("daily_minutes")}
          aria-invalid={!!state.errors?.daily_minutes}
          aria-describedby="minutes-hint daily_minutes-error"
        />
        <small id="minutes-hint">
          Choose 5–240 minutes in steps of 5. You can change this anytime.
        </small>
        <small id="daily_minutes-error">
          {state.errors?.daily_minutes?.[0]}
        </small>
      </div>
      <div className="form-columns">
        <div className="field">
          <label htmlFor="locale">Language and region</label>
          <select
            id="locale"
            name="locale"
            defaultValue={current("locale")}
            aria-invalid={!!state.errors?.locale}
            aria-describedby={described("locale")}
          >
            {Object.entries(locales).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <small id="locale-error">{state.errors?.locale?.[0]}</small>
        </div>
        <div className="field">
          <label htmlFor="timezone">Your timezone</label>
          <select
            id="timezone"
            name="timezone"
            defaultValue={current("timezone")}
            aria-invalid={!!state.errors?.timezone}
            aria-describedby="timezone-hint timezone-error"
          >
            {timezones.map((zone) => (
              <option key={zone} value={zone}>
                {zone.replaceAll("_", " ")}
              </option>
            ))}
          </select>
          <small id="timezone-hint">
            Used to display dates in your local time.
          </small>
          <small id="timezone-error">{state.errors?.timezone?.[0]}</small>
        </div>
      </div>
      <button
        className="button button-primary"
        disabled={pending}
        type="submit"
      >
        {pending
          ? "Saving…"
          : onboarding
            ? "Save and open my dashboard"
            : "Save preferences"}
        <span aria-hidden="true">→</span>
      </button>
    </form>
  );
}
