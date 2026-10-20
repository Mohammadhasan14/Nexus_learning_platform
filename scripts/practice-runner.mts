/** ESM static loopback host for development and CI. Never executes submitted code. */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { runnerHeaders, WORKER_CSP } from "../runner/policy.mjs";

const args = process.argv.slice(2);
const flag = (name: string, fallback: string) => {
  const index = args.indexOf(name);
  return index < 0 ? fallback : args[index + 1];
};
const port = Number(flag("--port", "3104"));
const parent = new URL(flag("--app-origin", "http://127.0.0.1:3000"));
if (
  !Number.isInteger(port) ||
  port < 1024 ||
  port > 65535 ||
  !["localhost", "127.0.0.1", "[::1]"].includes(parent.hostname) ||
  parent.protocol !== "http:" ||
  parent.href !== `${parent.origin}/`
)
  throw new Error("Use a loopback HTTP app origin and an unprivileged port.");

const assets = new Map<string, Buffer>(
  await Promise.all(
    ["frame.html", "frame.js", "worker.js", "protocol.mjs"].map(
      async (name) =>
        [
          `/${name}`,
          await readFile(new URL(`../runner/${name}`, import.meta.url)),
        ] as const,
    ),
  ),
);
createServer((request, response) => {
  const path = new URL(request.url ?? "/", "http://localhost").pathname;
  const asset = assets.get(path);
  response.writeHead(
    asset && ["GET", "HEAD"].includes(request.method ?? "") ? 200 : 404,
    {
      ...runnerHeaders(parent.origin),
      "Content-Type": path.endsWith(".html")
        ? "text/html; charset=utf-8"
        : "text/javascript; charset=utf-8",
      ...(path === "/worker.js"
        ? { "Content-Security-Policy": WORKER_CSP }
        : {}),
    },
  );
  response.end(request.method === "HEAD" ? undefined : (asset ?? "Not found"));
}).listen(port, "127.0.0.1", () => {
  console.log(
    `Practice runner: http://localhost:${port}/frame.html; allowed app: ${parent.origin}`,
  );
});
