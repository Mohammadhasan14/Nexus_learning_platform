import "server-only";
import { requireUser } from "@/lib/auth/session";
export type SearchItem = {
  title: string;
  detail: string;
  href: string;
  kind: "Lesson" | "Action";
};
export type SearchResult = {
  items: SearchItem[];
  more: boolean;
  error?: string;
};
export async function searchData(raw: string): Promise<SearchResult> {
  const { client } = await requireUser("/search");
  const query = raw.trim();
  if (query.length > 100)
    return { items: [], more: false, error: "Use at most 100 characters." };
  const { data: roles, error: roleError } = await client
    .from("staff_roles")
    .select("role");
  if (roleError)
    return {
      items: [],
      more: false,
      error: "Search is unavailable. Please retry.",
    };
  const actions = [
    {
      title: "Outcomes",
      detail: "Private learning evidence and delayed practice results",
      href: "/outcomes",
    },
    {
      title: "Today",
      detail: "Your dashboard and next lesson",
      href: "/dashboard",
    },
    {
      title: "Courses",
      detail: "Enrol or resume learning; open a lesson to write private notes",
      href: "/courses",
    },
    { title: "Reviews", detail: "Due practice reminders", href: "/reviews" },
    { title: "Projects", detail: "Saved project revisions", href: "/projects" },
    {
      title: "Preferences",
      detail: "Profile, timezone and learning goal",
      href: "/settings",
    },
    {
      title: "My reports",
      detail: "Lesson and tutor issue updates",
      href: "/reports",
    },
    ...(roles?.some((r) => r.role === "editor" || r.role === "admin")
      ? [
          {
            title: "Editorial",
            detail: "Staff content publishing and report triage",
            href: "/admin",
          },
        ]
      : []),
  ]
    .filter((a) =>
      (a.title + " " + a.detail).toLowerCase().includes(query.toLowerCase()),
    )
    .map((a) => ({ ...a, kind: "Action" as const }));
  if (query.length < 2) return { items: actions, more: false };
  const { data, error } = await client.rpc("search_lessons", { query });
  if (error)
    return {
      items: [],
      more: false,
      error: "Search is unavailable. Please retry.",
    };
  return {
    items: [
      ...actions,
      ...data.slice(0, 20).map((l) => ({
        kind: "Lesson" as const,
        title: l.title,
        detail: `${l.course_title} · v${l.course_version} · ${l.objective}`,
        href: `/courses/${encodeURIComponent(l.course_id)}/${encodeURIComponent(l.lesson_id)}`,
      })),
    ],
    more: data.length > 20,
  };
}
