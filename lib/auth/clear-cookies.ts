import "server-only";
import { cookies } from "next/headers";
import { backendConfig } from "@/lib/supabase/config";
export async function clearAccountCookies() {
  const config = backendConfig();
  if (!config) return;
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
