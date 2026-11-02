// Public lesson content only. Answer keys, hints and option feedback live in learning_private.
export const foundationIdentity = {
  lesson: "web-request-v1",
  content: "web-request-content-v1",
  schema: "foundation-position-v1",
} as const;
export const lessonTitle = "How a web request works";
export const definitions = [
  [
    "Client",
    "A program that asks another program for a service. Here, the browser is the client.",
  ],
  [
    "Application server",
    "The program that handles the browser’s request, applies application rules and prepares a response.",
  ],
  [
    "Database",
    "A system that stores and retrieves records, such as campus event names, dates and places.",
  ],
  [
    "Request",
    "A message asking for information or an action. Here, the browser asks for the campus event list.",
  ],
  [
    "Response",
    "A reply to a request. Here, the server returns event information for the browser to display.",
  ],
] as const;
export const walkthrough = [
  {
    from: "Browser",
    to: "Application server",
    label: "Request",
    text: "Your browser sends a request for campus events to the application server.",
    detail:
      "Opening the events page asks the application to provide the event list. The browser is the client that initiates this journey.",
  },
  {
    from: "Application server",
    to: "Database",
    label: "Query",
    text: "The application server queries the database for matching events.",
    detail:
      "A query is a request for stored information. The server applies the application’s rules and asks for the records it needs.",
  },
  {
    from: "Database",
    to: "Application server",
    label: "Records",
    text: "The database returns matching event records to the application server.",
    detail:
      "The records contain event information. The database replies to the server, rather than directly to the browser in this example.",
  },
  {
    from: "Application server",
    to: "Browser",
    label: "Response",
    text: "The application server sends a response to the browser, which displays the events.",
    detail:
      "The server prepares a reply using the records. The browser uses that reply to show the event list.",
  },
] as const;
export const questions = [
  {
    id: "initiator",
    prompt:
      "Which component initiates the illustrated request for campus events?",
    options: [
      { id: "browser", text: "Browser" },
      { id: "server", text: "Application server" },
      { id: "database", text: "Database" },
    ],
  },
  {
    id: "database-query",
    prompt: "Which component queries the database in this example?",
    options: [
      { id: "browser", text: "Browser" },
      { id: "server", text: "Application server" },
      { id: "database", text: "Database" },
    ],
  },
  {
    id: "request-response",
    prompt:
      "A student opens a library page. The browser asks the application server for opening hours. The server replies with today’s hours. Which statement is right?",
    options: [
      {
        id: "ask-reply",
        text: "Asking for the hours is the request; returning the hours is the response.",
      },
      {
        id: "reply-ask",
        text: "Returning the hours is the request; asking for them is the response.",
      },
      {
        id: "both-requests",
        text: "Both messages are requests because both travel over the network.",
      },
    ],
  },
] as const;
export const plannedLessons = [
  "APIs and data",
  "Latency, throughput, and concurrency",
  "Read/write workloads",
  "Units and the transition to capacity estimation",
];
