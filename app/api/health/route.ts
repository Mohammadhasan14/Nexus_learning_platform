import { readRequestId, REQUEST_ID_HEADER } from "@/lib/observability/record";

export const dynamic = "force-dynamic";

/** Liveness only: never touches Auth, learner data or a provider. */
export function GET(request: Request) {
  const requestId =
    readRequestId(request.headers.get(REQUEST_ID_HEADER)) ??
    crypto.randomUUID();
  return Response.json(
    { status: "ok", requestId },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        [REQUEST_ID_HEADER]: requestId,
      },
    },
  );
}

export function HEAD(request: Request) {
  const response = GET(request);
  return new Response(null, {
    status: response.status,
    headers: response.headers,
  });
}
