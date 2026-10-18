export const guidanceTextPolicyVersion = "canonical-uncertainty-1";
export const insufficientGuidance =
  "The reviewed lesson does not provide enough information. Continue with the available lesson text and practice feedback.";

/** Complete only the exact known uncertainty sentence; never rewrite other model text. */
export function completeGuidanceText(text: string): string {
  const trimmed = text.trim();
  return trimmed === "The reviewed lesson does not provide enough information."
    ? insufficientGuidance
    : trimmed;
}
