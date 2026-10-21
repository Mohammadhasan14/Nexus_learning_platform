import { logError } from "./record";

/** Observe backend failures without logging URLs, headers, bodies or SDK errors. */
export function observedBackendFetch(
  requestId: string,
  transport: typeof fetch = fetch,
): typeof fetch {
  return async (input, init) => {
    const started = performance.now();
    const method =
      init?.method ?? (input instanceof Request ? input.method : "GET");
    try {
      const response = await transport(input, {
        ...init,
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });
      if (response.status >= 500)
        logError({
          event: "backend.error",
          requestId,
          method,
          status: response.status,
          durationMs: performance.now() - started,
        });
      return response;
    } catch (error) {
      logError({
        event: "backend.error",
        requestId,
        method,
        durationMs: performance.now() - started,
      });
      throw error;
    }
  };
}
