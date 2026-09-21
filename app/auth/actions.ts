"use server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { serverClient } from "@/lib/supabase/server";
import { backendConfig, accountsAvailable } from "@/lib/supabase/config";
import {
  credentialsSchema,
  registrationSchema,
  safeDestination,
  type ActionState,
} from "@/lib/auth/validation";

export async function loginAction(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const input = { email: form.get("email"), password: form.get("password") };
  const parsed = credentialsSchema.safeParse(input);
  const values = {
    email: typeof input.email === "string" ? input.email.slice(0, 254) : "",
  };
  if (!parsed.success)
    return {
      errors: parsed.error.flatten().fieldErrors,
      message: "Check the highlighted fields.",
      values,
    };
  if (!accountsAvailable())
    return {
      message:
        "Accounts are unavailable in this environment. Please try again later.",
      values,
    };
  try {
    const client = await serverClient();
    const { error } = await client.auth.signInWithPassword(parsed.data);
    if (error)
      return {
        message:
          error.status === 429
            ? "Too many attempts. Please wait before trying again."
            : "We couldn’t sign you in. Check your details and confirm your email, then try again.",
        values,
      };
  } catch {
    return {
      message: "Sign-in is temporarily unavailable. Please try again.",
      values,
    };
  }
  revalidatePath("/", "layout");
  redirect(safeDestination(form.get("next")));
}

export async function registerAction(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const input = { email: form.get("email"), password: form.get("password") };
  const parsed = registrationSchema.safeParse(input);
  const values = {
    email: typeof input.email === "string" ? input.email.slice(0, 254) : "",
  };
  if (!parsed.success)
    return {
      errors: parsed.error.flatten().fieldErrors,
      message: "Check the highlighted fields.",
      values,
    };
  if (!accountsAvailable())
    return { message: "Accounts are unavailable in this environment.", values };
  try {
    const client = await serverClient();
    // The provider's explicitly configured Site URL owns email links; never derive it from Host headers.
    const { error } = await client.auth.signUp(parsed.data);
    if (error)
      return {
        message:
          "We couldn’t complete this request. Please try later, or sign in if you already have an account.",
        values,
      };
    return {
      success: true,
      message:
        "If this address is eligible, a confirmation email is on its way. Open its link to continue. If you already have an account, sign in.",
      values,
    };
  } catch {
    return {
      message: "Account creation is temporarily unavailable. Please try again.",
      values,
    };
  }
}

export async function signOutAction() {
  const config = backendConfig();
  if (config) {
    try {
      const client = await serverClient();
      await client.auth.signOut({ scope: "local" });
    } catch {
      /* Always remove this browser's cookies, even during an outage. */
    }
    const store = await cookies();
    const prefix = `nexus-${config.environment}-auth`;
    for (const cookie of store.getAll())
      if (
        cookie.name === prefix ||
        cookie.name.startsWith(`${prefix}.`) ||
        cookie.name === `${prefix}-code-verifier`
      )
        store.set(cookie.name, "", {
          maxAge: 0,
          path: "/",
          httpOnly: true,
          sameSite: "lax",
          secure: config.secureCookies,
        });
  }
  revalidatePath("/", "layout");
  redirect("/login?reason=signed-out");
}
