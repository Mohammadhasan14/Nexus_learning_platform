import "server-only";
import { requireUser } from "@/lib/auth/session";
import { notFound } from "next/navigation";
export async function staffData() {
  const { client } = await requireUser("/admin");
  const { data: staff, error } = await client.rpc("is_content_staff");
  if (error || !staff) notFound();
  const [courses, drafts, reports, audit] = await Promise.all([
    client
      .from("course_versions")
      .select("*")
      .order("version", { ascending: false }),
    client
      .from("content_drafts")
      .select("*")
      .order("created_at", { ascending: false }),
    client
      .from("content_reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
    client
      .from("content_audit")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  if (courses.error || drafts.error || reports.error || audit.error)
    throw new Error("Staff records could not be loaded. Please retry.");
  return {
    client,
    courses: courses.data!,
    drafts: drafts.data!,
    reports: reports.data!,
    audit: audit.data!,
  };
}
