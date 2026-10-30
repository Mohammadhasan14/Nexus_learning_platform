import Link from "next/link";
import { workshopData } from "@/modules/system-design/data";
import { Workshop } from "@/components/system-design/workshop";
export const metadata = {
  title:
    "Campus event directory — Requirements & capacity workshop — Farzain Learning",
};
export default async function Studio({
  params,
}: {
  params: Promise<{ course: string; scenario: string }>;
}) {
  const { course, scenario } = await params;
  const data = await workshopData(course, scenario);
  if (!data.enrolled)
    return (
      <>
        <h1>Enrol in System Design Studio first.</h1>
        <p>
          Your worksheet is private. No JavaScript practice prerequisite is
          required.
        </p>
        <Link className="button button-primary" href="/courses">
          Choose the workshop in Courses
        </Link>
      </>
    );
  if (data.unsupported)
    return (
      <>
        <h1>This workshop version is unavailable.</h1>
        <p>
          Your saved work has not changed. This application cannot safely read
          its pinned scenario, schema or formula. Return to Courses or contact
          the operator before continuing.
        </p>
        <Link href="/courses">Return to Courses</Link>
      </>
    );
  return <Workshop owner={data.user} initial={data.saved ?? null} />;
}
