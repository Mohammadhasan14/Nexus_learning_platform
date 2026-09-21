import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { backendConfig } from "./config";
import type { Database } from "./database.types";

export async function serverClient() {
  const config = backendConfig();
  if (!config) throw new Error("Accounts are not configured");
  const cookieStore = await cookies();
  return createServerClient<Database>(config.url, config.key, {
    cookieOptions: {
      name: `nexus-${config.environment}-auth`,
      httpOnly: true,
      sameSite: "lax",
      secure: config.secureCookies,
      path: "/",
    },
    global: {
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          cache: "no-store",
          signal: AbortSignal.timeout(10000),
        }),
    },
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (items) => {
        try {
          items.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          /* Server Components cannot write cookies; proxy refreshes them first. */
        }
      },
    },
  });
}
