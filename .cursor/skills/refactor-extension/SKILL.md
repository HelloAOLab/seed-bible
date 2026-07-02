---
name: refactor-extension
description: >-
  Refactor obsolete extension code into components, managers (signals),
  hooks, contexts, and interfaces with folder.folder.file imports. Use when
  the user asks to refactor an extension, split monolithic TSX, migrate
  obsolete code to packages/, or mentions the extension refactor architecture.
  Register dot-path imports in tsconfig paths, add per-folder .bot.aux files,
  and use named exports only (no default export).
---

# Extension Refactor

Migrate monolithic files (usually under `obsolete/`) into a layered layout under `packages/{extension-package}/`.

## Target package (Discovery / Playlist)

```
packages/discover-extension/ext_discover/
```

- **Package folder:** `packages/discover-extension/`
- **Extension root:** `ext_discover/`
- **Import prefix:** `ext_discover` (e.g. `ext_discover.managers.PlaylistShellManager`)
- **Source (obsolete):** `obsolete/Playlist/playlist/playlistMode/`

Do **not** create a separate `packages/Playlist/` tree or `playlist.Playlist` import prefix for this migration.

## Target layout

```
packages/discover-extension/ext_discover/
├── interfaces/     # Type contracts — every manager, context, component has one
│   ├── managers/
│   ├── contexts/
│   └── components/
├── managers/       # Signal-based state factories (createXManager)
├── hooks/          # Pure functions (converters, formatters, parsers)
├── contexts/       # Thin providers exposing managers to the React tree
├── components/     # TSX markup only
├── css/            # Stylesheets exported as strings (e.g. linkingCss) for <style>{…}</style>
└── models/         # Domain data types, enums, constants (no React)
```

## Layer rules

| Layer          | Contains                                                               | Must NOT contain                                                      |
| -------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------- |
| **interfaces** | `interface` / `type` contracts for managers, contexts, component props | Implementation, signals, JSX, side effects                            |
| **managers**   | `create{Name}Manager()`, `signal`, `effect`, handlers, API calls       | JSX; interface definitions (import from interfaces/)                  |
| **hooks**      | Pure functions (`convertX`, `formatY`, `parseZ`)                       | React hooks, JSX, signals, component state                            |
| **contexts**   | `createContext`, Provider, `useXContext`                               | Heavy logic (delegate to manager)                                     |
| **components** | JSX, layout, styling; reads manager signals via `.value` from props    | `useState`, `useEffect`, `useLayoutEffect`, business logic, API calls |
| **models**     | Domain shapes (`PlaylistItem`, `ChapterKey`), enums                    | React, signals, side effects                                          |

### Every artifact has an interface

Before implementing, define the public contract in `interfaces/`:

| Artifact        | Interface file                          | Interface name      |
| --------------- | --------------------------------------- | ------------------- |
| Manager         | `interfaces/managers/{Name}Manager.tsx` | `{Name}Manager`     |
| Context         | `interfaces/contexts/{Name}Context.tsx` | `{Name}ContextType` |
| Component props | `interfaces/components/{Name}.tsx`      | `{Name}Props`       |

Reference: `packages/seed-bible/seed-bible/managers/BibleDataManager.tsx` (implementation pattern; interface moves to `interfaces/`).

### Manager pattern — signals only

Managers use `@preact/signals`. No `useState` / `useEffect` in managers.

```tsx
// interfaces/managers/PlaylistManager.tsx
import type { Signal } from "@preact/signals";
import type { PlaylistItem } from "ext_discover.models.playlist";

export interface PlaylistManager {
  items: Signal<PlaylistItem[]>;
  isCreating: Signal<boolean>;
  addItem: (item: PlaylistItem) => void;
  setCreating: (value: boolean) => void;
}
```

```tsx
// managers/PlaylistManager.tsx
import { signal } from "@preact/signals";
import type { PlaylistManager } from "ext_discover.interfaces.managers.PlaylistManager";
import type { PlaylistItem } from "ext_discover.models.playlist";

export function createPlaylistManager(): PlaylistManager {
  const items = signal<PlaylistItem[]>([]);
  const isCreating = signal(false);

  const addItem = (item: PlaylistItem) => {
    items.value = [...items.value, item];
  };

  const setCreating = (value: boolean) => {
    isCreating.value = value;
  };

  return { items, isCreating, addItem, setCreating };
}
```

Rules:

