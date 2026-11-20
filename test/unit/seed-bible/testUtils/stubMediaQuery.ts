type MediaQueryListener = (event: { matches: boolean; media: string }) => void;

const STUB = Symbol("stubMediaQuery");
let answers = new Map<string, boolean>();
let listeners = new Map<string, Set<MediaQueryListener>>();

function installMatchMedia(): void {
  const current = (globalThis as { matchMedia?: { [STUB]?: true } }).matchMedia;
  if (current?.[STUB]) {
    return;
  }
  answers = new Map();
  listeners = new Map();
  const matchMedia = vi.fn((query: string) => ({
    media: query,
    get matches() {
      return answers.get(query) ?? false;
    },
    addEventListener: (_type: string, listener: MediaQueryListener) => {
      const forQuery = listeners.get(query) ?? new Set();
      forQuery.add(listener);
      listeners.set(query, forQuery);
    },
    removeEventListener: (_type: string, listener: MediaQueryListener) => {
      listeners.get(query)?.delete(listener);
    },
  }));
  vi.stubGlobal("matchMedia", Object.assign(matchMedia, { [STUB]: true }));
}

/**
 * Stubs `matchMedia` (which jsdom doesn't have) so `query` answers `matches`.
 * Every query answers on its own, unknown ones `false`, so stubbing the color
 * scheme doesn't also report a finger pointer. Returns a function that
 * changes the answer and fires a `change` on that query's listeners, standing
 * in for the device changing. Call `vi.unstubAllGlobals()` in an `afterEach`.
 */
export function stubMediaQuery(
  query: string,
  matches: boolean
): (matches: boolean) => void {
  installMatchMedia();
  answers.set(query, matches);
  return (next: boolean) => {
    answers.set(query, next);
    for (const listener of listeners.get(query) ?? []) {
      listener({ matches: next, media: query });
    }
  };
}
