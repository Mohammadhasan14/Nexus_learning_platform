import {
  foundationIdentity,
  lessonTitle,
  definitions,
  questions,
  plannedLessons,
} from "./content";
import {
  apiFoundationIdentity,
  apiLessonTitle,
  apiDefinitions,
  apiQuestions,
} from "./api-content";
export type PublicQuestion = {
  readonly id: string;
  readonly prompt: string;
  readonly options: readonly { readonly id: string; readonly text: string }[];
};
export const foundationLessons = [
  {
    identity: foundationIdentity,
    title: lessonTitle,
    definitions,
    questions,
    number: 1,
  },
  {
    identity: apiFoundationIdentity,
    title: apiLessonTitle,
    definitions: apiDefinitions,
    questions: apiQuestions,
    number: 2,
  },
] as const;
export const remainingFoundationLessons = plannedLessons.slice(1);
export function getFoundationLesson(lesson: string) {
  const item = foundationLessons.find((l) => l.identity.lesson === lesson);
  if (!item) throw new Error("Unsupported foundation lesson");
  return item;
}