- State fields on the interface are `Signal<T>` or `ReadonlySignal<T>`
- Factory is always `create{Name}Manager(...deps?)` returning `{Name}Manager`
- Side effects use `effect()` from `@preact/signals`, not React `useEffect`
- Mutate via `.value =`; never mutate signal contents in place without reassignment

### Context + manager split

Each shared domain gets three files:

1. `interfaces/contexts/{Name}Context.tsx` — `{Name}ContextType` (often mirrors or subsets manager)
2. `managers/{Name}Manager.tsx` — `create{Name}Manager()`
3. `contexts/{Name}Context.tsx` — thin Provider + `use{Name}Context`

```tsx
// contexts/PlaylistContext.tsx
import { createContext, useContext } from "preact/compat"; // or os.appHooks
import type { PlaylistContextType } from "ext_discover.interfaces.contexts.PlaylistContext";
import { createPlaylistManager } from "ext_discover.managers.PlaylistManager";

const PlaylistContext = createContext<PlaylistContextType | undefined>(
  undefined
);

export function PlaylistProvider({ children }) {
  const manager = createPlaylistManager();
  return (
    <PlaylistContext.Provider value={manager}>
      {children}
    </PlaylistContext.Provider>
  );
}

export function usePlaylistContext(): PlaylistContextType {
  const ctx = useContext(PlaylistContext);
  if (!ctx)
    throw new Error("usePlaylistContext must be used within PlaylistProvider");
  return ctx;
}
```

### Component-local vs shared state

| Scope                        | Destination                                                |
| ---------------------------- | ---------------------------------------------------------- |
| Used by one component        | `interfaces/managers/` + `managers/{Component}Manager.tsx` |
| Passed through 2+ components | `interfaces/contexts/` + `managers/` + `contexts/`         |
| Stateless transform          | `hooks/{functionName}.tsx`                                 |
| Domain data shape            | `models/{domain}.tsx`                                      |

### Components read signals

Components read signals via `.value` from **manager props** (same pattern as `BelowReaderToolbar` receiving `toolsManager`, `readingState`, etc.):

```tsx
// components/PlaylistUI.tsx
export function PlaylistUI({ shell, edit, annotation, groups, ... }: PlaylistUIProps) {
  if (shell.stopPlaylistModal.value) { /* ... */ }
  shell.setTab("discover");
}
```

### Child component imports (not bot dynamic loading)

Child components are **direct dot-path imports** once migrated — same style as seed-bible:

```tsx
import type { BibleReadingSession } from "seed-bible.managers.SessionsManager";
import { Discover } from "ext_discover.components.Discover";
```

**Do not** load child UI via `getBot(...)` + `await playlistBot.Discover()` / `thisBot.X()` in managers or app bootstrap. That is legacy obsolete-bot wiring only.

In `PlaylistAppManager` (or parent app manager), declare future imports **commented out** until each component file exists under `ext_discover/components/`:

```tsx
// Future direct imports — uncomment as each component is migrated:
// import { Discover } from "ext_discover.components.Discover";
// import { CreatePlaylistUI } from "ext_discover.components.CreatePlaylistUI";

// childComponents.value = {
//   Discover,
//   CreatePlaylistUI,
//   ...
// };
```

**Until a component is migrated, leave its import and wiring commented out.** Do not register tsconfig paths, do not reference it in JSX, and do not use bot fallbacks for that slot. Migrate one child component per iteration; uncomment only after the file exists and is verified.

Legacy bot loading (`getBot("system", "playlist.playlistMode")`, `Promise.all([ playlistBot.RenderIcon(), ... ])`) may remain **commented** in the app manager as reference — remove entirely once all children are direct imports.

Imports use dot-separated paths: `{extensionRoot}.{folder}.{subfolder}.{FileName}`

```tsx
import type { PlaylistManager } from "ext_discover.interfaces.managers.PlaylistManager";
import { createPlaylistManager } from "ext_discover.managers.PlaylistManager";
import { getSortedDateFormats } from "ext_discover.hooks.getSortedDateFormats";
import { ScriptureMap2DWrapper } from "scriptureMap2D.components.containers.ScriptureMap2DWrapper";
```

Rules:

- No file extension in import
- Path mirrors folder structure under `{extensionRoot}/`
- Subfolders add another segment (`interfaces.managers`, `components.containers`)
- Prefer `import type` for interface-only imports

### Custom import registration (`tsconfig.json`)

