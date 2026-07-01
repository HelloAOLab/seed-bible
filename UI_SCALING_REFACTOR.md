# UI Scaling Refactor — Work Log & Handoff

**Branch:** `fix/1281-ui-scaling` · **Issue:** #1281 · **Status:** Phase 0 + Phase 1 **committed** (`5e752106`) and merged with latest `develop` (`0714c379`); Phase 7 implemented + adversarially verified. Awaiting the joint runtime/hands-on QA sign-off on Phase 7 before proceeding to Phases 2–6.

This doc is the single source of truth for resuming this work in a new thread / on
another machine. (The original plan lived at a machine-local path
`~/.claude/plans/lets-create-a-plan-nested-corbato.md` and the codemod/screenshot
scripts in a session temp dir — both embedded below so nothing is lost.)

---

## 1. Goal & context

The app's **"UI Text Size"** setting (`uiTextSize`: S/M/L/XL) used to scale the whole UI by
writing `zoom` onto `<html>` (factors `0.85 / 1.0 / 1.15 / 1.3`), with the reader body
counter-zooming (`zoom: calc(1 / var(--sb-ui-zoom))`) to stay on its own fixed-px font knob.

Root `zoom` breaks layout flow because the chrome was built on fixed px + fixed/absolute
positioning + viewport units, and `zoom` creates a second coordinate space that entangles JS
pixel-math.

**Goal:** drive UI scaling from `html { font-size }` via a CSS var `--sb-ui-scale`, express
chrome in `rem`, and keep reader glyph size an independent px knob — so layout flows normally
at every size. "UI Text Size" stays the single scaling mechanism.

## 2. The scaling model (the core invariant)

```css
/* main.css */
:root {
  --sb-ui-scale: 1;
} /* seed: SSR / pre-effect = size M */
html {
  font-size: calc(16px * var(--sb-ui-scale, 1));
} /* 1rem = scaled UI base */
```

`SettingsManager` sets only `--sb-ui-scale` (0.85/1.0/1.15/1.3). `zoom`, `--sb-ui-zoom`, and the
`.sb-chapter-content` counter-zoom are **deleted**.

- **`rem`** — all chrome dimensions, spacing, radius, positioning offsets, chrome font-size. Scales with the knob.
- **`px` (immune to UI scale)** — reader glyph size (`.sb-font-size-*`), 1px hairline borders, `@media` breakpoints, `box-shadow` offsets, the pane x/y/w/h "canvas" model.
- **`em` (tracks the reader knob)** — reader-internal spacing. _(Mostly Phase 2; not done yet.)_

**Cascade-anchor:** the reader font class (`.sb-font-size-*`) was on `.sb-app-root` (chrome
root), which leaked the reader size into chrome `em`/`inherit` text. It now lives on
`.sb-bible-reader` (strict ancestor of every `.sb-chapter-content`), so chrome inherits `html`
(= UI scale) and the reader stays on its own knob. Why it's safe at M: `--sb-ui-scale`
defaults to 1, so at size M everything is a **no-op** vs the old behavior.

## 3. Decisions locked with the user

| Decision         | Choice                                                                                                                                                                              |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Migration method | **One-time `postcss-pxtorem` codemod** (throwaway script rewriting source `main.css`), not a persistent build plugin.                                                               |
| Root font base   | **`16px`** — `calc(16px * var(--sb-ui-scale))`. (`100%`/browser-pref is a deferred a11y option; UI Text Size is the sole scale input.)                                              |
| Scope & rollout  | **Full refactor, incremental PRs** — mechanism swap + codemod first (no-op at M), then per-area polish.                                                                             |
| QA cadence       | Claude runs gates + screenshot matrix each phase; **user does hands-on QA at the Phase 1 cutover and again after Phase 6 (mobile)**; Claude pauses for sign-off at those two gates. |

## 4. Status — DONE

### Phase 0 — rename (no behavior change) ✅

- `UI_TEXT_SIZE_ZOOM` → `UI_TEXT_SIZE_SCALE` in `SettingsManager.tsx` (values unchanged).

### Phase 1 — mechanism swap + bulk codemod ✅

Files changed (now **committed** as `5e752106`; the list below is historical):

