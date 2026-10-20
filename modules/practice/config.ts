const local = (url: URL) =>
  ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);

/** Validate before serializing server configuration into client props. */
export function configuredRunnerOrigin(
  value: string | undefined,
): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/" ||
      (url.protocol !== "https:" && !(url.protocol === "http:" && local(url)))
    )
      return undefined;
    return url.origin;
  } catch {
    return undefined;
  }
}

/** Verify origin separation again against the browser's actual app origin. */
export function runnerOrigin(
  value: string | undefined,
  appOrigin: string,
): string | null {
  const configured = configuredRunnerOrigin(value);
  if (!configured) return null;
  try {
    const runner = new URL(configured);
    const app = new URL(appOrigin);
    if (
      runner.hostname === app.hostname ||
      runner.hostname.endsWith(`.${app.hostname}`) ||
      app.hostname.endsWith(`.${runner.hostname}`) ||
      (runner.protocol !== "https:" &&
        !(runner.protocol === "http:" && local(runner) && local(app))) ||
      (local(runner) && !local(app))
    )
      return null;
    return runner.origin;
  } catch {
    return null;
  }
}
