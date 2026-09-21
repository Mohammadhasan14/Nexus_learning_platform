import { NextResponse, type NextRequest } from "next/server";
import { serverClient } from "@/lib/supabase/server";
import { accountsAvailable } from "@/lib/supabase/config";

export async function GET(request: NextRequest) {
  const token_hash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  let valid = false;
  if (
    accountsAvailable() &&
    token_hash &&
    token_hash.length <= 512 &&
    type === "signup"
  ) {
    try {
      const client = await serverClient();
      const { error } = await client.auth.verifyOtp({
        token_hash,
        type: "signup",
      });
      valid = !error;
    } catch {
      /* Invalid, expired or unavailable; no provider details disclosed. */
    }
  }
  // No arbitrary next/redirect parameter is accepted, and tokens never reach the destination URL.
  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: valid ? "/onboarding" : "/login?reason=confirmation" },
  });
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