- **`packages/seed-bible/seed-bible/managers/SettingsManager.tsx`** — the scaling `effect` now sets only `--sb-ui-scale` (deleted the `style.zoom` + `--sb-ui-zoom` writes); constant renamed.
- **`packages/seed-bible/seed-bible/app/main.css`** —
  - added `html { font-size: calc(16px * var(--sb-ui-scale,1)) }` (+ comment);
  - `:root` `--sb-ui-zoom: 1` → `--sb-ui-scale: 1`;
  - deleted the counter-zoom block on `.sb-chapter-content`;
  - ran the one-time codemod (**~1,240 chrome px → rem**);
  - hand-converted the `:root` size/spacing/radius tokens to rem (borders kept `1px`, box-shadows kept px, `@media` breakpoints kept px, textConfig `--text-heading-margin-*` kept px).
- **`packages/seed-bible/seed-bible/components/BibleReader.tsx`** — computes `readerFontSizeClass` from `state?.config?.config.value.fontSize ?? "M"` and applies it to `.sb-bible-reader` (the cascade-anchor). Note the **fully optional-chained** `state?.config?.config` — required because test mocks pass a `state` without `config`.
- **`packages/seed-bible/seed-bible/app/main.tsx`** — removed `fontSizeClass` (and the now-unused `config` destructure + `MainContent` prop) from `.sb-app-root`, BibleSelector, Onboarding, and Tutorial.
- **`package.json` / `pnpm-lock.yaml`** — added `postcss-pxtorem` (dev). _(Removed again in Phase 8.)_

### Phase 7 — verse-toolbar coordinate fix ✅ (implemented + verified; awaiting joint QA)

- **`packages/seed-bible/seed-bible/components/BibleReaderToolbar.tsx`** — added `UI_TEXT_SIZE_SCALE` to the `SettingsManager` import; introduced a `uiScale` computed (`UI_TEXT_SIZE_SCALE[settings.settings.value.uiTextSize]`) and multiplied the floating verse-toolbar clamp insets by it: `floatingX` inset `84 → 84 * uiScale`, `floatingY` inset `64 → 64 * uiScale`. Exact no-op at M (factor 1.0). Uncommitted on the branch pending QA sign-off.
- **Verified:** `check:ts` 0 errors · `test` 580/580 · `build` ✓ · Prettier + ESLint clean on the file. A 3-voter adversarial review unanimously confirmed `refuted:false`, `noOpAtSizeM:true`, `directionCorrect:true` (no-op at M, monotonic insets S→XL, reactive to live UI-size change, safe at narrow viewports, no coordinate-space mismatch, drag offset correctly untouched).

## 5. Verification done (Phase 1)

- **Static gates green:** `pnpm check:ts` (0 errors), `pnpm lint` (0 errors; 438 pre-existing warnings), `pnpm test` (580/580), `pnpm build` (✓).
- **Runtime (headless Chrome via CDP):** 0 console errors; measured `getComputedStyle(html).fontSize` = **13.6 / 16 / 18.4 / 20.8px** for S/M/L/XL, while `.sb-chapter-content` font-size stayed **16px at every scale** → chrome scales, reader constant, orthogonality confirmed.
- Screenshots were copied to `~/Desktop/seed-bible-ui-scaling/` (`scale-S/M/L/XL.png`, `land.png`) — **not in the repo**, won't migrate; re-capture on the new machine with §9 if wanted.

## 6. The codemod (for the record / re-runnable)

One-time Node script (`postcss` + `postcss-pxtorem`), run once over `main.css`, output reviewed,
then applied. Re-creatable on any machine after `pnpm add -D -w postcss-pxtorem`:

