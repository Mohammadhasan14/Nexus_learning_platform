import "server-only";
import { redirect } from "next/navigation";
import { accountsAvailable } from "@/lib/supabase/config";
import { serverClient } from "@/lib/supabase/server";
import { safeDestination } from "./validation";

export async function requireUser(destination = "/dashboard") {
  if (!accountsAvailable()) redirect("/login?reason=unavailable");
  const client = await serverClient();
  // Network verification rejects forged cookies; user IDs never come from form data.
  const { data, error } = await client.auth.getUser();
  if (error || !data.user)
    redirect(
      `/login?reason=session&next=${encodeURIComponent(safeDestination(destination))}`,
    );
  return { client, user: data.user };
}
export async function requireProfile(destination = "/dashboard") {
  const { client, user } = await requireUser(destination);
  const { data: profile, error } = await client
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();
  if (error || !profile)
    throw new Error("Your preferences could not be loaded. Please try again.");
  return { client, user, profile };
}
