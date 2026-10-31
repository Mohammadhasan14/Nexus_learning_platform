import type { Reporter, TestCase, TestResult } from "@playwright/test/reporter";
import { mkdirSync, writeFileSync } from "node:fs";
import {
  browserCase,
  browserAcceptance,
  type SafeBrowserCase,
} from "../../scripts/ci-provider-policy";

/** Emit no raw errors, stdout, attachments, titles, source, DOM or Auth state. */
export default class ProviderReporter implements Reporter {
  private cases: SafeBrowserCase[] = [];
  private runnerError = false;
  onTestEnd(test: TestCase, result: TestResult) {
    this.cases.push(
      browserCase({
        file: test.location.file,
        line: test.location.line,
        status: result.status,
        expected: test.expectedStatus,
        durationMs: result.duration,
      }),
    );
  }
  onError() {
    this.runnerError = true;
  }
  onEnd() {
    mkdirSync("test-results/provider-report", { recursive: true });
    writeFileSync(
      "test-results/provider-report/browser.json",
      JSON.stringify(
        {
          format: "studio-provider-browser-v1",
          accepted: browserAcceptance(this.cases, this.runnerError),
          runnerError: this.runnerError,
          cases: this.cases,
        },
        null,
        2,
      ),
    );
  }
}