```js
// pxtorem-codemod.cjs — node pxtorem-codemod.cjs <in.css> <out.css>
const fs = require("fs"),
  path = require("path");
const REPO = process.cwd();
const pxtoremPath = require.resolve("postcss-pxtorem", { paths: [REPO] });
const pxtorem = require(pxtoremPath);
const postcss = require(
  require.resolve("postcss", { paths: [path.dirname(pxtoremPath)] })
);
const opts = {
  rootValue: 16,
  unitPrecision: 5,
  minPixelValue: 2,
  mediaQuery: false,
  propList: [
    "font-size",
    "width",
    "min-width",
    "max-width",
    "height",
    "min-height",
    "max-height",
    "margin*",
    "padding*",
    "gap",
    "row-gap",
    "column-gap",
    "top",
    "right",
    "bottom",
    "left",
    "inset*",
    "*radius",
    "flex",
    "flex-basis",
    "grid-template-columns",
    "grid-template-rows",
    "background-size",
  ],
  selectorBlackList: [
    "html",
    /^\.sb-font-size-/,
    /\.sb-chapter-heading/,
    /\.sb-line-break/,
    /\.sb-verse-number/,
  ],
};
const [, , i, o] = process.argv;
postcss([pxtorem(opts)])
  .process(fs.readFileSync(i, "utf8"), { from: i, to: o })
  .then((r) => fs.writeFileSync(o, r.css));
```

Key choices: `minPixelValue:2` leaves 1px hairlines; `mediaQuery:false` keeps breakpoint
_conditions_ px (property px inside `@media` blocks still converts — intended for chrome);
`border`/`box-shadow`/`transform`/`line-height` excluded from `propList` (stay px); `html`
blacklisted so the base `calc(16px*…)` is protected; reader selectors blacklisted so reader
glyph/spacing stays px (`.sb-chapter-content` is NOT blacklisted so its `padding-bottom` → rem).
The `*radius` wildcard also caught the 5 `:root` `*-border-radius` custom props (desirable).
**`pnpm-lock.yaml` notes:** custom-prop declarations (`--sb-…`) don't match `propList` by name,
so the rest of `:root` was hand-converted (see §4).

## 7. QA findings / known issues

- **[DEFER — pre-existing] Book selector not fully responsive ~1250px at UI Text Size > M** — edges get cut off at the screen edges. Confirmed this was _also_ a bug under the old `zoom` impl, so it's not a Phase-1 regression. Address in a later phase (likely Phase 5 modals/overlays, or its own fix).
- **[Phase 7 ✅ DONE] Verse-toolbar edge clamp at L/XL** — the floating verse-selection toolbar's `84`/`64` clamp insets now scale by `UI_TEXT_SIZE_SCALE[uiTextSize]`. Fixed + verified; awaiting joint QA.
- **[Sibling raw-px-under-rem bugs found by the Phase 7 verification sweep — both minor, both pre-existing rem-refactor regressions, deferred to their phases]:**
  - **[Phase 4 — panes] Floating detached-pane min-size floors are raw px** — `PanesManager.tsx:918` `resizePane` clamps the floating branch to `Math.max(280, …)` width / `Math.max(180, …)` height (and the side/bottom branches to `320`/`180`), but these floors reserve room for **rem-sized** pane chrome (`.sb-detached-pane-toolbar` = `2.625rem` + `0.5rem` margin). At XL a pane dragged to its minimum leaves too little reader body; the ~15.75rem-wide floating toolbar can also overflow the 280px min-width (`overflow: visible`, so it spills rather than clips). Fix: multiply the floating-branch (and side/bottom) floors by `UI_TEXT_SIZE_SCALE[uiTextSize]`; leave `pane.x/y` and the resize **deltas** (correct plain px) untouched.
  - **[Phase 5/6 — modals/mobile] Mobile TranslationInfo popover offset is raw px** — `BibleSelector.tsx:1405` positions the mobile popover with `left: calc(${position.x}px - 265px)`, where `position.x` is a raw `clientX` and the popover is `width: 15.625rem` (`main.css:8152`). The `265` offset was tuned to the 250px M-scale width, so at XL on a narrow phone (right-aligned tap) the popover's right edge clips offscreen (~325px wide vs a frozen anchor). Fix: `265 * UI_TEXT_SIZE_SCALE[uiTextSize]` (or drive the anchor off the rem width).
- **Not yet QA'd:** multi-pane layouts (split-2v, grid-2x2) and mobile (≤768) — single-pane desktop only so far.
- **Intended behavior change:** at non-M _reader_ sizes, chrome text no longer follows the reader knob (that leak was the bug); at reader = M it's a pure no-op.

## 8. NEXT STEPS

