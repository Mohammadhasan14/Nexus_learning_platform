import "server-only";

export const privacyHeaders = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};
export function privacyResponse(message: string, status: number) {
  return Response.json({ message }, { status, headers: privacyHeaders });
}
export function sameOrigin(request: Request) {
  return (
    request.headers.get("origin") ===
    `${new URL(request.url).protocol}//${request.headers.get("host")}`
  );
}
export async function privacyInput(request: Request): Promise<unknown> {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new Error("JSON required");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Body required");
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 2048) throw new Error("Input too large");
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
export function privacyMethodNotAllowed() {
  return new Response(null, {
    status: 405,
    headers: { ...privacyHeaders, Allow: "POST" },
  });
}
