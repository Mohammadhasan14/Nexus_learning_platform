/** Pure parser for tests; environment access belongs in server-only.ts. */
export function parseTutorConfig(env: Record<string, string | undefined>) {
  if (env.TUTOR_MODE === "scripted") return { mode: "scripted" } as const;
  if (
    env.TUTOR_MODE === "live" &&
    env.APP_ENV === "local" &&
    env.LLM_FREE_TIER_ONLY === "true" &&
    env.LLM_PROVIDER === "gemini" &&
    env.LLM_API_KEY?.trim() &&
    env.LLM_MODEL &&
    /^gemini-[a-z0-9.-]{1,80}$/.test(env.LLM_MODEL)
  ) {
    return {
      mode: "live",
      provider: "gemini",
      apiKey: env.LLM_API_KEY.trim(),
      model: env.LLM_MODEL,
    } as const;
  }
  return { mode: "disabled" } as const;
}
