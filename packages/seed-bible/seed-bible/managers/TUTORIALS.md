# Tutorials & Tours — Developer Guide

How guided tours (a highlighted element plus a popover with Back / Next) work in Seed Bible, and how to add one for a feature.

The logic lives in [`TutorialManager.tsx`](./TutorialManager.tsx). The overlay is drawn by [`Tutorial`](../components/Tutorial/Tutorial.tsx). The first-run "Would you like a tutorial?" card is [`TutorialPrompt`](../components/TutorialPrompt/TutorialPrompt.tsx), and the "Turn off tutorials?" question after Skip is [`TutorialSkipPrompt`](../components/TutorialSkipPrompt/TutorialSkipPrompt.tsx).

---

## TL;DR

```ts
// 1. Add the tour's steps to CONTEXTUAL_TUTORIALS in TutorialManager.tsx
//    (a made-up "bookmarks" tour, for example).
"bookmarks": [
  {
    id: "bookmarks",
    target: ".sb-bookmarks-pane",
    titleKey: "tutorial.bookmarksTitle",
    titleDefault: "Bookmarks",
    bodyKey: "tutorial.bookmarksBody",
    bodyDefault: "Everything you bookmark collects here.",
    placement: "left",
  },
],

// 2. Add tutorial.bookmarksTitle and tutorial.bookmarksBody to i18n/en.json.

// 3. Start it from the feature's own handler. It shows once per user.
onClick={() => {
  openBookmarks();
  state.tutorial.startContextual("bookmarks");
}}
```

---

## Two kinds of tour

**The introduction.** The first-run tour of the basics. Desktop uses `ONBOARDING_STEPS` and phones use `MOBILE_TUTORIAL_STEPS`. A new user is offered it with the `TutorialPrompt` card once the reader has stayed open and uncovered (no pane or modal over it) for `TUTORIAL_OFFER_DELAY_MS`. It can be started again from Settings and the About page, which call `start()`. Its id is `INTRODUCTION_TUTORIAL_ID` (`"introduction"`).

**Contextual tours.** A short tour of one feature, shown the first time the user opens that feature. Each has a feature id, which is also what "seen" is recorded under. Most are listed in `CONTEXTUAL_TUTORIALS`:

| Feature id         | Started from                                                       |
| ------------------ | ------------------------------------------------------------------ |
| `mobile-settings`  | Opening the phone's settings sheet (`TabsLayout.tsx`)              |
| `pane-layout`      | Opening the pane layout menu (`Tabs.tsx`)                          |
| `add-tab`          | Nothing in the app yet; only a `?tutorial=add-tab` link            |
| `offline-download` | The Books selector's offline download button (`BibleSelector.tsx`) |
| `search`           | Nothing in the app yet; only a `?tutorial=search` link             |

A tour whose steps need something only known at run time passes its steps instead of listing them. `customization-created` does this: its steps open the theme being edited, so `buildCustomizationTutorialSteps(state, variantId)` builds them per call (see `CustomizationEditPane.tsx`). It starts after a Custom Branding is created, and from the editor's **Take a tour** button.

---

## Starting a tour

All of these are on `state.tutorial` (`TutorialManager`).

| Method                         | Use it for                                                                                                     | Seen / turned off | Returns            |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------- | ----------------- | ------------------ |
| `startContextual(id, steps?)`  | The first time a user opens a feature. Safe to call every time.                                                | Respected         | nothing            |
| `replayContextual(id, steps?)` | A **Take a tour** button: the user asked, so it runs anyway.                                                   | Ignored           | whether it started |
| `startTutorial(id, step?)`     | A known tour (the introduction or a `CONTEXTUAL_TUTORIALS` id) from a given step, as a `?tutorial=` link does. | Ignored           | whether it started |
| `start()`                      | The introduction, from the start.                                                                              | Ignored           | nothing            |

`steps` replaces the `CONTEXTUAL_TUTORIALS[id]` lookup; "seen" is still recorded under `id`. Finishing a contextual tour, however it was started, records it seen.

### When a tour doesn't start

`startContextual` does nothing when:

- another tour is already running,
- Seed Bible is in a compact partner-site embed,
- the visit started from a shared link (a session invite, a playlist, a reading plan),
- the user turned tutorials off,
- the user has already seen this tour.

`replayContextual` stops only for the first two. `startTutorial` stops only in an embed, or for a desktop-only tour on a phone; it doesn't wait for a running tour but replaces it. Both return `false` when nothing started. If your **Take a tour** button also changes the screen for the tour, do that only when it returns `true`, or a tour that's already running ends up pointing at something that isn't shown. This is the one case where the screen changes after the tour starts; that's fine, because the overlay keeps looking for a step's target until it appears. The Custom Branding editor's button does this:

```ts
onClick={() => {
  const started = state.tutorial.replayContextual(
    "customization-created",
    buildCustomizationTutorialSteps(state, variantId)
  );
  if (started) {
    customizationEditView.value = "edit"; // the main editor, where step 1 points
  }
}}
```

---

## Writing steps

```ts
const step: TutorialStep = {
  id: "bookmarks",
  target: ".sb-bookmarks-pane",
  titleKey: "tutorial.bookmarksTitle",
  titleDefault: "Bookmarks",
  bodyKey: "tutorial.bookmarksBody",
  bodyDefault: "Everything you bookmark collects here.",
  placement: "left",
};
```

