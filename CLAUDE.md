# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Seed Bible** is a collaborative, web-based Bible study and visualization platform built on top of [CasualOS](https://github.com/casual-simulation/casualos) — a distributed runtime that manages bots, state, and real-time collaboration. The app compiles into `.aux` files (CasualOS's binary script format) and runs inside a CasualOS simulation.

## Package Manager

This project requires **pnpm v10+**. Do not use npm or yarn.

## Common Commands

```bash
pnpm dev            # Start dev server (Puppeteer Chrome + interactive REPL)
pnpm build          # Bundle with esbuild
pnpm package        # Pack all packages into .aux files via casualos CLI
pnpm test           # Run Jest tests
pnpm test:watch     # Jest in watch mode
pnpm lint           # ESLint check
pnpm lint:fix       # Auto-fix ESLint issues
pnpm check:ts       # TypeScript check (tsc-silent)
pnpm check:aux      # Validate .aux files
pnpm format         # Prettier format all files
pnpm format:changed # Format only staged files (runs automatically pre-commit via Husky)
```

### Running a single test

```bash
pnpm test -- --testPathPattern="<filename>"
```

### Dev REPL commands (after `pnpm dev`)

```
.save [name]     Save simulation state to filesystem
.reload          Hot reload from disk
.system          Open system portal
.download        Download .aux file
run(script)      Execute an AUX script in the simulation
shout(name, arg) Trigger a shout event
```

## Architecture

This is **not a traditional npm monorepo**. Packages under `packages/` do not have their own `package.json`. All dependencies and scripts are managed from the root `package.json`. Each package compiles to an `.aux` file (CasualOS format) via the `casualos pack-aux` CLI.

### Layer Model (top → bottom)

```
User Interface (React / TSX components)
    ↓
Application Layer (React hooks — primary dev surface)
    ↓
Service Layer (Bible data, Canvas, managers)
    ↓
CasualOS Runtime (bot system, state, collaboration)
    ↓
Browser APIs (WebGL, IndexedDB, WebRTC)
```

Data flows unidirectionally: **User Action → Hook → Manager → Service → State → Re-render**. All state is accessed through React hooks. Avoid reaching into managers or services directly from components.

### Key Packages

| Package                                 | Role                                                                       |
| --------------------------------------- | -------------------------------------------------------------------------- |
| `seed-bible`                            | Core app — hooks, components, managers, DB layer, AI features              |
| `Tabernacle`                            | Tabernacle 3D visualization (uses `MeshState` enum for visibility control) |
| `Scripture Map 2D` / `Scripture Map 3D` | Geospatial Bible mapping                                                   |
| `Bible Visualization Utils`             | Shared config providers and pooling utilities                              |
| `Bible Stack`                           | Layered stacking view                                                      |
| `Assistant`                             | AI voice assistant extension                                               |
| `Playlist`                              | Media playlist tied to Scripture passages                                  |
| `Object Pooler`                         | Reusable object pool utility                                               |

Architecture docs live in `packages/seed-bible/app/`:

- `ARCHITECTURE.md` — deep technical overview
- `EXTENSION_DEVELOPMENT_GUIDE.md` — how to build new extensions
- `API_REFERENCE.md` — hook and service API reference
- `GETTING_STARTED.md` — first-time setup

### Extension Format

Each package under `packages/` has an `extension.json` describing its name, version, author, dependencies, and status. Extensions register themselves via CasualOS bot tags (e.g., `aiApps.voiceAssistant`). The `pnpm package` command packs all extensions using the `casualos pack-aux` CLI.

### TypeScript Path Aliases

`@packages/*` resolves to `/packages/*` (configured in both `tsconfig.json` and `jest.config.cjs`).

## Testing

- Framework: **Jest** with Babel transpilation
- Tests live in `test/e2e/` (Puppeteer-based, runs against the live CasualOS frame) and `test/unit/`
- Test timeout is 60 seconds (E2E tests launch a real browser)
- E2E tests access the simulation via `window.aux.getApp()`

## Build Pipeline

The `script/` directory contains all build/dev automation in TypeScript (run via `tsx`):

- `script/build.ts` — esbuild orchestration (target: ES2022, ESM output)
- `script/dev.ts` — Puppeteer dev server + REPL
- `script/package.ts` — packs packages into `.aux` via casualos CLI
- `script/lib/` — shared utilities (browser automation, package helpers, records API)

## CI/CD

- **CI** (`.github/workflows/ci.yml`): lint → tsc → test → package → validate `.aux` → upload artifacts; triggered on push/PR
- **CD** (`.github/workflows/cd.yml`): same pipeline + publishes extensions/patterns to the AO record system; triggered on `releases/**` and `develop` branches
