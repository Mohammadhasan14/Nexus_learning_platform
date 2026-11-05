import Link from "next/link";
import { foundationData } from "@/modules/system-design/foundations/data";
import { FoundationLesson } from "@/components/system-design/foundations/lesson";
export const metadata = {
  title: "How a web request works — Foundations — Farzain Learning",
};
export default async function FoundationPage({
  params,
}: {
  params: Promise<{ course: string; lesson: string }>;
}) {
  const { course, lesson } = await params;
  const data = await foundationData(course, lesson);
  if (!data.enrolled)
    return (
      <>
        <h1>Enrol in System Design Studio first.</h1>
        <p>
          Foundations and the workshop use the same enrolment. No JavaScript
          prerequisite is required.
        </p>
        <Link className="button button-primary" href="/courses">
          Choose System Design Studio in Courses
        </Link>
      </>
    );
  if (!data.state)
    return (
      <>
        <h1>This lesson version is unavailable.</h1>
        <p>
          Your saved position and practice have not changed. This application
          cannot safely read the pinned content version.
        </p>
        <Link href="/courses">Return to Courses</Link>
      </>
    );
  return <FoundationLesson owner={data.owner} initial={data.state} />;
}
