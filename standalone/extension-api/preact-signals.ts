// Import-map target for the bare specifier `@preact/signals`.
//
// Signals are how the app shares reactive state (see the managers under
// `packages/seed-bible/seed-bible/managers/`), so an extension that reads or
// writes any of it needs the same signals runtime — a second copy would track
// subscriptions in its own registry and never re-render the host's components.
export * from "@preact/signals";
