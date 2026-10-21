import { readBackendConfig } from "../config";
export const HEALTH_TIMEOUT_MS = 2_000;

/** Read-only Auth reachability probe. No user session, database rows or AI calls. */
export async function ready(
  env: Record<string, string | undefined>,
  transport: typeof fetch = fetch,
): Promise<boolean> {
  try {
    const backend = readBackendConfig(env);
    if (!backend) return false;
    const response = await transport(`${backend.url}/auth/v1/health`, {
      method: "GET",
      headers: { apikey: backend.key },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    });
    // Never parse or return provider health payloads (which can disclose versions/config).
    const healthy = response.status === 200;
    await response.body?.cancel();
    return healthy;
  } catch {
    return false;
  }
}
