import Link from "next/link";
import { Brand } from "@/components/ui";
export const metadata = { title: "Terms of use — Nexus Learning" };
export default function Terms() {
  return (
    <div className="container policy-page">
      <header>
        <Brand />
        <p>
          <Link href="/">Homepage</Link> ·{" "}
          <Link href="/privacy">Privacy notice</Link>
        </p>
      </header>
      <main id="main-content">
        <h1>Terms of use</h1>
        <p>
          Updated 23 October 2026. These describe the current development
          service and are not a paid-service contract or a promise of production
          availability.
        </p>
        <h2>Use for learning</h2>
        <p>
          Use Nexus Learning to study and practise with content you are entitled
          to submit. Keep your sign-in details private. Do not attempt to access
          another learner’s data, bypass quotas or grading controls, or use the
          practice runner to attack the application or other services.
        </p>
        <h2>Guidance and saved work</h2>
        <p>
          Prepared guidance, AI replies and automated completeness feedback can
          be incomplete or incorrect. Check them against lesson sources and your
          own work. Saved progress is learning evidence, not a professional
          certification. You remain responsible for the code and text you
          submit; do not include passwords, third-party secrets or personal
          information you are not entitled to share.
        </p>
        <h2>Availability and your controls</h2>
        <p>
          Features depend on a connected environment and can be unavailable
          during development or an outage. Export important work when needed.
          Settings provides tutor reply retention, export and account deletion
          controls; see the <Link href="/privacy">privacy notice</Link> for
          their exact scope and limitations.
        </p>
        <h2>Operator arrangements</h2>
        <p>
          No payments or subscriptions are implemented. Commercial terms,
          support commitments and operator-specific legal arrangements must be
          supplied before a public or paid release. Use the operator/contact
          information in the privacy notice for questions about the environment
          you are using.
        </p>
      </main>
    </div>
  );
}
