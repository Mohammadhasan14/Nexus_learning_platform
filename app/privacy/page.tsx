import Link from "next/link";
import { Brand } from "@/components/ui";
export const dynamic = "force-dynamic";
export const metadata = { title: "Privacy notice — Nexus Learning" };
export default function Privacy() {
  const operator = process.env.PRIVACY_OPERATOR_NAME?.trim().slice(0, 120);
  const candidate =
    process.env.PRIVACY_CONTACT_EMAIL?.trim() || "hello.farzain@gmail.com";
  const contact =
    /^[^\s@<>"?&#]+@[^\s@<>"?&#]+\.[^\s@<>"?&#]+$/.test(candidate) &&
    candidate.length <= 254
      ? candidate
      : null;
  return (
    <div className="container policy-page">
      <header>
        <Brand />
        <p>
          <Link href="/">Homepage</Link> ·{" "}
          <Link href="/terms">Terms of use</Link>
        </p>
      </header>
      <main id="main-content">
        <h1>Privacy notice</h1>
        <p>
          Updated 23 October 2026. This notice describes the current Nexus
          Learning application and its controls. Hosting, backups and AI
          provider settings depend on the environment you use.
        </p>
        <h2>Who operates this environment</h2>
        <p>
          {operator
            ? `Operator: ${operator}.`
            : "A named operator has not yet been supplied for this environment."}{" "}
          {contact ? (
            <>
              For privacy questions or requests, contact{" "}
              <a href={`mailto:${contact}`}>{contact}</a>.
            </>
          ) : (
            "A direct privacy contact has not yet been supplied. Contact the person or organisation that gave you access before submitting personal information."
          )}
        </p>
        <h2>Account and learning information</h2>
        <p>
          Connected account services store your email and authentication
          information. Nexus stores your display name, learning goal, language,
          timezone and study schedule; enrolments, reading acknowledgements,
          exercise answers, feedback and outcomes; private lesson notes and
          saved project revisions. These support sign-in, preferences, progress,
          reviews and the learning tools you choose to use.
        </p>
        <p>
          Learning outcomes record activity such as practice results and
          recorded tutor use. They do not establish mastery or independently
          verified ability. Practice-runner code stays in the current browser
          editor and is not saved as learning evidence. Downloaded exports are
          saved wherever you choose on your device.
        </p>
        <h2>Tutor use and reports</h2>
        <p>
          Scripted guidance uses prepared replies. When live AI is explicitly
          enabled in a local testing environment, the application sends the
          reviewed lesson title, objective, body, example and your selected
          guidance choice to the configured Gemini provider. It does not add
          your profile, private notes, project work, chat history or grading
          keys to that request. The application saves completed replies and
          request/token accounting. There is currently no free-form chat input.
        </p>
        <p>
          Reports include what you type, the lesson version and, if selected, a
          copy of the saved tutor reply you report. Trusted editorial staff can
          review these reports and maintain staff notes/audit records. Staff
          have no general access to your private profile, notes, project
          submissions or tutor history through the app.
        </p>
        <h2>Your retention controls</h2>
        <p>
          By default saved tutor replies stay until you remove them. In{" "}
          <Link href="/settings">Settings</Link>, you can instead choose 30 or
          90 days, or clear saved replies now. Age is measured from when a reply
          was saved; older legacy scripted replies use the start of their
          request day in UTC. Choosing a shorter limit immediately removes
          replies already past it. Extending the limit cannot restore removed
          text.
        </p>
        <p>
          Expiration is enforced when using the tutor, filing a report,
          exporting data or opening privacy settings; operator maintenance can
          purge expired text in the background. An environment without scheduled
          maintenance may retain expired database text until one of those
          operations. Clearing also blocks pending requests from saving their
          reply later. It does not refund quota charges or remove learning
          evidence.
        </p>
        <p>
          Reports keep their submitted copy separately, even after you clear the
          tutor reply. Other account records and reports remain until account
          deletion; there is currently no automatic age-based deletion for them.
          Copies already downloaded, displayed in an open tab or submitted to an
          AI provider are outside this control.
        </p>
        <h2>Export and account deletion</h2>
        <p>
          Settings provides a private JSON download of your account summary and
          saved learner records, including privacy settings. Downloads are
          limited to 8 MiB and fail as a whole if larger; they do not silently
          truncate history. Account deletion requires your current password and
          an explicit confirmation. When available, it removes your Auth
          account, private learning records, preferences, notes, project
          revisions, tutor data and reports you filed, with their report audit
          records.
        </p>
        <p>
          Published course content and staff audit text can remain with direct
          account links removed. Aggregate global quota totals remain. Existing
          access tokens may remain cryptographically valid until expiry, but
          protected application requests verify the account and reject a deleted
          user. Copies in backups, provider logs or downloaded files are not
          erased by this operation. A network failure can leave deletion
          unconfirmed; check the account before retrying.
        </p>
        <h2>Cookies, storage and logs</h2>
        <p>
          The application uses necessary, environment-specific, HttpOnly
          authentication cookies. It does not install advertising trackers or a
          third-party browser analytics SDK. Ordinary application error records
          use request IDs and bounded technical metadata, excluding raw
          passwords, tokens and learner content. Framework, backend, hosting,
          email and AI providers may maintain separate operational records.
        </p>
        <p>
          This code does not establish provider log or backup retention periods,
          data locations, international transfer terms or provider training
          policies. Those details must be supplied by the operator for the
          actual services in use. Do not assume this notice promises a
          particular backup deletion date or provider data policy.
        </p>
        <h2>Before public use</h2>
        <p>
          This application is being developed for adult and college learners. It
          has no verified child-consent or school administration workflow. The
          operator must provide contact details, actual provider/hosting
          information and applicable privacy arrangements before public beta.
          This notice makes no certification or legal-compliance claim.
        </p>
      </main>
    </div>
  );
}
