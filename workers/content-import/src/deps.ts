/** What the worker takes from its surroundings, so tests can supply their own. */
export interface WorkerDeps {
  /** Reaches CasualOS and Common Crawl. */
  fetch: typeof fetch;
  now: () => number;
  sleep: (ms: number) => Promise<void>;
}

export const defaultDeps: WorkerDeps = {
  fetch: (...args) => fetch(...args),
  now: () => Date.now(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};
