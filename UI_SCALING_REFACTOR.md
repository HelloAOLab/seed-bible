# UI Scaling Refactor — Work Log & Handoff

**Branch:** `fix/1281-ui-scaling` · **Issue:** #1281 · **Status:** Rem-based UI scaling — **Phases 0–8, 10, 11–14 done. Refactor complete; only the optional Phase 9 (a11y browser-pref) remains deferred. Ready to push / open PR.**

- **Committed:** Phase 0+1 (`5e752106`), Phase 7 (`f0e2c921`), Phase 2 (`0190a5b7`), Phase 4 (`e469fbb`), Phase 5 (`337b1794`), Phase 6 (`275184e7`). Plus the ThemeManager var-collision fix (`5ec5f44f`). An earlier `develop` merge landed at `168b7fbb`.
- **Phase 3** = verified clean, **no code changes** (see §4).
- **✅ The second `develop` merge (2026-07-03) is now COMMITTED** — merge commit `16461f74`, followed by `4ed4b607` (the TutorialPrompt `fontSizeClass` strip — the code half of Phase 12). The `main.css` conflict + `main.tsx` `fontSizeClass` collision were resolved in that merge. This merge spawned integration **Phases 11–14** (§8). Full gates re-run green post-merge (see §5).
- **Phase 11 (chat UI)** = ✅ committed (`3c3731f`) — see §4.
- **Phase 12 (tutorial/tour)** = ✅ committed (`9c4a7fe6`). Code half was `4ed4b607` (`fontSizeClass` strip); the CSS-audit half converted the `.sb-tutorial-prompt` block (12 px→rem). See §4.
- **Phase 13 (today screen)** = ✅ committed (`a674f8e7`). `today-screen` package: whole `styles.css` + 3 inline icon sizes → rem; 2 unit tests updated. See §4.
- **Phase 14 (scripture map)** = ✅ committed (`c0f424f1`, together with the icon-scaling QA fixes). `scripture-map` chrome px→rem (settings/controls/tooltip), **map-canvas geometry kept px** (scale-factor coordinate space); 2 inline px + 2 pinned tests updated. See §4.
- **Phase 8 (book-selector responsiveness)** = ✅ **complete, uncommitted in working tree** (2026-07-06). Capped `.sb-selector-panel` width to the viewport so it stops clipping at L/XL. See §7/§8.
- **Icon-scaling QA fixes** (committed `c0f424f1`): app-wide `body .material-symbols-outlined { font-size: 1.5rem }` base + per-button SVG rem sizing + the scripture-map settings `<img>` `.coloredIcon`. See §7.
- **Naming:** the scale-map constant was renamed `UI_TEXT_SIZE_SCALE` → **`UI_TEXT_SIZE_SCALE_MAP`** (in `e469fbb`). Older references below may still say the old name.
- **Remaining:** only the deferred **Phase 9** (optional a11y browser-pref, not required for #1281). Everything else — mechanism swap, all per-area passes, all develop-merge integration, book-selector responsiveness, and final cleanup — is done. Next action is push + PR.
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

### Phase 12 — tutorial/tour review ✅ (committed `9c4a7fe6`)

- **Code half — already committed (`4ed4b607`):** develop's new `TutorialPrompt` reintroduced the pre-refactor overlay convention `className={`${fontSizeClass} ${webkitClass}`}`; that commit stripped `fontSizeClass` so it matches its chrome siblings (`Tutorial`/`OnboardingModals`/`BibleSelector`). This is the fix that makes the prompt's `em` font-sizes track the **UI** knob instead of the reader knob (see below).
- **CSS-audit half — this pass:** the shared `.sb-tour-*` rules (~1661–1847) were **already rem** from Phase 1 — the only px left there are `box-shadow`, the `9999px` spotlight mask, and `2px`/`1px` borders, all correctly kept per §2. The **new px was confined to the `.sb-tutorial-prompt` block** (develop-added, 1849–1920). Converted **12 declarations px→rem** via the marker-scoped codemod (`.sb-tutorial-prompt {` → `.sb-reader-toolbar {`): `top/right: 16px → 1rem`, `width: min(340px, calc(100vw - 32px)) → min(21.25rem, calc(100vw - 2rem))`, `border-radius 14px/10px → 0.875rem/0.625rem`, `padding 18px → 1.125rem` and `8px 16px → 0.5rem 1rem`, `margin 6px/16px → 0.375rem/1rem`, `font-size 16px → 1rem`, `gap 8px/6px → 0.5rem/0.375rem`.
- **3 px kept** (confirmed): the `box-shadow: 0 16px 40px` and the `1px` button border.
- **`em` font-sizes left as-is (intentional):** `.sb-tutorial-prompt-body` `0.95em`, `-btn` `0.9em`, `-arrow` `1.05em`. Post-`4ed4b607` the prompt inherits the chrome base (`16px × UI scale`), so these `em` now resolve against the UI-scaled base and already track the UI knob — behavior-identical to rem here. Converting them would be a no-op normalization; left them to keep the diff minimal and in-scope (the phase converts stray **px**).
- **`TutorialPrompt.tsx` has no inline styles** — nothing to convert in JSX.
- **Gates green:** `check:ts` (0 err) · `lint` (0 err / 251 pre-existing warns) · `test` (2520/2520) · `build` (✓). Exact no-op at UI size M.

### Phase 13 — Today screen rem pass ✅ (committed `a674f8e7`)

- **Render context confirmed:** `today-screen` is an in-process extension (not an `ao.bot` iframe) — `Today.tsx` does `import "./../styles/styles.css"`, so its CSS lands in the main document and **`rem` tracks the global `html` knob** (rem is root-relative, no inheritance caveats).
- **`styles.css` (866 lines, was 150 px / 0 rem):** ran the whole-file codemod (`pxtorem-full.cjs`, same Phase-1 opts) — the file has no reader/`html` selectors so the whole thing is chrome. **~130 declarations px→rem.** **20 px kept** (verified): `1px`/`2px`/`solid` borders, the 3 `box-shadow`s, the `0.5px` hairline divider, two `transform: translate` offsets, `text-underline-offset: 4px`, the `@media (width <= 480px)` condition, and the `mask-image` fade-gradient stops (`0px`/`8px` — a visual affordance, like box-shadow).
- **2 px `line-height`s hand-converted** (codemod excludes `line-height`): `.welcome-screen-verse` `44px → 2.75rem` and `.today-content h1` `32px → 2rem`. **Why:** these sit on scaling chrome text; a fixed px line-height would cramp/overlap the text at L/XL (e.g. `.today-content h1` font `25px → 1.5625rem` vs a frozen 32px line-box). rem line-height scales with the font, preserving the ratio.
- **3 inline icon sizes → rem** (the codemod only touches CSS): `Welcome.tsx` `SpinnerIcon 36px → 2.25rem`; `useWelcome.tsx` `seedBibleIconStyle 20px → 1.25rem`; `useSearchSection.tsx` `seedBibleIconStyle 24px → 1.5rem`. **2 unit tests** that pin those style objects updated to the rem values (`useWelcome.test.tsx`, `useSearchSection.test.tsx`).
- **Fixed-graphic classification (per §2):** the icons/avatars here (seed-bible/spinner mask PNGs, `.filtered-reading-book-icon` avatars, chapter squares, status dots) are chrome decorations with no internal px coordinate system, so they **scale with the UI knob** (rem) — consistent with the Phase 11 chat-avatar decision. The `2px` avatar border stays px (border rule). The only true pixel-lattice, `useMicroGrid.tsx` (`GAP/CELL_SIZE = 8`, reads `offsetWidth`), is **commented out / dormant** (`FilteredReading.tsx:16`), so its backing `.filtered-reading-container { gap }` is a plain flex gap with no JS px-sync requirement — converted freely. Left the dead `useMicroGrid.tsx` untouched.
- **Other inline styles are color-only** (`Chapter.tsx`, `HistoryCard.tsx`, `UserIcon.tsx` — `backgroundColor` from theme/data), nothing to convert.
- **Gates green:** `check:ts` (0 err) · `lint` (0 err / 251 pre-existing warns) · `test` (2520/2520, after updating the 2 icon-style assertions) · `build` (✓). Exact no-op at UI size M.
- **Not code (verify at QA):** open Today at UI L/XL and eyeball the header, resume card, search dropdown, history filters, presence card, and bookmarks row for layout/wrap breakage.

### Phase 14 — Scripture Map rem pass ✅ (working tree, uncommitted — 2026-07-06)

- **The classification (the whole point of this phase):** the map is a **zoomable canvas**. Its cell geometry scales with the map's _own_ zoom via `calc(<px> * var(--scale-factor))` and the `--chapter-*`/`--book-*` CSS vars (set inline by `useScriptureMapWrapper`, in px). Converting those px to rem would make the map **double-scale** (its own zoom × the UI text knob) — wrong. So map geometry stays px; only the surrounding chrome converts.
  - **Canvas → keep px (styles.css ~lines 491–743):** `.scripture-map-container` and everything nested — `.testament-*`, `.scripture-map-books-container`, `.book-container`/`.book-cover`/`.book-header`/`.book-id`/`.book-name`, `.chapter` (+ presence rings), and the scale-factor-driven `.scripture-map-toggle`/`.toggle-*` section headers. Includes the non-scaled canvas floors (`.scripture-map-container padding`, `.book-container min-height: 80px`) — they're map-coordinate space, not chrome, so tying them to the UI knob would be wrong.
  - **Chrome → rem (styles.css ~1–489 + 745–866):** wrapper frame, settings bar/panel/filters/selection, controls bar, zoom selector, tooltip, dividers, filter swatch.
- **Method:** a **targeted postcss transform** (`scripture-map-pxtorem.cjs`) — same rem base + kept-px rules as Phase 1, but it **skips any rule whose selector names a canvas token AND any declaration referencing `var(--scale-factor|--chapter|--book)`** (belt-and-suspenders). **85 chrome declarations px→rem.** Verified: zero rem landed inside any scale-factor `calc()`; the diff hunks are confined to lines ≤489 and ≥752 (canvas region 490–751 untouched).
- **Kept px (besides all canvas geometry):** `1px`/`1.5px` hairlines, `2px`/`3px`/`5px` borders, box-shadows, `transform: translate` offsets, and the `.zoom-level-selector > button` `calc(var(--scale-factor) * 4px)` radius (a lone scale-factor use in chrome — left as-is rather than risk a behavior change).
- **Inline styles (2 px):** `Tooltip.tsx` `+N` overflow-badge `fontSize 12px → 0.75rem` (box styling); `useScriptureMapWrapper.tsx` `paddingBottom 40px/16px → 2.5rem/1rem` (chrome frame). The wrapper's `--book-width`/`--chapter-*` vars **stay px** (canvas coord space).
- **Tooltip positioning left px (intentional):** `useTooltip.tsx` sets `top/left` from `getBoundingClientRect` coords and an `offset = 8` anchor gap — a CSS-px coordinate space (like the Phase 7 verse-toolbar), so it stays px. `Container.tsx` inline is `gap: 0` (nothing to convert).
- **QA fix (settings-button icon):** the header settings button (`Settings.tsx`) renders an **`<img>`** (`SETTINGS_ICON`, an external 16×16 SVG) with class `.coloredIcon`, which had **no CSS at all** — so `font-size` never sized it (it was a dead `28px→1.75rem` no-op, pre-existing from develop), and the icon stayed a fixed 16px while its grid cell scaled. Added `.settings-button .coloredIcon { width: 1rem; height: 1rem }` — 1rem = its intrinsic 16px at M (no-op), scales at L/XL. NB: the button's `font-size: 1.75rem !important` implies a 28px design intent that never took effect on the `<img>`; left the icon at its real 16px (bump `.coloredIcon` to `1.75rem` if a larger gear is wanted — a separate size decision, not a scaling fix).
- **Tests:** 2 pinned assertions updated (`useScriptureMapWrapper.test.tsx` `paddingBottom` → rem); the `--chapter-*` px assertions in that same file were **left unchanged** (canvas vars, correctly still px). The `ScriptureMapWrapper.test.tsx` component tests mock the hook with arbitrary px and assert forwarding — unaffected.
- **Gates green:** `check:ts` (0 err) · `lint` (0 err / 251 pre-existing warns) · `test` (2520/2520) · `build` (✓). Exact no-op at UI size M.
- **Not code (verify at QA):** open the Scripture Map at UI L/XL — the settings panel, controls/zoom bar, and tooltips should scale; the **book/chapter grid must NOT change** with UI size (it only responds to its own zoom control). Also confirm the map still zooms correctly via its own control at each UI size.

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

- **[✅ FIXED — QA 2026-07-06] Material Symbols icons didn't scale with UI Text Size (systemic).** The Material Symbols font stylesheet (loaded via the Google Fonts `<link>` in `main.tsx`) ships a base `.material-symbols-outlined { font-size: 24px }`. Any icon _without_ a scoped rem/em override fell through to that fixed 24px and ignored the UI knob (surfaced during Phase 14 QA on the scripture-map header and the detached-pane toolbar, whose own icon rule was commented out). **Fix:** one systemic base rule in `main.css` — `body .material-symbols-outlined { font-size: 1.5rem }` (1.5rem = 24px at M, no-op at M; every icon now scales by default). Specificity `(0,1,1)` beats the font's base `(0,1,0)` regardless of stylesheet load order, and loses to the scoped `.sb-* .material-symbols-outlined` overrides `(0,2,0)`, which keep their sizes. **QA at L/XL:** watch for any icon overflowing a still-fixed container (intended-to-scale, but worth an eyeball). NB: the scripture-map settings button is a separate case — it's an `<img>`, not a font glyph, fixed separately via `.settings-button .coloredIcon` rem sizing (see §4 Phase 14).
- **[✅ FIXED — QA 2026-07-06] SVG icon-buttons didn't scale with UI Text Size.** Distinct from the Material Symbols issue above: several chrome icon-buttons render their icon as an **`<svg>`** (inline or an icon component from `icons.tsx`) with fixed px `width`/`height` attributes, so the button box scaled (rem) but the icon inside stayed fixed. The font base rule can't help — SVGs are sized by width/height, not `font-size`. **Fix (`main.css`):** a consolidated block sizing each button's `svg` in rem (CSS width/height overrides the SVG's px attributes; values = current px ÷ 16, no-op at M): `.sb-quick-toolbar-button` / `.sb-sidebar-icon-button` (settings) / `.sb-sidebar-tabs-header-icon-button` (bookmarks + tasks) → `1.5rem` (24px); `.sb-bible-reader-bookmark-button` → `1.375rem` (22px); `.sb-tab-bookmark-button` → `1.125rem` (18px). Non-square/`size`-prop icons keep their aspect since each group matches its icon's real dimensions. **Note for future icons:** any new chrome button using an `<svg>` icon needs a rem width/height rule (no app-wide base is possible for SVGs — they vary in intrinsic size and aspect ratio, unlike the uniform Material Symbols glyphs).
- **[✅ FIXED — Phase 8, 2026-07-06] Book selector clipped at the screen edges ~1250px at UI Text Size > M.** Root cause: `.sb-selector-panel` used a fixed rem width (`40.625rem` ≥769px, `68.75rem` ≥1201px) that scaled past the viewport at L/XL (`68.75rem` = 1100px at M but 1265px at L / 1430px at XL). The panel is a centered `position: absolute` element, so once wider than the viewport its left/right edges ran off-screen. Pre-existing (also broken under old `zoom`). **Fix:** capped both desktop widths to the viewport — `width: min(<rem>, calc(100vw - 2.5rem))` (the `2.5rem` = the overlay's `1.25rem` padding each side), matching the chat/search/login `min()` pattern. No-op at M / on wide viewports; fits with margin at L/XL. See §8 Phase 8.
- **[Phase 7 ✅ DONE] Verse-toolbar edge clamp at L/XL** — the floating verse-selection toolbar's `84`/`64` clamp insets now scale by `UI_TEXT_SIZE_SCALE[uiTextSize]`. Fixed + verified; awaiting joint QA.
- **[Sibling raw-px-under-rem bugs found by the Phase 7 verification sweep — both minor, both pre-existing rem-refactor regressions — NOW FIXED]:**
  - **[Phase 4 ✅ FIXED `e469fbb`] Floating detached-pane min-size floors** — `PanesManager.resizePane` now takes a `uiScale` param and scales the floors (`320`/`180`/`280×180`) by `UI_TEXT_SIZE_SCALE_MAP[uiTextSize]` (threaded from `PaneLayout` via `getUiScale()`). Pane `x/y/w/h` stay unscaled px (canvas). New unit test asserts the floating floor clamps to `280×1.3 / 180×1.3` at scale 1.3.
  - **[Phase 5 ✅ FIXED (working tree)] Mobile TranslationInfo popover offset** — `BibleSelector.tsx` mobile branch `left: calc(${position.x}px - 265px)` → `calc(${position.x}px - 16.5625rem)`. Because `1rem = 16px × --sb-ui-scale`, the offset auto-tracks the `15.625rem` popover with no prop-threading; exact no-op at M, no longer clips at L/XL. Desktop branch left alone (sweep adjudicated it not a regression).
- **Not yet QA'd:** multi-pane layouts (split-2v, grid-2x2) and mobile (≤768) — single-pane desktop only so far.
- **Intended behavior change:** at non-M _reader_ sizes, chrome text no longer follows the reader knob (that leak was the bug); at reader = M it's a pure no-op.

## 8. NEXT STEPS

**Phases 0–7 + 11 + 12 + 13 + 14 — DONE** (code). All develop-merge integration phases (11–14) are complete. See §4 for what each did and its commit ref. Phases 11 (`3c3731f`) + 12 (`9c4a7fe6`) + 13 (`a674f8e7`) are committed; Phase 14 (scripture map) is done in the working tree, uncommitted. Remaining: **Phase 8** (book-selector responsiveness), the deferred **Phase 9** (optional a11y), and the **final Phase 10 (cleanup)** which runs after all of them.

> **`develop` merge (2026-07-03):** a large feature merge brought in new UI written in the **pre-refactor px idiom**. The merge itself is in the working tree, uncommitted (the CSS conflict + one semantic collision are resolved & staged — see §10). develop's new UI does not honor the UI Text Size knob until converted; this spawned integration Phases **11–14** below. Decision (2026-07-03): the two separate feature packages (Today, Scripture Map) **should** scale — treat as chrome, convert px→rem (the map keeps its canvas/marker geometry in px).

**Phase 6 — mobile ✅ (code done, awaiting QA gate):** `MobileSettingsSheet.tsx` 4 inline px font-sizes → rem (see §4 for details + the divergence from this plan's original "keep px" note). **Now paused for the user's hands-on mobile QA gate** (768px breakpoint + swipe carousel at all UI sizes). ⚠️ The original plan text below is **superseded** — kept for the record: it said to make a `READER_PREVIEW_PX = [12,14,16,18,20]` px const, but that plan targeted a pre-`develop`-merge layout where `${12 + i*2}px` was a reader preview; post-merge it's the chrome UI-text-size ramp (4 options), correctly converted to rem instead.

--- Deferred items (given their own phases so they aren't lost) ---

**Phase 8 — book-selector responsiveness ✅ DONE (working tree, uncommitted — 2026-07-06):** the book/translation selector clipped at the screen edges around ~1250px when UI Text Size > M. Root cause: `.sb-selector-panel`'s fixed rem width (`40.625rem`/`68.75rem`) scaled past the viewport at L/XL on a centered `position: absolute` panel. **Fix:** capped both desktop breakpoint widths to `min(<rem>, calc(100vw - 2.5rem))` — a responsive cap (not a px→rem swap), matching the chat/search/login `min()` pattern; no-op at M. See §7 for the before/after. Gates green (2520/2520). **Verify at QA:** open the selector at ~1250px viewport with UI Text Size L/XL — the panel should now sit within the screen with a small margin instead of running off both edges.

**Phase 9 — (optional, a11y) honor browser font-size:** make the root base `100%` (browser preference) instead of a fixed `16px`, as an accessibility option layered on top of the UI Text Size knob (see §3, "Root font base"). Low priority; not required for #1281.

**Deferred candidate — unverified (panes):** the attached-pane splitter minimums (`minFrac = 80/rect.width`, `60/rect.height` in `PaneLayout`'s `handlePointerMove`) are raw px that reserve room for rem-sized attached-pane chrome. Not flagged by the sweep and left untouched in Phase 4. If attached panes feel cramped at XL, scale these `80`/`60` by the UI knob too (fold into Phase 8 or a Phase 4 follow-up).

--- develop-merge integration phases (added 2026-07-03) — apply the §2 invariant to develop's new px-idiom UI ---

**Phase 11 — Chat UI rem pass ✅ DONE (working tree, uncommitted — 2026-07-06):** develop redesigned the floating chat panel (adopted wholesale when resolving the `main.css` merge conflict). `main.css` `.sb-floating-chat-*` / `.sb-chat-*` chat block (`/* --- Chat panel --- */` ~8605 → `/* Login modal` ~9544) — **149 declarations converted px→rem, 27 px deliberately kept.** Ran the exact Phase-1 codemod scoped to the block by its comment markers; gates green. See §4 for the full breakdown (avatar-cluster geometry, kept-px list, precedents). `ChatView.tsx` has **no** inline styles. Was the largest of the merge phases; self-contained in `main.css`.

**Phase 12 — TutorialPrompt / tour review ✅ DONE:** develop's new `TutorialPrompt` component (`feat/restore-tutorial-prompt`). Code half committed in `4ed4b607` (`fontSizeClass` strip). CSS-audit half done in the working tree (2026-07-06): `.sb-tour-*` was already rem; the new px was confined to the `.sb-tutorial-prompt` block — **12 px→rem** converted, `em` font-sizes left (they track the UI knob via chrome inheritance post-strip). See §4 for the full breakdown. Gates green.

**Phase 13 — Today screen ✅ DONE (working tree, uncommitted — 2026-07-06):** `packages/today-screen/` (DDD-layered). `styles.css` whole-file codemod (~130 px→rem, 20 px kept) + 2 hand-converted px `line-height`s + 3 inline icon sizes → rem (in `Welcome.tsx` and the `useWelcome`/`useSearchSection` hooks, not the 4 files this plan originally guessed) + 2 unit-test assertions updated. Renders in-document (in-process extension), so rem tracks the global knob. Icons/avatars scale (chrome, no internal px coord system); the only pixel-lattice `useMicroGrid` is dormant (commented out). See §4 for the full breakdown. Gates green (2520/2520).

**Phase 14 — Scripture Map ✅ DONE (working tree, uncommitted — 2026-07-06):** `packages/scripture-map/`. Classified chrome vs map-canvas up front (the map cells scale with the map's own zoom via `calc(<px> * var(--scale-factor))` + `--chapter-*`/`--book-*` vars). Ran a **targeted transform** that converts chrome only and skips canvas selectors + any scale-factor/chapter/book var (85 chrome decls px→rem); map geometry kept px. 2 inline px converted (tooltip badge font, wrapper paddingBottom), tooltip _positioning_ left px (coordinate space), 2 pinned tests updated. See §4 for the full classification. Gates green (2520/2520).

**Merge-phase ordering:** run 11–14 in the per-area rollout, before Phase 10 (cleanup). Order run: **11** (chat) ✅ → **12** (tutorial) ✅ → **13** (today) ✅ → **14** (map, classified canvas vs chrome) ✅. **All merge phases complete.** Each got the static gates (`check:ts`/`lint`/`test`/`build`) and is a no-op at UI M.

**Phase 10 — cleanup ✅ DONE (working tree, uncommitted — 2026-07-06):** removed the `postcss-pxtorem` dev-dep (`package.json` + `pnpm-lock.yaml`) — it was only needed for the one-time codemods, which are all done and nothing else in the repo referenced it; build still green. Added a source-of-truth header comment to the top of `main.css` documenting the rem/em/px invariant, the icon rules (Material Symbols base vs. per-button SVG sizing), and the codemod blacklist. **Deferred to merge:** deleting this handoff doc — keep it until `fix/1281-ui-scaling` merges, then it can go.

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
- [x] Phase 12 (tutorial/tour) — committed (`9c4a7fe6`).
- [x] Phase 13 (today screen) — committed (`a674f8e7`).
- [x] Phase 14 (scripture map) + icon-scaling QA fixes — committed (`c0f424f1`).
- [x] Phase 8 (book selector) — committed (`da1d42f0`).
- [ ] **Phase 10 (cleanup) — in the working tree, UNCOMMITTED** (`package.json` + `pnpm-lock.yaml` postcss-pxtorem removal + `main.css` invariant header + this doc). Gates green. Commit is the user's to make (`/commit`).
- [ ] Push `fix/1281-ui-scaling` to the remote — **only when the user explicitly asks.**
- [ ] Deferred Phase 9 (optional a11y) — not started, not required for #1281.
