// Test-time stand-in for the "seed-bible" specifier — aliased in here (see
// vitest.config.ts) purely so Vite's resolver has *something* to resolve to;
// real tests override its behavior with `vi.mock("seed-bible", ...)` (see
// src/init.test.tsx), which needs the specifier to already be resolvable
// before it can intercept it. There's no real "seed-bible" npm package to
// depend on instead — see docs/developer-guide.md in the seed-bible repo.
export function registerExtension(): () => void {
  return () => {};
}

export function unregisterExtension(): boolean {
  return false;
}
