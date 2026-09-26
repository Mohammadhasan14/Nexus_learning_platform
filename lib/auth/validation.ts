import { z } from "zod";

export const credentialsSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(254),
  password: z
    .string()
    .min(1, "Enter your password.")
    .max(128, "Use at most 128 characters."),
});
export const registrationSchema = credentialsSchema.extend({
  password: z
    .string()
    .min(12, "Use at least 12 characters.")
    .max(128, "Use at most 128 characters."),
});

// An allowlist avoids external URLs, scheme-relative URLs and encoded redirect tricks.
export function safeDestination(
  value: unknown,
):
  | "/dashboard"
  | "/settings"
  | "/onboarding"
  | "/courses"
  | "/reviews"
  | "/projects" {
  return value === "/settings" ||
    value === "/onboarding" ||
    value === "/courses" ||
    value === "/reviews" ||
    value === "/projects"
    ? value
    : "/dashboard";
}

export type ActionState = {
  message?: string;
  errors?: Record<string, string[] | undefined>;
  values?: Record<string, string>;
  success?: boolean;
};
