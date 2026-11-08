"use client";
import { useState, useSyncExternalStore } from "react";
import { apiDefinitions } from "@/modules/system-design/foundations/api-content";
import {
  exampleRequest,
  transitionExample,
  type ExplorerConfig,
  type ExampleState,
  type ExampleAction,
} from "@/modules/system-design/foundations/api-example";
import styles from "./lesson.module.css";
const subscribe = () => () => {};
export function ApiExplorer({
  config,
  onChange,
  onPractice,
}: {
  config: ExplorerConfig;
  onChange: (config: ExplorerConfig) => void;
  onPractice: () => void;
}) {
  const [response, setResponse] = useState<ExampleState["response"]>(null);
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const request = exampleRequest(config);
  function act(action: ExampleAction) {
    const next = transitionExample({ config, response }, action);
    setResponse(next.response);
    if (action.kind !== "run") onChange(next.config);
  }
  const edit = (patch: Partial<ExplorerConfig>) =>
    act({ kind: "edit", config: { ...config, ...patch } });
  return (
    <>
      <div className={styles.card}>
        <h2>Before you explore</h2>
        <p>
          A client is a program asking for a service, such as a browser
          requesting campus events. An application handles that request. An API
          is their agreed interface: its contract describes which requests the
          application understands and how it responds.
        </p>
        <p>
          HTTP is a set of communication rules for web requests and responses. A
          resource is something you ask about, such as an event. Its
          representation is a chosen view of that resource, rather than the
          underlying storage itself.
        </p>
        <p>
          JSON is a text format for structured data. An object uses named fields
          such as title; an array is a list. JSON is not a database. The
          application chooses which fields clients receive and can keep internal
          records and organiser secrets private.
        </p>
      </div>
      <div className={styles.card}>
        <div className={styles.explorerHeading}>
          <h2>Explore an example API</h2>
          <span className="badge">
            Local teaching example. No network request.
          </span>
        </div>
        <p>
          These paths, field names, JSON bodies and validation rules belong to
          this example contract. Other APIs may use different formats and
          conventions.
        </p>
        <label className={styles.scenarioLabel} htmlFor="api-scenario">
          Scenario
        </label>
        <select
          id="api-scenario"
          className={styles.explorerInput}
          disabled={!ready}
          value={config.scenario}
          onChange={(e) => {
            const value = e.target.value;
            if (value === "list" || value === "view" || value === "create")
              edit({ scenario: value });
          }}
        >
          <option value="list">List events</option>
          <option value="view">View one event</option>
          <option value="create">Create an event</option>
        </select>
        <div className={styles.requestResponse}>
          <section
            className={styles.examplePanel}
            aria-labelledby="api-request-heading"
          >
            <h3 id="api-request-heading">Request</h3>
            <p>
              <strong className={styles.method}>{request.method}</strong>{" "}
              <code className={styles.path}>{request.path}</code>
            </p>
            <p>
              {config.scenario === "list"
                ? "Ask for the event list."
                : config.scenario === "view"
                  ? "Ask for one event by its ID."
                  : "Send a title to request a new event in this contract."}
            </p>
            {config.scenario === "view" && (
              <>
                <label htmlFor="api-event-id">Event ID</label>
                <select
                  id="api-event-id"
                  className={styles.explorerInput}
                  value={config.eventId}
                  disabled={!ready}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (
                      value === "evt_101" ||
                      value === "evt_102" ||
                      value === "evt_999"
                    )
                      edit({ eventId: value });
                  }}
                >
                  <option value="evt_101">evt_101 — Robotics meetup</option>
                  <option value="evt_102">
                    evt_102 — Campus gardening club
                  </option>
                  <option value="evt_999">evt_999 — No matching event</option>
                </select>
              </>
            )}
            {config.scenario === "create" && (
              <>
                <label htmlFor="api-title">Event title</label>
                <input
                  id="api-title"
                  className={styles.explorerInput}
                  disabled={!ready}
                  value={config.title}
                  maxLength={80}
                  aria-invalid={response?.titleError ? true : undefined}
                  aria-describedby="api-title-help api-title-error"
                  onChange={(e) => edit({ title: e.target.value })}
                />
                <p id="api-title-help">
                  Our example accepts 3–80 characters after trimming spaces,
                  without control characters. An empty field omits title so you
                  can explore missing input.
                </p>
                <p id="api-title-error" className={styles.error}>
                  {response?.titleError ?? ""}
                </p>
              </>
            )}
            <h4>Request body</h4>
            {request.body === null ? (
              <p>No request body in these GET examples.</p>
            ) : (
              <>
                <pre
                  className={styles.json}
                  role="group"
                  aria-label="Request body JSON"
                >
                  <code>{JSON.stringify(request.body, null, 2)}</code>
                </pre>
                <p>
                  {config.title === ""
                    ? "Plain language: no title field is sent in this example request."
                    : "Plain language: the client sends the title entered above. The application must validate it."}
                </p>
              </>
            )}
            <div className={styles.controls}>
              <button
                type="button"
                className="button button-primary"
                disabled={!ready}
                onClick={() => act({ kind: "run" })}
              >
                Show example response
              </button>
              <button
                type="button"
                className="button button-secondary"
                disabled={!ready}
                onClick={() => act({ kind: "reset" })}
              >
                Reset example
              </button>
            </div>
          </section>
          <section
            className={styles.examplePanel}
            aria-labelledby="api-response-heading"
          >
            <h3 id="api-response-heading">Example response</h3>
            <p role="status" aria-live="polite" aria-atomic="true">
              {response
                ? `${response.status} ${response.statusText}. ${response.summary}`
                : "No response shown. Choose Show example response. Changing an input clears the previous response."}
            </p>
            {response && (
              <>
                <p>
                  <strong className={styles.responseStatus}>
                    {response.status} {response.statusText}
                  </strong>
                </p>
                <h4>Response body</h4>
                <pre
                  className={styles.json}
                  role="group"
                  aria-label="Response body JSON"
                >
                  <code>{JSON.stringify(response.body, null, 2)}</code>
                </pre>
                <p>{response.detail}</p>
                <div role="group" aria-label="Response data in plain language">
                  {"events" in response.body ? (
                    <ul>
                      {response.body.events.map((event) => (
                        <li key={event.id}>
                          Event ID {event.id}: {event.title}
                        </li>
                      ))}
                    </ul>
                  ) : "event" in response.body ? (
                    <p>
                      Event ID: {response.body.event.id}. Title:{" "}
                      {response.body.event.title}.
                    </p>
                  ) : (
                    <p>
                      Error code: {response.body.error.code}. Details:{" "}
                      {response.body.error.message}
                    </p>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
        <div className={styles.contextDefinitions}>
          {apiDefinitions.slice(2).map(([term, definition]) => (
            <details key={term}>
              <summary>{term}</summary>
              <p>{definition}</p>
            </details>
          ))}
        </div>
        <h3>An API is a contract</h3>
        <p>
          The client follows an agreed request format. The application validates
          inputs, controls access and returns a documented response. The JSON
          fields in a response need not match database tables or include every
          stored field.
        </p>
        <p>
          GET retrieves a representation and should not be used to intentionally
          change application state. POST creates an event here, but has other
          uses too. A method alone does not grant permission.
        </p>
        <h3>Who can do what?</h3>
        <p>
          Authentication checks who is making a request. Authorization checks
          what they are allowed to do. A real event application might let
          students read events while only authorised organisers can create them.
          This local illustration does not simulate sign-in or permission
          checks.
        </p>
        <p>
          Created examples are never added to the fixed event list or retained
          as real events. Saving lesson position restores your scenario, event
          ID and title draft, not a response or an actual event. Choose Show
          example response again after resuming.
        </p>
        <button
          type="button"
          className="button button-primary"
          onClick={onPractice}
        >
          Continue to practice →
        </button>
      </div>
    </>
  );
}
