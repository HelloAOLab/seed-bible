import * as z from "zod/v4";
import { v4 as uuid } from "uuid";
import {
  computed,
  signal,
  type ReadonlySignal,
  type Signal,
} from "@preact/signals";
import type { CasualOSManager } from "./OsManager";
import type { LoginManager } from "./LoginManager";
import type { NavigationManager } from "./NavigationManager";
import type { CustomizationVariantSelectionsManager } from "./CustomizationVariantSelectionsManager";
import type { CustomizationExtensionPreferencesManager } from "./CustomizationExtensionPreferencesManager";
import {
  applyHighlightOverrides,
  filterValidColorOverrides,
  filterValidFontFamilyOverrides,
  LIGHT_THEME_FONT_DEFAULTS,
  type BibleTheme,
  type HighlightOverrides,
  type ThemeColorKey,
  type ThemeFontFamilyKey,
  type ThemeHighlightColor,
  type ThemeManager,
  type ThemeOverrides,
} from "./ThemeManager";

export const CUSTOMIZATION_MARKER = "publicRead:seedBibleCustomization";

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  return (
    "#" +
    [r, g, b]
      .map((c) =>
        Math.round(Math.min(255, Math.max(0, c)))
          .toString(16)
          .padStart(2, "0")
      )
      .join("")
  );
}

function rgbToHsl([r, g, b]: [number, number, number]): [
  number,
  number,
  number,
] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) {
    return [0, 0, l];
  }
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === rn) {
    h = ((gn - bn) / d) % 6;
  } else if (max === gn) {
    h = (bn - rn) / d + 2;
  } else {
    h = (rn - gn) / d + 4;
  }
  h *= 60;
  if (h < 0) {
    h += 360;
  }
  return [h, s, l];
}

function hslToRgb([h, s, l]: [number, number, number]): [
  number,
  number,
  number,
] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r1, g1, b1] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];
  return [(r1 + m) * 255, (g1 + m) * 255, (b1 + m) * 255];
}

/** Lightens a hex color toward white by `amount` (0-1) of its remaining headroom. */
export function lightenColor(hex: string, amount: number): string {
  const [h, s, l] = rgbToHsl(hexToRgb(hex));
  return rgbToHex(hslToRgb([h, s, l + (1 - l) * amount]));
}

export const SECONDARY_LIGHTEN_AMOUNT = 0.35;
export const TERTIARY_LIGHTEN_AMOUNT = 0.55;

/** Linearizes one sRGB channel (0-255) per the WCAG relative-luminance formula. */
function srgbChannelToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** WCAG relative luminance (0-1) of a hex color. */
function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return (
    0.2126 * srgbChannelToLinear(r) +
    0.7152 * srgbChannelToLinear(g) +
    0.0722 * srgbChannelToLinear(b)
  );
}

/**
 * WCAG contrast ratio between two colors, from 1 (identical) to 21 (black on
 * white) — https://www.w3.org/TR/WCAG21/#contrast-minimum. Symmetric: the
 * argument order doesn't matter.
 */
export function getContrastRatio(hexA: string, hexB: string): number {
  const luminanceA = relativeLuminance(hexA);
  const luminanceB = relativeLuminance(hexB);
  const lighter = Math.max(luminanceA, luminanceB);
  const darker = Math.min(luminanceA, luminanceB);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * WCAG AA's minimum contrast ratio for normal-sized text. Below this, text
 * is considered hard to read against its background.
 */
export const MIN_READABLE_CONTRAST_RATIO = 4.5;

export interface CustomizationContrastPair {
  /** The text/foreground color field. */
  foreground: ThemeColorKey;
  /** The field it's expected to be read against. */
  background: ThemeColorKey;
  /** Human-readable description of the pair, e.g. for a warning tooltip. */
  label: string;
}

/**
 * Every foreground/background color pair in a theme that's meant to hold
 * readable text — e.g. `primaryFontColor` text drawn on a `primaryColor`
 * surface. Used to warn when a customization's colors don't leave enough
 * contrast to stay readable. Deliberately excludes fields with no natural
 * reading pair (`tertiaryColor`, `dividerColor`,
 * `selectedVerseTextDecorationColor`) — those aren't backgrounds text sits
 * on top of.
 */
export const CUSTOMIZATION_CONTRAST_PAIRS: CustomizationContrastPair[] = [
  {
    foreground: "primaryFontColor",
    background: "primaryColor",
    label: "Primary text on primary",
  },
  {
    foreground: "secondaryFontColor",
    background: "secondaryColor",
    label: "Secondary text on secondary",
  },
  {
    foreground: "fontColor",
    background: "background",
    label: "Text on app background",
  },
  {
    foreground: "linkColor",
    background: "readerBackground",
    label: "Link on reader background",
  },
  {
    foreground: "linkVisitedColor",
    background: "readerBackground",
    label: "Visited link on reader background",
  },
  {
    foreground: "readerFontColor",
    background: "readerBackground",
    label: "Reader text on reader background",
  },
  {
    foreground: "bookTitleFontColor",
    background: "readerBackground",
    label: "Book title on reader background",
  },
  {
    foreground: "chapterHeadingFontColor",
    background: "readerBackground",
    label: "Chapter heading on reader background",
  },
  {
    foreground: "verseFontColor",
    background: "readerBackground",
    label: "Verse text on reader background",
  },
  {
    foreground: "hebrewSubtitleFontColor",
    background: "readerBackground",
    label: "Hebrew subtitle on reader background",
  },
  {
    foreground: "sidebarFontColor",
    background: "sidebarBackground",
    label: "Sidebar text on sidebar background",
  },
  {
    foreground: "readerToolbarFontColor",
    background: "readerToolbarBackground",
    label: "Reader toolbar text on reader toolbar background",
  },
  {
    foreground: "readerToolbarFloatingButtonFontColor",
    background: "readerToolbarFloatingButtonBackground",
    label: "Floating button text on floating button background",
  },
];

const customizationVariantHighlightColorSchema = z.object({
  color: z.string().optional(),
  fontColor: z.string().optional(),
  wordsOfJesusFontColor: z.string().optional(),
});

const customizationVariantSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  /**
   * Id of the built-in preset (an entry in `theme.themes.value`, e.g.
   * "light"/"dark") this theme falls back to for any field not present in
   * `themes`/`highlightColors` below. Defaults to "light" for records
   * persisted before this field existed — harmless, since those records'
   * `themes`/`highlightColors` were always fully populated at creation
   * time, so there's nothing left for a base theme to fill in.
   */
  baseTheme: z.string().min(1).default("light"),
  /**
   * Color/font overrides explicitly set by the user, keyed by
   * `ThemeColorKey`/`ThemeFontFamilyKey`. A key's absence means "inherit
   * `baseTheme`'s value", not "no value" — see `buildBibleThemeFromCustomizationTheme`.
   */
  themes: z.record(z.string(), z.string()),
  /**
   * Per-highlight-id color overrides, in the same shape as `ThemeManager`'s
   * own `HighlightOverrides` — keyed by highlight id (e.g. "yellow"), each
   * entry a partial `{ color, fontColor, wordsOfJesusFontColor }` patch. A
   * highlight id (or one of its fields) absent here also means "inherit
   * from `baseTheme`."
   */
  highlightColors: z
    .record(z.string(), customizationVariantHighlightColorSchema)
    .default({}),
  createdAt: z.number(),
  updatedAt: z.number(),
});

