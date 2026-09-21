import Link from "next/link";
import {
  AccountShell,
  AccountsUnavailable,
} from "@/components/auth/account-shell";
import { AuthForm } from "@/components/auth/auth-form";
import { accountsAvailable } from "@/lib/supabase/config";
import { safeDestination } from "@/lib/auth/validation";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Sign in — Nexus Learning",
  robots: { index: false, follow: false },
};
const messages: Record<string, string> = {
  session:
    "Your session has ended or could not be verified. Sign in to continue.",
  "signed-out": "You’re signed out on this browser.",
  confirmation:
    "That confirmation link is invalid or expired. Try signing in, or request a new account confirmation by registering again.",
};
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reason?: string }>;
}) {
  const params = await searchParams;
  return (
    <AccountShell>
      <p className="eyebrow">WELCOME BACK</p>
      <h2>Make room for your next breakthrough.</h2>
      {accountsAvailable() ? (
        <>
          <p className="account-description">
            Sign in to your personal learning space.
          </p>
          {params.reason && messages[params.reason] && (
            <p className="form-message" role="status">
              {messages[params.reason]}
            </p>
          )}
          <AuthForm mode="login" next={safeDestination(params.next)} />
          <p className="account-switch">
            New to Nexus? <Link href="/register">Create an account</Link>
          </p>
        </>
      ) : (
        <AccountsUnavailable />
      )}
    </AccountShell>
  );
}
