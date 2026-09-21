import { requireProfile } from "@/lib/auth/session";
import { PreferencesForm } from "@/components/learner/preferences-form";
import { timezoneOptions } from "@/modules/profile/timezones";
export const metadata = { title: "Learning preferences — Nexus Learning" };
export default async function Settings() {
  const { profile } = await requireProfile("/settings");
  return (
    <section className="preferences-panel">
      <p className="eyebrow">LEARNING THAT FITS YOUR LIFE</p>
      <h1>Your preferences.</h1>
      <p>
        Make room for what matters to you. You can change your goal and schedule
        anytime.
      </p>
      <PreferencesForm
        profile={profile}
        timezones={timezoneOptions(profile.timezone)}
      />
    </section>
  );
}
