import { accountsAvailable } from "@/lib/supabase/config";
import { serverClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};
const failure = (message: string, status: number) =>
  Response.json({ message }, { status, headers });

export async function POST(request: Request) {
  // Cookie-authenticated downloads require an explicit same-origin request.
  // Next can normalise the URL host; use the actual Host, not forwarded headers.
  if (
    request.headers.get("origin") !==
    `${new URL(request.url).protocol}//${request.headers.get("host")}`
  )
    return failure("Request your download from Settings.", 403);
  if (!accountsAvailable())
    return failure("Sign in to download your data.", 401);
  try {
    const client = await serverClient();
    const { data: auth, error: authError } = await client.auth.getUser();
    if (authError || !auth.user)
      return failure("Sign in again, then retry your download.", 401);
    // The RPC has no owner parameter and reads auth.uid() inside the database.
    const { data, error } = await client.rpc("export_learner_data");
    if (error?.code === "54000")
      return failure("Your data exceeds the current download limit.", 413);
    if (error || !data || typeof data !== "object" || Array.isArray(data))
      return failure("Your data could not be exported. Please try again.", 503);
    if (
      data.format !== "nexus-learner-export-v1" ||
      !data.profile ||
      typeof data.profile !== "object" ||
      Array.isArray(data.profile) ||
      data.profile.user_id !== auth.user.id
    )
      return failure("Your data could not be exported. Please try again.", 503);
    const body = JSON.stringify({
      ...data,
      account: {
        id: auth.user.id,
        email: auth.user.email ?? null,
        created_at: auth.user.created_at,
      },
    });
    if (Buffer.byteLength(body, "utf8") > 8 * 1024 * 1024)
      return failure("Your data exceeds the current download limit.", 413);
    return new Response(body, {
      headers: {
        ...headers,
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="farzain-learning-data.json"',
      },
    });
  } catch {
    return failure("Your data could not be exported. Please try again.", 503);
  }
}

export function GET() {
  return new Response(null, {
    status: 405,
    headers: { ...headers, Allow: "POST" },
  });
}
export const HEAD = GET;
