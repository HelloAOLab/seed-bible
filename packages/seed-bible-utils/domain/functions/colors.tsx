/**
 * Re-export shim. These colour helpers now live in the core package so it can
 * use them without depending on this extension; `scripture-map` keeps importing
 * them from here unchanged.
 *
 * Import the concrete core file, never `seed-bible`/`seed-bible/managers` — the
 * barrel pulls in SeedBibleStateManager, which reaches back into this package
 * through `virtual:@extensions`.
 */
export * from "@packages/seed-bible/seed-bible/managers/Colors";
