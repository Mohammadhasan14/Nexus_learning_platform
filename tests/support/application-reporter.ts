import type { Reporter, TestCase, TestResult } from "@playwright/test/reporter";
import { mkdirSync, writeFileSync } from "node:fs";
import {
  browserCase,
  failureDetails,
  type SafeBrowserCase,
} from "../../scripts/ci-provider-policy";

/** Fixed diagnostic fields only; exclude titles, errors, DOM, attachments and Auth state. */
export default class ApplicationReporter implements Reporter {
  private cases: (SafeBrowserCase & {
    failure?: ReturnType<typeof failureDetails>;
  })[] = [];
  private runnerError = false;
  onTestEnd(test: TestCase, result: TestResult) {
    this.cases.push({
      ...browserCase({
        file: test.location.file,
        line: test.location.line,
        status: result.status,
        expected: test.expectedStatus,
        durationMs: result.duration,
      }),
      ...(result.status === "failed" || result.status === "timedOut"
        ? { failure: failureDetails(result.errors, test.location.file) }
        : {}),
    });
  }
  onError() {
    this.runnerError = true;
  }
  onEnd() {
    const suite = process.env.APPLICATION_BROWSER_SUITE;
    if (suite !== "flows" && suite !== "performance")
      throw new Error("Choose an allowlisted application browser suite.");
    mkdirSync("test-results/application-report", { recursive: true });
    writeFileSync(
      `test-results/application-report/${suite}.json`,
      JSON.stringify(
        {
          format: "application-browser-v1",
          suite,
          runnerError: this.runnerError,
          cases: this.cases,
        },
        null,
        2,
      ),
    );
  }
}
