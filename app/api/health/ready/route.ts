import { ready } from "@/lib/observability/health";
import {
  logError,
  readRequestId,
  REQUEST_ID_HEADER,
} from "@/lib/observability/record";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId =
    readRequestId(request.headers.get(REQUEST_ID_HEADER)) ??
    crypto.randomUUID();
  const started = performance.now();
  const healthy = await ready(process.env);
  if (!healthy)
    logError({
      event: "health.not_ready",
      requestId,
      method: request.method,
      phase: "route",
      status: 503,
      durationMs: performance.now() - started,
    });
  return Response.json(
    { status: healthy ? "ready" : "unavailable", requestId },
    {
      status: healthy ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        [REQUEST_ID_HEADER]: requestId,
      },
    },
  );
}

export async function HEAD(request: Request) {
  const response = await GET(request);
  return new Response(null, {
    status: response.status,
    headers: response.headers,
  });
}