| Field                       | Required | Notes                                                                                                                                                                                                               |
| --------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                        | ✓        | Unique within the tour.                                                                                                                                                                                             |
| `target`                    | ✓        | CSS selector for the element to highlight. It must be findable with `document.querySelector`. If nothing matches, the popover is centered with no highlight. A `data-tutorial="…"` attribute makes a stable target. |
| `titleKey` / `titleDefault` | ✓        | Translation key in `i18n/en.json`, and the English text used until the key is translated.                                                                                                                           |
| `bodyKey` / `bodyDefault`   | ✓        | Same, for the body.                                                                                                                                                                                                 |
| `placement`                 | –        | `"top"`, `"bottom"`, `"left"` or `"right"`. Flips when there's no room.                                                                                                                                             |
| `onEnter` / `onLeave`       | –        | Run when the step becomes active / is left, for example to open the panel the step points at and close it again.                                                                                                    |
| `elevated`                  | –        | Draws the overlay above high panels. See below.                                                                                                                                                                     |
| `highlight`                 | –        | `"spotlight"` (default) dims everything around the target. `"glow"` leaves the page alone and rings the target, for a one-off tip about one small control.                                                          |
| `group`                     | –        | `"selector"` only, for steps inside the Books selector. See below.                                                                                                                                                  |

**Translations.** Add each key to `i18n/en.json` only (the other languages are left for translators). Write the four text fields as plain string literals: that's how the i18n lint recognizes a step and checks its keys exist. A step built in a loop or from variables isn't checked.

### The overlay is modal

While a step is showing, the overlay sits over the app and takes the taps, so the user can't click the real target underneath. Don't wait for the user to tap the target to move on. Start the tour from the feature's own handler instead, after it has opened what the tour points at. That's how all the built-in contextual tours work.

### Pointing at a panel that just opened

A panel with a high stacking layer (such as the phone's settings sheet) would cover the tour. Set `elevated: true` on the step to draw the overlay above it, as `mobile-settings` does.

### Targets inside the Books selector

The Books selector draws its own layer. Steps whose target is inside it set `group: "selector"`, and the selector draws those steps itself. Most tours don't need this.

---

## Links to a tour

`?tutorial=<id>&tutorialStep=<n>` starts a tour when the page opens, on step `n` (counting from 0). Only the ids in `LINKABLE_TUTORIAL_IDS` work: `introduction`, `pane-layout`, `add-tab` and `search`. `pane-layout` is ignored on phones, where its menu isn't shown. While a linkable tour runs, the URL is kept up to date with its step, so the page can be refreshed or shared mid-tour.

---

## Extensions

An extension gets `state.tutorial` through its `init(context)` state, so it can start a tour with its own steps: `state.tutorial.startContextual("my-extension-feature", steps)`. Use an id unlikely to clash with Seed Bible's own.

One limitation: the overlay looks step text up in Seed Bible's own `en.json`, and the lint requires a step's keys to be there, so an extension's tour can't be translated yet.

---

## API reference

`state.tutorial` (`TutorialManager`):

| Member                                    | Type    | Purpose                                                                                          |
| ----------------------------------------- | ------- | ------------------------------------------------------------------------------------------------ |
| `startContextual(id, steps?)`             | method  | Show a contextual tour once; respects "seen" and "turned off".                                   |
| `replayContextual(id, steps?)`            | method  | Start a contextual tour on request; ignores "seen" and "turned off". Returns whether it started. |
| `startTutorial(id, step?)`                | method  | Start a known tour at a step, as links do. Returns whether it started.                           |
| `start()`                                 | method  | Start the introduction from the beginning.                                                       |
| `next()` / `prev()` / `finish()`          | method  | Move through the tour, or end it (the popover's buttons call these).                             |
| `skip()`                                  | method  | End the tour and ask whether to turn tutorials off.                                              |
| `keepTutorials()`                         | method  | Answer that question with "keep them".                                                           |
| `optOut()`                                | method  | Turn tutorials off (what the "turn off tutorials?" question's confirm button calls).             |
| `acceptPrompt()` / `dismissPrompt()`      | method  | Answer the first-run offer card.                                                                 |
| `running`                                 | signal  | Whether a tour is showing.                                                                       |
| `activeTutorialId`                        | signal  | `"introduction"`, a contextual feature id, or `null`.                                            |
| `currentStep`                             | signal  | The step showing, or `null`.                                                                     |
| `index` / `isLast` / `canGoBack`          | signals | Where the tour is, for custom UI.                                                                |
| `completed` / `optedOut` / `featuresSeen` | signals | Introduction seen / tutorials turned off / contextual tours seen, by id.                         |
| `promptVisible` / `skipPromptVisible`     | signals | Whether the first-run offer card / the "turn off tutorials?" question is showing.                |

Also exported from `TutorialManager.tsx`: the `TutorialStep`, `TutorialPlacement` and `TutorialManager` types; `CONTEXTUAL_TUTORIALS`, `ONBOARDING_STEPS`, `MOBILE_TUTORIAL_STEPS`, `INTRODUCTION_TUTORIAL_ID`, `LINKABLE_TUTORIAL_IDS` and `TUTORIAL_OFFER_DELAY_MS`.

---

## Testing

Tests are in [`test/unit/seed-bible/managers/TutorialManager.test.tsx`](../../../../test/unit/seed-bible/managers/TutorialManager.test.tsx) (`pnpm vitest run TutorialManager`).

To see a once-only tour again in the browser, clear what's been recorded and reload:

```js
localStorage.removeItem("sb-tutorial-features-seen"); // contextual tours
localStorage.removeItem("sb-tutorial-seen"); // the introduction
localStorage.removeItem("sb-tutorial-opted-out"); // "turn off tutorials"
```

When signed in, the same flags are also saved on the profile (`tutorialFeaturesSeen`, `tutorialSeen`, `tutorialOptedOut` in `profile.config`) and come back on reload. A `?tutorial=` link starts a linkable tour without clearing anything.