/**
 * How a customization treats one extension from the app's known catalog
 * while it's active:
 * - `available` (the default for any extension with no explicit entry):
 *   shown in Settings → Extensions; the viewer may install/uninstall it
 *   themselves, same as outside any customization.
 * - `auto-installed`: force-installed with no prompt while the
 *   customization is active; shown but can't be uninstalled from there.
 * - `hidden`: not shown in Settings → Extensions at all while the
 *   customization is active.
 */
export const EXTENSION_AVAILABILITY_VALUES = [
  "available",
  "auto-installed",
  "hidden",
] as const;
export type ExtensionAvailability =
  (typeof EXTENSION_AVAILABILITY_VALUES)[number];
const extensionAvailabilitySchema = z.enum(EXTENSION_AVAILABILITY_VALUES);

const customizationSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    variants: z.array(customizationVariantSchema).min(1),
    defaultVariantId: z.string().min(1),
    logoUrl: z.url().max(1024).optional().nullable(),
    createdAt: z.number(),
    updatedAt: z.number(),
    /**
     * Per-extension availability while this customization is active,
     * keyed by extension id. Every id must reference the app's own known
     * extension catalog — never a URL or other free-form identity, since
     * `auto-installed` installs with no confirmation step. An id with no
     * entry here defaults to `available`. Only ever written from the
     * select in CustomizationEditExtensionsSettingsView.
     */
    extensionSettings: z
      .record(z.string(), extensionAvailabilitySchema)
      .default({}),
  })
  .refine((r) => r.variants.some((v) => v.id === r.defaultVariantId), {
    message: "defaultVariantId must reference an existing variant",
  });

export interface CustomizationThemeVariant {
  id: string;
  name: string;
  /**
   * Id of the built-in preset (an entry in `theme.themes.value`) this theme
   * falls back to for any field not present in `themes`/`highlightColors`.
   * See `buildBibleThemeFromCustomizationTheme`.
   */
  baseTheme: string;
  /**
   * Color/font overrides explicitly set by the user, in the same shape as
   * `ThemeManager`'s own `ThemeOverrides`. A key's absence means "inherit
   * `baseTheme`'s value" — this is what makes "has the user overridden
   * this field" a simple presence check rather than something tracked
   * separately.
   */
  themes: ThemeOverrides;
  /** Per-highlight-id color overrides, in the same shape as `ThemeManager`'s own `HighlightOverrides`. Absence follows the same inherit-from-`baseTheme` rule as `themes`. */
  highlightColors: HighlightOverrides;
  createdAt: number;
  updatedAt: number;
}

export interface SeedBibleCustomization {
  id: string;
  name: string;
  /** Named theme variants (e.g. a "Light" and "Dark" pair) authored for this customization. Always has at least 1 entry. */
  variants: CustomizationThemeVariant[];
  /** The variant id shown to a viewer who hasn't picked one for this customization yet. Always references an entry in `variants`. */
  defaultVariantId: string;
  logoUrl?: string | null;
  createdAt: number;
  updatedAt: number;
  /** Per-extension availability while this customization is active. An id with no entry defaults to "available". */
  extensionSettings: Record<string, ExtensionAvailability>;
}

/** Resolves an extension's effective availability for a customization, defaulting to "available" when unset. */
export function getExtensionAvailability(
  customization: SeedBibleCustomization | null,
  extensionId: string
): ExtensionAvailability {
  return customization?.extensionSettings[extensionId] ?? "available";
}

function buildCustomizationLocator(recordName: string, id: string): string {
  return `${recordName}.${id}`;
}

function narrowVariants(
  variants: {
    id: string;
    name: string;
    baseTheme: string;
    themes: Record<string, string>;
    highlightColors: HighlightOverrides;
    createdAt: number;
    updatedAt: number;
  }[]
): CustomizationThemeVariant[] {
  return variants.map((variant) => ({
    ...variant,
    themes: {
      ...filterValidColorOverrides(variant.themes),
      ...filterValidFontFamilyOverrides(variant.themes),
    },
  }));
}

export interface CustomizationColorGroup {
  id: string;
  title: string;
  fields: { key: ThemeColorKey; label: string }[];
}

export const CUSTOMIZATION_COLOR_GROUPS: CustomizationColorGroup[] = [
  {
    id: "brand",
    title: "Brand",
    fields: [
      { key: "primaryColor", label: "Primary" },
      { key: "primaryFontColor", label: "Primary text" },
      { key: "secondaryColor", label: "Secondary" },
      { key: "secondaryFontColor", label: "Secondary text" },
      { key: "tertiaryColor", label: "Tertiary" },
      { key: "linkColor", label: "Link" },
      { key: "linkVisitedColor", label: "Visited link" },
    ],
  },
  {
    id: "surfaces",
    title: "Surfaces",
    fields: [
      { key: "background", label: "App background" },
      { key: "readerBackground", label: "Reader background" },
      { key: "sidebarBackground", label: "Sidebar background" },
      { key: "readerToolbarBackground", label: "Reader toolbar background" },
      {
        key: "readerToolbarFloatingButtonBackground",
        label: "Floating button background",
      },
      { key: "dividerColor", label: "Divider" },
    ],
  },
  {
    id: "text",
    title: "Text",
    fields: [
      { key: "fontColor", label: "Text" },
      { key: "readerFontColor", label: "Reader text" },
      { key: "sidebarFontColor", label: "Sidebar text" },
      { key: "bookTitleFontColor", label: "Book title" },
      { key: "chapterHeadingFontColor", label: "Chapter heading" },
      { key: "verseFontColor", label: "Verse" },
      { key: "hebrewSubtitleFontColor", label: "Hebrew subtitle" },
      { key: "readerToolbarFontColor", label: "Reader toolbar text" },
      {
        key: "readerToolbarFloatingButtonFontColor",
        label: "Floating button text",
      },
    ],
  },
  {
    id: "selection",
    title: "Verse selection",
    fields: [
      {
        key: "selectedVerseTextDecorationColor",
        label: "Selected verse decoration",
      },
    ],
  },
];

