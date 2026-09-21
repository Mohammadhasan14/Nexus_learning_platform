import { z } from "zod";

export const locales = {
  en: "English",
  "en-IN": "English (India)",
  "en-US": "English (United States)",
  "en-GB": "English (United Kingdom)",
} as const;
export function isTimezone(value: string) {
  if (value !== "UTC" && !value.includes("/")) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}
export const profileSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(1, "Enter your name.")
    .max(60, "Use at most 60 characters."),
  goal: z
    .string()
    .trim()
    .min(10, "Describe your goal in at least 10 characters.")
    .max(500, "Use at most 500 characters."),
  daily_minutes: z.coerce
    .number()
    .int()
    .min(5)
    .max(240)
    .multipleOf(5, "Choose a multiple of 5 minutes."),
  locale: z.enum(["en", "en-IN", "en-US", "en-GB"]),
  timezone: z
    .string()
    .max(100)
    .refine(isTimezone, "Choose a valid IANA timezone, such as Asia/Kolkata."),
});
