// Import-map target for the bare specifier `seed-bible`.
//
// See `script/lib/importMap.ts` for why these shims exist: an extension loaded
// from a URL is imported by the *browser*, which cannot resolve bare specifiers
// on its own. Each shim is an entry point, so it gets a URL of its own that the
// page's import map can point at.
//
// Imported through the `@packages/*` alias rather than the bare `seed-bible`
// name on purpose: the repo root's own package.json is *also* named
// `seed-bible` and does not depend on the workspace package, so the bare name
// does not resolve from files outside `packages/`. Re-exporting (rather than
// re-implementing) is what keeps the extension and the host app on one shared
// copy of every module.
export * from "@packages/seed-bible/seed-bible/app/api";