export const CUSTOMIZATION_COLOR_FIELDS: {
  key: ThemeColorKey;
  label: string;
}[] = CUSTOMIZATION_COLOR_GROUPS.flatMap((group) => group.fields);

export interface CustomizationFontField {
  key: ThemeFontFamilyKey;
  label: string;
}

export const CUSTOMIZATION_FONT_FIELDS: CustomizationFontField[] = [
  { key: "fontFamily", label: "Default" },
  { key: "bookTitleFontFamily", label: "Book title" },
  { key: "chapterHeadingFontFamily", label: "Chapter heading" },
  { key: "verseFontFamily", label: "Verse" },
  { key: "hebrewSubtitleFontFamily", label: "Hebrew subtitle" },
];

export interface CustomizationFontPreset {
  name: string;
  value: string;
}

export const CUSTOMIZATION_FONT_PRESETS: CustomizationFontPreset[] = [
  { name: "Newsreader", value: "Newsreader, serif" },
  { name: "System UI", value: "system-ui, sans-serif" },
  { name: "Roboto", value: "Roboto, sans-serif" },
  { name: "Open Sans", value: "Open Sans, sans-serif" },
  { name: "Playfair Display", value: "Playfair Display, serif" },
  { name: "Cormorant Garamond", value: "Cormorant Garamond, serif" },
];

/**
 * The presets for one font field, with a "Default" entry (that field's
 * value in the Seed Bible Light theme) prepended. "Default" is
 * field-specific — unlike the 6 named presets, which apply the exact same
 * value regardless of which of the 5 fields is being edited — so it can't
 * live in `CUSTOMIZATION_FONT_PRESETS` itself.
 */
export function getFontPresetsForField(
  key: ThemeFontFamilyKey
): CustomizationFontPreset[] {
  return [
    { name: "Default", value: LIGHT_THEME_FONT_DEFAULTS[key] },
    ...CUSTOMIZATION_FONT_PRESETS,
  ];
}

/**
 * Builds a font-family CSS value for a manually-typed Google Font name.
 * Restricted to letters/digits/spaces (real font names never need more)
 * both so the stored CSS value can't be broken and so it's safe to later
 * reuse as a Google Fonts API query parameter with no further escaping.
 */
export function buildCustomFontValue(name: string): string {
  const trimmed = name
    .replace(/[^A-Za-z0-9 ]/g, "")
    .trim()
    .replace(/\s+/g, " ");
  return trimmed ? `${trimmed}, sans-serif` : "";
}

/**
 * A brand-new variant starts with no overrides at all — every field is
 * inherited from `baseThemeId` until the user explicitly edits it. This is
 * what makes "has the user overridden this field" a simple presence check
 * (see `buildBibleThemeFromCustomizationTheme`) rather than something that
 * has to be tracked separately from the values themselves.
 */
