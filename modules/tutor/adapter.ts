import { z } from "zod";

export const tutorInput = z
  .object({
    lesson: z
      .string()
      .regex(/^[a-z0-9-]+$/)
      .max(100),
    request: z.string().uuid(),
    intent: z.enum(["hint", "explain", "example", "reflect"]),
  })
  .strict();
export type TutorIntent = z.infer<typeof tutorInput>["intent"];
export type TutorContext = {
  lesson: string;
  course: string;
  title: string;
  reviewed: boolean;
};
export type TutorReply = {
  text: string;
  source?: { title: string; href: string };
  adapter: string;
};
export interface TutorAdapter {
  respond(context: TutorContext, intent: TutorIntent): Promise<TutorReply>;
}
export const adapterVersion = "scripted-foundations-1";
const scripts: Record<string, Record<TutorIntent, string>> = {
  "js-v2-values": {
    hint: "Trace each assignment in order. Write down the current value before moving to the next line; quotation marks matter when identifying a value’s type.",
    explain:
      "A binding gives a value a name. A let binding can be assigned a new value. Numeric text inside quotes is a string, even when its characters look like digits. typeof describes the value’s type.",
    example:
      "Try a different example: let apples = 4; apples = apples + 3; The new value is 7. Explain which value the right-hand side reads before the assignment happens.",
    reflect:
      "Where did your value come from: the original assignment or the latest assignment? Explain that step before checking your practice answer. I cannot assess free-form reasoning in this scripted mode.",
  },
  "js-v2-conditions": {
    hint: "Evaluate the condition first, then trace only the chosen branch. For strict equality, check both the type and the value.",
    explain:
      "An if/else selects a branch from a condition. Strict equality (===) compares without converting different types; assignment (=) changes a binding. Keep those operations separate.",
    example:
      'Try a different condition: if (8 > 4) { console.log("Warm up"); } else { console.log("Rest"); } It logs Warm up because 8 is greater than 4. Which branch would a false condition select?',
    reflect:
      "State the condition’s result before naming a branch. If you are comparing values, state their types too. I cannot assess free-form reasoning in this scripted mode.",
  },
  "js-v2-functions": {
    hint: "Follow the argument into the parameter, then find the return statement. Displaying something in the console and returning a value are different operations.",
    explain:
      "A function receives arguments through parameters. return sends a value back to its caller. An ordinary function that reaches its end without returning a value returns undefined; console output is a separate side effect.",
    example:
      "Try a different function: function double(n) { return n * 2; } double(6) returns 12. Which expression supplies the value to the caller?",
    reflect:
      "Point to the return statement and describe the value it sends to the caller. If you only found a log, revisit the distinction between output and a returned value. I cannot assess free-form reasoning in this scripted mode.",
  },
};
export const scriptedTutor: TutorAdapter = {
  async respond(context, intent) {
    const script =
      context.reviewed && context.course === "javascript-foundations-v2"
        ? scripts[context.lesson]
        : undefined;
    if (!script)
      return {
        text: "I do not have reviewed guidance for this lesson. Continue with its lesson text and practice feedback.",
        adapter: adapterVersion,
      };
    return {
      text: script[intent],
      source: {
        title: context.title,
        href: `/courses/${context.course}/${context.lesson}`,
      },
      adapter: adapterVersion,
    };
  },
};

/** Bound provider work without automatic retries; live providers must also abort their I/O. */
export async function respondWithFallback(
  adapter: TutorAdapter,
  context: TutorContext,
  intent: TutorIntent,
  timeoutMs = 3000,
): Promise<TutorReply> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      adapter.respond(context, intent),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Tutor timeout")), timeoutMs);
      }),
    ]);
  } catch {
    return {
      text: "The tutor is unavailable. Your lesson, example and practice feedback are still available. Try again later.",
      adapter: "offline-fallback-1",
    };
  } finally {
    clearTimeout(timer);
  }
}
