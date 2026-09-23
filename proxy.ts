import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { readBackendConfig } from "@/lib/config";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  let backend;
  try {
    backend = readBackendConfig(process.env);
  } catch {
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
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          cache: "no-store",
          signal: AbortSignal.timeout(10000),
        }),
    },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (items) => {
        items.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        items.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        response.headers.set("Cache-Control", "private, no-store, max-age=0");
        response.headers.set("Pragma", "no-cache");
        response.headers.set("Expires", "0");
      },
    },
  });
  // Refresh here; authorization is repeated at the page/action boundary with getUser().
  await client.auth.getUser();
  return response;
}
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/courses/:path*",
    "/settings/:path*",
    "/onboarding/:path*",
    "/login",
    "/register",
    "/auth/:path*",
  ],
};
