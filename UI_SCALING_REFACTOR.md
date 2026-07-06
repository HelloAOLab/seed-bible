# UI Scaling Refactor — Work Log & Handoff

**Branch:** `fix/1281-ui-scaling` · **Issue:** #1281 · **Status:** Rem-based UI scaling — **Phases 0, 1, 2, 3, 4, 5, 6, 7, 11, 12 done.**

- **Committed:** Phase 0+1 (`5e752106`), Phase 7 (`f0e2c921`), Phase 2 (`0190a5b7`), Phase 4 (`e469fbb`), Phase 5 (`337b1794`), Phase 6 (`275184e7`). Plus the ThemeManager var-collision fix (`5ec5f44f`). An earlier `develop` merge landed at `168b7fbb`.
- **Phase 3** = verified clean, **no code changes** (see §4).
- **✅ The second `develop` merge (2026-07-03) is now COMMITTED** — merge commit `16461f74`, followed by `4ed4b607` (the TutorialPrompt `fontSizeClass` strip — the code half of Phase 12). The `main.css` conflict + `main.tsx` `fontSizeClass` collision were resolved in that merge. This merge spawned integration **Phases 11–14** (§8). Full gates re-run green post-merge (see §5).
- **Phase 11 (chat UI)** = ✅ committed (`3c3731f`) — see §4.
- **Phase 12 (tutorial/tour)** = ✅ **complete, uncommitted in working tree** (2026-07-06). Code half was `4ed4b607` (`fontSizeClass` strip); the CSS-audit half converted the `.sb-tutorial-prompt` block (12 px→rem). See §4.
- **Naming:** the scale-map constant was renamed `UI_TEXT_SIZE_SCALE` → **`UI_TEXT_SIZE_SCALE_MAP`** (in `e469fbb`). Older references below may still say the old name.
- **Remaining:** **Phase 8** (book-selector responsiveness); **Phases 13–14** (develop-merge integration: today-screen / scripture-map); deferred **Phase 9** (optional a11y browser-pref); and **Phase 10 — cleanup (runs last, after all other phases)** — see §8.
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

### Phase 11 — chat UI rem pass ✅ (committed `3c3731f`)

- **`main.css` chat block only** (`/* --- Chat panel --- */` marker at ~8605 → the `/* Login modal` marker at ~9544). develop had merged the whole floating-chat panel in the pre-refactor px idiom; the shared floating-panel base + search panel _above_ the marker were already rem from Phase 1.
- **149 declarations `px → rem`** via the **exact Phase-1 codemod** (`postcss-pxtorem`, same opts: `rootValue:16`, `minPixelValue:2`, `mediaQuery:false`, same propList/blacklist), scoped to just the chat block by its comment markers, then Prettier'd. Verified `git diff -w` shows _only_ px→rem value changes (149 in / 149 out, no formatting drift).
- **27 px deliberately kept** (all confirmed): `1px`/`border` widths, `box-shadow` offsets (incl. the `2px` avatar-ring `box-shadow: 0 0 0 2px`), `outline`/`outline-offset`, `transform: translate*` offsets, the `@media` breakpoint _conditions_ (768px/1400px), and the `env(…, 0px)` safe-area fallbacks (scale-invariant zeros). Property px _inside_ the media blocks did convert (e.g. `bottom: 100px → 6.25rem`, `120px → 7.5rem`).
- **Avatar clusters scale as chrome:** cluster container/icon sizes, overlap margins (`-10px → -0.625rem`, etc.), and `grid-template-columns/rows: 17px → 1.0625rem` all converted so each cluster scales together with its row text. The `2px` white separator ring stays px (box-shadow rule) — a minor, intentional exception per §2.
- **`999px` pill radii → `62.4375rem`** — matches how Phase 1 already converted the search panel's pill radius (consistent precedent, harmless: still effectively "fully round").
- **`ChatView.tsx` has no inline styles** — nothing to convert in JSX. Self-contained CSS change. Exact no-op at UI size M.
- **Gates green (full post-merge re-run):** `check:ts` (0 err, 6 pre-existing suppressed) · `lint` (0 err / 251 pre-existing warns) · `test` (2520/2520) · `build` (✓).
- **Not code (verify at QA):** open the floating chat at UI L/XL and eyeball panel width / list rows / message bubbles / mention picker for layout breakage. Flow layout (flex/grid, no JS coordinate math), so risk is cosmetic only.

### Phase 12 — tutorial/tour review ✅ (working tree, uncommitted — 2026-07-06)

