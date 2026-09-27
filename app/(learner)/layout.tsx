import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { LearnerShell } from "@/components/learner/learner-shell";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };
export default async function LearnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { client } = await requireUser();
  const { data: role } = await client
    .from("staff_roles")
    .select("role")
    .maybeSingle();
  return <LearnerShell staff={!!role}>{children}</LearnerShell>;
}
