import type { Instrumentation } from "next";
import {
  logError,
  readRequestId,
  REQUEST_ID_HEADER,
  safeErrorDigest,
} from "./lib/observability/record";

export const onRequestError: Instrumentation.onRequestError = (
  error,
  request,
  context,
) => {
  logError({
    event: "request.error",
    // Proxy failures can precede header replacement; never trust their external ID.
    requestId:
      context.routeType === "proxy"
        ? undefined
        : readRequestId(request.headers[REQUEST_ID_HEADER]),
    method: request.method,
    phase: context.routeType,
    digest: safeErrorDigest(error),
  });
};
