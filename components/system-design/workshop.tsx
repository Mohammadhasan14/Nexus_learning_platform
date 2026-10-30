"use client";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import {
  campusScenario,
  defaultWorksheet,
} from "@/modules/system-design/content";
import { estimate } from "@/modules/system-design/estimation";
import {
  worksheetSchema,
  workloadSchema,
  workloadFields,
  worksheetIdentity,
  type Worksheet,
  type SavedWorksheet,
  type WorkloadKey,
} from "@/modules/system-design/schema";
import {
  saveWorksheet,
  loadSavedWorksheet,
  type StudioResult,
} from "@/modules/system-design/actions";
import styles from "./workshop.module.css";
const subscribe = () => () => {};
const keys = Object.keys(workloadFields) as WorkloadKey[];
function draftOf(w: Worksheet) {
  return {
    ...w,
    latencyTargetMs: String(w.latencyTargetMs),
    availabilityTargetPercent: String(w.availabilityTargetPercent),
    workload: Object.fromEntries(
      keys.map((k) => [k, String(w.workload[k])]),
    ) as Record<WorkloadKey, string>,
  };
}
type Draft = ReturnType<typeof draftOf>;
const num = (v: string) => (v.trim() === "" ? undefined : Number(v));
function inputOf(d: Draft) {
  return {
    ...d,
    latencyTargetMs: num(d.latencyTargetMs),
    availabilityTargetPercent: num(d.availabilityTargetPercent),
    workload: Object.fromEntries(keys.map((k) => [k, num(d.workload[k])])),
  };
}
const fmt = (n: number, digits = 2) =>
  new Intl.NumberFormat("en", { maximumFractionDigits: digits }).format(n);
