# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Communication Style

Write explanations to be understood on the first read. The reader may not have the code in front of them.

- **Plain language over jargon.** When a technical term is unavoidable, explain it in everyday words right after.
- **Lead with the short answer**, then the detail. Don't make the reader assemble the conclusion from scattered pieces.
- **Use concrete before/after.** To explain a change in behavior, describe what happened _before_ and what happens _now_, with a real example ("books used to enter one by one; now they enter all at once").
- **Explain the _why_, not just the _what_.** If something couldn't be done, say plainly what blocked it.
- **Avoid over-compression.** A few clear sentences beat one dense sentence packed with terms. Don't sacrifice clarity to be brief.
- **Don't bury trade-offs.** When presenting options, make the consequence of each one obvious.

This applies to all prose responses — summaries, explanations, and trade-off discussions — not to code itself.

## Project Overview

**Seed Bible** is a collaborative, web-based Bible study and visualization platform built on top of [CasualOS](https://github.com/casual-simulation/casualos) — a distributed runtime that manages bots, state, and real-time collaboration. The app compiles into `.aux` files (CasualOS's binary script format) and runs inside a CasualOS simulation.

## Package Manager

This project requires **pnpm v10+**. Do not use npm or yarn.

### Dev REPL commands (after `pnpm dev`)

```bash
.save [name]     Save simulation state to filesystem
.reload          Hot reload from disk
.system          Open system portal
.download        Download .aux file
run(script)      Execute an AUX script in the simulation
shout(name, arg) Trigger a shout event
```

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
>>>>>>> develop
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

Separate packages that `export default` a function which, when called, calls `registerExtension({ id, init })`; the `init(context)` generator receives the `SeedBibleState` and yields cleanup functions. `ExtensionManager` invokes the default export on every install attempt (not just once at module load), which is what allows an extension to be uninstalled and reinstalled within the same session. `seed-bible-refresh-example-extension` is the reference template.

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

**Translations**: When adding or updating any translation key, **only update en.json** in `packages/seed-bible/seed-bible/i18n/`, don't update other translation files, leave those for the professionals.

**TypeScript**: Strict mode is on (`strict`, `noImplicitAny`, `strictNullChecks`). No `any` unless unavoidable.

**Formatting**: Prettier with 2-space indent, double quotes, trailing commas (es5). Enforced by a Husky + pretty-quick pre-commit hook.

**Theming**: `managers/ThemeManager.tsx` (`LIGHT_THEME`/`DARK_THEME`) duplicates many of the same `--sb-*` CSS variables as `app/main.css`'s `:root` block, and `ThemeManager`'s values silently win (it's injected `body`-scoped, which beats an inherited `:root` value). When editing a `--sb-*` value in `main.css`, grep `ThemeManager.tsx` for it and update both, or the CSS change won't render.
