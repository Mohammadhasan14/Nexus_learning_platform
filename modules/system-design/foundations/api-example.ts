import { z } from "zod";
export const apiContractVersion = "campus-api-example-v1";
export const explorerConfigSchema = z
  .object({
    scenario: z.enum(["list", "view", "create"]),
    eventId: z.enum(["evt_101", "evt_102", "evt_999"]),
    title: z.string().max(80),
  })
  .strict();
export type ExplorerConfig = z.infer<typeof explorerConfigSchema>;
export const exampleEvents = Object.freeze([
  Object.freeze({ id: "evt_101", title: "Robotics meetup" }),
  Object.freeze({ id: "evt_102", title: "Campus gardening club" }),
]);
export function defaultExplorerConfig(): ExplorerConfig {
  return { scenario: "list", eventId: "evt_101", title: "Robotics meetup" };
}
export function exampleRequest(input: unknown) {
  const c = explorerConfigSchema.parse(input);
  return c.scenario === "create"
    ? {
        method: "POST" as const,
        path: "/api/events",
        body: c.title === "" ? {} : { title: c.title },
      }
    : {
        method: "GET" as const,
        path:
          c.scenario === "list" ? "/api/events" : `/api/events/${c.eventId}`,
        body: null,
      };
}
export type ExampleResponse = {
  status: 200 | 201 | 400 | 404;
  statusText: string;
  body:
    | { events: { id: string; title: string }[] }
    | { event: { id: string; title: string } }
    | { error: { code: string; message: string } };
  summary: string;
  detail: string;
  titleError?: string;
};
/** Pure local teaching model. No transport, clock, random IDs or mutable event store. */
export function runApiExample(
  input: unknown,
  version = apiContractVersion,
): ExampleResponse {
  if (version !== apiContractVersion)
    throw new Error("Unsupported example contract");
  const c = explorerConfigSchema
    .extend({ title: z.unknown().optional() })
    .parse(input);
  if (c.scenario === "list")
    return {
      status: 200,
      statusText: "OK",
      body: { events: exampleEvents.map((e) => ({ ...e })) },
      summary: "The example returned two events.",
      detail:
        "The events field is an array: a list of event representations. Each has an id and title. No event was changed.",
    };
  if (c.scenario === "view") {
    const event = exampleEvents.find((e) => e.id === c.eventId);
    return event
      ? {
          status: 200,
          statusText: "OK",
          body: { event: { ...event } },
          summary: "The requested example event was found.",
          detail:
            "The event field contains one representation, not a copy of all database records. This GET retrieves information without intentionally changing application state.",
        }
      : {
          status: 404,
          statusText: "Not Found",
          body: {
            error: {
              code: "event_not_found",
              message: "No example event has this ID.",
            },
          },
          summary: "The requested example event was not found.",
          detail:
            "Here 404 means no matching event was found. Read the error code and message for details; the status alone is not the full explanation.",
        };
  }
  const title = typeof c.title === "string" ? c.title.trim() : "";
  if (
    typeof c.title !== "string" ||
    title.length < 3 ||
    title.length > 80 ||
    /[\u0000-\u001f\u007f]/.test(c.title)
  ) {
    const message =
      "Use a title of 3–80 characters after trimming spaces, without control characters.";
    return {
      status: 400,
      statusText: "Bad Request",
      body: { error: { code: "invalid_title", message } },
      summary: "The example rejected the title.",
      detail:
        "Our chosen contract uses 400 for missing or invalid input. This differs from the missing-resource 404 example. Other APIs can choose different validation conventions.",
      titleError: message,
    };
  }
  return {
    status: 201,
    statusText: "Created",
    body: { event: { id: "evt_example", title } },
    summary:
      "An illustrative create response is shown. No real event was saved.",
    detail:
      "The response uses a fixed illustrative ID and a trimmed title. The fixed dataset stays unchanged: this event will not appear in List or View. A real application would validate inputs, check permissions and create a resource before returning a successful create response.",
  };
}
export type ExampleState = {
  config: ExplorerConfig;
  response: ExampleResponse | null;
};
export type ExampleAction =
  | { kind: "run" }
  | { kind: "reset" }
  | { kind: "edit"; config: ExplorerConfig };
export function initialExample(config = defaultExplorerConfig()): ExampleState {
  return { config: explorerConfigSchema.parse(config), response: null };
}
export function transitionExample(
  state: ExampleState,
  action: ExampleAction,
): ExampleState {
  if (action.kind === "reset") return initialExample();
  if (action.kind === "edit") return initialExample(action.config);
  return { config: { ...state.config }, response: runApiExample(state.config) };
}
