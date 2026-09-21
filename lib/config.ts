export type BackendConfig = {
  url: string;
  key: string;
  environment: string;
  secureCookies: boolean;
};
type Environment = Record<string, string | undefined>;

/** Pure validation; no values from this module are exposed to the browser. */
export function readBackendConfig(env: Environment): BackendConfig | null {
  const urlValue = env.SUPABASE_URL;
  const key = env.SUPABASE_PUBLISHABLE_KEY;
  if (!urlValue && !key) return null;
  if (!urlValue || !key) throw new Error("Incomplete backend configuration");
  const environment = env.APP_ENV;
  if (
    !environment ||
    !["local", "test", "staging", "production"].includes(environment)
  )
    throw new Error("Explicit APP_ENV is required");
  if (env.SUPABASE_PROJECT_ENV !== environment)
    throw new Error("Backend environment mismatch");
  const url = new URL(urlValue);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !["", "/"].includes(url.pathname)
  )
    throw new Error("Invalid backend URL");
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (environment === "local" || environment === "test") {
    if (
      !loopback ||
      !["http:", "https:"].includes(url.protocol) ||
      env.VERCEL_ENV
    )
      throw new Error("Local backend must use loopback outside hosting");
  } else {
    const expected = env.SUPABASE_EXPECTED_PROJECT_REF;
    const production = env.SUPABASE_PRODUCTION_PROJECT_REF;
    if (
      !expected ||
      !production ||
      url.protocol !== "https:" ||
      url.hostname !== `${expected}.supabase.co` ||
      url.port
    )
      throw new Error("Hosted project identity must be explicit");
    if (environment === "staging" && expected === production)
      throw new Error("Staging cannot target production");
    if (environment === "production" && expected !== production)
      throw new Error("Production project mismatch");
    if (env.VERCEL_ENV === "preview" && environment !== "staging")
      throw new Error("Previews require staging");
    if (env.VERCEL_ENV === "production" && environment !== "production")
      throw new Error(
        "Production deployment requires production configuration",
      );
  }
  if (key.startsWith("sb_secret_"))
    throw new Error("Privileged keys are forbidden in the app");
  if (!key.startsWith("sb_publishable_")) {
    try {
      const payload = JSON.parse(
        Buffer.from(key.split(".")[1], "base64url").toString(),
      );
      if (payload.role !== "anon") throw new Error();
    } catch {
      throw new Error("Use a publishable or legacy anon key");
    }
  }
  return { url: url.origin, key, environment, secureCookies: !loopback };
}
