# UI Scaling Refactor — Work Log & Handoff

**Branch:** `fix/1281-ui-scaling` · **Issue:** #1281 · **Status:** Rem-based UI scaling — **Phases 0, 1, 2, 3, 4, 5, 6, 7 done.**

- **Committed:** Phase 0+1 (`5e752106`), Phase 7 (`f0e2c921`), Phase 2 (`0190a5b7`), Phase 4 (`e469fbb`), Phase 5 (`337b1794`). Plus the ThemeManager var-collision fix (`5ec5f44f`). `develop` was merged in (`168b7fbb`).
- **Phase 3** = verified clean, **no code changes** (see §4).
- **Phase 6** (mobile) is **in the working tree, uncommitted** — awaiting the user's hands-on mobile QA gate + `/commit`.
- **Naming:** the scale-map constant was renamed `UI_TEXT_SIZE_SCALE` → **`UI_TEXT_SIZE_SCALE_MAP`** (in `e469fbb`). Older references below may still say the old name.
- **Remaining:** deferred **Phase 8** (book-selector responsiveness) / **Phase 9** (optional a11y browser-pref); and **Phase 10 — cleanup (runs last, after all other phases)** — see §8.
- **Commit policy:** never commit on your own — only when the user invokes `/commit`.

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
- **`em` (tracks the reader knob)** — reader-internal spacing. _(Phase 2 ✅ — `.sb-line-break`, `.sb-verse-number` gutters, and `.sb-chapter-heading` font-size are now `em`.)_

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
- **`package.json` / `pnpm-lock.yaml`** — added `postcss-pxtorem` (dev). _(Removed in the final cleanup phase — Phase 10.)_

### Phase 7 — verse-toolbar coordinate fix ✅ (committed `f0e2c921`)

- **`BibleReaderToolbar.tsx`** — a `uiScale` computed (`UI_TEXT_SIZE_SCALE_MAP[settings.settings.value.uiTextSize]`) multiplies the floating verse-toolbar clamp insets (`floatingX` `84 → 84*uiScale`, `floatingY` `64 → 64*uiScale`). Exact no-op at M.
- **Verified:** `check:ts` · `test` · `build` · Prettier/ESLint clean. A 3-voter adversarial review confirmed: no-op at M, monotonic insets S→XL, reactive to live UI-size change, safe at narrow viewports, no coordinate-space mismatch, drag offset untouched.

### Phase 2 — reader `em` ✅ (committed `0190a5b7`)

