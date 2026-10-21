import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { readBackendConfig } from "@/lib/config";
import { logError, REQUEST_ID_HEADER } from "@/lib/observability/record";
import { observedBackendFetch } from "@/lib/observability/backend-fetch";

export async function proxy(request: NextRequest) {
  // A request ID is correlation metadata, never identity or an authorization token.
  const requestId = crypto.randomUUID();
  const pathname = request.nextUrl.pathname;
  const refresh =
    ["/dashboard", "/courses", "/settings", "/onboarding", "/auth"].some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    ) || ["/login", "/register"].includes(pathname);
  const next = () => {
    const forwarded = new Headers(request.headers);
    // Always replace caller-supplied IDs, including well-formed ones.
    forwarded.set(REQUEST_ID_HEADER, requestId);
    const result = NextResponse.next({ request: { headers: forwarded } });
    result.headers.set(REQUEST_ID_HEADER, requestId);
    if (refresh) {
      result.headers.set("Cache-Control", "private, no-store, max-age=0");
      result.headers.set("Pragma", "no-cache");
      result.headers.set("Expires", "0");
    }
    return result;
  };
  let response = next();
  if (!refresh) return response;
  let backend;
  try {
    backend = readBackendConfig(process.env);
  } catch {
    logError({
      event: "config.error",
      requestId,
      method: request.method,
      phase: "proxy",
    });
    return response;
  }
  if (!backend) return response;
  const client = createServerClient(backend.url, backend.key, {
    cookieOptions: {
      name: `nexus-${backend.environment}-auth`,
      httpOnly: true,
      sameSite: "lax",
      secure: backend.secureCookies,
      path: "/",
    },
    global: {
      fetch: observedBackendFetch(requestId),
    },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (items) => {
        items.forEach(({ name, value }) => request.cookies.set(name, value));
        response = next();
        items.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });
  // Refresh here; authorization is repeated at the page/action boundary with getUser().
  try {
    await client.auth.getUser();
  } catch {
    logError({
      event: "request.error",
      requestId,
      method: request.method,
      phase: "proxy",
    });
  }
  return response;
}
export const config = {
  matcher: ["/((?!_next/|favicon[.]ico$).*)"],
};
