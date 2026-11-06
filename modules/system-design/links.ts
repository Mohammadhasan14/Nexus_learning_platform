// Data-only route mapping: safe to reuse without pulling validators into other courses.
export function studioHref(course: string) {
  return course === "system-design-studio-v1"
    ? `/courses/${course}/studio/campus-events-v1`
    : undefined;
}

export function foundationHref(course: string, lesson = "web-request-v1") {
  return course === "system-design-studio-v1" &&
    ["web-request-v1", "apis-data-v1"].includes(lesson)
    ? `/courses/${course}/foundations/${lesson}`
    : undefined;
}