When code imports via a dot-path alias (e.g. `ext_discover.app.bootstrap`), register that alias in `tsconfig.json` → `compilerOptions.paths`.

Pattern:

```json
"ext_discover.app.bootstrap": [
  "./packages/discover-extension/ext_discover/app/bootstrap.tsx"
]
```

Rules:

- Key = full import path (no file extension): `{extensionRoot}.{folder}.{subfolder?}.{FileName}`
- Value = relative path from repo root to the source file
- Add one entry per importable file that uses this alias style
- Place new entries with other paths for the same extension (see `// Playlists Paths` in `tsconfig.json`)

Example consumer:

```tsx
import { registerDiscoverExtension } from "ext_discover.app.bootstrap";
```

### Folder `.bot.aux` files

Every folder that contains importable extension code must have a matching `.bot.aux` tag file in that same folder.

Naming: `{extensionRoot}.{folder}.bot.aux`

| Folder                   | Required file                   |
| ------------------------ | ------------------------------- |
| `ext_discover/app/`      | `ext_discover.app.bot.aux`      |
| `ext_discover/helper/`   | `ext_discover.helper.bot.aux`   |
| `ext_discover/managers/` | `ext_discover.managers.bot.aux` |

Template (create if missing):

```json
{
  "state": {
    "{id}": {
      "id": "{id}",
      "space": "shared",
      "tags": {
        "aoIDOrigin": "ext_discover",
        "system": "ext_discover.app"
      }
    }
  },
  "version": 1
}
```

Rules:

- `aoIDOrigin` = extension root id (`ext_discover`, `ext_geoImporter`, etc.)
- `system` = `{extensionRoot}.{folder}` matching the folder name
- Extension host root may also need `{extensionRoot}.host.bot.aux` (e.g. `ext_discover/ext_discover.host.bot.aux`)
- When scaffolding a new folder during refactor, create its `.bot.aux` before adding files

### Named exports only (no default export)

Extension modules imported via dot-path aliases must use **named exports**, never `export default`.

```tsx
// ✅ correct
export const registerDiscoverExtension = () => {
  /* ... */
};
export function createPlaylistManager() {
  /* ... */
}

// ❌ wrong
export default function registerDiscoverExtension() {
  /* ... */
}
```

Rules:

- Entry points (`bootstrap.tsx`, helpers, hooks) export named functions/constants
- Importers destructure or import by name: `import { registerDiscoverExtension } from "ext_discover.app.bootstrap"`
- Do not add `export default` to any file under `packages/{extension-package}/`

## File-by-file workflow

Work **one source file at a time**. Do not batch multiple files without user approval.

### Step 1 — Analyze (no edits)

Read the target file and output:

```markdown
## Refactor plan: `{sourcePath}`

### States found

| State | Type      | Initial | Used by       | Proposed destination     |
| ----- | --------- | ------- | ------------- | ------------------------ |
| `foo` | `string`  | `""`    | Book, Chapter | Context manager (shared) |
| `bar` | `boolean` | `false` | Book only     | BookManager              |

### Interfaces to create

| Interface     | File                                  |
| ------------- | ------------------------------------- |
| `BookManager` | `interfaces/managers/BookManager.tsx` |
| `BookProps`   | `interfaces/components/Book.tsx`      |

### Pure functions found

| Function               | Proposed file                    |
| ---------------------- | -------------------------------- |
| `getSortedDateFormats` | `hooks/getSortedDateFormats.tsx` |

### Components to extract

| Component    | Proposed file                          |
| ------------ | -------------------------------------- |
| `BookHeader` | `components/containers/BookHeader.tsx` |
```

**STOP. Ask the user to confirm or correct every state row before editing.**

Use `AskQuestion` when available. Do not proceed until the user approves the state table.

### Step 2 — Scaffold

Create only the folders/files approved in Step 1. For each new folder:

1. Add `{extensionRoot}.{folder}.bot.aux` (create from template if missing)
2. Register each new importable file in `tsconfig.json` `paths`
3. Use named exports only in new files

### Step 3 — Extract in order

1. `models/` — domain types
2. `interfaces/` — contracts for managers, contexts, components
3. `hooks/` — pure functions
4. `managers/` — `createXManager()` with signals
5. `contexts/` — providers for approved shared state
6. `components/` — TSX last

### Step 4 — Verify

