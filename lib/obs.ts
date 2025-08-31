// Minimal timing helper – drop-in around handlers for perf visibility.
// Addresses "no monitoring / metrics" without adding vendors yet.
// (You can wire this into Sentry later.)
export async function withTiming<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    const ms = Math.round(performance.now() - start);
    // eslint-disable-next-line no-console
    console.info(`[perf] ${label} ${ms}ms`);
  }
}
