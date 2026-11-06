"use client";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
  type KeyboardEvent,
} from "react";
import { walkthrough } from "@/modules/system-design/foundations/content";
import {
  moveStep,
  type Feedback,
  type FoundationState,
  type LessonPosition as Position,
  type FoundationIdentity,
  type SavedPosition,
} from "@/modules/system-design/foundations/schema";
import {
  loadFoundationPosition,
  saveFoundationPosition,
  submitFoundationPractice,
  type FoundationResult,
} from "@/modules/system-design/foundations/actions";
import { ApiExplorer } from "./api-explorer";
import { apiFoundationIdentity } from "@/modules/system-design/foundations/api-content";
import { defaultExplorerConfig } from "@/modules/system-design/foundations/api-example";
import {
  foundationLessons,
  getFoundationLesson,
  remainingFoundationLessons,
  type PublicQuestion,
} from "@/modules/system-design/foundations/lessons";
import { studioHref, foundationHref } from "@/modules/system-design/links";
import { studioCourse } from "@/modules/system-design/schema";
import styles from "./lesson.module.css";
const subscribe = () => () => {};
const sections = ["learn", "practice", "recap"] as const;
const initialPosition: Position = { section: "learn", step: 0, viewed: false };
function ComponentIcon({ kind }: { kind: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      width="44"
      height="44"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      {kind === "Browser" ? (
        <>
          <rect x="8" y="7" width="32" height="25" rx="2" />
          <path d="M4 37h40M17 32v5m14-5v5" />
        </>
      ) : kind === "Database" ? (
        <>
          <ellipse cx="24" cy="10" rx="15" ry="6" />
          <path d="M9 10v25c0 8 30 8 30 0V10M9 22c0 8 30 8 30 0" />
        </>
      ) : (
        <>
          {[7, 19, 31].map((y) => (
            <g key={y}>
              <rect x="8" y={y} width="32" height="9" rx="2" />
              <path d={`M13 ${y + 4}h4m13 0h4`} />
            </g>
          ))}
        </>
      )}
    </svg>
  );
}
function PracticeQuestion({
  question,
  owner,
  initial,
  onUnsaved,
  onFeedback,
  identity,
}: {
  question: PublicQuestion;
  identity: FoundationIdentity;
  owner: string;
  initial: Feedback[];
  onUnsaved: (question: string, dirty: boolean) => void;
  onFeedback: (feedback: Feedback) => void;
}) {
  const [evidence, setEvidence] = useState(
    initial.filter((e) => e.question === question.id),
  );
  const attempted = evidence.find((e) => e.kind === "attempt");
  const hint = evidence.find((e) => e.kind === "hint");
  const explanation = evidence.find((e) => e.kind === "explain");
  const [choice, setChoice] = useState(attempted?.choice ?? "");
  const [result, setResult] = useState<FoundationResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [invalid, setInvalid] = useState(false);
  const request = useRef<{ payload: string; key: string } | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  async function act(kind: "attempt" | "hint" | "explain") {
    if (pending || !ready) return;
    if (kind === "attempt" && !choice) {
      setInvalid(true);
      form.current?.querySelector<HTMLInputElement>("input")?.focus();
      return;
    }
    const payload = {
      identity,
      question: question.id,
      kind,
      choice: kind === "attempt" ? choice : null,
    };
    const json = JSON.stringify(payload);
    if (request.current?.payload !== json)
      request.current = { payload: json, key: crypto.randomUUID() };
    const key = request.current.key;
    onUnsaved(question.id, true);
    startTransition(async () => {
      let response: FoundationResult;
      try {
        response = await submitFoundationPractice(owner, {
          ...payload,
          request: key,
        });
      } catch {
        response = {
          status: "error",
          message:
            "Could not confirm your answer. Your selection is kept. Retry unchanged safely.",
        };
      }
      setResult(response);
      if (response.feedback) {
        const feedback = response.feedback;
        setEvidence((old) => [
          ...old.filter((e) => e.kind !== feedback.kind),
          feedback,
        ]);
        onFeedback(feedback);
        onUnsaved(
          question.id,
          feedback.kind === "attempt" ? false : choice !== attempted?.choice,
        );
        request.current = null;
      }
    });
  }
  return (
    <form
      ref={form}
      className={styles.question}
      onSubmit={(e) => {
        e.preventDefault();
        void act("attempt");
      }}
    >
      <fieldset
        disabled={pending || !ready}
        role="radiogroup"
        aria-labelledby={`${question.id}-prompt`}
        aria-invalid={invalid || undefined}
        aria-describedby={`${question.id}-error`}
      >
        <legend id={`${question.id}-prompt`}>{question.prompt}</legend>
        {question.options.map((option) => (
          <label key={option.id} className={styles.option}>
            <input
              type="radio"
              name={question.id}
              value={option.id}
              checked={choice === option.id}
              onChange={() => {
                setChoice(option.id);
                setInvalid(false);
                onUnsaved(question.id, option.id !== attempted?.choice);
              }}
            />
            {option.text}
          </label>
        ))}
      </fieldset>
      <p
        id={`${question.id}-error`}
        className={styles.error}
        role={invalid ? "alert" : undefined}
      >
        {invalid ? "Choose an option before submitting." : ""}
      </p>
      <div className={styles.controls}>
        <button
          className="button button-primary"
          disabled={pending || !ready}
          type="submit"
        >
          {pending ? "Checking…" : attempted ? "Submit retry" : "Check answer"}
        </button>
        {attempted && (
          <button
            type="button"
            className="button button-secondary"
            disabled={pending || !ready}
            onClick={() => {
              setChoice("");
              setInvalid(false);
              onUnsaved(question.id, false);
              form.current?.querySelector<HTMLInputElement>("input")?.focus();
            }}
          >
            Try again
          </button>
        )}
        {attempted && (
          <button
            type="button"
            className="button button-secondary"
            disabled={pending || !ready || (hint?.hintLevel ?? 0) >= 2}
            onClick={() => void act("hint")}
          >
            {(hint?.hintLevel ?? 0) >= 2
              ? "Both hints shown"
              : hint
                ? "Show next hint"
                : "Show a hint"}
          </button>
        )}
        {attempted && !explanation && (
          <button
            type="button"
            className="button button-secondary"
            disabled={pending || !ready}
            onClick={() => void act("explain")}
          >
            Explain every option
          </button>
        )}
      </div>
      <div role="status" aria-live="polite" className={styles.feedback}>
        {result && result.status !== "ok" && (
          <p className={styles.error}>{result.message}</p>
        )}
        {result?.status === "session" && (
          <p>
            <Link
              className="text-link"
              href="/login"
              target="_blank"
              rel="noreferrer"
            >
              Sign in in another tab
            </Link>
            , then retry here.
          </p>
        )}
        {attempted && (
          <>
            <p>
              <strong>
                {attempted.correct ? "Correct response" : "Try another answer"}
              </strong>{" "}
              · attempt {attempted.attempt}
              {attempted.independent
                ? " · first attempt without prior help"
                : " · retry; not independent first-attempt evidence"}
            </p>
            <p>
              Feedback for “
              {question.options.find((o) => o.id === attempted.choice)?.text}”:{" "}
              {attempted.message}
            </p>
            <p>
              Answer feedback shown and recorded. This check does not establish
              mastery.
            </p>
          </>
        )}
        {hint && (
          <p>
            <strong>Hint {hint.hintLevel} of 2 (recorded):</strong>{" "}
            {hint.message}
          </p>
        )}
        {explanation && (
          <div>
            <p>
              <strong>Option explanations shown (recorded)</strong>
            </p>
            <ul>
              {question.options.map((o) => (
                <li key={o.id}>
                  <strong>{o.text}</strong> {explanation.options?.[o.id]}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </form>
  );
}
export function FoundationLesson({
  owner,
  initial,
}: {
  owner: string;
  initial: FoundationState;
}) {
  const identity = initial.identity;
  const lesson = getFoundationLesson(identity.lesson);
  const isApi = identity.lesson === apiFoundationIdentity.lesson;
  const { title: lessonTitle, definitions, questions } = lesson;
  const [explorerEpoch, setExplorerEpoch] = useState(0);
  const [position, setPosition] = useState<Position>(
    initial.saved?.position ??
      (isApi
        ? { ...initialPosition, step: 0, explorer: defaultExplorerConfig() }
        : initialPosition),
  );
  const [saved, setSaved] = useState(initial.saved);
  const [base, setBase] = useState(initial.saved?.revision ?? 0);
  const [result, setResult] = useState<FoundationResult | null>(null);
  const [comparison, setComparison] = useState<SavedPosition | null>(null);
  const [practiceEvidence, setPracticeEvidence] = useState(initial.evidence);
  const [practiceDirty, setPracticeDirty] = useState<Record<string, boolean>>(
    {},
  );
  const [pending, startTransition] = useTransition();
  const request = useRef<{ payload: string; key: string } | null>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const dirty =
    !saved || JSON.stringify(position) !== JSON.stringify(saved.position);
  const unsaved =
    dirty || pending || Object.values(practiceDirty).some(Boolean);
  useEffect(() => {
    if (!unsaved) return;
    const unload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const leave = (e: MouseEvent) => {
      const a = e.target instanceof Element ? e.target.closest("a") : null;
      if (!a || a.target === "_blank" || e.defaultPrevented) return;
      const url = new URL(a.href, location.href);
      if (url.pathname === location.pathname && url.origin === location.origin)
        return;
      if (
        !confirm(
          "Leave this lesson? Unsaved position and unsubmitted selections will be lost. Saved work remains private.",
        )
      ) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", leave, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", leave, true);
    };
  }, [unsaved]);
  const section = (value: Position["section"]) =>
    setPosition((p) => ({ ...p, section: value }));
  const step = walkthrough[position.step];
  function tabKey(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (e.key === "ArrowRight") next = (index + 1) % 3;
    else if (e.key === "ArrowLeft") next = (index + 2) % 3;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = 2;
    else return;
    e.preventDefault();
    section(sections[next]);
    tabs.current[next]?.focus();
  }
  async function save() {
    if (pending || !ready) return;
    const snapshot = position;
    const payload = JSON.stringify({ position: snapshot, expected: base });
    if (request.current?.payload !== payload)
      request.current = { payload, key: crypto.randomUUID() };
    const key = request.current.key;
    startTransition(async () => {
      let response: FoundationResult;
      try {
        response = await saveFoundationPosition(owner, {
          identity,
          expected: base,
          request: key,
          position: snapshot,
        });
      } catch {
        response = {
          status: "error",
          message:
            "Could not confirm the save. Your position is kept. Retry unchanged safely.",
        };
      }
      setResult(response);
      if (response.saved) {
        setSaved(response.saved);
        setBase(response.saved.revision);
        setComparison(null);
        request.current = null;
      }
    });
  }
  function compare() {
    startTransition(async () => {
      try {
        const response = await loadFoundationPosition(owner, identity);
        setResult(response);
        setComparison(response.state?.saved ?? null);
      } catch {
        setResult({
          status: "error",
          message:
            "Could not load the saved position. Your current position is kept.",
        });
      }
    });
  }
  return (
    <div className={styles.workspace}>
      <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
        <Link href="/courses">Courses</Link>
        <span aria-hidden="true"> / </span>
        <Link href={studioHref(studioCourse)!}>System Design Studio</Link>
        <span> / Foundations</span>
      </nav>
      <div className={styles.layout}>
        <aside
          className={styles.sidebar}
          aria-label="Foundations lesson navigation"
        >
          <details open>
            <summary>Foundations lesson list</summary>
            <nav aria-label="Foundations lessons">
              <ol>
                {foundationLessons.map((item) => (
                  <li key={item.identity.lesson}>
                    {item.identity.lesson === identity.lesson ? (
                      <span aria-current="page">
                        {item.number}. {item.title}
                      </span>
                    ) : (
                      <Link
                        href={foundationHref(
                          studioCourse,
                          item.identity.lesson,
                        )!}
                      >
                        {item.number}. {item.title}
                      </Link>
                    )}
                  </li>
                ))}
                {remainingFoundationLessons.map((name, i) => (
                  <li key={name}>
                    {i + 3}. {name} <small>Planned</small>
                  </li>
                ))}
              </ol>
            </nav>
          </details>
        </aside>
        <div className={styles.main}>
          <header>
            <p className="eyebrow">Lesson {lesson.number} · Beginner</p>
            <h1>{lessonTitle}</h1>
            <p>
              {isApi
                ? "Explore the contract between a client and an application."
                : "Follow a student opening the campus events page."}
            </p>
            <p>
              {isApi
                ? "Objective: distinguish requests and responses, interpret JSON and status feedback, and explain a representation without confusing it with database storage."
                : "Objective: explain the browser, server and database roles, and trace a request and its response."}
            </p>
          </header>
          <div
            className={styles.tabs}
            role="tablist"
            aria-label="Lesson sections"
          >
            {sections.map((value, i) => (
              <button
                key={value}
                ref={(el) => {
                  tabs.current[i] = el;
                }}
                id={`tab-${value}`}
                type="button"
                role="tab"
                aria-selected={position.section === value}
                aria-controls={`panel-${value}`}
                tabIndex={position.section === value ? 0 : -1}
                onClick={() => section(value)}
                onKeyDown={(e) => tabKey(e, i)}
              >
                {value[0].toUpperCase() + value.slice(1)}
              </button>
            ))}
          </div>
          <section
            role="tabpanel"
            id="panel-learn"
            aria-labelledby="tab-learn"
            hidden={position.section !== "learn"}
            tabIndex={0}
          >
            {isApi && "explorer" in position ? (
              <ApiExplorer
                key={explorerEpoch}
                config={position.explorer}
                onChange={(explorer) =>
                  setPosition((p) => ({ ...p, step: 0, explorer }))
                }
                onPractice={() => {
                  section("practice");
                  tabs.current[1]?.focus();
                }}
              />
            ) : (
              <>
                <div className={styles.card}>
                  <h2>Guided walkthrough</h2>
                  <p>
                    A student opens the campus event directory to find an event.
                    These three components cooperate to show the list.
                  </p>
                  <div className={styles.diagram} aria-hidden="true">
                    {["Browser", "Application server", "Database"].map(
                      (name, i) => (
                        <div key={name} className={styles.diagramGroup}>
                          {i > 0 && (
                            <span
                              className={`${styles.arrow} ${(i === 1 && (position.step === 0 || position.step === 3)) || (i === 2 && (position.step === 1 || position.step === 2)) ? styles.activeArrow : ""}`}
                            >
                              <span>
                                {i === 1
                                  ? position.step === 3
                                    ? "Response"
                                    : "Request"
                                  : position.step === 2
                                    ? "Records"
                                    : "Query"}
                              </span>
                              <b>
                                {(i === 1 && position.step === 3) ||
                                (i === 2 && position.step === 2)
                                  ? "←"
                                  : "→"}
                              </b>
                            </span>
                          )}
                          <div
                            className={`${styles.node} ${name === step.from || name === step.to ? styles.activeNode : ""}`}
                          >
                            <ComponentIcon kind={name} />
                            <span>{name}</span>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                  <div
                    className={styles.step}
                    role="status"
                    aria-live="polite"
                    aria-atomic="true"
                  >
                    <p>Step {position.step + 1} of 4</p>
                    <h3>{step.text}</h3>
                    <p>{step.detail}</p>
                  </div>
                  <div className={styles.controls}>
                    <button
                      type="button"
                      className="button button-secondary"
                      disabled={position.step === 0}
                      onClick={() =>
                        setPosition((p) => ({
                          ...p,
                          step: moveStep(p.step, "back"),
                        }))
                      }
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      className="button button-primary"
                      disabled={position.step === 3}
                      onClick={() =>
                        setPosition((p) => ({
                          ...p,
                          step: moveStep(p.step, "next"),
                        }))
                      }
                    >
                      Next step →
                    </button>
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() =>
                        setPosition((p) => ({
                          ...p,
                          step: moveStep(p.step, "replay"),
                        }))
                      }
                    >
                      ↻ Replay
                    </button>
                  </div>
                  <p>
                    <small>
                      Simplified illustration, not a live network request. No
                      autoplay.
                    </small>
                  </p>
                  <details>
                    <summary>Read the whole journey</summary>
                    <ol>
                      {walkthrough.map((s) => (
                        <li key={s.text}>{s.text}</li>
                      ))}
                    </ol>
                  </details>
                </div>
                <div className={styles.card}>
                  <h2>In plain language</h2>
                  <p>
                    The browser asks. The application server handles the
                    request. The database stores event records.
                  </p>
                  <dl>
                    {definitions.map(([name, text]) => (
                      <div key={name}>
                        <dt>{name}</dt>
                        <dd>{text}</dd>
                      </div>
                    ))}
                  </dl>
                  <h3>Why not go straight to the database?</h3>
                  <p>
                    In this architecture the application server is the
                    controlled entry point. It checks access, applies rules and
                    chooses which information to return. Giving every browser
                    direct database credentials would expose access the student
                    does not need. Other architectures can use carefully
                    controlled data APIs; this example does not show them.
                  </p>
                  <h3>What this example leaves out</h3>
                  <p>
                    We omit DNS (finding a server’s address), TLS (protecting
                    the connection), caching (reusing an earlier result) and
                    other network details. Not every request needs a database
                    query: a server may already have the answer in a cache or
                    produce it without stored records.
                  </p>
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={() => {
                      section("practice");
                      tabs.current[1]?.focus();
                    }}
                  >
                    Try a practice question →
                  </button>
                </div>
              </>
            )}
          </section>
          <section
            role="tabpanel"
            id="panel-practice"
            aria-labelledby="tab-practice"
            hidden={position.section !== "practice"}
            tabIndex={0}
          >
            <div className={styles.card}>
              <h2>Practice the request journey</h2>
              <p>
                {questions.length} short checks on this lesson. Submit an answer
                before asking for hints or option explanations. Help and retries
                are recorded; these checks do not prove mastery.
              </p>
              {questions.map((q) => (
                <PracticeQuestion
                  key={q.id}
                  question={q}
                  identity={identity}
                  owner={owner}
                  initial={initial.evidence}
                  onFeedback={(feedback) =>
                    setPracticeEvidence((old) => [
                      ...old.filter(
                        (e) =>
                          !(
                            e.question === feedback.question &&
                            e.kind === feedback.kind
                          ),
                      ),
                      feedback,
                    ])
                  }
                  onUnsaved={(id, value) =>
                    setPracticeDirty((old) => ({ ...old, [id]: value }))
                  }
                />
              ))}
              <button
                type="button"
                className="button button-secondary"
                onClick={() => {
                  section("recap");
                  tabs.current[2]?.focus();
                }}
              >
                Open recap →
              </button>
            </div>
          </section>
          <section
            role="tabpanel"
            id="panel-recap"
            aria-labelledby="tab-recap"
            hidden={position.section !== "recap"}
            tabIndex={0}
          >
            <div className={styles.card}>
              <h2>{isApi ? "Recap APIs and data" : "Recap the journey"}</h2>
              {isApi ? (
                <>
                  <p>
                    An API is an agreed interface. In these HTTP examples,
                    requests use a method and path, and a create request carries
                    a title in its request body. Responses include a status and
                    a separate response body.
                  </p>
                  <ul>
                    <li>
                      GET /api/events returns an events array; GET
                      /api/events/evt_101 returns one event (200).
                    </li>
                    <li>
                      An unknown event returns 404. A missing or invalid create
                      title returns 400 in our chosen contract.
                    </li>
                    <li>
                      A valid POST /api/events title shows an illustrative 201
                      response; no real event is retained.
                    </li>
                    <li>
                      JSON is a structured data format, not a database. API
                      fields can differ from internal records.
                    </li>
                    <li>
                      The application validates input and checks identity and
                      permissions. A method or status alone does not describe
                      the entire interaction.
                    </li>
                  </ul>
                </>
              ) : (
                <>
                  <ol>
                    {walkthrough.map((s) => (
                      <li key={s.text}>{s.text}</li>
                    ))}
                  </ol>
                  <p>
                    The browser talks to the application server. The server
                    controls access to stored event records. A request asks for
                    something; a response replies to that request.
                  </p>
                </>
              )}
              <h3>Compact glossary</h3>
              <dl>
                {definitions.map(([name, text]) => (
                  <div key={name}>
                    <dt>{name}</dt>
                    <dd>{text}</dd>
                  </div>
                ))}
              </dl>
              <label className={styles.option}>
                <input
                  type="checkbox"
                  checked={position.viewed}
                  onChange={(e) =>
                    setPosition((p) => ({ ...p, viewed: e.target.checked }))
                  }
                />
                I viewed this lesson (self-reported; saved with my position).
              </label>
              <div className={styles.controls}>
                <Link
                  className="text-link"
                  href={foundationHref(
                    studioCourse,
                    isApi ? "web-request-v1" : "apis-data-v1",
                  )!}
                >
                  {isApi
                    ? "Revisit How a web request works"
                    : "Continue to APIs and data"}
                </Link>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => {
                    section("practice");
                    tabs.current[1]?.focus();
                  }}
                >
                  Revisit practice
                </button>
                <Link
                  className="button button-primary"
                  href={studioHref(studioCourse)!}
                >
                  Open capacity workshop →
                </Link>
              </div>
              <p>
                Additional foundations lessons are planned:{" "}
                {remainingFoundationLessons.join("; ")}. They are not available
                yet. The workshop is available now without a prerequisite lock.
              </p>
            </div>
          </section>
          <footer className={styles.saveArea}>
            <div className={styles.controls}>
              <button
                type="button"
                className="button button-secondary"
                disabled={pending || !ready}
                onClick={() => void save()}
              >
                {pending ? "Saving or loading…" : "Save lesson position"}
              </button>
              <span>
                {dirty ? "Unsaved position" : "Position saved"}
                {saved ? ` · revision ${saved.revision}` : " · not saved yet"}
              </span>
            </div>
            <p>
              Lesson viewed: {position.viewed ? "self-reported" : "not marked"}
              {dirty ? " · current draft" : " · saved"}. Position saves do not
              submit practice.
            </p>
            {isApi && (
              <p>
                Saving restores the scenario, event ID and title draft.
                Responses and illustrative created events are not saved.
              </p>
            )}
            <p>
              Practice:{" "}
              {practiceEvidence.filter((e) => e.kind === "attempt").length
                ? `${practiceEvidence.filter((e) => e.kind === "attempt").length} of ${questions.length} questions attempted; ${practiceEvidence.filter((e) => e.kind === "attempt" && e.correct).length} latest responses correct on these specific checks.`
                : "not attempted."}{" "}
              Details and help history appear in Practice. This is not course
              completion.
            </p>
            <div role="status" aria-live="polite">
              {result?.message}
            </div>
            {result?.status === "session" && (
              <p>
                <Link
                  className="text-link"
                  href="/login"
                  target="_blank"
                  rel="noreferrer"
                >
                  Sign in in another tab
                </Link>
                , then retry here. Keep this tab open.
              </p>
            )}
            {result?.status === "conflict" && (
              <button
                type="button"
                className="button button-secondary"
                disabled={pending}
                onClick={compare}
              >
                Review saved position
              </button>
            )}
            {comparison && (
              <div className={styles.card}>
                <h3>Saved revision {comparison.revision}</h3>
                <p>
                  {comparison.position.section};{" "}
                  {"explorer" in comparison.position
                    ? `explorer scenario ${comparison.position.explorer.scenario}, event ID ${comparison.position.explorer.eventId}, title draft: ${comparison.position.explorer.title || "(empty)"}`
                    : `walkthrough step ${comparison.position.step + 1}`}
                  ; viewed:{" "}
                  {comparison.position.viewed ? "yes (self-reported)" : "no"}.
                  Your current position is still kept.
                </p>
                <div className={styles.controls}>
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => {
                      if (
                        !confirm(
                          "Replace this tab’s position with the saved position? Practice selections stay in this tab.",
                        )
                      )
                        return;
                      setPosition(comparison.position);
                      setExplorerEpoch((n) => n + 1);
                      setSaved(comparison);
                      setBase(comparison.revision);
                      setComparison(null);
                      setResult(null);
                      request.current = null;
                    }}
                  >
                    Use saved position
                  </button>
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => {
                      setBase(comparison.revision);
                      setComparison(null);
                      setResult({
                        status: "ok",
                        message:
                          "Your current position is kept. Save explicitly to create the next revision.",
                      });
                      request.current = null;
                    }}
                  >
                    Keep my position for next save
                  </button>
                </div>
              </div>
            )}
            <small>
              Content: {identity.content} · position: {identity.schema}. Private
              to your account. No automatic saves.
            </small>
          </footer>
        </div>
      </div>
    </div>
  );
}
