import { serverClient } from "@/lib/supabase/server";
import { accountsAvailable } from "@/lib/supabase/config";
import { privacyChange, privacySettings } from "@/modules/privacy/schema";
import {
  privacyHeaders,
  privacyInput,
  privacyResponse,
  sameOrigin,
  privacyMethodNotAllowed,
} from "@/modules/privacy/http";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return privacyResponse("Use account controls in Settings.", 403);
  if (!accountsAvailable())
    return privacyResponse("Sign in again to continue.", 401);
  let input: ReturnType<typeof privacyChange.parse>;
  try {
    input = privacyChange.parse(await privacyInput(request));
  } catch {
    return privacyResponse(
      "Choose a retention setting or confirm clearing your replies.",
      400,
    );
  }
  try {
    const client = await serverClient();
    const auth = await client.auth.getUser();
    if (auth.error || !auth.data.user)
      return privacyResponse("Sign in again to continue.", 401);
    if (input.intent === "clear") {
      const result = await client.rpc("clear_tutor_replies", {
        confirmation: input.confirmation,
      });
      if (result.error || result.data !== true)
        return privacyResponse(
          "Clearing could not be confirmed. Reload Settings before retrying.",
          503,
        );
    } else {
      const result = await client.rpc("set_tutor_retention", {
        days: input.days,
      });
      const checked = privacySettings.safeParse(result.data);
      if (result.error || !checked.success)
        return privacyResponse(
          "Your retention setting could not be confirmed. Reload Settings before retrying.",
          503,
        );
      return Response.json(
        { settings: checked.data },
        { headers: privacyHeaders },
      );
    }
    return Response.json({ cleared: true }, { headers: privacyHeaders });
  } catch {
    return privacyResponse(
      "The request was interrupted. Reload Settings before retrying.",
      503,
    );
  }
}
export const GET = privacyMethodNotAllowed;
export const HEAD = privacyMethodNotAllowed;
