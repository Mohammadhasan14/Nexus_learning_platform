import { requireProfile } from "@/lib/auth/session";
import { PreferencesForm } from "@/components/learner/preferences-form";
import { timezoneOptions } from "@/modules/profile/timezones";
import { DataExport } from "@/components/learner/data-export";
import {
  PrivacyControls,
  DeleteAccount,
} from "@/components/learner/privacy-controls";
import { privacySettings } from "@/modules/privacy/schema";
export const metadata = { title: "Learning preferences — Nexus Learning" };
export default async function Settings() {
  const { client, profile } = await requireProfile("/settings");
  const result = await client.rpc("get_privacy_settings");
  const settings = privacySettings.safeParse(result.data);
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
      <DataExport />
      <PrivacyControls
        initial={!result.error && settings.success ? settings.data : null}
      />
      <DeleteAccount
        available={/^[a-f0-9]{64}$/.test(
          process.env.ACCOUNT_DELETION_SIGNING_KEY ?? "",
        )}
      />
    </section>
  );
}
