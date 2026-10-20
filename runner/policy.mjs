/** @param {string} parentOrigin */
export function runnerHeaders(parentOrigin) {
  return {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Origin-Agent-Cluster": "?1",
    "Permissions-Policy":
      "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "Content-Security-Policy": `default-src 'none'; script-src 'self'; worker-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors ${parentOrigin}; sandbox allow-scripts allow-same-origin`,
  };
}

export const WORKER_CSP =
  "default-src 'none'; script-src 'unsafe-eval'; connect-src 'none'; worker-src 'none'; child-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
