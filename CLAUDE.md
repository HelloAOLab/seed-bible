# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

```bash
pnpm dev               # Run the SSR dev server (Express + Vite, HMR)
pnpm test              # Run Vitest test suite
pnpm test:watch        # Vitest in watch mode
pnpm lint              # ESLint (includes i18n translation key validation)
pnpm lint:fix          # Auto-fix linting issues
pnpm check:ts          # TypeScript type check — client + patterns (non-emit)
pnpm build             # Production build (client + SSR + server bundles)
pnpm pattern pack <name>  # Package a patterns/<name> portal into .aux
pnpm format            # Prettier formatting
```

**Run a single test file:**

```bash
pnpm vitest run FreeUseBibleAPI.test.ts
```

## Architecture

This is a **monorepo** (pnpm workspaces) containing a Preact-based Bible reader. The reader is a **standalone SSR Preact PWA** that uses **CasualOS as a backend** (auth, records, file storage, Yjs real-time multiplayer) via its SDK (`@casual-simulation/*`) — it does not run as bot scripts. Only the embeddable portals in `patterns/` (e.g. `geo-importer`) ship as CasualOS `.aux` patterns, loaded in cross-origin `ao.bot` iframes.

### Core App: `packages/seed-bible/seed-bible/`

**Managers** (`managers/`) contain all business logic. Each owns one domain:

- `OsManager` — CasualOS gateway; wraps the SDK records/auth/inst clients (data, files, shared docs). Every CasualOS-touching manager receives this `os`.
- `LoginManager` — Email-code auth, sessions, and user profile
- `BibleDataManager` — Bible content and translation loading
- `BibleReadingManager` — Reading position and navigation
- `HighlightsManager`, `BookmarksManager`, `AnnotationsManager` — Annotations, persisted via CasualOS records
- `SessionsManager` — Shared/multiplayer sessions (Yjs shared documents)
- `ThemeManager` — Dark/light mode and color schemes
- `ExtensionManager` — Extension lifecycle
- `SearchManager` — Typesense-backed search

**Components** (`components/`) are Preact functional components. State is managed with `@preact/signals`, not useState/useReducer.

**App entry** (`app/`) — initialization hooks, PostHog bootstrap, and the entry point that wires managers together.

**i18n** (`i18n/`) — i18next with 24 locale JSON files. Translation keys are validated at lint time by a custom ESLint rule in `script/eslint/`.

### Extensions (`packages/*-extension/`)

Separate packages that call `registerExtension({ id, init })`; the `init(context)` generator receives the `SeedBibleState` and yields cleanup functions. `seed-bible-refresh-example-extension` is the reference template.

### Tests (`test/`)

- Unit tests in `test/unit/` mirror the package structure
- Integration tests in `test/integration/`

### Build System

The app deploys as a **web app, not a pattern**: `pnpm build` makes client + SSR + server bundles, which CI (`.github/workflows/cd.yml`) syncs to S3 for the long-running host (`server/index.ts` / `Dockerfile`). Separately, the `.aux` patterns under `patterns/` are packaged by the Vite `patternPlugin` during `pnpm build` (via `casualos pack-aux` + `minify-aux`) and uploaded to the records server when `PATTERN_SESSION_KEY` + `PATTERN_RECORD_KEY` are set.

## Key Conventions

**JSX**: Uses Preact, not React. `jsxImportSource` is `"preact"`. Import from `"preact"`.

**State**: Use `@preact/signals` (`signal()`, `computed()`, `effect()`) for reactive state in both components and managers.

**Imports**: One path alias in `tsconfig.json` — `@packages/*` → `./packages/*`. Otherwise use relative paths.

**CasualOS access**: All CasualOS access goes through the `CasualOSManager` factory (`managers/OsManager.tsx`) — the SDK clients, not injected runtime globals (`os`/`thisBot`/`configBot` exist only inside `ao.bot` portal iframes).

**Translations**: When adding or updating any translation key, update **all 24 locale files** in `packages/seed-bible/seed-bible/i18n/`, each in its native language (don't copy English into non-English files). A translation is only complete when all 24 are updated.

**TypeScript**: Strict mode is on (`strict`, `noImplicitAny`, `strictNullChecks`). No `any` unless unavoidable.

**Formatting**: Prettier with 2-space indent, double quotes, trailing commas (es5). Enforced by a Husky + pretty-quick pre-commit hook.
