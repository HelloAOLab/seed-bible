/**
 * Pins `matchMedia("(prefers-color-scheme: dark)")` to `dark` and returns a
 * function that fires a change on every listener, standing in for the viewer
 * flipping their device between light and dark. Call `vi.unstubAllGlobals()`
 * in an `afterEach`.
 */
export function stubColorScheme(dark: boolean): (matches: boolean) => void {
  const listeners: Array<(event: { matches: boolean }) => void> = [];
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: dark,
      addEventListener: (
        _: string,
        cb: (event: { matches: boolean }) => void
      ) => listeners.push(cb),
      removeEventListener: () => {},
    }))
  );
  return (matches: boolean) => {
    for (const cb of listeners) cb({ matches });
  };
}
