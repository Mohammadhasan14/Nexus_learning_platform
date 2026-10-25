import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { accountsAvailable } from "@/lib/supabase/config";
import { serverClient } from "@/lib/supabase/server";
import { safeDestination } from "./validation";

// React clears these promises after each Server Component render request.
// Actions and route handlers continue to use the uncached session helpers.
const readUser = cache(async () => {
  if (!accountsAvailable()) return null;
  const client = await serverClient();
  const { data, error } = await client.auth.getUser();
  return { client, user: error ? null : data.user };
});

export async function requireRenderUser(destination = "/dashboard") {
  const session = await readUser();
  if (!session) redirect("/login?reason=unavailable");
  if (!session.user)
    redirect(
      `/login?reason=session&next=${encodeURIComponent(safeDestination(destination))}`,
    );
  return { client: session.client, user: session.user };
}

const readProfile = cache(async () => {
  const { client, user } = await requireRenderUser();
  const { data: profile, error } = await client
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();
  if (error || !profile)
    throw new Error("Your preferences could not be loaded. Please try again.");
  return profile;
});

export async function requireRenderProfile(destination = "/dashboard") {
  const session = await requireRenderUser(destination);
  return { ...session, profile: await readProfile() };
}
