import "server-only";
import { headers } from "next/headers";
import { readRequestId, REQUEST_ID_HEADER } from "./record";

export async function currentRequestId() {
  return (
    readRequestId((await headers()).get(REQUEST_ID_HEADER)) ??
    crypto.randomUUID()
  );
}
