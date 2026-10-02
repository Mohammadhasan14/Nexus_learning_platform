import "server-only";
import { parseTutorConfig } from "./config";

export function tutorConfig() {
  return parseTutorConfig(process.env);
}
