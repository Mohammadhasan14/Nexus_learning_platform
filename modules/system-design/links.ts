// Data-only route mapping: safe to reuse without pulling validators into other courses.
export function studioHref(course: string) {
  return course === "system-design-studio-v1"
    ? `/courses/${course}/studio/campus-events-v1`
    : undefined;
}