- **Code half — already committed (`4ed4b607`):** develop's new `TutorialPrompt` reintroduced the pre-refactor overlay convention `className={`${fontSizeClass} ${webkitClass}`}`; that commit stripped `fontSizeClass` so it matches its chrome siblings (`Tutorial`/`OnboardingModals`/`BibleSelector`). This is the fix that makes the prompt's `em` font-sizes track the **UI** knob instead of the reader knob (see below).
- **CSS-audit half — this pass:** the shared `.sb-tour-*` rules (~1661–1847) were **already rem** from Phase 1 — the only px left there are `box-shadow`, the `9999px` spotlight mask, and `2px`/`1px` borders, all correctly kept per §2. The **new px was confined to the `.sb-tutorial-prompt` block** (develop-added, 1849–1920). Converted **12 declarations px→rem** via the marker-scoped codemod (`.sb-tutorial-prompt {` → `.sb-reader-toolbar {`): `top/right: 16px → 1rem`, `width: min(340px, calc(100vw - 32px)) → min(21.25rem, calc(100vw - 2rem))`, `border-radius 14px/10px → 0.875rem/0.625rem`, `padding 18px → 1.125rem` and `8px 16px → 0.5rem 1rem`, `margin 6px/16px → 0.375rem/1rem`, `font-size 16px → 1rem`, `gap 8px/6px → 0.5rem/0.375rem`.
- **3 px kept** (confirmed): the `box-shadow: 0 16px 40px` and the `1px` button border.
- **`em` font-sizes left as-is (intentional):** `.sb-tutorial-prompt-body` `0.95em`, `-btn` `0.9em`, `-arrow` `1.05em`. Post-`4ed4b607` the prompt inherits the chrome base (`16px × UI scale`), so these `em` now resolve against the UI-scaled base and already track the UI knob — behavior-identical to rem here. Converting them would be a no-op normalization; left them to keep the diff minimal and in-scope (the phase converts stray **px**).
- **`TutorialPrompt.tsx` has no inline styles** — nothing to convert in JSX.
- **Gates green:** `check:ts` (0 err) · `lint` (0 err / 251 pre-existing warns) · `test` (2520/2520) · `build` (✓). Exact no-op at UI size M.

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

**Phases 0–7 + 11 + 12 — DONE** (code). See §4 for what each did and its commit ref. Phase 11 (chat) is committed (`3c3731f`); Phase 12 (tutorial/tour) is done in the working tree, uncommitted. Remaining: **Phase 8** (book-selector responsiveness), **Phase 13** (today screen), **Phase 14** (scripture map), the deferred **Phase 9** (optional a11y), and the **final Phase 10 (cleanup)** which runs after all of them.

> **`develop` merge (2026-07-03):** a large feature merge brought in new UI written in the **pre-refactor px idiom**. The merge itself is in the working tree, uncommitted (the CSS conflict + one semantic collision are resolved & staged — see §10). develop's new UI does not honor the UI Text Size knob until converted; this spawned integration Phases **11–14** below. Decision (2026-07-03): the two separate feature packages (Today, Scripture Map) **should** scale — treat as chrome, convert px→rem (the map keeps its canvas/marker geometry in px).

