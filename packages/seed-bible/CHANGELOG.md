# Changelog

All notable changes to the `seed-bible` package are documented here.

## v1.5.0

- Add a build (`pnpm build`) that produces a `dist/` folder with compiled JS, `.d.ts` type declarations, and a bundled `style.css`, so the package can be consumed outside this monorepo. `exports` now point at `dist/` instead of raw `.tsx` source.