- **`main.css`** — `.sb-line-break height 10px → 0.625em`; `.sb-verse-number` gutters `6px/3px → 0.625em/0.3125em` (this element's font is `0.6em`, so `1em ≈ 0.6×` the reader glyph); `.sb-chapter-heading font-size 18px → 1.125em`. All no-ops at reader **M**.
- **User decision (overrides the original "keep px" note):** headings now **scale with the reader** (`1.125em`) — a fixed `18px` heading fell to/below body size at reader L/XL/XXL.

### Phase 3 — toolbar/chrome ✅ (verified clean — no code changes)

- Ripple (`spawnRipple`) sizes/positions purely as ratios of `getBoundingClientRect()` → scale-invariant; no change. Reader-embedded chrome (reader nav toolbar, verse toolbar, bookmark button, quick toolbar) confirmed all `rem`; `BelowReaderToolbar`/`BibleReaderToolbar` JS carry no stray px (only the ripple + the Phase 7 verse-toolbar `left/top`).
- The "desktop toolbar height doesn't scale" symptom seen during QA turned out to be a **ThemeManager hardcoded-var collision** with `main.css`, fixed separately in `5ec5f44f` — not a chrome-CSS problem.

### Phase 4 — panes ✅ (committed `e469fbb`)

- **`PanesManager.resizePane`** gained a `uiScale` param; the detached min-size floors (`320`/`180`/`280×180`) now scale by `UI_TEXT_SIZE_SCALE_MAP[uiTextSize]`, threaded from **`PaneLayout`** via a `getUiScale()` helper (read at call time so the once-registered `pointermove` listener isn't stale). Pane `x/y/w/h` stay unscaled px (OS-window canvas); resize **deltas** stay px. New unit test covers the scaled floor.
- This commit also **renamed** `UI_TEXT_SIZE_SCALE` → `UI_TEXT_SIZE_SCALE_MAP`.

### Phase 5 — modals/overlays ✅ (working tree, uncommitted — QA in progress)

- **Popover fix:** mobile `TranslationInfo` `left: calc(clientX - 265px)` → `calc(clientX - 16.5625rem)` (rem auto-tracks the UI knob; no prop-threading; no-op at M).
- **14 inline `px → rem` conversions** across `BibleSelector.tsx` (11) + `SettingsPage.tsx` (3): border-radii, padding/margin, gaps, width/height, font-sizes. **Kept px:** `1px` borders, the `9999px` overlay-mask box-shadow, `icons.tsx` borders.
- **Decisions:** footnote-modal font **kept** tracking the reader knob (intentional — it's reading content); book-selector responsiveness **deferred → Phase 8**.

### Phase 6 — mobile ✅ (working tree, uncommitted — awaiting hands-on mobile QA)

- **`MobileSettingsSheet.tsx`** — the **4 remaining inline `px` font-sizes → rem** (the codemod only touched `main.css`, so JSX inline styles were never migrated). All exact no-ops at UI size M: header `auto_stories` icon `22 → 1.375rem`; the two scripture "A" affordance buttons `14 → 0.875rem` / `20 → 1.25rem`; the UI-text-size preview ramp `` `${12 + i*2}px` `` → `` `${(12 + i*2)/16}rem` `` (0.75/0.875/1/1.125rem).
- **⚠️ Divergence from this doc's original Phase 6 plan (§8), and why:** the plan said to keep the `${12 + i*2}px` ramp as **px** in a `READER_PREVIEW_PX` const because it "mirrors the reader glyph knob." That was written against a **pre-`develop`-merge** file layout. In the current file that line is the **UI-text-size selector ramp** (chrome, iterating `UI_TEXT_SIZE_OPTIONS` = S/M/L/XL, 4 buttons — not the doc's stale 5-entry array), **not** a reader preview. By the §2 invariant, chrome font-size → rem, so it now scales with the UI knob like the rest of the sheet. There is no reader-glyph preview ramp in the current file, so nothing here should stay px.
- **Consistency check:** the two scripture "A" buttons now use the **identical** rem values (`0.875rem` / `1.25rem`) that desktop's already-shipped `.sb-scripture-quick-btn-a-small` / `-a-large` (`main.css`) use — mobile now matches desktop.
- **`READER_PREVIEW_PX` const not created** — the plan's rationale (keep-px) no longer applies; kept the inline rem computation (adaptive to the options-array length) with a clarifying comment.
- **Gates green:** `check:ts` (0) · `lint` (0 err / 438 pre-existing warns) · `test` (581/581) · `build` (✓).
- **Not code (verify at the QA gate):** 768px breakpoint + swipe carousel at all UI sizes. The reader-size preview const the plan mentioned (`${12 + i * 2}px`) does not exist as a _reader_ preview post-merge (see divergence above).

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

- **[DEFERRED → Phase 8] Book selector not fully responsive ~1250px at UI Text Size > M** — edges get cut off at the screen edges. Confirmed this was _also_ a bug under the old `zoom` impl, so it's not a rem-refactor regression. Decided (2026-07-02) to give it its **own focused fix** — see **Phase 8** in §8 (it's a responsive-layout bug, not a px→rem swap).
- **[Phase 7 ✅ DONE] Verse-toolbar edge clamp at L/XL** — the floating verse-selection toolbar's `84`/`64` clamp insets now scale by `UI_TEXT_SIZE_SCALE[uiTextSize]`. Fixed + verified; awaiting joint QA.
- **[Sibling raw-px-under-rem bugs found by the Phase 7 verification sweep — both minor, both pre-existing rem-refactor regressions — NOW FIXED]:**
  - **[Phase 4 ✅ FIXED `e469fbb`] Floating detached-pane min-size floors** — `PanesManager.resizePane` now takes a `uiScale` param and scales the floors (`320`/`180`/`280×180`) by `UI_TEXT_SIZE_SCALE_MAP[uiTextSize]` (threaded from `PaneLayout` via `getUiScale()`). Pane `x/y/w/h` stay unscaled px (canvas). New unit test asserts the floating floor clamps to `280×1.3 / 180×1.3` at scale 1.3.
  - **[Phase 5 ✅ FIXED (working tree)] Mobile TranslationInfo popover offset** — `BibleSelector.tsx` mobile branch `left: calc(${position.x}px - 265px)` → `calc(${position.x}px - 16.5625rem)`. Because `1rem = 16px × --sb-ui-scale`, the offset auto-tracks the `15.625rem` popover with no prop-threading; exact no-op at M, no longer clips at L/XL. Desktop branch left alone (sweep adjudicated it not a regression).
- **Not yet QA'd:** multi-pane layouts (split-2v, grid-2x2) and mobile (≤768) — single-pane desktop only so far.
- **Intended behavior change:** at non-M _reader_ sizes, chrome text no longer follows the reader knob (that leak was the bug); at reader = M it's a pure no-op.

## 8. NEXT STEPS

**Phases 0–7 — DONE** (code). See §4 for what each did and its commit ref. Phase 6 is in the working tree awaiting the user's hands-on mobile QA gate + `/commit`. Only the deferred Phases 8–9 and the final Phase 10 (cleanup) remain.

**Phase 6 — mobile ✅ (code done, awaiting QA gate):** `MobileSettingsSheet.tsx` 4 inline px font-sizes → rem (see §4 for details + the divergence from this plan's original "keep px" note). **Now paused for the user's hands-on mobile QA gate** (768px breakpoint + swipe carousel at all UI sizes). ⚠️ The original plan text below is **superseded** — kept for the record: it said to make a `READER_PREVIEW_PX = [12,14,16,18,20]` px const, but that plan targeted a pre-`develop`-merge layout where `${12 + i*2}px` was a reader preview; post-merge it's the chrome UI-text-size ramp (4 options), correctly converted to rem instead.

--- Deferred items (given their own phases so they aren't lost) ---

**Phase 8 — book-selector responsiveness (deferred):** the book/translation selector clips at the screen edges around ~1250px when UI Text Size > M. Pre-existing (also broken under the old `zoom` impl), so **not** a rem-refactor regression. Needs a focused responsive-layout fix (grid / overflow / max-width), not a px→rem swap. See §7.

**Phase 9 — (optional, a11y) honor browser font-size:** make the root base `100%` (browser preference) instead of a fixed `16px`, as an accessibility option layered on top of the UI Text Size knob (see §3, "Root font base"). Low priority; not required for #1281.

**Deferred candidate — unverified (panes):** the attached-pane splitter minimums (`minFrac = 80/rect.width`, `60/rect.height` in `PaneLayout`'s `handlePointerMove`) are raw px that reserve room for rem-sized attached-pane chrome. Not flagged by the sweep and left untouched in Phase 4. If attached panes feel cramped at XL, scale these `80`/`60` by the UI knob too (fold into Phase 8 or a Phase 4 follow-up).

**Phase 10 — cleanup (FINAL — runs after every other phase):** remove the `postcss-pxtorem` dev-dep; add a `main.css` header comment documenting the rem/em/px invariant + the codemod blacklist as source of truth. Consider deleting this handoff doc once merged.

**JS sanity (both size-tracking exceptions now fixed):** no JS reads `--sb-ui-zoom`/`element.style.zoom`. Pane drag/resize **deltas**, swipe, tutorial, context menu, keyboard-nav, and ripple are delta/ratio math in one CSS-px space — correct-by-construction after removing zoom. The two size-tracking constants the sweep found (`PanesManager` min-floors, `BibleSelector` popover offset) are now fixed (Phases 4 & 5). Only remaining unverified candidate: the attached-pane splitter mins above.

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

## 10. Commit / push status

- [x] Phase 0 + 1 committed (`5e752106`), merged with latest `develop` (`168b7fbb`).
- [x] Phase 7 (`f0e2c921`), Phase 2 (`0190a5b7`), Phase 4 + rename (`e469fbb`), Phase 5 (`337b1794`) committed.
- [x] Phase 3 — verified clean, no code changes.
- [ ] Phase 6 (mobile) — in the working tree, awaiting user hands-on mobile QA + `/commit`.
- [ ] Push `fix/1281-ui-scaling` to the remote — **only when the user explicitly asks.**
- [ ] Deferred Phase 8/9, Phase 10 (cleanup — runs last) — not started.
