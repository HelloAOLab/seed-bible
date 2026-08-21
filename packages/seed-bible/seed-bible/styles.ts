// Publishes the foundation reset/utility styles as their own build entry so
// they land in the package's single bundled CSS output (see vite.config.ts's
// `cssCodeSplit: false`) even though no exported module reaches them through
// a normal import chain — `app/main.tsx` (the app's own mount point) isn't
// part of this package's public surface, but consumers still need this CSS
// loaded once, before any component's own co-located CSS.
import "./app/styles/base.css";
import "./app/styles/utilities.css";