**Phase 6 — mobile ✅ (code done, awaiting QA gate):** `MobileSettingsSheet.tsx` 4 inline px font-sizes → rem (see §4 for details + the divergence from this plan's original "keep px" note). **Now paused for the user's hands-on mobile QA gate** (768px breakpoint + swipe carousel at all UI sizes). ⚠️ The original plan text below is **superseded** — kept for the record: it said to make a `READER_PREVIEW_PX = [12,14,16,18,20]` px const, but that plan targeted a pre-`develop`-merge layout where `${12 + i*2}px` was a reader preview; post-merge it's the chrome UI-text-size ramp (4 options), correctly converted to rem instead.

--- Deferred items (given their own phases so they aren't lost) ---

**Phase 8 — book-selector responsiveness (deferred):** the book/translation selector clips at the screen edges around ~1250px when UI Text Size > M. Pre-existing (also broken under the old `zoom` impl), so **not** a rem-refactor regression. Needs a focused responsive-layout fix (grid / overflow / max-width), not a px→rem swap. See §7.

**Phase 9 — (optional, a11y) honor browser font-size:** make the root base `100%` (browser preference) instead of a fixed `16px`, as an accessibility option layered on top of the UI Text Size knob (see §3, "Root font base"). Low priority; not required for #1281.

**Deferred candidate — unverified (panes):** the attached-pane splitter minimums (`minFrac = 80/rect.width`, `60/rect.height` in `PaneLayout`'s `handlePointerMove`) are raw px that reserve room for rem-sized attached-pane chrome. Not flagged by the sweep and left untouched in Phase 4. If attached panes feel cramped at XL, scale these `80`/`60` by the UI knob too (fold into Phase 8 or a Phase 4 follow-up).

--- develop-merge integration phases (added 2026-07-03) — apply the §2 invariant to develop's new px-idiom UI ---

**Phase 11 — Chat UI rem pass ✅ DONE (working tree, uncommitted — 2026-07-06):** develop redesigned the floating chat panel (adopted wholesale when resolving the `main.css` merge conflict). `main.css` `.sb-floating-chat-*` / `.sb-chat-*` chat block (`/* --- Chat panel --- */` ~8605 → `/* Login modal` ~9544) — **149 declarations converted px→rem, 27 px deliberately kept.** Ran the exact Phase-1 codemod scoped to the block by its comment markers; gates green. See §4 for the full breakdown (avatar-cluster geometry, kept-px list, precedents). `ChatView.tsx` has **no** inline styles. Was the largest of the merge phases; self-contained in `main.css`.

**Phase 12 — TutorialPrompt / tour review ✅ DONE:** develop's new `TutorialPrompt` component (`feat/restore-tutorial-prompt`). Code half committed in `4ed4b607` (`fontSizeClass` strip). CSS-audit half done in the working tree (2026-07-06): `.sb-tour-*` was already rem; the new px was confined to the `.sb-tutorial-prompt` block — **12 px→rem** converted, `em` font-sizes left (they track the UI knob via chrome inheritance post-strip). See §4 for the full breakdown. Gates green.

**Phase 13 — Today screen (`packages/today-screen/`):** separate monorepo package (DDD-layered). `infrastructure/presentation/styles/styles.css` = **866 lines, ~161 px, 28 font-size decls, 0 rem**; plus **4 inline-style files** (`components/containers/Chapter.tsx`, `HistoryCard.tsx`, `Welcome.tsx`, `components/ui/UserIcon.tsx`). Renders in the same document as the reader, so rem tracks the global `html` knob — convert chrome px→rem (same blacklist: `1px` borders, breakpoints, `box-shadow`). Classify chrome vs any fixed-graphic (avatars/icons) per §2. No-op at UI M (px/16 at the 16px base).

**Phase 14 — Scripture Map (`packages/scripture-map/`):** separate package. `styles/styles.css` = **865 lines, ~153 px, 25 font-size decls, ~0 rem**; plus **2 inline-style files** (`components/containers/Container.tsx`, `Tooltip.tsx`). Convert **chrome UI** (controls, settings panel, tooltips, book list, labels) px→rem, but **keep px for map-canvas / marker / coordinate geometry** — the spatial canvas is its own coordinate space (same rule as the pane `x/y/w/h` model, §2). **Riskiest** of the merge phases: classify "UI chrome" vs "map geometry" _before_ converting; the `Container.tsx`/`Tooltip.tsx` inline styles likely mix marker positioning (keep px) with box styling (rem).

**Merge-phase ordering:** run 11–14 in the per-area rollout, before Phase 10 (cleanup). Suggested order: **11** (chat, in-family) ✅ → **12** (tutorial, small) ✅ → **13** (today) → **14** (map, needs classification). Each gets the static gates (`check:ts`/`lint`/`test`/`build`) and is a no-op at UI M.

**Phase 10 — cleanup (FINAL — runs after every other phase, incl. 8–9 and the merge phases 11–14):** remove the `postcss-pxtorem` dev-dep; add a `main.css` header comment documenting the rem/em/px invariant + the codemod blacklist as source of truth. Consider deleting this handoff doc once merged.

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

- [x] Phase 0 + 1 committed (`5e752106`), merged with `develop` (`168b7fbb`).
- [x] Phase 7 (`f0e2c921`), Phase 2 (`0190a5b7`), Phase 4 + rename (`e469fbb`), Phase 5 (`337b1794`), Phase 6 (`275184e7`) committed.
- [x] Phase 3 — verified clean, no code changes.
- [x] **Second `develop` merge (2026-07-03) — COMMITTED** (`16461f74`), plus `4ed4b607` (Phase 12 `fontSizeClass` strip). Full gates re-run green post-merge.
- [x] Phase 11 (chat UI) — committed (`3c3731f`).
- [ ] **Phase 12 (tutorial/tour) — in the working tree, UNCOMMITTED** (`main.css` + this doc). Gates green. Commit is the user's to make (`/commit`).
- [ ] Push `fix/1281-ui-scaling` to the remote — **only when the user explicitly asks.**
- [ ] Phase 8 (book selector); Phases 13–14 (merge integration); deferred Phase 9; Phase 10 (cleanup — runs last) — not started.
