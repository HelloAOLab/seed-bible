// Import-map target for the bare specifier `preact/jsx-runtime`.
//
// Rarely imported by hand, but an extension author who compiles their own JSX
// with the automatic runtime emits `import { jsx } from "preact/jsx-runtime"`
// without writing it, so the map has to cover it or their build's output fails
// to load.
export * from "preact/jsx-runtime";