function buildVariant(
  name: string,
  baseThemeId: string
): CustomizationThemeVariant {
  const now = Date.now();
  return {
    id: `variant_${uuid()}`,
    name,
    baseTheme: baseThemeId,
    themes: {},
    highlightColors: {},
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Resolves a customization theme's full, ready-to-render `BibleTheme` by
 * layering its own explicit overrides (`variant.themes`/`highlightColors`)
 * on top of `basePreset`. A field absent from the variant falls through to
 * `basePreset`'s own value unchanged — this is the one place that
 * inherit-vs-override distinction gets resolved into a concrete value, so
 * `variant.themes`/`highlightColors` should never be read as if either were
 * a complete theme on their own.
 */
export function buildBibleThemeFromCustomizationTheme(
  variant: CustomizationThemeVariant,
  basePreset: BibleTheme
): BibleTheme {
  const withVariables =
    Object.keys(variant.themes).length === 0
      ? basePreset
      : {
          ...basePreset,
          variables: { ...basePreset.variables, ...variant.themes },
        };
  return applyHighlightOverrides(withVariables, variant.highlightColors);
}

export interface CustomizationsManager {
  customizations: Signal<SeedBibleCustomization[]>;
  isLoading: Signal<boolean>;
  /**
   * The customization currently applied to the live theme, if any. There
   * are exactly two ways for one to become active: the in-progress edit
   * draft, if one is open (so unsaved edits preview live), or a
   * `?customization=...` share link. The draft takes priority, so opening
   * an editor always previews that customization even if a different one
   * was loaded via the URL.
   */
  activeCustomization: ReadonlySignal<SeedBibleCustomization | null>;
  /** The variant of the active customization currently in effect (viewer's own pick, else the customization's default, else its first variant). */
  activeVariant: ReadonlySignal<CustomizationThemeVariant | null>;
  /**
   * The active variant's colors, session-only: layered on top of the
   * rendered theme by `SeedBibleStateManager`, never written to
   * `SettingsManager` — a refresh always reverts to the user's real theme.
   */
  activeThemeOverrides: ReadonlySignal<ThemeOverrides>;
  /**
   * The active variant's per-highlight-id color overrides, session-only —
   * same lifetime and rendering path as `activeThemeOverrides`, just for
   * highlight colors instead of flat theme variables.
   */
  activeHighlightOverrides: ReadonlySignal<HighlightOverrides>;
  /**
   * The active variant's full, resolved `BibleTheme` — its own overrides
   * combined with its `baseTheme` preset via
   * `buildBibleThemeFromCustomizationTheme`. `null` when nothing is active.
   * This is what `SeedBibleStateManager` actually renders: the active
   * variant's colors are always shown against its own designated base
   * preset (e.g. a "Dark" theme always looks dark), never against whatever
   * the viewer's own personal light/dark theme happens to be.
   */
  activeResolvedTheme: ReadonlySignal<BibleTheme | null>;
  /** Resolves a variant's `baseTheme` id to the actual preset, falling back to the viewer's current preset if the id is unrecognized (e.g. a preset was removed). */
  resolveVariantBaseTheme: (variant: CustomizationThemeVariant) => BibleTheme;
  /**
   * The extension ids that should be installed while the active
   * customization is in effect: its own `auto-installed` extensions,
   * unioned with any `available` extras the viewer added for it via
   * `addExtensionToActiveCustomization`. Empty when nothing is active.
   */
  activeExtensionIds: ReadonlySignal<string[]>;
  /**
   * A customization loaded via the `?customization={recordName}.{id}` share
   * link, if any. Used by `activeCustomization` whenever there's no
   * in-progress edit draft open.
   */
  linkedCustomization: ReadonlySignal<SeedBibleCustomization | null>;
  /**
   * Resolves once the initial `?customization=...` load (if any) reaches a
   * terminal outcome: loaded, failed, or (during SSR only) exceeded a
   * deadline. Resolves immediately if there was no `?customization=` param.
   * Throw this in a component to suspend SSR rendering until then.
   *
   * Never rejects — a rejected promise thrown during `renderToStringAsync`
   * surfaces as a render exception and takes down the whole SSR document.
   */
  initialCustomizationLoadPromise: Promise<void>;
  /** True once the initial `?customization=` load has settled — see above. */
  initialCustomizationLoadSettled: ReadonlySignal<boolean>;
  /**
   * The local, unpersisted draft of the customization currently open in the
   * editor settings pages, or null when none is open. Edits accumulate here
   * and are only written to CasualOS by `saveEditingCustomization`.
   */
  editingCustomization: Signal<SeedBibleCustomization | null>;
  /** The variant id the variant editor settings page should show. */
  editingVariantId: Signal<string | null>;
  load: () => Promise<void>;
  /** Loads a customization by its `{recordName}.{id}` locator into `linkedCustomization`. */
  loadByLocator: (locator: string) => Promise<void>;
  /** Creates a new customization with one variant based on the viewer's current preset (no overrides of its own yet). */
  create: () => Promise<SeedBibleCustomization>;
  /** Seeds `editingCustomization` from the persisted record with this id. No-ops if not found. */
  startEditing: (id: string) => void;
  /**
   * Clears `editingCustomization` and `editingVariantId` immediately. Any
   * edit still waiting on the auto-save debounce (see
   * `saveEditingCustomization`) is flushed in the background at the same
   * time, so closing the editor right after a change doesn't drop it.
   */
  stopEditing: () => void;
  /**
   * Same as `stopEditing`, except a pending auto-save is cancelled instead
   * of flushed — the draft's unsaved changes are actually thrown away. Used
   * by the "Discard changes" action of the unsaved-changes confirmation
   * shown when closing the editor with `hasUnsavedChanges` true.
   */
  discardEditingCustomization: () => void;
  /**
   * True while `editingCustomization` differs from what's actually
   * persisted (a pending or in-flight auto-save). `false` when there's no
   * open draft.
   */
  hasUnsavedChanges: ReadonlySignal<boolean>;
  /** Persists `editingCustomization` and upserts it into `customizations`. No-op if there's no draft or the user is signed out. Also called automatically, debounced by 5 seconds, whenever one of the draft mutators below changes the draft. */
  saveEditingCustomization: () => Promise<void>;
  remove: (id: string) => Promise<void>;
  /** Uploads the file, stages the resulting URL onto the open draft, and immediately persists it (unlike every other draft field, which auto-saves only after a short debounce). */
  uploadLogo: (file: File) => Promise<void>;
  /** A shareable link that auto-loads this customization via `loadByLocator`. */
  getShareLink: (customization: SeedBibleCustomization) => string;
  // Synchronous, draft-only mutators. Each no-ops if `editingCustomization` is
  // null, and otherwise queues a debounced auto-save of the draft.
  updateEditingName: (name: string) => void;
  /** Clears the draft's logo and immediately persists it (unlike every other draft field, which auto-saves only after a short debounce). No-op with no open draft. */
  removeEditingLogo: () => Promise<void>;
  /** Adds a new variant to the draft, based on the viewer's current preset (no overrides of its own yet). */
  addEditingVariant: () => CustomizationThemeVariant | null;
  renameEditingVariant: (variantId: string, name: string) => void;
  /**
   * Changes which built-in preset (`presetId`, one of `theme.themes.value`'s
   * own ids) one variant falls back to for anything it hasn't explicitly
   * overridden — e.g. "base this dark theme on Seed Bible's own Dark
   * preset." The variant's own overrides (`themes`/`highlightColors`) are
   * left completely untouched; only fields the user hasn't customized will
   * visually change. No-ops if there's no open draft or the preset id is
   * unrecognized.
   */
  applyPresetToEditingVariant: (variantId: string, presetId: string) => void;
  setEditingVariantColor: (
    variantId: string,
    key: ThemeColorKey,
    value: string
  ) => void;
  setEditingVariantFont: (
    variantId: string,
    key: ThemeFontFamilyKey,
    value: string
  ) => void;
  /** Patches one highlight id's color overrides on the draft's variant. Fields omitted from `patch` are left as they were. */
  setEditingVariantHighlightColor: (
    variantId: string,
    highlightId: string,
    patch: Partial<ThemeHighlightColor>
  ) => void;
  /** Removes one color/font field's override, reverting it to inherit from the variant's `baseTheme`. No-op with no open draft. */
  resetEditingVariantField: (
    variantId: string,
    key: ThemeColorKey | ThemeFontFamilyKey
  ) => void;
  /** Removes all of one highlight id's overrides, reverting it to inherit from the variant's `baseTheme`. No-op with no open draft. */
  resetEditingVariantHighlightColor: (
    variantId: string,
    highlightId: string
  ) => void;
  setEditingDefaultVariant: (variantId: string) => void;
  /** Removes a variant from the draft. No-op if it's the only remaining variant. */
  removeEditingVariant: (variantId: string) => void;
  /** Persists the viewer's variant choice for the currently active customization. No-op if none is active. */
  selectActiveVariant: (variantId: string) => Promise<void>;
  /** Sets an extension's availability on the draft. No-op with no open draft. */
  setEditingExtensionAvailability: (
    extensionId: string,
    availability: ExtensionAvailability
  ) => void;
  /** The active customization's effective availability for an extension id. "available" when nothing is active or the id has no explicit entry. */
  getActiveExtensionAvailability: (
    extensionId: string
  ) => ExtensionAvailability;
  /** Adds an extra extension id to the viewer's own preferences for the active customization. No-op if none is active or the extension's availability there isn't "available". */
  addExtensionToActiveCustomization: (extensionId: string) => Promise<void>;
  /** Removes an extra extension id from the viewer's own preferences for the active customization. No-op if none is active or the id isn't one of the viewer's extras. */
  removeExtensionFromActiveCustomization: (
    extensionId: string
  ) => Promise<void>;
}

export function createCustomizationsManager(
  os: CasualOSManager,
  login: LoginManager,
  theme: ThemeManager,
  navigation: NavigationManager,
  variantSelections: CustomizationVariantSelectionsManager,
  extensionPreferences: CustomizationExtensionPreferencesManager
): CustomizationsManager {
  const customizations = signal<SeedBibleCustomization[]>([]);
  const isLoading = signal(false);
  const editingCustomization = signal<SeedBibleCustomization | null>(null);
  const editingVariantId = signal<string | null>(null);
  const linkedCustomization = signal<SeedBibleCustomization | null>(null);
  const linkedCustomizationLocator = signal<string | null>(null);

  const initialCustomizationLoadSettled = signal<boolean>(false);
  let resolveInitialCustomizationLoadPromise: () => void = () => {};
  const initialCustomizationLoadPromise = new Promise<void>((resolve) => {
    resolveInitialCustomizationLoadPromise = resolve;
  });

  const loadByLocator = async (locator: string): Promise<void> => {
    // `id` is always `customization_<uuid>` (no dots); split on the LAST dot
    // so a recordName that happens to contain one still parses correctly.
    const dotIndex = locator.lastIndexOf(".");
    if (dotIndex <= 0 || dotIndex === locator.length - 1) {
      console.warn("Invalid customization locator:", locator);
      return;
    }
    const recordName = locator.slice(0, dotIndex);
    const id = locator.slice(dotIndex + 1);

    try {
      const result = await os.getData(recordName, id);
      if (!result.success || !result.data) {
        console.warn("Customization not found for locator:", locator);
        return;
      }
      const parsed = customizationSchema.safeParse(result.data);
      if (!parsed.success) {
        console.warn(
          "Invalid customization record for locator:",
          locator,
          parsed.error
        );
        return;
      }
      linkedCustomization.value = {
        ...parsed.data,
        variants: narrowVariants(parsed.data.variants),
      };
      linkedCustomizationLocator.value = locator;
    } catch (error) {
      console.error(
        "Failed to load customization from locator:",
        locator,
        error
      );
    }
  };

  const initialLocator =
    navigation.initialUrl.searchParams.get("customization");

  let initialCustomizationLoadTimer: ReturnType<typeof setTimeout> | null =
    null;
  const settleInitialCustomizationLoad = () => {
    if (initialCustomizationLoadTimer !== null) {
      clearTimeout(initialCustomizationLoadTimer);
      initialCustomizationLoadTimer = null;
    }
    initialCustomizationLoadSettled.value = true;
    resolveInitialCustomizationLoadPromise();
  };

  if (initialLocator) {
    void loadByLocator(initialLocator).then(settleInitialCustomizationLoad);

    // During SSR the render blocks on `initialCustomizationLoadPromise`, so an
    // `os.getData()` that never answers would hold the request open
    // indefinitely — `loadByLocator` itself always resolves (its try/catch
    // covers every other failure mode), so this timeout is purely a backstop
    // for that one case. Not armed on the client: there the promise only
    // gates a Suspense boundary, and a genuinely slow connection deserves to
    // keep waiting rather than have the customization silently dropped.
    const SSR_INITIAL_CUSTOMIZATION_TIMEOUT_MS = 5000;
    if (import.meta.env.SSR) {
      initialCustomizationLoadTimer = setTimeout(() => {
        console.warn(
          "Timed out waiting for initial customization load:",
          initialLocator
        );
        settleInitialCustomizationLoad();
      }, SSR_INITIAL_CUSTOMIZATION_TIMEOUT_MS);
    }
  } else {
    settleInitialCustomizationLoad();
  }

  // The only two ways for a customization to become "active" (applied to
  // the live theme): an in-progress edit draft, or a `?customization=...`
  // share link. The draft wins when both are present — nothing is persisted
  // by opening an editor, so previewing your own edits should never be
  // blocked by whatever happened to be loaded from the URL.
  const activeCustomization = computed<SeedBibleCustomization | null>(
    () => editingCustomization.value ?? linkedCustomization.value
  );

  const activeCustomizationLocator = computed<string | null>(() => {
    const draft = editingCustomization.value;
    if (draft) {
      const recordName = login.userId.value;
      return recordName
        ? buildCustomizationLocator(recordName, draft.id)
        : null;
    }
    if (linkedCustomization.value) {
      return linkedCustomizationLocator.value;
    }
    return null;
  });

  const activeExtensionIds = computed<string[]>(() => {
    const customization = activeCustomization.value;
    if (!customization) {
      return [];
    }
    const autoInstalled = Object.entries(customization.extensionSettings)
      .filter(([, availability]) => availability === "auto-installed")
      .map(([id]) => id);
    const locator = activeCustomizationLocator.value;
    const extra = locator
      ? extensionPreferences.getExtraExtensionIds(locator)
      : [];
    // An extra id only applies while its availability is still "available" —
    // if the owner later marks it hidden or auto-installed, a stale extra
    // pick from before that change is ignored rather than force-applied.
    const validExtra = extra.filter(
      (id) => getExtensionAvailability(customization, id) === "available"
    );
    return Array.from(new Set([...autoInstalled, ...validExtra]));
  });

  const activeVariant = computed<CustomizationThemeVariant | null>(() => {
    const customization = activeCustomization.value;
    if (!customization) {
      return null;
    }
    const locator = activeCustomizationLocator.value;
    const selectedId = locator
      ? variantSelections.getSelectedVariantId(locator)
      : null;
    const byId = (id: string | null | undefined) =>
      id ? customization.variants.find((v) => v.id === id) : undefined;
    return (
      byId(selectedId) ??
      byId(customization.defaultVariantId) ??
      customization.variants[0] ??
      null
    );
  });

  const activeThemeOverrides = computed<ThemeOverrides>(
    () => activeVariant.value?.themes ?? {}
  );

  const activeHighlightOverrides = computed<HighlightOverrides>(
    () => activeVariant.value?.highlightColors ?? {}
  );

  const resolveVariantBaseTheme = (
    variant: CustomizationThemeVariant
  ): BibleTheme =>
    theme.themes.value.find((t) => t.id === variant.baseTheme) ??
    theme.basePresetTheme.value;

  const activeResolvedTheme = computed<BibleTheme | null>(() => {
    const variant = activeVariant.value;
    if (!variant) {
      return null;
    }
    return buildBibleThemeFromCustomizationTheme(
      variant,
      resolveVariantBaseTheme(variant)
    );
  });

  /**
   * Whether the open draft (`editingCustomization`) differs from what's
   * actually persisted — i.e. an edit hasn't landed yet, whether because
   * the auto-save debounce is still pending or a write is in flight. Used
   * to decide whether to warn before discarding the draft. `false` when
   * there's no open draft.
   */
  const hasUnsavedChanges = computed<boolean>(() => {
    const draft = editingCustomization.value;
    if (!draft) {
      return false;
    }
    const persisted = customizations.value.find((c) => c.id === draft.id);
    if (!persisted) {
      return true;
    }
    return JSON.stringify(draft) !== JSON.stringify(persisted);
  });

  const load = async () => {
    const userId = login.userId.value;
    if (!userId) {
      customizations.value = [];
      return;
    }

    isLoading.value = true;
    try {
      const result = await os.listAllDataByMarker(userId, CUSTOMIZATION_MARKER);
      const loaded: SeedBibleCustomization[] = [];
      for (const item of result.items) {
        const parsed = customizationSchema.safeParse(item.data);
        if (!parsed.success) {
          console.warn("Skipping invalid customization record:", parsed.error);
          continue;
        }
        loaded.push({
          ...parsed.data,
          variants: narrowVariants(parsed.data.variants),
        });
      }
      customizations.value = loaded;
    } catch (error) {
      console.error("Failed to load customizations:", error);
    } finally {
      isLoading.value = false;
    }
  };

  const persist = async (
    userId: string,
    record: SeedBibleCustomization
  ): Promise<void> => {
    await os.recordData(userId, record.id, record, {
      marker: CUSTOMIZATION_MARKER,
    });
  };

  const create = async (): Promise<SeedBibleCustomization> => {
    const userId = login.userId.value;
    if (!userId) {
      throw new Error("Cannot create a customization while signed out.");
    }

    const now = Date.now();
    const preset = theme.basePresetTheme.value;
    const variant = buildVariant(preset.name, preset.id);
    const record: SeedBibleCustomization = {
      id: `customization_${uuid()}`,
      name: `Customization ${customizations.value.length + 1}`,
      variants: [variant],
      defaultVariantId: variant.id,
      logoUrl: null,
      createdAt: now,
      updatedAt: now,
      extensionSettings: {},
    };

    await persist(userId, record);
    customizations.value = [...customizations.value, record];
    return record;
  };

  const startEditing = (id: string): void => {
    const existing = customizations.value.find((c) => c.id === id);
    if (!existing) {
      return;
    }
    editingCustomization.value = existing;
  };

  /**
   * Clears `editingCustomization` and `editingVariantId`. Any edit still
   * waiting on the auto-save debounce is flushed first (in the background —
   * this stays synchronous, since callers rely on the draft being gone
   * immediately), so closing the editor right after a change doesn't drop it.
   */
  const stopEditing = (): void => {
    if (autoSaveTimer !== null) {
      void flushAutoSave();
    }
    editingCustomization.value = null;
    editingVariantId.value = null;
  };

  /**
   * Clears `editingCustomization` and `editingVariantId` the same as
   * `stopEditing`, except any edit still waiting on the auto-save debounce
   * is cancelled instead of flushed — the draft's unsaved changes are
   * genuinely thrown away rather than written on the way out. An edit
   * whose auto-save has already started (the 5-second debounce already
   * fired) can't be un-sent and will still land.
   */
  const discardEditingCustomization = (): void => {
    if (autoSaveTimer !== null) {
      clearTimeout(autoSaveTimer);
      autoSaveTimer = null;
    }
    editingCustomization.value = null;
    editingVariantId.value = null;
  };

  const saveEditingCustomization = async (): Promise<void> => {
    if (autoSaveTimer !== null) {
      clearTimeout(autoSaveTimer);
      autoSaveTimer = null;
    }
    const userId = login.userId.value;
    const current = editingCustomization.value;
    if (!userId || !current) {
      return;
    }

    const saved: SeedBibleCustomization = { ...current, updatedAt: Date.now() };
    await persist(userId, saved);
    customizations.value = customizations.value.some((c) => c.id === saved.id)
      ? customizations.value.map((c) => (c.id === saved.id ? saved : c))
      : [...customizations.value, saved];
    // Only reflect the write onto the draft if it's still the exact one
    // captured above — a newer edit, or the editor closing, may have
    // changed `editingCustomization` while this (possibly auto-triggered)
    // save was in flight, and must not be clobbered by this now-stale copy.
    if (editingCustomization.value === current) {
      editingCustomization.value = saved;
    }
  };

  /** How long to wait after the last edit before auto-saving the draft. */
  const AUTO_SAVE_DEBOUNCE_MS = 5000;
  let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
  // Serializes autosave writes so two saves can't race and land out of
  // order, and one failure doesn't reject the save queued behind it.
  let autoSaveChain: Promise<void> = Promise.resolve();

  /** Queues a debounced save of the current draft. */
  const scheduleAutoSave = (): void => {
    if (autoSaveTimer !== null) {
      clearTimeout(autoSaveTimer);
    }
    autoSaveTimer = setTimeout(() => {
      autoSaveTimer = null;
      void flushAutoSave();
    }, AUTO_SAVE_DEBOUNCE_MS);
  };

  /**
   * Writes the current draft immediately. Resolves once it has landed.
   * Starts the write synchronously (rather than deferring it into a
   * `.then()`) so it captures `editingCustomization.value` as it is right
   * now — callers like `stopEditing()` clear that signal on the very next
   * line, before this promise has a chance to resolve.
   */
  const flushAutoSave = (): Promise<void> => {
    const write = saveEditingCustomization().catch((error) => {
      console.error("Failed to auto-save customization:", error);
    });
    autoSaveChain = autoSaveChain.then(() => write);
    return autoSaveChain;
  };

  const updateEditingName = (name: string): void => {
    const current = editingCustomization.value;
    if (!current) {
      return;
    }
    editingCustomization.value = { ...current, name, updatedAt: Date.now() };
    scheduleAutoSave();
  };

  const addEditingVariant = (): CustomizationThemeVariant | null => {
    const current = editingCustomization.value;
    if (!current) {
      return null;
    }

    const preset = theme.basePresetTheme.value;
    const baseName = preset.name;
    const usedNames = new Set(current.variants.map((v) => v.name));
    const name = usedNames.has(baseName)
      ? `Variant ${current.variants.length + 1}`
      : baseName;
    const variant = buildVariant(name, preset.id);

    editingCustomization.value = {
      ...current,
      variants: [...current.variants, variant],
      updatedAt: Date.now(),
    };
    scheduleAutoSave();
    return variant;
  };

  /**
   * Changes which built-in preset one variant falls back to for anything it
   * hasn't explicitly overridden — "base" this theme on Light or Dark so it
   * starts from a known-good reference instead of hand-tweaking every
   * field. Every field the user has already customized (present in
   * `themes`/`highlightColors`) is left completely untouched; only the
   * still-inherited fields will visually change. No-ops if there's no open
   * draft, the variant id doesn't match, or `presetId` is unrecognized.
   */
  const applyPresetToEditingVariant = (
    variantId: string,
    presetId: string
  ): void => {
    const current = editingCustomization.value;
    if (!current) {
      return;
    }
    const preset = theme.themes.value.find((t) => t.id === presetId);
    if (!preset) {
      return;
    }

    editingCustomization.value = {
      ...current,
      variants: current.variants.map((v) =>
        v.id === variantId
          ? { ...v, baseTheme: preset.id, updatedAt: Date.now() }
          : v
      ),
      updatedAt: Date.now(),
    };
    scheduleAutoSave();
  };

  const renameEditingVariant = (variantId: string, name: string): void => {
    const current = editingCustomization.value;
    if (!current) {
      return;
    }
    editingCustomization.value = {
      ...current,
      variants: current.variants.map((v) =>
        v.id === variantId ? { ...v, name, updatedAt: Date.now() } : v
      ),
      updatedAt: Date.now(),
    };
    scheduleAutoSave();
  };

  const setEditingVariantColor = (
    variantId: string,
    key: ThemeColorKey,
    value: string
  ): void => {
    const current = editingCustomization.value;
    if (!current) {
      return;
    }
    editingCustomization.value = {
      ...current,
      variants: current.variants.map((variant) => {
        if (variant.id !== variantId) {
          return variant;
        }
        if (key !== "primaryColor") {
          return {
            ...variant,
            themes: { ...variant.themes, [key]: value },
            updatedAt: Date.now(),
          };
        }

        // Secondary/tertiary follow the primary color as long as they still
        // match its lightened derivation — including "never touched at
        // all" (inherited from the base preset), which counts as following
        // too. The moment a user manually picks one, it stops matching and
        // is left alone on future primary edits.
        const previousPrimary =
          variant.themes.primaryColor ??
          resolveVariantBaseTheme(variant).variables.primaryColor;
        const nextThemes: ThemeOverrides = {
          ...variant.themes,
          primaryColor: value,
        };
        if (
          variant.themes.secondaryColor === undefined ||
          variant.themes.secondaryColor ===
            lightenColor(previousPrimary, SECONDARY_LIGHTEN_AMOUNT)
        ) {
          nextThemes.secondaryColor = lightenColor(
            value,
            SECONDARY_LIGHTEN_AMOUNT
          );
        }
        if (
          variant.themes.tertiaryColor === undefined ||
          variant.themes.tertiaryColor ===
            lightenColor(previousPrimary, TERTIARY_LIGHTEN_AMOUNT)
        ) {
          nextThemes.tertiaryColor = lightenColor(
            value,
            TERTIARY_LIGHTEN_AMOUNT
          );
        }

        return { ...variant, themes: nextThemes, updatedAt: Date.now() };
      }),
      updatedAt: Date.now(),
    };
    scheduleAutoSave();
  };

  const setEditingVariantFont = (
    variantId: string,
    key: ThemeFontFamilyKey,
    value: string
  ): void => {
    const current = editingCustomization.value;
    if (!current) {
      return;
    }
    editingCustomization.value = {
      ...current,
      variants: current.variants.map((variant) =>
        variant.id === variantId
          ? {
              ...variant,
              themes: { ...variant.themes, [key]: value },
              updatedAt: Date.now(),
            }
          : variant
      ),
      updatedAt: Date.now(),
    };
    scheduleAutoSave();
  };

  const setEditingVariantHighlightColor = (
    variantId: string,
    highlightId: string,
    patch: Partial<ThemeHighlightColor>
  ): void => {
    const current = editingCustomization.value;
    if (!current) {
      return;
    }
    editingCustomization.value = {
      ...current,
      variants: current.variants.map((variant) => {
        if (variant.id !== variantId) {
          return variant;
        }
        const existing = variant.highlightColors[highlightId] ?? {};
        return {
          ...variant,
          highlightColors: {
            ...variant.highlightColors,
            [highlightId]: { ...existing, ...patch },
          },
          updatedAt: Date.now(),
        };
      }),
      updatedAt: Date.now(),
    };
    scheduleAutoSave();
  };

  /** Removes one field's override, reverting it to inherit from the variant's `baseTheme`. No-op with no open draft. */
  const resetEditingVariantField = (
    variantId: string,
    key: ThemeColorKey | ThemeFontFamilyKey
  ): void => {
    const current = editingCustomization.value;
    if (!current) {
      return;
    }
    editingCustomization.value = {
      ...current,
      variants: current.variants.map((variant) => {
        if (variant.id !== variantId) {
          return variant;
        }
        const nextThemes = { ...variant.themes };
        delete nextThemes[key];
        return { ...variant, themes: nextThemes, updatedAt: Date.now() };
      }),
      updatedAt: Date.now(),
    };
    scheduleAutoSave();
  };

  /** Removes all of one highlight id's overrides, reverting it to inherit from the variant's `baseTheme`. No-op with no open draft. */
  const resetEditingVariantHighlightColor = (
    variantId: string,
    highlightId: string
  ): void => {
    const current = editingCustomization.value;
    if (!current) {
      return;
    }
    editingCustomization.value = {
      ...current,
      variants: current.variants.map((variant) => {
        if (variant.id !== variantId) {
          return variant;
        }
        const nextHighlightColors = { ...variant.highlightColors };
        delete nextHighlightColors[highlightId];
        return {
          ...variant,
          highlightColors: nextHighlightColors,
          updatedAt: Date.now(),
        };
      }),
      updatedAt: Date.now(),
    };
    scheduleAutoSave();
  };

  const setEditingDefaultVariant = (variantId: string): void => {
    const current = editingCustomization.value;
    if (!current || !current.variants.some((v) => v.id === variantId)) {
      return;
    }
    editingCustomization.value = {
      ...current,
      defaultVariantId: variantId,
      updatedAt: Date.now(),
    };
    scheduleAutoSave();
  };

  const removeEditingVariant = (variantId: string): void => {
    const current = editingCustomization.value;
    if (!current || current.variants.length <= 1) {
      return;
    }
    if (!current.variants.some((v) => v.id === variantId)) {
      return;
    }

    const remaining = current.variants.filter((v) => v.id !== variantId);
    const nextDefaultVariantId =
      current.defaultVariantId === variantId
        ? remaining[0]!.id
        : current.defaultVariantId;

    editingCustomization.value = {
      ...current,
      variants: remaining,
      defaultVariantId: nextDefaultVariantId,
      updatedAt: Date.now(),
    };
    scheduleAutoSave();
  };

  const remove = async (id: string): Promise<void> => {
    const userId = login.userId.value;
    const existing = customizations.value.find((c) => c.id === id);
    if (!userId || !existing) {
      return;
    }

    await os.eraseData(userId, id);
    customizations.value = customizations.value.filter((c) => c.id !== id);
    if (editingCustomization.value?.id === id) {
      editingCustomization.value = null;
    }
  };

  const uploadLogo = async (file: File): Promise<void> => {
    const userId = login.userId.value;
    if (!userId) {
      throw new Error("Cannot upload a logo while signed out.");
    }
    if (!editingCustomization.value) {
      return;
    }

    const result = await os.recordFile(userId, file, {
      mimeType: file.type,
      marker: CUSTOMIZATION_MARKER,
    });
    if (result.success === false) {
      throw new Error("Failed to upload logo.");
    }

    // Re-read after the await: editing may have been cancelled while the
    // upload was in flight. Only stage the URL onto the draft — the record
    // itself isn't persisted until saveEditingCustomization() is called.
    const current = editingCustomization.value;
    if (!current) {
      return;
    }
    editingCustomization.value = {
      ...current,
      logoUrl: result.url,
      updatedAt: Date.now(),
    };
    await saveEditingCustomization();
  };

  const removeEditingLogo = async (): Promise<void> => {
    const current = editingCustomization.value;
    if (!current) {
      return;
    }
    editingCustomization.value = {
      ...current,
      logoUrl: null,
      updatedAt: Date.now(),
    };
    await saveEditingCustomization();
  };

  const setEditingExtensionAvailability = (
    extensionId: string,
    availability: ExtensionAvailability
  ): void => {
    const current = editingCustomization.value;
    if (!current) {
      return;
    }
    // "available" is the default for any id with no entry, so setting it
    // explicitly just removes the entry rather than storing a redundant one.
    const nextSettings = { ...current.extensionSettings };
    if (availability === "available") {
      delete nextSettings[extensionId];
    } else {
      nextSettings[extensionId] = availability;
    }
    editingCustomization.value = {
      ...current,
      extensionSettings: nextSettings,
      updatedAt: Date.now(),
    };
    scheduleAutoSave();
  };

  const getActiveExtensionAvailability = (
    extensionId: string
  ): ExtensionAvailability =>
    getExtensionAvailability(activeCustomization.value, extensionId);

  const addExtensionToActiveCustomization = async (
    extensionId: string
  ): Promise<void> => {
    const locator = activeCustomizationLocator.value;
    if (!locator) {
      return;
    }
    if (getActiveExtensionAvailability(extensionId) === "hidden") {
      return;
    }
    await extensionPreferences.addExtraExtensionId(locator, extensionId);
  };

  const removeExtensionFromActiveCustomization = async (
    extensionId: string
  ): Promise<void> => {
    const locator = activeCustomizationLocator.value;
    if (!locator) {
      return;
    }
    await extensionPreferences.removeExtraExtensionId(locator, extensionId);
  };

  const getShareLink = (customization: SeedBibleCustomization): string => {
    const recordName = login.userId.value ?? "";
    return navigation.linkToQuery({
      customization: buildCustomizationLocator(recordName, customization.id),
    });
  };

  const selectActiveVariant = async (variantId: string): Promise<void> => {
    const locator = activeCustomizationLocator.value;
    if (!locator) {
      return;
    }
    await variantSelections.selectVariant(locator, variantId);
  };

  return {
    customizations,
    isLoading,
    activeCustomization,
    activeVariant,
    activeThemeOverrides,
    activeHighlightOverrides,
    activeResolvedTheme,
    resolveVariantBaseTheme,
    activeExtensionIds,
    linkedCustomization,
    initialCustomizationLoadPromise,
    initialCustomizationLoadSettled,
    editingCustomization,
    editingVariantId,
    load,
    loadByLocator,
    create,
    startEditing,
    stopEditing,
    discardEditingCustomization,
    hasUnsavedChanges,
    saveEditingCustomization,
    remove,
    uploadLogo,
    getShareLink,
    updateEditingName,
    removeEditingLogo,
    addEditingVariant,
    applyPresetToEditingVariant,
    renameEditingVariant,
    setEditingVariantColor,
    setEditingVariantFont,
    setEditingVariantHighlightColor,
    resetEditingVariantField,
    resetEditingVariantHighlightColor,
    setEditingDefaultVariant,
    removeEditingVariant,
    selectActiveVariant,
    setEditingExtensionAvailability,
    getActiveExtensionAvailability,
    addExtensionToActiveCustomization,
    removeExtensionFromActiveCustomization,
  };
}
