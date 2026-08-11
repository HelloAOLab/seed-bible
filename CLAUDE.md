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

Unit tests in `test/unit/` mirror the package structure; integration tests live in `test/integration/`. Test real-world behavior, not implementation details:

- Assert on observable behavior (rendered output, returned data, persisted state, emitted events), not internals like whether a helper was called.
- Mock only at the real boundary — `OsManager`/CasualOS SDK calls — not sibling managers or internal helpers; mocking deeper just verifies your mocks agree with each other.
- Don't test the framework — that a signal updates or a component re-renders is Preact's job; test what your code does with that state.
- Cover error paths and edge cases, not just the happy path — a failed record call, an empty result, a signed-out user are where the real bugs hide.
- Keep tests independent: no shared mutable fixtures, no dependence on run order.
- Avoid fixed-duration sleeps for async work (a debounce, a fetch) — poll a condition with a timeout instead, as the `waitForCondition` helpers in several manager tests already do. A zero-delay flush of the microtask queue is fine; a hardcoded "wait 250ms and hope" is not.
- Regression tests must fail on the pre-fix code — revert the fix locally, confirm red, then restore it. A regression test that passes either way isn't testing anything.

### Build System

The app deploys as a **web app, not a pattern**: `pnpm build` makes client + SSR + server bundles, which CI (`.github/workflows/cd.yml`) syncs to S3 for the long-running host (`server/index.ts` / `Dockerfile`). Separately, the `.aux` patterns under `patterns/` are packaged by the Vite `patternPlugin` during `pnpm build` (via `casualos pack-aux` + `minify-aux`) and uploaded to the records server when `PATTERN_SESSION_KEY` + `PATTERN_RECORD_KEY` are set.

## Key Conventions

**JSX**: Uses Preact, not React. `jsxImportSource` is `"preact"`. Import from `"preact"`.

**State**: Use `@preact/signals` (`signal()`, `computed()`, `effect()`) for reactive state in both components and managers.

**Imports**: One path alias in `tsconfig.json` — `@packages/*` → `./packages/*`. Otherwise use relative paths.

**CasualOS access**: All CasualOS access goes through the `CasualOSManager` factory (`managers/OsManager.tsx`) — the SDK clients, not injected runtime globals (`os`/`thisBot`/`configBot` exist only inside `ao.bot` portal iframes).

**Translations**: When adding or updating any translation key, **only update en.json** in `packages/seed-bible/seed-bible/i18n/`, don't update other translation files, leave those for the professionals.

**TypeScript**: Strict mode is on (`strict`, `noImplicitAny`, `strictNullChecks`). No `any` unless unavoidable.

**Comments**: Only add comments when the _why_ or _how_ isn't obvious from the code itself (a non-obvious constraint, a workaround, a subtle invariant). Don't restate what the code already shows, and don't narrate the change or task that produced it (that belongs in the commit message or PR description, not the file).

**Duplication**: Before writing new logic, do a quick grep for an existing helper in the same manager/component or obvious nearby domain — reuse or extend a close match rather than writing a parallel version. Keep the check light (a grep or two, not an audit); if nothing turns up, write the new code. Once the same logic lands in a third file, extract a shared helper — copies drift, and fixes reach some but not others. But only extract real shared concepts: code that's merely similar is better left duplicated than forced into one abstraction.

**Formatting**: Prettier with 2-space indent, double quotes, trailing commas (es5). Enforced by a Husky + pretty-quick pre-commit hook.

**Theming**: `managers/ThemeManager.tsx` (`LIGHT_THEME`/`DARK_THEME`) duplicates many of the same `--sb-*` CSS variables as `app/main.css`'s `:root` block, and `ThemeManager`'s values silently win (it's injected `body`-scoped, which beats an inherited `:root` value). When editing a `--sb-*` value in `main.css`, grep `ThemeManager.tsx` for it and update both, or the CSS change won't render.
