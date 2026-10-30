/** Synthetic HTTP behavior only; SQL policy evidence comes from the migration tests. */
import {
  worksheetSchema,
  worksheetIdentity,
  studioCourse,
  scenarioId,
  type SavedWorksheet,
} from "../../modules/system-design/schema";
let enabled = false,
  outage = false,
  unsupported = false;
const enrolments = new Set<string>(),
  revisions = new Map<string, SavedWorksheet[]>(),
  keys = new Map<
    string,
    { expected: number; document: string; saved: SavedWorksheet }
  >();
export function resetStudio() {
  enabled = false;
  outage = false;
  unsupported = false;
  enrolments.clear();
  revisions.clear();
  keys.clear();
}
export function configureStudio(body: Record<string, unknown>) {
  enabled = body.value === undefined ? enabled : !!body.value;
  outage = !!body.outage;
  unsupported = !!body.unsupported;
}
export function deleteStudio(owner: string) {
  enrolments.delete(owner);
  revisions.delete(owner);
  for (const k of keys.keys()) if (k.startsWith(`${owner}:`)) keys.delete(k);
}
export function studioExport(owner: string) {
  const all = revisions.get(owner) ?? [];
  return {
    studio_worksheets: all.length
      ? [
          {
            scenario_id: scenarioId,
            revision: all.at(-1)!.revision,
            updated_at: all.at(-1)!.savedAt,
          },
        ]
      : [],
    studio_worksheet_revisions: all.map((s) => ({
      scenario_id: scenarioId,
      revision: s.revision,
      base_revision: s.revision - 1,
      schema_version: s.identity.schema,
      formula_version: s.identity.formula,
      worksheet: s.worksheet,
      saved_at: s.savedAt,
    })),
  };
}
export function studioData(
  path: string,
  method: string,
  body: Record<string, unknown>,
  owner: string,
  base?: { status: number; data: unknown },
) {
  if (!enabled) return undefined;
  const ok = (data: unknown) => ({ status: 200, data });
  const fail = (code: string, message: string) => ({
    status: 400,
    data: { code, message },
  });
  const rows = Array.isArray(base?.data) ? base.data : [];
  if (path === "/rest/v1/course_versions")
    return ok([
      ...rows,
      {
        id: studioCourse,
        title: "System Design Studio",
        summary:
          "One requirements and capacity workshop; a first slice of a planned course.",
        version: 1,
        review_status: "preview",
        supersedes_id: null,
        experience_kind: "studio",
      },
    ]);
  if (path === "/rest/v1/enrolments")
    return ok([
      ...(enrolments.has(owner)
        ? [
            {
              user_id: owner,
              course_id: studioCourse,
              enrolled_at: "2099-01-01T00:00:00Z",
            },
          ]
        : []),
      ...rows,
    ]);
  if (path === "/rest/v1/studio_worksheets")
    return ok(studioExport(owner).studio_worksheets);
  if (path === "/rest/v1/rpc/enrol_course" && body.course === studioCourse) {
    enrolments.add(owner);
    return ok(null);
  }
  if (path === "/rest/v1/rpc/get_studio_workshop") {
    if (body.course !== studioCourse || body.scenario !== scenarioId)
      return fail("22023", "Unknown workshop");
    return enrolments.has(owner)
      ? ok({
          enrolled: true,
          identity: {
            ...worksheetIdentity,
            ...(unsupported ? { formula: "capacity-future" } : {}),
          },
          saved: revisions.get(owner)?.at(-1) ?? null,
        })
      : ok({ enrolled: false });
  }
  if (path === "/rest/v1/rpc/save_studio_worksheet") {
    if (outage)
      return {
        status: 503,
        data: { code: "fixture_outage", message: "Synthetic outage" },
      };
    if (!enrolments.has(owner)) return fail("42501", "Enrol first");
    const parsed = worksheetSchema.safeParse(body.document);
    if (
      !parsed.success ||
      body.scenario !== scenarioId ||
      typeof body.expected !== "number" ||
      typeof body.request !== "string"
    )
      return fail("22023", "Invalid worksheet");
    const key = `${owner}:${body.request}`,
      json = JSON.stringify(parsed.data),
      old = keys.get(key);
    if (old)
      return old.document === json && old.expected === body.expected
        ? ok(old.saved)
        : fail("22023", "Request already used");
    const all = revisions.get(owner) ?? [];
    if (body.expected !== all.length)
      return fail("40001", "Newer revision exists");
    const saved: SavedWorksheet = {
      revision: all.length + 1,
      savedAt: new Date().toISOString(),
      identity: worksheetIdentity,
      worksheet: parsed.data,
    };
    revisions.set(owner, [...all, saved]);
    keys.set(key, { expected: body.expected, document: json, saved });
    return ok(saved);
  }
  // Keep the old JS fixture and empty fallbacks unchanged.
  void method;
  return undefined;
}
