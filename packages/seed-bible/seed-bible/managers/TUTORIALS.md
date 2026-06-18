# Tutorials & Tours — Developer Guide

How to add guided coachmark tours (spotlight + popover) to a feature, including
from an extension, without editing the built-in onboarding flow.

The system lives in [`TutorialManager.tsx`](./TutorialManager.tsx) and renders
through the [`Tutorial`](../components/Tutorial.tsx) overlay.

---

## TL;DR

```ts
import { tourStep } from "seed-bible.managers.TutorialManager";

// 1. Register your tour once (e.g. when your feature/extension initializes).
state.tutorial.registerTour("highlights", [
  tourStep({
    id: "hl-1",
    target: ".hl-button",
    title: "Highlights",
    body: "Tap a verse, then tap here to highlight it.",
  }),
  tourStep({
    id: "hl-2",
    target: ".hl-list",
    title: "Your highlights",
    body: "Everything you mark collects here.",
    placement: "left",
  }),
]);

// 2. Trigger it from your feature's own click/open handler.
state.tutorial.startContextual("highlights"); // auto-shows once per user
```

That's it — you get Back / Next / Done buttons, smart popover placement that
never covers the highlighted element, Skip / "Don't show tutorials", and
per-tour "already seen" tracking, all for free.

---

## Live example in the app

There's a working demo wired into the app root ([`app/main.tsx`](../app/main.tsx),
search for `DEMO_TOUR_ID`). It registers a 3-step tour and shows a small **▶ Demo
tour** launcher button — but only when dev tours are enabled, so real users never
see it. To try it:

```js
// In the devtools console, then reload:
localStorage.setItem("sb-dev-tours", "1");
// (or append ?devTour to the URL)
```

Click the launcher to run the tour. It's also a copy-paste reference for the
`registerTour` + `tourStep` + `startTour` flow.

There's a unit test covering the API at
[`test/unit/seed-bible/managers/TutorialManager.test.ts`](../../../../test/unit/seed-bible/managers/TutorialManager.test.ts)
(`npx jest TutorialManager`).

## Core concepts

