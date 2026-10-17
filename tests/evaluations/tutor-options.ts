export function evaluationOptions(args: string[]) {
  if (
    args.some(
      (a) =>
        a !== "--live" && !a.startsWith("--only=") && !a.startsWith("--suite="),
    )
  )
    throw new Error(
      "Use --live, --suite=baseline|extended and optional --only=case-id,case-id",
    );
  if (
    args.filter((a) => a.startsWith("--suite=")).length > 1 ||
    args.filter((a) => a.startsWith("--only=")).length > 1 ||
    args.filter((a) => a === "--live").length > 1
  )
    throw new Error("Duplicate evaluation option");
  const suite =
    args.find((a) => a.startsWith("--suite="))?.slice(8) ?? "baseline";
  if (suite !== "baseline" && suite !== "extended")
    throw new Error("Unknown evaluation suite");
  const only = args
    .find((a) => a.startsWith("--only="))
    ?.slice(7)
    .split(",");
  if (only && (only.some((id) => !id) || new Set(only).size !== only.length))
    throw new Error("Choose unique, nonempty case IDs");
  return { live: args.includes("--live"), suite, only };
}

export function selectEvaluationCases<T extends { id: string }>(
  all: T[],
  only?: string[],
) {
  if (new Set(all.map((c) => c.id)).size !== all.length)
    throw new Error("Duplicate case ID");
  if (only?.some((id) => !all.some((c) => c.id === id)))
    throw new Error("Unknown evaluation case ID");
  const selected = only ? all.filter((c) => only.includes(c.id)) : all;
  if (selected.length < 1 || selected.length > 16)
    throw new Error("Evaluation requires 1–16 cases");
  return selected;
}