- Every manager has a matching interface in `interfaces/managers/`
- Managers use `signal` / `effect`; no `useState` or React `useEffect`
- Component files contain only TSX + imports
- Imports follow `{root}.{folder}.{file}` convention
- Each folder has its `{extensionRoot}.{folder}.bot.aux`
- Each dot-path import is registered in `tsconfig.json` `paths`
- No `export default` in extension package files
- Original behavior preserved

### Step 5 — Mark source done

After verification passes, rename the **obsolete source file** in place:

```
{originalName}  →  done-{originalName}
```

Examples:

- `CreatePlaylistUI.tsx` → `done-CreatePlaylistUI.tsx`
- `AddNewPlaylist.tsx` → `done-AddNewPlaylist.tsx`

Rules:

- Rename only after the refactor for that file is complete and verified
- Keep the file in the same `obsolete/` directory (do not delete)
- Prefix is always `done-` + original filename (including extension)
- Do not rename until user has approved the completed work for that file

### Do not edit obsolete source files

**Never change a line** in `obsolete/` originals during migration. All new code goes under `packages/{extension-package}/`. The only allowed touch to an obsolete file is **rename** to `done-{originalName}` after that file’s refactor is verified.

### Step 6 — Report

```markdown
## Done: `{sourcePath}`

**Created**

- `path/to/new/file.tsx`

**Renamed**

- `obsolete/.../CreatePlaylistUI.tsx` → `obsolete/.../done-CreatePlaylistUI.tsx`

**Next file candidate**

- `path/to/next/monolith.tsx`
```

## Naming conventions

| Artifact                  | Pattern                                 | Example                     |
| ------------------------- | --------------------------------------- | --------------------------- |
| Manager interface         | `interfaces/managers/{Name}Manager.tsx` | `PlaylistManager`           |
| Manager impl              | `managers/{Name}Manager.tsx`            | `createPlaylistManager`     |
| Context interface         | `interfaces/contexts/{Name}Context.tsx` | `PlaylistContextType`       |
| Context provider          | `contexts/{Name}Context.tsx`            | `PlaylistProvider`          |
| Component props           | `interfaces/components/{Name}.tsx`      | `BookProps`                 |
| Component                 | `components/{Name}.tsx`                 | `Book.tsx`                  |
| Pure function             | `hooks/{verbNoun}.tsx`                  | `getSortedDateFormats.tsx`  |
| Context hook              | `use{Domain}Context`                    | `usePlaylistContext`        |
| Completed obsolete source | `done-{originalName}`                   | `done-CreatePlaylistUI.tsx` |

## Scripture Map 2D migration note

Partially refactored under `obsolete/Scripture Map 2D/scriptureMap2D/`. When continuing:

- `useReadingHistoryProvider.tsx` → `managers/ReadingHistoryManager.tsx` with signals
- Add `interfaces/managers/ReadingHistoryManager.tsx` for the contract
- `useState` / `useEffect` in provider hooks → `signal` / `effect`

## Prompt templates

**Start a refactor session**

```
Refactor extension using @refactor-extension skill.
Source: obsolete/Playlist/playlist/playlistMode/CreatePlaylistUI.tsx
Target package: packages/discover-extension/ext_discover/
Analyze only — list states, interfaces, and wait for my confirmation.
```

**Continue after confirmation**

```
States approved. Proceed with Step 2–5 for CreatePlaylistUI.tsx.
```

**Next file**

```
Refactor next file: obsolete/Playlist/playlist/playlistMode/PlaylistUI.tsx
Analyze only first.
```

## Do not

- Move state without user confirmation on the state table
- Use `useState` / `useEffect` in managers (use signals)
- Define manager interfaces inside manager implementation files
- Put JSX in managers or pure-function hooks
- Refactor multiple monolith files in one pass
- Rename the obsolete source before verification is complete
- Delete obsolete files (rename to `done-{originalName}` instead)
- **Edit obsolete source files** — migrate only in `packages/`; obsolete files stay untouched until renamed to `done-*`
- Change behavior, copy, or i18n keys unless asked
- Use relative imports like `../../` when dot-path imports are available
- Use `export default` in extension package files
- Import via dot-path alias without a matching `tsconfig.json` `paths` entry
- Add files to a folder without its `{extensionRoot}.{folder}.bot.aux`
- Load child components via `getBot` / `await thisBot.X()` — use direct `ext_discover.components.{Name}` imports after migration
- Wire or import child components that do not yet exist under `ext_discover/components/` — keep import + wiring **commented out** until that file is migrated
