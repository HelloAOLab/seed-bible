# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

```bash
pnpm dev           # Run in development mode (opens Chrome via Puppeteer + REPL)
pnpm test          # Run Jest test suite
pnpm test:watch    # Jest in watch mode
pnpm lint          # ESLint (includes i18n translation key validation)
pnpm lint:fix      # Auto-fix linting issues
pnpm check:ts      # TypeScript type check (non-emit)
pnpm package       # Build all packages into .aux files in dist/
pnpm format        # Prettier formatting
```

**Run a single test file:**

```bash
pnpm jest test/unit/seed-bible/managers/ChatsManager.test.ts
```

**Dev REPL commands** (available when `pnpm dev` is running):

- `.reload` — Reload Chrome to reflect local file changes
- `.system` — Open the system portal
- `.chat [message]` — Send a chat message via `@onChat` shout

## Architecture

This is a **monorepo** (pnpm workspaces) containing a Preact-based Bible reader built on top of the **CasualOS** framework. The app runs as a CasualOS "Pattern" — a bundle of bots packaged as `.aux` files.

### Core App: `packages/seed-bible/seed-bible/`

**Managers** (`managers/`) contain all business logic. Each manager is a class or module that owns a specific domain:

- `BibleDataManager` — Bible content and translation loading
- `BibleReadingManager` — Reading position and navigation
- `ChatsManager` — AI chat (providers, participants, @mentions)
- `HighlightsManager`, `BookmarksManager` — Annotations
- `SessionsManager` — Shared/multiplayer sessions
- `ThemeManager` — Dark/light mode and color schemes
- `ExtensionManager` — Extension lifecycle
- `SearchManager` — Typesense-backed search

**Components** (`components/`) are Preact functional components. State is managed with `@preact/signals` (reactive signals and computed values), not useState/useReducer.

**App entry** (`app/`) — initialization hooks, PostHog analytics bootstrap, and the main entry point that wires managers together.

**i18n** (`i18n/`) — i18next with 24 locale JSON files. Translation keys are validated at lint time by a custom ESLint rule in `script/eslint/`.

### Extensions (`packages/*-extension/`)

Extensions are separate packages that hook into the `ExtensionManager` lifecycle (`init`, `onInstJoined`, `onExtensionInstalled`). The `seed-bible-refresh-example-extension` is the reference template.

### Tests (`test/`)

- Unit tests in `test/unit/` mirror the package structure
- Integration tests in `test/integration/`
- Custom Jest environment at `test/env/CasualOSEnvironment.js` simulates the CasualOS runtime — tests use the same `os`, `thisBot`, `tags` globals as production code

### Build System

`pnpm package` runs `casualos pack-aux` (the `casualos` CLI) to bundle each package into a `.aux` file. The `script/lib/package.ts` orchestrates this. CI/CD runs: lint → check:ts → test → package → check:aux.

## Key Conventions

**JSX**: Uses Preact, not React. `jsxImportSource` is `"preact"`. Import from `"preact"` not `"react"`.

**State**: Use `@preact/signals` (`signal()`, `computed()`, `effect()`) for reactive state in both components and managers.

**Imports**: Extensive TypeScript path aliases are configured in `tsconfig.json` (e.g., `seed-bible.managers.*`). Use these rather than deep relative paths.

**CasualOS globals**: Production code uses CasualOS globals (`os`, `thisBot`, `configBot`, `tags`, `shout()`, etc.) that are injected at runtime. These are mocked in the test environment.

**Translations**: When adding or updating any translation key, update **all 24 locale files** in `packages/seed-bible/seed-bible/i18n/`. Write each locale's value in its native language — do not copy English text into non-English files. A translation is only complete when all 24 locales are updated.

**TypeScript**: Strict mode is on (`strict: true`, `noImplicitAny`, `strictNullChecks`). No `any` unless unavoidable.

**Formatting**: Prettier with 2-space indent, double quotes, trailing commas (es5). Pre-commit hook enforces this via Husky + pretty-quick.
