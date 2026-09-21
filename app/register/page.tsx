import Link from "next/link";
import {
  AccountShell,
  AccountsUnavailable,
} from "@/components/auth/account-shell";
import { AuthForm } from "@/components/auth/auth-form";
import { accountsAvailable } from "@/lib/supabase/config";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Create account — Nexus Learning",
  robots: { index: false, follow: false },
};
export default function Register() {
  return (
    <AccountShell>
      <p className="eyebrow">A FRESH START</p>
      <h2>
        Build a habit.
        <br />
        Discover what’s possible.
      </h2>
      {accountsAvailable() ? (
        <>
          <p className="account-description">
            Create your account, confirm your email, and set a goal. This early
            version is intended for adult learners.
          </p>
          <AuthForm mode="register" />
          <p className="account-switch">
            Already have an account? <Link href="/login">Sign in</Link>
          </p>
          <small>
            Learning content isn’t available yet. No payment details are needed.
          </small>
        </>
      ) : (
        <AccountsUnavailable />
      )}
    </AccountShell>
  );
}
