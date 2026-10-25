/** Stop waiting for optional code immediately; the shared chunk may still load. */
export async function abortable<T>(work: Promise<T>, signal: AbortSignal) {
  let abort = () => {};
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        abort = () => reject(signal.reason);
        if (signal.aborted) abort();
        else signal.addEventListener("abort", abort, { once: true });
      }),
    ]);
  } finally {
    signal.removeEventListener("abort", abort);
  }
}
