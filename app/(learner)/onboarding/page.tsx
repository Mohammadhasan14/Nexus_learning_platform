import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/session";
import { PreferencesForm } from "@/components/learner/preferences-form";
import { timezoneOptions } from "@/modules/profile/timezones";
export const metadata = { title: "Your starting point — Nexus Learning" };
export default async function Onboarding() {
  const { profile } = await requireProfile("/onboarding");
  if (profile.onboarding_completed_at) redirect("/dashboard");
  return (
    <section className="preferences-panel">
      <p className="eyebrow">LET’S MAKE THIS YOURS</p>
      <h1>
        A goal. A little time.
        <br />
        <span className="gradient-text">A place to begin.</span>
      </h1>
      <p>
        Your preferences are private. Set a starting point now, and adjust it as
        you go.
      </p>
      <PreferencesForm
        profile={profile}
        timezones={timezoneOptions(profile.timezone)}
        onboarding
      />
    </section>
  );
}
