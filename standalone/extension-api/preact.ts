// Import-map target for the bare specifier `preact`.
//
// Exposed because a URL-loaded extension that renders anything needs the *same*
// preact instance the host app is running. Two copies break hooks with
// "Cannot read properties of undefined (reading '__H')" — the failure the
// `resolve.dedupe` block in `vite.config.ts` already guards against for
// bundled code. Re-exporting from the app's own graph extends that guarantee to
// extensions the bundler never sees.
export * from "preact";