export function Workshop({
  owner,
  initial,
}: {
  owner: string;
  initial: SavedWorksheet | null;
}) {
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const [draft, setDraft] = useState(() =>
    draftOf(initial?.worksheet ?? defaultWorksheet),
  );
  const [saved, setSaved] = useState(initial),
    [base, setBase] = useState(initial?.revision ?? 0);
  const [pending, setPending] = useState(false),
    [result, setResult] = useState<StudioResult | null>(null),
    [newer, setNewer] = useState<SavedWorksheet | null>(null),
    [errors, setErrors] = useState<Record<string, string>>({});
  const [active, setActive] = useState("brief");
  const attempt = useRef<{ payload: string; key: string } | null>(null),
    form = useRef<HTMLFormElement>(null);
  const dirty =
    !saved ||
    JSON.stringify(draft) !== JSON.stringify(draftOf(saved.worksheet));
  const changed = dirty || pending;
  useEffect(() => {
    if (!changed) return;
    const unload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const leave = (e: MouseEvent) => {
      const a = e.target instanceof Element ? e.target.closest("a") : null;
      if (!a || a.target === "_blank" || e.defaultPrevented) return;
      const u = new URL(a.href, location.href);
      if (
        u.origin === location.origin &&
        u.pathname === location.pathname &&
        u.search === location.search
      )
        return;
      if (
        !confirm(
          "Leave this worksheet and discard unsaved changes? Saved revisions will remain.",
        )
      ) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    const submit = (e: Event) => {
      if (
        e.target !== form.current &&
        !confirm("Leave this worksheet and discard unsaved changes?")
      ) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", leave, true);
    document.addEventListener("submit", submit, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", leave, true);
      document.removeEventListener("submit", submit, true);
    };
  }, [changed]);
  const update = (key: Exclude<keyof Draft, "workload">, value: string) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => {
      const next = { ...e };
      delete next[key];
      return next;
    });
  };
  const workload = workloadSchema.safeParse(inputOf(draft).workload);
  const estimates = workload.success ? estimate(workload.data) : null;
  async function save(e: FormEvent) {
    e.preventDefault();
    if (pending || !ready) return;
    const parsed = worksheetSchema.safeParse(inputOf(draft));
    if (!parsed.success) {
      const issues: Record<string, string> = {};
      for (const issue of parsed.error.issues)
        issues[issue.path.join(".")] = issue.message;
      setErrors(issues);
      setResult({
        status: "error",
        message: "Check the marked fields. Your inputs are kept.",
      });
      requestAnimationFrame(() => {
        const invalid = form.current?.querySelector<HTMLElement>(
          '[aria-invalid="true"]',
        );
        for (
          let parent = invalid?.parentElement;
          parent;
          parent = parent.parentElement
        ) {
          if (parent instanceof HTMLDetailsElement) parent.open = true;
        }
        invalid?.focus();
      });
      return;
    }
    setErrors({});
    setPending(true);
    setResult(null);
    const payload = JSON.stringify({ expected: base, worksheet: parsed.data });
    if (attempt.current?.payload !== payload)
      attempt.current = { payload, key: crypto.randomUUID() };
    try {
      const next = await saveWorksheet(owner, {
        identity: worksheetIdentity,
        expected: base,
        request: attempt.current!.key,
        worksheet: parsed.data,
      });
      setResult(next);
      if (next.status === "saved" && next.saved) {
        setSaved(next.saved);
        setBase(next.saved.revision);
        setNewer(null);
        attempt.current = null;
      }
    } catch {
      setResult({
        status: "error",
        message:
          "Could not confirm the save. Your inputs are kept. Retry unchanged safely.",
      });
    } finally {
      setPending(false);
    }
  }
  async function compare() {
    setPending(true);
    try {
      const next = await loadSavedWorksheet(owner);
      setResult(next);
      if (next.saved) setNewer(next.saved);
    } catch {
      setResult({
        status: "error",
        message:
          "Could not load the saved revision. Your draft is kept; retry.",
      });
    } finally {
      setPending(false);
    }
  }
  function acceptSaved() {
    if (
      newer &&
      confirm("Replace your unsaved draft with this saved revision?")
    ) {
      setDraft(draftOf(newer.worksheet));
      setSaved(newer);
      setBase(newer.revision);
      setNewer(null);
      setErrors({});
      setResult({
        status: "loaded",
        message: "Saved revision restored. No draft was saved.",
      });
      attempt.current = null;
    }
  }
  const errorFor = (key: string) => errors[key];
  function textField(
    key:
      "functionalRequirements" | "exclusions" | "assumptions" | "explanation",
    label: string,
    max: number,
    rows = 2,
  ) {
    return (
      <div className={styles.field}>
        <label htmlFor={`studio-${key}`}>{label}</label>
        <textarea
          id={`studio-${key}`}
          name={key}
          value={draft[key]}
          rows={rows}
          maxLength={max}
          disabled={!ready}
          aria-invalid={!!errorFor(key)}
          aria-describedby={errorFor(key) ? `error-${key}` : undefined}
          onChange={(e) => update(key, e.target.value)}
        />
        {errorFor(key) && (
          <small id={`error-${key}`} className={styles.error}>
            {errorFor(key)}
          </small>
        )}
      </div>
    );
  }
  function targetField(
    key: "latencyTargetMs" | "availabilityTargetPercent",
    label: string,
    unit: string,
    min: number,
    max: number,
  ) {
    return (
      <div className={styles.field}>
        <label htmlFor={`studio-${key}`}>
          {label} ({unit})
        </label>
        <input
          id={`studio-${key}`}
          name={key}
          type="number"
          step="any"
          min={min}
          max={max}
          value={draft[key]}
          disabled={!ready}
          aria-invalid={!!errorFor(key)}
          aria-describedby={errorFor(key) ? `error-${key}` : undefined}
          onChange={(e) => update(key, e.target.value)}
        />
        {errorFor(key) && (
          <small id={`error-${key}`} className={styles.error}>
            {errorFor(key)}
          </small>
        )}
      </div>
    );
  }
  function workloadField(key: WorkloadKey) {
    const rule = workloadFields[key],
      path = `workload.${key}`;
    return (
      <div className={styles.field} key={key}>
        <label htmlFor={`studio-${key}`}>
          {rule.label} <span>({rule.unit})</span>
        </label>
        <input
          id={`studio-${key}`}
          name={path}
          type="number"
          min={rule.min}
          max={rule.max}
          step={rule.integer ? "1" : "any"}
          value={draft.workload[key]}
          disabled={!ready}
          aria-invalid={!!errorFor(path)}
          aria-describedby={`help-${key}${errorFor(path) ? ` error-${key}` : ""}`}
          onChange={(e) => {
            setDraft((d) => ({
              ...d,
              workload: { ...d.workload, [key]: e.target.value },
            }));
            setErrors((old) => {
              const n = { ...old };
              delete n[path];
              return n;
            });
          }}
        />
        <small id={`help-${key}`}>
          {rule.help} Range: {fmt(rule.min)}–{fmt(rule.max)}.
        </small>
        {errorFor(path) && (
          <small id={`error-${key}`} className={styles.error}>
            {errorFor(path)}
          </small>
        )}
      </div>
    );
  }
  const w = workload.success ? workload.data : null;
  const metrics =
    estimates && w
      ? [
          [
            "Average requests",
            `${fmt(estimates.averageRps)} req/s`,
            "daily requests ÷ 86,400",
            `${fmt(w.dailyActiveUsers)} users × ${fmt(w.requestsPerUserPerDay, 6)} requests/user/day = ${fmt(estimates.dailyRequests, 6)} requests/day; ÷ 86,400 seconds/day = ${fmt(estimates.averageRps, 6)} req/s.`,
          ],
          [
            "Peak requests",
            `${fmt(estimates.peakRps)} req/s`,
            "average requests/s × peak multiplier",
            `${fmt(estimates.averageRps, 6)} × ${fmt(w.peakFactor, 6)} = ${fmt(estimates.peakRps, 6)} req/s.`,
          ],
          [
            "Peak reads",
            `${fmt(estimates.peakReadRps)} req/s`,
            "peak requests/s × (read percentage ÷ 100)",
            `${fmt(estimates.peakRps, 6)} × (${fmt(w.readPercentage, 6)} ÷ 100) = ${fmt(estimates.peakReadRps, 6)} reads/s.`,
          ],
          [
            "Peak writes",
            `${fmt(estimates.peakWriteRps)} req/s`,
            "peak requests/s × (1 − read percentage ÷ 100)",
            `${fmt(estimates.peakRps, 6)} × (1 − ${fmt(w.readPercentage, 6)} ÷ 100) = ${fmt(estimates.peakWriteRps, 6)} writes/s.`,
          ],
          [
            "Retained write storage",
            `${fmt(estimates.logicalRetainedWriteBytes / 1e9)} GB`,
            "daily requests × write share × write payload bytes × retention days",
            `${fmt(estimates.dailyWrites, 6)} writes/day × ${fmt(w.writePayloadBytes)} bytes × ${fmt(w.retentionDays)} days = ${fmt(estimates.logicalRetainedWriteBytes, 0)} bytes. ÷ 1,000,000,000 = ${fmt(estimates.logicalRetainedWriteBytes / 1e9, 6)} GB; ÷ 1,073,741,824 = ${fmt(estimates.logicalRetainedWriteBytes / 2 ** 30, 6)} GiB. Uses average daily writes, not peak writes. Assumes payloads accumulate; updates that overwrite records need not grow the database by this volume.`,
          ],
          [
            "Peak read egress",
            `${fmt(estimates.peakReadEgressMbps)} Mbps`,
            "peak reads/s × response bytes × 8 ÷ 1,000,000",
            `${fmt(estimates.peakReadRps, 6)} reads/s × ${fmt(w.readResponseBytes)} bytes × 8 bits/byte ÷ 1,000,000 = ${fmt(estimates.peakReadEgressMbps, 6)} Mbps.`,
          ],
        ]
      : null;
  return (
    <div className={styles.studio}>
      <nav aria-label="Course breadcrumb" className={styles.breadcrumb}>
        <Link href="/courses">Courses</Link>
        <span aria-hidden="true">/</span>
        <span>System Design Studio</span>
      </nav>
      <header className={styles.heading}>
        <p className="eyebrow">SYSTEM DESIGN STUDIO · WORKSHOP 1</p>
        <h1>{campusScenario.title}</h1>
        <p>{campusScenario.subtitle}</p>
      </header>
      <nav className={styles.sections} aria-label="Workshop sections">
        {["brief", "requirements", "workload", "explain"].map((section, i) => (
          <a
            key={section}
            href={`#studio-${section}`}
            aria-current={active === section ? "location" : undefined}
            onClick={() => {
              setActive(section);
              const panel = document.getElementById(`studio-${section}`);
              if (panel instanceof HTMLDetailsElement) panel.open = true;
            }}
          >
            <span aria-hidden="true">{i + 1}</span>
            {section[0].toUpperCase() + section.slice(1)}
          </a>
        ))}
      </nav>
      <form ref={form} onSubmit={save} noValidate className={styles.layout}>
        <noscript>
          Enable JavaScript to edit, calculate and save this worksheet. Your
          saved work remains private.
        </noscript>
        <div className={styles.main}>
          <details open id="studio-brief" className={styles.panel}>
            <summary>
              <h2>Scenario brief</h2>
            </summary>
            <div className={styles.body}>
              <p>{campusScenario.brief}</p>
              <details>
                <summary>Understand the concepts</summary>
                <div className={styles.teaching}>
                  <p>{campusScenario.introduction}</p>
                  {campusScenario.teaching.map(([title, body]) => (
                    <section key={title}>
                      <h3>{title}</h3>
                      <p>{body}</p>
                    </section>
                  ))}
                  <p className={styles.muted}>
                    Defaults are illustrative, not measured traffic.{" "}
                    {campusScenario.review}
                  </p>
                </div>
              </details>
            </div>
          </details>
          <details open id="studio-requirements" className={styles.panel}>
            <summary>
              <h2>Requirements</h2>
              <span>Targets, not predictions</span>
            </summary>
            <div className={styles.body}>
              {textField(
                "functionalRequirements",
                "Functional requirements",
                4000,
              )}
              {textField("exclusions", "Out of scope", 2000)}
              <div className={styles.targets}>
                {targetField(
                  "latencyTargetMs",
                  "Latency target",
                  "ms",
                  1,
                  600000,
                )}
                {targetField(
                  "availabilityTargetPercent",
                  "Availability target",
                  "%",
                  0,
                  100,
                )}
              </div>
              <p className={styles.muted}>
                These are your goals. The calculations do not predict latency or
                availability.
              </p>
            </div>
          </details>
          <details open id="studio-workload" className={styles.panel}>
            <summary>
              <h2>Workload inputs</h2>
            </summary>
            <div className={styles.body}>
              <p>
                Enter assumptions to estimate workload and retained write
                volume.
              </p>
              <div className={styles.workload}>
                {keys.slice(0, 4).map(workloadField)}
              </div>
              <details open className={styles.payload}>
                <summary>Payloads &amp; retention</summary>
                <div className={styles.workload}>
                  {keys.slice(4).map(workloadField)}
                </div>
              </details>
              {textField("assumptions", "Workload assumptions", 2000)}
            </div>
          </details>
          <details open id="studio-explain" className={styles.panel}>
            <summary>
              <h2>Explain your assumptions</h2>
            </summary>
            <div className={styles.body}>
              <p>
                Change one assumption, such as the peak multiplier. What changes
                in the estimates, what stays the same, and why?
              </p>
              {textField("explanation", "Your explanation", 4000, 4)}
              <p className={styles.muted}>
                Private work, not an AI chat or a graded answer. Nothing is
                saved until you select Save worksheet.
              </p>
            </div>
          </details>
        </div>
        <aside
          className={`${styles.panel} ${styles.estimates}`}
          aria-labelledby="studio-estimates-title"
        >
          <h2 id="studio-estimates-title">Derived estimates</h2>
          <p className={styles.muted}>
            Based on your assumptions. Arithmetic estimates, not measurements.
            Displayed values are rounded; formulas use full precision.
          </p>
          {metrics ? (
            metrics.map(([label, value, formula, substitution]) => (
              <details className={styles.metric} key={label}>
                <summary>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </summary>
                <div className={styles.formula}>
                  <h3>How this is calculated</h3>
                  <code>{formula}</code>
                  <p>{substitution}</p>
                </div>
              </details>
            ))
          ) : (
            <p>
              Enter valid workload values to see all six estimates. Blank values
              are not treated as zero; check ranges and the combined
              retained-volume precision limit.
            </p>
          )}
          <p className={styles.muted}>{campusScenario.exclusions}</p>
          <details className={styles.versions}>
            <summary>Versions and review</summary>
            <p>
              Scenario: {worksheetIdentity.scenario} · Schema:{" "}
              {worksheetIdentity.schema} · Formulas: {worksheetIdentity.formula}
              .
            </p>
            <p>{campusScenario.review}</p>
          </details>
        </aside>
        <div className={styles.saveArea}>
          <div className={styles.saveSummary}>
            <span className={dirty ? styles.unsaved : styles.saved}>
              {pending
                ? "Saving / loading…"
                : dirty
                  ? "Unsaved changes"
                  : "Saved"}
            </span>
            <span>
              {saved
                ? `Last saved: revision ${saved.revision}`
                : "Not saved yet"}
            </span>
            <button
              className="button button-primary"
              type="submit"
              disabled={pending || !ready}
            >
              {" "}
              {pending ? "Please wait…" : "Save worksheet"}
            </button>
          </div>
          {result && (
            <div
              role={
                ["error", "conflict", "session"].includes(result.status)
                  ? "alert"
                  : "status"
              }
              className={
                ["error", "conflict", "session"].includes(result.status)
                  ? styles.error
                  : styles.muted
              }
            >
              {result.message}
            </div>
          )}
          {result?.status === "session" && (
            <a
              href="/login?next=/courses"
              target="_blank"
              rel="noopener noreferrer"
            >
              Sign in in another tab
            </a>
          )}
          {(result?.status === "conflict" || newer) && (
            <button
              type="button"
              className="button button-secondary"
              disabled={pending}
              onClick={compare}
            >
              Review newer saved revision
            </button>
          )}
          {newer && (
            <section
              className={styles.comparison}
              aria-label="Newer saved worksheet"
            >
              <h2>Saved revision {newer.revision}</h2>
              <p>
                Your editable draft is still above. Compare it with this private
                saved copy before choosing.
              </p>
              <pre tabIndex={0}>{JSON.stringify(newer.worksheet, null, 2)}</pre>
              <div className={styles.choices}>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={acceptSaved}
                >
                  Use saved revision (replace draft)
                </button>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => {
                    setBase(newer.revision);
                    setSaved(newer);
                    setNewer(null);
                    setResult({
                      status: "loaded",
                      message:
                        "Your draft is kept against the newer base. Select Save worksheet to create a new revision; earlier revisions remain unchanged.",
                    });
                    attempt.current = null;
                  }}
                >
                  Keep my draft; use revision {newer.revision} as base
                </button>
              </div>
            </section>
          )}
        </div>
      </form>
    </div>
  );
}
