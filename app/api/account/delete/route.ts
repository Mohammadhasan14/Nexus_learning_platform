import { createClient } from "@supabase/supabase-js";
import { serverClient } from "@/lib/supabase/server";
import { accountsAvailable, backendConfig } from "@/lib/supabase/config";
import { clearAccountCookies } from "@/lib/auth/clear-cookies";
import { observedBackendFetch } from "@/lib/observability/backend-fetch";
import { currentRequestId } from "@/lib/observability/request";
import { signDeletionProof } from "@/modules/privacy/proof";
import { deletionInput } from "@/modules/privacy/schema";
import {
  privacyHeaders,
  privacyInput,
  privacyResponse,
  sameOrigin,
  privacyMethodNotAllowed,
} from "@/modules/privacy/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return privacyResponse("Use account controls in Settings.", 403);
  if (!accountsAvailable())
    return privacyResponse("Sign in again to continue.", 401);
  let input: { password: string; confirmation: "DELETE" };
  try {
    input = deletionInput.parse(await privacyInput(request));
  } catch {
    return privacyResponse(
      "Enter your current password and type DELETE to confirm.",
      400,
    );
  }
  try {
    const client = await serverClient();
    const { data: auth, error } = await client.auth.getUser();
    if (error || !auth.user?.email)
      return privacyResponse("Sign in again to continue.", 401);
    const key = process.env.ACCOUNT_DELETION_SIGNING_KEY ?? "";
    if (!/^[a-f0-9]{64}$/.test(key))
      return privacyResponse(
        "Account deletion is not configured in this environment.",
        503,
      );
    const config = backendConfig()!;
    // Isolated password verification: never replace this browser's session on failure.
    const verifier = createClient(config.url, config.key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: { fetch: observedBackendFetch(await currentRequestId()) },
    });
    try {
      const checked = await verifier.auth.signInWithPassword({
        email: auth.user.email,
        password: input.password,
      });
      if (checked.error || checked.data.user?.id !== auth.user.id)
        return privacyResponse(
          checked.error?.status === 429
            ? "Too many attempts. Wait before trying again."
            : "Password verification failed. Re-enter your current password.",
          checked.error?.status === 429 ? 429 : 403,
        );
      const signed = signDeletionProof(key, auth.user.id);
      const result = await client.rpc("delete_learner_account", signed);
      if (result.error || result.data !== true)
        return privacyResponse(
          "Deletion could not be confirmed. Check your account by signing in again before retrying.",
          503,
        );
    } finally {
      // The new verification session is temporary; success already cascades its Auth row.
      await verifier.auth.signOut({ scope: "local" }).catch(() => {});
    }
    await clearAccountCookies();
    return Response.json({ deleted: true }, { headers: privacyHeaders });
  } catch {
    return privacyResponse(
      "Deletion could not be confirmed. Check your account by signing in again before retrying.",
      503,
    );
  }
}
export const GET = privacyMethodNotAllowed;
export const HEAD = privacyMethodNotAllowed;
