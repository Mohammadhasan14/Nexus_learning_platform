import "server-only";
import { readBackendConfig } from "@/lib/config";
export function backendConfig() {
  return readBackendConfig(process.env);
}
export function accountsAvailable() {
  try {
    return backendConfig() !== null;
  } catch {
    return false;
  }
}
