/** What the worker takes from its surroundings, so tests can supply their own. */
export interface WorkerDeps {
  /** Reaches CasualOS. */
  fetch: typeof fetch;
  now: () => number;
}

export const defaultDeps: WorkerDeps = {
  fetch: (...args) => fetch(...args),
  now: () => Date.now(),
};
