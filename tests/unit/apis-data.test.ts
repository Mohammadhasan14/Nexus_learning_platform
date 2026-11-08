import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  apiFoundationIdentity,
  apiQuestions,
} from "../../modules/system-design/foundations/api-content";
import { foundationIdentity } from "../../modules/system-design/foundations/content";
import {
  defaultExplorerConfig,
  exampleEvents,
  exampleRequest,
  initialExample,
  runApiExample,
  transitionExample,
} from "../../modules/system-design/foundations/api-example";
import {
  foundationStateSchema,
  positionSaveSchema,
  practiceInputSchema,
} from "../../modules/system-design/foundations/schema";
test("API example returns the documented representations and chosen status codes", () => {
  const config = defaultExplorerConfig();
  assert.deepEqual(exampleRequest(config), {
    method: "GET",
    path: "/api/events",
    body: null,
  });
  assert.deepEqual(runApiExample(config).body, {
    events: [
      { id: "evt_101", title: "Robotics meetup" },
      { id: "evt_102", title: "Campus gardening club" },
    ],
  });
  assert.equal(runApiExample(config).status, 200);
  assert.deepEqual(exampleRequest({ ...config, scenario: "view" }), {
    method: "GET",
    path: "/api/events/evt_101",
    body: null,
  });
  assert.deepEqual(runApiExample({ ...config, scenario: "view" }).body, {
    event: { id: "evt_101", title: "Robotics meetup" },
  });
  assert.equal(
    runApiExample({ ...config, scenario: "view", eventId: "evt_102" }).status,
    200,
  );
  assert.equal(
    runApiExample({ ...config, scenario: "view", eventId: "evt_999" }).status,
    404,
  );
  assert.deepEqual(
    exampleRequest({ ...config, scenario: "create", title: "" }),
    { method: "POST", path: "/api/events", body: {} },
  );
  const created = runApiExample({
    ...config,
    scenario: "create",
    title: "  Study group  ",
  });
  assert.equal(created.status, 201);
  assert.deepEqual(created.body, {
    event: { id: "evt_example", title: "Study group" },
  });
  assert.equal(
    runApiExample({ ...config, scenario: "create", title: "abc" }).status,
    201,
  );
  assert.equal(
    runApiExample({ ...config, scenario: "create", title: "a".repeat(80) })
      .status,
    201,
  );
});
test("missing/invalid titles differ from an unknown resource; unsupported contracts fail closed", () => {
  const c = { ...defaultExplorerConfig(), scenario: "create" };
  for (const title of [
    undefined,
    null,
    5,
    "",
    "  ",
    "ab",
    "a".repeat(81),
    "A\nTitle",
    "A\0Title",
  ]) {
    const response = runApiExample({ ...c, title });
    assert.equal(response.status, 400);
    assert.ok(response.titleError);
    assert.ok(
      "error" in response.body && response.body.error.code === "invalid_title",
    );
  }
  assert.throws(() => runApiExample(c, "future"));
  for (const patch of [
    { scenario: "delete" },
    { eventId: "https://arbitrary.example" },
    { owner: "forged" },
  ])
    assert.throws(() => runApiExample({ ...c, ...patch }));
});
test("runs are deterministic and isolated; edits/reset clear response and cannot mutate the dataset", () => {
  const initial = initialExample();
  assert.equal(initial.response, null);
  let state = transitionExample(initial, { kind: "run" });
  assert.equal(state.response?.status, 200);
  state = transitionExample(state, {
    kind: "edit",
    config: { ...state.config, scenario: "create", title: "New club" },
  });
  assert.equal(state.response, null);
  state = transitionExample(state, { kind: "run" });
  assert.equal(state.response?.status, 201);
  assert.deepEqual(transitionExample(state, { kind: "run" }), state);
  state = transitionExample(state, {
    kind: "edit",
    config: defaultExplorerConfig(),
  });
  assert.equal(state.response, null);
  assert.deepEqual(
    transitionExample(state, { kind: "reset" }),
    initialExample(),
  );
  const response = runApiExample(defaultExplorerConfig());
  if ("events" in response.body)
    response.body.events[0].title = "Changed returned copy";
  assert.equal(exampleEvents[0].title, "Robotics meetup");
  assert.equal(exampleEvents.length, 2);
  assert.deepEqual(
    runApiExample(defaultExplorerConfig()),
    runApiExample(defaultExplorerConfig()),
  );
});
test("the teaching model performs no fetch while running or resetting every scenario", () => {
  const previous = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = () => {
    calls++;
    throw new Error("No network allowed");
  };
  try {
    for (const scenario of ["list", "view", "create"] as const) {
      const state = initialExample({ ...defaultExplorerConfig(), scenario });
      transitionExample(state, { kind: "run" });
      transitionExample(state, { kind: "reset" });
    }
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = previous;
  }
});
test("versioned API positions and questions cannot be mixed with first-lesson evidence", () => {
  const document = {
    identity: apiFoundationIdentity,
    expected: 0,
    request: randomUUID(),
    position: {
      section: "learn",
      step: 0,
      viewed: false,
      explorer: defaultExplorerConfig(),
    },
  };
  assert.ok(positionSaveSchema.safeParse(document).success);
  assert.equal(
    positionSaveSchema.safeParse({ ...document, identity: foundationIdentity })
      .success,
    false,
  );
  assert.equal(
    positionSaveSchema.safeParse({
      ...document,
      position: { section: "learn", step: 0, viewed: false },
    }).success,
    false,
  );
  assert.equal(
    positionSaveSchema.safeParse({
      ...document,
      position: {
        ...document.position,
        explorer: { ...defaultExplorerConfig(), title: "x".repeat(81) },
      },
    }).success,
    false,
  );
  for (const question of [
    "api-read-one",
    "api-create-body",
    "api-error-kind",
    "api-representation",
  ]) {
    assert.equal(
      practiceInputSchema.safeParse({
        identity: foundationIdentity,
        question,
        kind: "attempt",
        choice: "browser",
        request: randomUUID(),
      }).success,
      false,
    );
  }
  assert.equal(
    practiceInputSchema.safeParse({
      identity: apiFoundationIdentity,
      question: "initiator",
      kind: "attempt",
      choice: "browser",
      request: randomUUID(),
    }).success,
    false,
  );
  assert.equal(
    foundationStateSchema.safeParse({
      enrolled: true,
      identity: apiFoundationIdentity,
      saved: {
        revision: 1,
        savedAt: "2026-11-05T00:00:00Z",
        position: { section: "learn", step: 0, viewed: false },
      },
      evidence: [],
    }).success,
    false,
  );
});

test("public API questions carry no keys or help; strict submissions reject caller grades", () => {
  for (const question of apiQuestions) {
    assert.deepEqual(Object.keys(question).sort(), ["id", "options", "prompt"]);
    for (const option of question.options) {
      const input = {
        identity: apiFoundationIdentity,
        question: question.id,
        kind: "attempt",
        choice: option.id,
        request: randomUUID(),
      };
      assert.equal(practiceInputSchema.safeParse(input).success, true);
      assert.equal(
        practiceInputSchema.safeParse({ ...input, correct: true }).success,
        false,
      );
    }
  }
  assert.doesNotMatch(
    readFileSync("modules/system-design/foundations/api-content.ts", "utf8"),
    /correct_choice\s*:|correct:\s*(true|false)|hints:\s*\[/,
  );
});
