import { type Worksheet, worksheetIdentity } from "./schema";
export const campusScenario = {
  ...worksheetIdentity,
  title: "Campus event directory",
  subtitle: "Requirements & capacity workshop",
  brief:
    "Help students discover campus events. Support event listings, details and organiser updates.",
  introduction:
    "Start by describing what the directory must do and what is outside its scope. Then estimate how much work it might receive. This is the first implemented workshop in a planned beginner-to-advanced course, not the whole course. A short foundations module is planned before this workshop; it is not available yet or required to enter today.",
  teaching: [
    [
      "Requirements and targets",
      "Functional requirements say what people can do, such as browse events. Quality targets say how well it should work. Latency is the time for a request and its response; throughput is requests handled per second. Your latency and availability targets express goals, not predictions from this calculator.",
    ],
    [
      "Requests, reads and writes",
      "A client, such as a browser, sends a request to a server through an API (an agreed way to ask for data or actions). The server can read or write a database and return a response. Viewing an event is a read; updating it is a write. One page can make several requests.",
    ],
    [
      "Average and peak",
      "Average traffic spreads daily requests over 86,400 seconds. Peak traffic is a stated multiplier of that average. Event launches may create short peaks; this assumption needs evidence before real planning.",
    ],
    [
      "Units and retention",
      "A byte measures data size. GB means 1,000,000,000 bytes; GiB means 1,073,741,824 bytes. Mbps means 1,000,000 bits per second; each byte has 8 bits. Retained write volume assumes payloads accumulate. Updates that overwrite records do not necessarily grow a database by that amount.",
    ],
  ],
  exclusions:
    "Estimates exclude protocol overhead, indexes, replication, backups, compression and growth. They do not predict database size, server counts, latency, availability or production readiness.",
  review:
    "AI-assisted content and arithmetic review, 29 October 2026. Golden formulas and boundary cases are tested; no independent curriculum or learning-outcome validation is claimed.",
} as const;
export const defaultWorksheet: Worksheet = {
  functionalRequirements:
    "Browse events, view details, create and update events",
  exclusions: "Payments and ticketing",
  latencyTargetMs: 200,
  availabilityTargetPercent: 99.9,
  assumptions: "Event launches may concentrate traffic into short peaks.",
  explanation: "",
  workload: {
    dailyActiveUsers: 100_000,
    requestsPerUserPerDay: 20,
    peakFactor: 5,
    readPercentage: 90,
    readResponseBytes: 20_000,
    writePayloadBytes: 2_000,
    retentionDays: 30,
  },
};