**Phase 7 — verse-toolbar coordinate fix ✅ DONE (implemented + adversarially verified; awaiting joint QA).**
`BibleReaderToolbar.tsx` (the floating `floatingX`/`floatingY` computeds) now multiplies the
`84`/`64` clamp insets by `UI_TEXT_SIZE_SCALE[uiTextSize]` via a `uiScale` computed; CSS
`.sb-verse-toolbar` stays `position:fixed; transform: translate(-50%,-100%)`. Exact no-op at M.
Remaining: joint runtime QA at L/XL near the right/top edges (Claude screenshot/measure + user
hands-on). The verification sweep also surfaced 2 sibling raw-px bugs — see §7 (Phases 4 and 5/6).

**Phases 2–6 — per-area polish (each independently shippable; gate again after Phase 6).**

- **2 — reader `em`:** `.sb-line-break height:10px` → `0.625em`; `.sb-verse-number` margins (6px/3px) → `em`. Keep `.sb-chapter-heading font-size:18px` px. (These selectors are blacklisted from the codemod, still px.)
- **3 — toolbar/chrome:** verify reader-embedded chrome scales; ripple centering `BibleReaderToolbar.tsx:30-46`.
- **4 — panes:** pane x/y/w/h stay **px** (OS-window canvas; `PanesManager.tsx:142-145`); inline `left/top/width/height` writes (`PaneLayout.tsx:~1415`) stay px. Verify drag/resize + a freshly-detached pane at XL fits 480×320.
- **5 — modals/overlays:** inline styles → rem in `BibleSelector.tsx` (924,941,1140,1205,1446), `SettingsPage.tsx:2113`; keep px borders `BibleSelector.tsx` (1292,1323,1352), `icons.tsx` (597,603,616). **Likely home for the book-selector responsiveness fix (§7).** Decide footnote-modal font (it renders inside `.sb-bible-reader`, so currently follows the reader knob).
- **6 — mobile:** inline → rem `MobileSettingsSheet.tsx` (97,124,137); computed reader preview `MobileSettingsSheet.tsx:167` `${12+i*2}px` → a `READER_PREVIEW_PX=[12,14,16,18,20]` const (**keep px**). Verify 768px breakpoint + swipe at all sizes. **Then pause for the user's hands-on mobile QA gate.**

**Phase 8 — cleanup:** remove the `postcss-pxtorem` dev-dep; add a `main.css` header comment documenting the rem/em/px invariant + the codemod blacklist as source of truth. Consider deleting this handoff doc once merged.

**JS sanity (mostly verify-only, with 2 exceptions):** no JS reads `--sb-ui-zoom`/`element.style.zoom`.
Pane drag/resize **deltas**, swipe, tutorial, context menu, keyboard-nav, ripple are all delta/ratio
math in one CSS-px space and are correct-by-construction after removing zoom (verify-only). **However**,
the Phase 7 verification sweep found that raw-px **min-size floors** (`PanesManager.tsx:918`) and a raw-px
**popover offset** (`BibleSelector.tsx:1405`) were meant to track rem-sized elements and DO need the
`* UI_TEXT_SIZE_SCALE` treatment — see §7. So "no JS change needed" holds for delta/ratio math but not for
these two size-tracking constants.

## 9. How to resume / verify on the new machine

```bash
git checkout fix/1281-ui-scaling
pnpm install
pnpm check:ts && pnpm lint && pnpm test && pnpm build   # all should pass
pnpm dev                                                 # SSR dev server on http://localhost:3002
```

To re-capture the S/M/L/XL screenshot matrix without driving the settings UI, launch Chrome with
`--headless=new --remote-debugging-port=9222`, then a small Node CDP script (Node 22+ has global
`WebSocket`/`fetch`): navigate to :3002, dismiss the welcome modal (`.sb-onboarding-btn-primary`),
dismiss the tutorial ("Don't show tutorials"), then for each scale set
`document.documentElement.style.setProperty('--sb-ui-scale', s)` and `Page.captureScreenshot`.
Setting `--sb-ui-scale` directly is faithful — it's exactly what `SettingsManager` does.

## 10. Migration checklist

- [ ] Commit Phase 0 + Phase 1 (5 source files + `package.json`/`pnpm-lock.yaml` + this doc).
- [ ] Push `fix/1281-ui-scaling` to the remote.
- [ ] On the new machine: `git pull`, `pnpm install`, then open a new thread and point it at this file.