- **Step** — one coachmark: a CSS `target` to spotlight, plus a title and body.
- **Tour** — an ordered list of steps shown one at a time with Back/Next.
- **Contextual tour** — a tour shown the first time a user uses a feature
  (triggered from that feature's handler), as opposed to the first-run
  onboarding tour. Custom tours are contextual.
- The tour overlay is **modal** — see [Important: the overlay is modal](#important-the-overlay-is-modal).

---

## Getting the manager

Anywhere you have the app `state` (`SeedBibleState`), use `state.tutorial`:

```ts
function MyButton({ state }: { state: SeedBibleState }) {
  return (
    <button
      onClick={() => {
        openMyPanel();
        state.tutorial.startContextual("my-feature");
      }}
    >
      Open
    </button>
  );
}
```

The instance type is `TutorialManager` (exported from
`seed-bible.managers.TutorialManager`).

---

## Authoring steps

### `tourStep(config)` — the easy way

Pass plain strings; it fills in the i18n keys for you (namespaced as
`tour.<id>.title` / `tour.<id>.body`, so translations can be added later without
touching call sites).

```ts
tourStep({
  id: "hl-1", // unique within the tour
  target: ".hl-button", // CSS selector to spotlight
  title: "Highlights",
  body: "Tap to mark a verse.",
  placement: "bottom", // optional: "top" | "bottom" | "left" | "right"
  elevated: false, // optional: see "Pointing at panels/sheets"
});
```

### Raw `TutorialStep` — full control

```ts
const step: TutorialStep = {
  id: "hl-1",
  target: ".hl-button",
  titleDefault: "Highlights", // titleKey is optional; omit for no i18n
  bodyDefault: "Tap to mark a verse.",
  placement: "bottom",
  onEnter: () => {}, // optional side effect when shown
  onLeave: () => {}, // optional cleanup when leaving
};
```

| Field                  | Required | Notes                                                                                                                                               |
| ---------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                   | ✓        | Unique within the tour.                                                                                                                             |
| `target`               | ✓        | CSS selector. The element must be in the **light DOM** (queryable via `document.querySelector`). If missing, the popover centers with no spotlight. |
| `titleDefault`         | ✓        | Shown verbatim unless `titleKey` resolves to a translation.                                                                                         |
| `bodyDefault`          | ✓        | Same.                                                                                                                                               |
| `titleKey` / `bodyKey` | –        | i18n keys; omit to skip translation.                                                                                                                |
| `placement`            | –        | Preferred side; auto-flips when there's no room. Default `"bottom"`.                                                                                |
| `elevated`             | –        | Lift the overlay above high z-index panels. See below.                                                                                              |
| `group`                | –        | `"selector"` only — for steps inside the book-selector portal.                                                                                      |
| `onEnter`/`onLeave`    | –        | Run when the step becomes active / is left.                                                                                                         |

---

## Registering & triggering

### `registerTour(id, steps, options?)`

```ts
state.tutorial.registerTour("highlights", steps); // once-only (default)
state.tutorial.registerTour("debug-walkthrough", steps, { once: false }); // replayable
```

- `once: true` (default) — auto-shows at most once per user via
  `startContextual` (tracked in the user's profile + local cache).
- `once: false` — never marked "seen"; can replay every time.
- Re-registering the same `id` replaces it.

### `startContextual(id)`

Use this from the feature's **own** event handler (the click that opens your
panel, etc.). It is safe to call unconditionally — it no-ops when:

- a tour is already running,
- the user opted out of tutorials,
- the tour is `once` and already seen.

```ts
onClick={() => {
  openSettingsSheet();
  state.tutorial.startContextual("mobile-settings");
}}
```

### `startTour(id)`

Starts immediately and **ignores** the "already seen" flag and opt-out — for an
explicit "Show me again" / replay button.

```ts
<button onClick={() => state.tutorial.startTour("highlights")}>
  Replay tour
</button>
```

Works with both your registered tours and built-in contextual ones.

---

## Important: the overlay is modal

The tour overlay sits on top of the screen and **intercepts taps**. While a tour
step is showing, the user cannot click the app underneath it.

**Consequence:** you cannot rely on the user "tapping the real target through the
overlay" to advance or reveal a step. Instead, **trigger tips from the feature's
own click handler** (the pattern shown above). This is how the built-in
`pane-layout`, `search`, and `mobile-settings` tips work.

```ts
// ✅ Do: fire the tip when your handler runs.
onClick={() => { openThing(); state.tutorial.startContextual("thing"); }}

// ❌ Don't: expect the user to click `target` while the tour overlay is up.
```

### Pointing at panels/sheets that open

If your handler opens a panel with a **high `z-index`** (e.g. a modal sheet), the
tip would render _behind_ it. Mark the step `elevated: true` to lift the overlay
above such panels:

```ts
state.tutorial.registerTour("mobile-settings", [
  tourStep({
    id: "mobile-settings",
    target: ".sb-mobile-settings-sheet", // the panel that just opened
    title: "Settings",
    body: "Customize text, themes, and reading options here.",
    placement: "top",
    elevated: true,
  }),
]);
```

### Targets inside the book-selector portal

The book selector renders in its own shadow-root portal. Steps whose target
lives there must set `group: "selector"`; the selector draws those tips itself.
This is an advanced case — most features don't need it.

---

## Full example: a feature with a 2-step tour

```ts
import { tourStep } from "seed-bible.managers.TutorialManager";
import type { SeedBibleState } from "seed-bible.managers.SeedBibleStateManager";

export function registerHighlightTour(state: SeedBibleState) {
  state.tutorial.registerTour("highlights", [
    tourStep({
      id: "hl-button",
      target: ".hl-button",
      title: "Highlight verses",
      body: "Select a verse, then tap here to highlight it.",
      placement: "bottom",
    }),
    tourStep({
      id: "hl-panel",
      target: ".hl-panel",
      title: "Your highlights",
      body: "Open this panel any time to revisit them.",
      placement: "left",
      elevated: true, // the panel opens above normal content
    }),
  ]);
}

// In the component that owns the feature:
function HighlightButton({ state }: { state: SeedBibleState }) {
  return (
    <button
      className="hl-button"
      onClick={() => {
        openHighlightPanel();
        // First-time-only tip, right when the user uses the feature.
        state.tutorial.startContextual("highlights");
      }}
    >
      Highlight
    </button>
  );
}
```

---

## API reference

`state.tutorial` (`TutorialManager`):

| Member                                    | Type    | Purpose                                                        |
| ----------------------------------------- | ------- | -------------------------------------------------------------- |
| `registerTour(id, steps, opts?)`          | method  | Register a custom tour. `opts.once` (default `true`).          |
| `startContextual(id)`                     | method  | Auto-show once; respects opt-out & seen flag. Use in handlers. |
| `startTour(id)`                           | method  | Force-start now (ignores seen flag & opt-out). For replay.     |
| `start()`                                 | method  | Restart the first-run onboarding tour.                         |
| `next()` / `prev()` / `finish()`          | method  | Manual navigation / end (the popover buttons call these).      |
| `optOut()`                                | method  | End and record "don't show tutorials again".                   |
| `running`                                 | signal  | Whether a tour is showing.                                     |
| `currentStep`                             | signal  | The active `TutorialStep` or `null`.                           |
| `index` / `isLast` / `canGoBack`          | signals | Position helpers for custom UI.                                |
| `completed` / `optedOut` / `featuresSeen` | signals | Onboarding done / opted out / per-tour seen map.               |

Helpers (exported from `seed-bible.managers.TutorialManager`):

- `tourStep(config)` → `TutorialStep`
- types: `TutorialStep`, `TutorialPlacement`, `TutorialManager`

---

## Testing / resetting

Tours marked `once` won't show again after being seen. To re-test, clear the
seen flags (the profile record is the durable source; localStorage is the cache):

```js
// In the browser devtools console:
localStorage.removeItem("sb-tutorial-features-seen"); // contextual/custom tours
localStorage.removeItem("sb-tutorial-seen"); // first-run onboarding
localStorage.removeItem("sb-tutorial-opted-out"); // opt-out flag
```

Then reload (and, if signed in, the matching `profile.config` values still apply
across devices — clear those too for a full reset). Or use `startTour(id)`, which
ignores the seen flag entirely.
