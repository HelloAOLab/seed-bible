// Import-map target for the bare specifier `preact/compat`.
// See `standalone/extension-api/preact.ts` for why the instance must be shared.
//
// `preact/compat` declares its types with `export =` (the CommonJS form), and
// TypeScript refuses to spread those with `export *` — even though the module
// Vite actually bundles is ordinary ESM with the named exports this needs to
// forward. The suppression is on the type checker only; the emitted re-export
// is correct.
//
// The default export is listed separately because `export *` never forwards a
// default, and `preact/compat` has one — the React-compatible namespace object
// that `import React from "preact/compat"` resolves to.
// @ts-expect-error -- see above: `export =` types, ESM runtime.
export * from "preact/compat";
export { default } from "preact/compat";
