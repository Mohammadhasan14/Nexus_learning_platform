// Public teaching and options only. Grading keys, hints and feedback are SQL-private.
export const apiFoundationIdentity = {
  lesson: "apis-data-v1",
  content: "apis-data-content-v1",
  schema: "api-position-v1",
} as const;
export const apiLessonTitle = "APIs and data";
export const apiDefinitions = [
  [
    "API",
    "An application programming interface: an agreed way for programs to interact. Its contract describes supported requests and responses.",
  ],
  [
    "HTTP",
    "A protocol: rules a client and application use to exchange requests and responses on the web.",
  ],
  [
    "Resource and path",
    "A resource is something the application makes available, such as an event. The path identifies what is being requested, for example /api/events/evt_101.",
  ],
  [
    "Method",
    "The request’s action word. GET retrieves a representation: a view of a resource. POST creates an event in this example; it can serve other purposes in other contracts.",
  ],
  [
    "Request body",
    "Data the client sends with a request. Our create-event request carries a title; our GET examples have no body.",
  ],
  [
    "Status",
    "A three-digit response code summarizing the result. The response body can explain details that the code alone does not describe.",
  ],
  [
    "Response body",
    "Data sent back by the application, such as an event list or an error explanation. It is distinct from the request body.",
  ],
  [
    "JSON",
    "A text format for structured data using named fields, arrays (lists) and values. It is not a database. These examples use JSON; other APIs can use other formats.",
  ],
] as const;
export const apiQuestions = [
  {
    id: "api-read-one",
    prompt:
      "In this lesson’s contract, which request reads event evt_101 without intentionally changing application state?",
    options: [
      { id: "get-one", text: "GET /api/events/evt_101" },
      { id: "post-list", text: "POST /api/events with a title" },
      {
        id: "get-create",
        text: "GET /api/events/create?title=Meetup to create an event",
      },
    ],
  },
  {
    id: "api-create-body",
    prompt:
      "Which data belongs in the client’s create-event request body under this example contract?",
    options: [
      {
        id: "title",
        text: 'A title, for example {"title":"Robotics meetup"}.',
      },
      {
        id: "status",
        text: 'The response status, for example {"status":201}.',
      },
      {
        id: "internal",
        text: "Private database fields, including the internal organiser secret.",
      },
    ],
  },
  {
    id: "api-error-kind",
    prompt:
      "The event ID is well formed but not found. Separately, a create request has no title. Which feedback matches this lesson’s chosen contract?",
    options: [
      {
        id: "missing-invalid",
        text: "404 for the missing event; 400 for the invalid create input. Read the response body for details.",
      },
      {
        id: "reversed",
        text: "400 for the missing event; 404 for the invalid create input.",
      },
      {
        id: "all-success",
        text: "200 for both because JSON can contain an error message.",
      },
    ],
  },
  {
    id: "api-representation",
    prompt:
      "An internal event record includes an organiser secret. The API returns only id and title. Which explanation is right?",
    options: [
      {
        id: "chosen-view",
        text: "The application can return a chosen representation and keep internal fields private. JSON is a data format, not the storage system.",
      },
      {
        id: "same-table",
        text: "API JSON must contain every database column in its original structure.",
      },
      {
        id: "json-database",
        text: "The JSON response is the database, so the browser now has direct database access.",
      },
    ],
  },
] as const;
