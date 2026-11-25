import * as z from "zod/v4";
import { v4 as uuid } from "uuid";
import {
  batch,
  computed,
  effect,
  signal,
  type ReadonlySignal,
  type Signal,
} from "@preact/signals";
import type { CasualOSManager, StudioMember, StudioRole } from "./OsManager";
import type { LoginManager } from "./LoginManager";
import { isMinimalEmbedUrl } from "./EmbedMode";
import type { NavigationManager } from "./NavigationManager";
import type { CustomizationVariantSelectionsManager } from "./CustomizationVariantSelectionsManager";
import type { CustomizationExtensionPreferencesManager } from "./CustomizationExtensionPreferencesManager";
import type { ExtensionSettingValue } from "./ExtensionManager";
import {
  sensitiveProxyPointerSchema,
  type SensitiveProxyPointer,
} from "./ExtensionSensitiveSettings";
import {
  applyHighlightOverrides,
  DARK_THEME,
  filterValidColorOverrides,
  filterValidFontFamilyOverrides,
  LIGHT_THEME,
  LIGHT_THEME_FONT_DEFAULTS,
  SYSTEM_THEME_ID,
  type BibleTheme,
  type HighlightOverrides,
  type ThemeColorKey,
  type ThemeFontFamilyKey,
  type ThemeHighlightColor,
  type ThemeManager,
  type ThemeOverrides,
} from "./ThemeManager";
import { toShareableUrl } from "../app/publicLinks";

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

// Darkest-last reds for light backgrounds, then lightest-last for dark ones,
// so the first readable pick is the most saturated red that still reads.
const WORDS_OF_JESUS_RED_CANDIDATES = [
  "#c00",
  "#b00",
  "#a00",
  "#900",
  "#800",
  "#700",
  "#ff8080",
  "#ffa0a0",
  "#ffc0c0",
  "#ffe0e0",
];

/**
 * A red for words of Jesus that stays readable on `background` (a hex color),
 * or `undefined` if `background` isn't a hex color. When no red reaches
 * {@link MIN_READABLE_CONTRAST_RATIO} (a mid-tone background), returns the
 * highest-contrast one.
 */
export function getReadableWordsOfJesusColor(
  background: string
): string | undefined {
  if (!/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(background)) {
    return undefined;
  }
  const readable = WORDS_OF_JESUS_RED_CANDIDATES.find(
    (red) => getContrastRatio(red, background) >= MIN_READABLE_CONTRAST_RATIO
  );
  if (readable) {
    return readable;
  }
  return WORDS_OF_JESUS_RED_CANDIDATES.reduce((best, red) =>
    getContrastRatio(red, background) > getContrastRatio(best, background)
      ? red
      : best
  );
}

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
    foreground: "dangerFontColor",
    background: "dangerColor",
    label: "Danger text on danger",
  },
  {
    foreground: "dangerColor",
    background: "readerBackground",
    label: "Danger on reader background",
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
 * - `available`: shown in Settings → Extensions; the viewer may install/uninstall it
 *   themselves, same as outside any customization.
 * - `auto-installed`: force-installed with no prompt while the
 *   customization is active; shown but can't be uninstalled from there.
 * - `hidden`: never offered in Settings → Extensions while the
 *   customization is active. If it's still installed anyway (e.g. as another
 *   extension's dependency) it's listed under Installed and can still be uninstalled.
 */
export const EXTENSION_AVAILABILITY_VALUES = [
  "available",
  "auto-installed",
  "hidden",
] as const;
export type ExtensionAvailability =
  (typeof EXTENSION_AVAILABILITY_VALUES)[number];
const extensionAvailabilitySchema = z.enum(EXTENSION_AVAILABILITY_VALUES);

/**
 * The availabilities a customization may apply to every extension it has no
 * explicit entry for. `auto-installed` is deliberately excluded: it installs
 * with no prompt, so it must only ever follow an author's review of that one
 * extension, never reach one added to the catalog after they last looked.
 */
export const DEFAULT_EXTENSION_AVAILABILITY_VALUES = [
  "available",
  "hidden",
] as const;
export type DefaultExtensionAvailability =
  (typeof DEFAULT_EXTENSION_AVAILABILITY_VALUES)[number];

function pickSchemeDefault(
  variants: readonly { id: string; baseTheme: string }[],
  baseTheme: string,
  current: string | undefined,
  legacyDefaultId: string
): string | undefined {
  const ofScheme = variants.filter((v) => v.baseTheme === baseTheme);
  if (ofScheme.some((v) => v.id === current)) {
    return current;
  }
  return (ofScheme.find((v) => v.id === legacyDefaultId) ?? ofScheme[0])?.id;
}

function fillSchemeDefaults<
  T extends {
    variants: readonly { id: string; baseTheme: string }[];
    defaultVariantId: string;
    defaultLightVariantId?: string;
    defaultDarkVariantId?: string;
  },
>(customization: T): T {
  const defaultLightVariantId = pickSchemeDefault(
    customization.variants,
    LIGHT_THEME.id,
    customization.defaultLightVariantId,
    customization.defaultVariantId
  );
  const defaultDarkVariantId = pickSchemeDefault(
    customization.variants,
    DARK_THEME.id,
    customization.defaultDarkVariantId,
    customization.defaultVariantId
  );
  const fallback = customization.variants.find(
    (v) => v.id === customization.defaultVariantId
  );
  const fallbackOfItsKind =
    fallback?.baseTheme === LIGHT_THEME.id
      ? defaultLightVariantId
      : fallback?.baseTheme === DARK_THEME.id
        ? defaultDarkVariantId
        : fallback?.id;
  return {
    ...customization,
    defaultLightVariantId,
    defaultDarkVariantId,
    defaultVariantId:
      fallbackOfItsKind ??
      defaultLightVariantId ??
      defaultDarkVariantId ??
      customization.variants[0]!.id,
  };
}

/**
 * App icons a customization can replace with its own SVG. Each is the icon
 * of one navigation entry, wherever that entry appears (toolbar, mobile tab
 * bar, More menu, sidebar header).
 */
export const CUSTOMIZATION_ICON_IDS = [
  "books",
  "search",
  "today",
  "share",
  "chat",
  "discover",
] as const;
export type CustomizationIconId = (typeof CUSTOMIZATION_ICON_IDS)[number];
/** Uploaded SVG URL per icon id. An id with no entry keeps the app's own icon. */
export type CustomizationIcons = Partial<Record<CustomizationIconId, string>>;

export const MAX_CUSTOM_ICON_BYTES = 256 * 1024;

const SVG_MIME_TYPE = "image/svg+xml";

/**
 * Whether `file` is an SVG. Some Windows setups and Android file pickers
 * report no type for `.svg` files, so an untyped file is judged by its name.
 */
function isSvgFile(file: File): boolean {
  if (file.type) {
    return file.type === SVG_MIME_TYPE;
  }
  return file.name.toLowerCase().endsWith(".svg");
}

/** Why a file can't be used as a custom icon, or null when it can. */
export function getCustomIconFileProblem(
  file: File
): "not-svg" | "too-large" | null {
  if (!isSvgFile(file)) {
    return "not-svg";
  }
  if (file.size > MAX_CUSTOM_ICON_BYTES) {
    return "too-large";
  }
  return null;
}

function isCustomizationIconId(id: string): id is CustomizationIconId {
  return (CUSTOMIZATION_ICON_IDS as readonly string[]).includes(id);
}

const customizationSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    variants: z.array(customizationVariantSchema).min(1),
    defaultLightVariantId: z.string().min(1).optional(),
    defaultDarkVariantId: z.string().min(1).optional(),
    defaultVariantId: z.string().min(1),
    logoUrl: z.url().max(1024).optional().nullable(),
    /**
     * Uploaded SVG URLs replacing app icons, keyed by `CustomizationIconId`.
     * Keys are left as plain strings so a record carrying an icon id this
     * build doesn't know yet still loads; unknown ids are just ignored.
     * Limited to http(s) since the URL ends up in a CSS `url()`.
     */
    icons: z
      .record(z.string(), z.url({ protocol: /^https?$/ }).max(1024))
      .optional(),
    /**
     * The translation viewers of this customization should start reading in,
     * overriding Seed Bible's own per-language default (see
     * `DEFAULT_TRANSLATIONS_BY_LANGUAGE` in `BibleReadingManager`) the same
     * way `BrandingConfig.defaultTranslationId` does for a whole deployment.
     * Absent means "no override — use Seed Bible's normal default."
     */
    defaultTranslationId: z.string().min(1).optional(),
    /**
     * The CasualOS record holding this customization's content library (see
     * `CustomContentManager`). Its own record rather than the owner's, so a
     * large library doesn't fill the owner's personal record. Absent means
     * the customization has no library.
     */
    contentRecordName: z.string().min(1).optional(),
    /**
     * The CasualOS studio this customization belongs to. Its record (named
     * after the studio) holds the customization, its files and its proxies,
     * and every member of the studio can edit it. Absent means it lives in
     * the record of the one person who made it.
     */
    studioId: z.string().min(1).optional(),
    /**
     * The record a shared customization lived in before it moved into its
     * studio. Viewers' choices made through the old address are kept under
     * it, so they're still found there.
     */
    movedFromRecordName: z.string().min(1).optional(),
    createdAt: z.number(),
    updatedAt: z.number(),
    /**
     * Per-extension availability while this customization is active,
     * keyed by extension id. Every id must reference the app's own known
     * extension catalog — never a URL or other free-form identity, since
     * `auto-installed` installs with no confirmation step. An id with no
     * entry here follows `defaultExtensionAvailability`. Only ever written
     * from the select in CustomizationEditExtensionsView.
     */
    extensionSettings: z
      .record(z.string(), extensionAvailabilitySchema)
      .default({}),
    /**
     * The availability of every extension with no entry in
     * `extensionSettings`, including ones added to the catalog later. Absent
     * (records saved before this existed) means `available`.
     */
    defaultExtensionAvailability: z
      .enum(DEFAULT_EXTENSION_AVAILABILITY_VALUES)
      .optional(),
    /**
     * Default values this customization sets for extension settings
     * (`ExtensionMeta.settings`), keyed by extension id then setting name.
     * A viewer's own value (see `ExtensionSettingsManager`) always wins over
     * this; this only fills in for a viewer who hasn't set one themselves.
     * Only ever written from the extension settings editor in
     * `CustomizationEditExtensionsView`.
     */
    extensionSettingDefaults: z
      .record(
        z.string(),
        z.record(z.string(), z.union([z.string(), z.boolean(), z.number()]))
      )
      .default({}),
    /**
     * Where this customization's own values for extension sensitive settings
     * are held, keyed by extension id then `sensitive` entry id. Only the
     * addresses: the values live in proxy records in the owner's record, and
     * a viewer's own values (see `ExtensionSensitiveSettings`) win over them.
     * Only ever written by `setExtensionSensitiveProxy`.
     */
    extensionSensitiveProxies: z
      .record(z.string(), z.record(z.string(), sensitiveProxyPointerSchema))
      .default({}),
  })
  .refine((r) => r.variants.some((v) => v.id === r.defaultVariantId), {
    message: "defaultVariantId must reference an existing variant",
  })
  .transform(fillSchemeDefaults);

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
  /**
   * Id of the variant a viewer who hasn't picked one gets when the scheme in
   * effect is light: the app theme is Light, or it is System and the device
   * prefers light. Must reference a Light-based variant (`baseTheme` is the
   * light preset). Absent when the customization has no Light-based variant.
   */
  defaultLightVariantId?: string;
  /** Same as `defaultLightVariantId`, for the dark scheme and Dark-based variants. */
  defaultDarkVariantId?: string;
  /**
   * Fallback default, used when the scheme in effect has no per-scheme
   * default (e.g. white-label customizations whose variants are all
   * brand-based). Set directly from the editor for brand-based variants;
   * otherwise kept in step with the light or dark default of the kind it
   * already points at, so older builds, which read only this field, follow
   * the author's latest choice. Must reference an existing variant: older
   * builds require it and skip any customization without it.
   */
  defaultVariantId: string;

  logoUrl?: string | null;
  /** Uploaded SVG URLs replacing app icons. An id with no entry keeps the app's own icon. */
  icons?: CustomizationIcons;
  /**
   * The translation viewers should start reading in while this
   * customization is active, overriding Seed Bible's per-language default.
   * Absent means no override.
   */
  defaultTranslationId?: string;
  /** The record holding this customization's content library. Absent means it has none. */
  contentRecordName?: string;
  /** The studio this customization belongs to. Absent means it's in its creator's own record. */
  studioId?: string;
  /** The record a shared customization lived in before it moved into its studio. */
  movedFromRecordName?: string;
  createdAt: number;
  updatedAt: number;
  /** Per-extension availability while this customization is active. An id with no entry follows `defaultExtensionAvailability`. */
  extensionSettings: Record<string, ExtensionAvailability>;
  /** Availability of every extension with no entry in `extensionSettings`. Absent means "available". */
  defaultExtensionAvailability?: DefaultExtensionAvailability;
  /** Per-extension setting defaults while this customization is active. An extension/key with no entry has no default here. */
  extensionSettingDefaults: Record<
    string,
    Record<string, ExtensionSettingValue>
  >;
  /** Per-extension sensitive proxies this customization provides. An extension/entry with none here provides nothing. */
  extensionSensitiveProxies: Record<
    string,
    Record<string, SensitiveProxyPointer>
  >;
}

/**
 * Which default a variant can be: the Light or Dark default by its base
 * theme, or the single fallback `defaultVariantId` for a variant based on
 * anything else (a white-label brand theme).
 */
export type VariantDefaultRole = "light" | "dark" | "fallback";

const DEFAULT_ROLE_FIELD_MAP: Record<
  VariantDefaultRole,
  "defaultLightVariantId" | "defaultDarkVariantId" | "defaultVariantId"
> = {
  light: "defaultLightVariantId",
  dark: "defaultDarkVariantId",
  fallback: "defaultVariantId",
};

function getThemeDefaultRole(themeId: string): VariantDefaultRole {
  if (themeId === LIGHT_THEME.id) {
    return "light";
  }
  if (themeId === DARK_THEME.id) {
    return "dark";
  }
  return "fallback";
}

export function getVariantDefaultRole(
  variant: CustomizationThemeVariant
): VariantDefaultRole {
  return getThemeDefaultRole(variant.baseTheme);
}

export function isDefaultVariant(
  record: SeedBibleCustomization,
  variant: CustomizationThemeVariant
): boolean {
  return (
    record[DEFAULT_ROLE_FIELD_MAP[getVariantDefaultRole(variant)]] ===
    variant.id
  );
}

/**
 * The Light or Dark default for `schemeThemeId`. `undefined` for any other
 * theme: the fallback `defaultVariantId` is a separate, later step in
 * `activeVariant`, not a scheme default.
 */
function getSchemeDefaultVariantId(
  customization: SeedBibleCustomization,
  schemeThemeId: string
): string | undefined {
  const role = getThemeDefaultRole(schemeThemeId);
  return role === "fallback"
    ? undefined
    : customization[DEFAULT_ROLE_FIELD_MAP[role]];
}

function resolveDefaultVariant(
  customization: SeedBibleCustomization,
  schemeThemeId: string
): CustomizationThemeVariant | undefined {
  const byId = (id: string | undefined) =>
    id ? customization.variants.find((v) => v.id === id) : undefined;
  return (
    byId(getSchemeDefaultVariantId(customization, schemeThemeId)) ??
    byId(customization.defaultVariantId) ??
    customization.variants[0]
  );
}

function withExtensionSensitiveProxy(
  customization: SeedBibleCustomization,
  extensionId: string,
  proxyId: string,
  pointer: SensitiveProxyPointer | null,
  updatedAt: number
): SeedBibleCustomization {
  const byProxy = { ...customization.extensionSensitiveProxies[extensionId] };
  if (pointer) {
    byProxy[proxyId] = pointer;
  } else {
    delete byProxy[proxyId];
  }
  const next = { ...customization.extensionSensitiveProxies };
  if (Object.keys(byProxy).length === 0) {
    delete next[extensionId];
  } else {
    next[extensionId] = byProxy;
  }
  return {
    ...customization,
    extensionSensitiveProxies: next,
    updatedAt,
  };
}

/** The availability a customization gives extensions it has no explicit entry for. "available" when none is given. */
export function getDefaultExtensionAvailability(
  customization: SeedBibleCustomization | null
): DefaultExtensionAvailability {
  return customization?.defaultExtensionAvailability ?? "available";
}

/** Resolves an extension's effective availability for a customization, falling back to its default when the id has no explicit entry. */
export function getExtensionAvailability(
  customization: SeedBibleCustomization | null,
  extensionId: string
): ExtensionAvailability {
  return (
    customization?.extensionSettings[extensionId] ??
    getDefaultExtensionAvailability(customization)
  );
}

/** Resolves a customization's default for one extension setting, or undefined if it doesn't set one. */
export function getExtensionSettingDefault(
  customization: SeedBibleCustomization | null,
  extensionId: string,
  key: string
): ExtensionSettingValue | undefined {
  return customization?.extensionSettingDefaults[extensionId]?.[key];
}

/** PostHog event/person property holding the `recordName.id` locator of the customization the viewer arrived through. */
export const POSTHOG_CUSTOMIZATION_PROPERTY = "customization_id";

function buildCustomizationLocator(recordName: string, id: string): string {
  return `${recordName}.${id}`;
}

/**
 * Marks the note left at a customization's old address once it has moved
 * into a studio. Not `CUSTOMIZATION_MARKER`, so listing a person's own
 * customizations doesn't find it; still `publicRead`, so share links made
 * before the move can follow it.
 */
export const MOVED_CUSTOMIZATION_MARKER =
  "publicRead:seedBibleCustomizationMoved";

const movedCustomizationSchema = z.object({
  movedTo: z.object({
    recordName: z.string().min(1),
    id: z.string().min(1),
  }),
});

/** Where a customization was found, so its edits are saved back there. */
function customizationRecordName(
  customization: Pick<SeedBibleCustomization, "studioId">,
  ownerId: string
): string {
  return customization.studioId ?? ownerId;
}

export interface CustomizationSaveConflict {
  customizationId: string;
  /** The copy someone else saved. */
  theirs: SeedBibleCustomization;
}

/** A failed share, membership change or member listing, with CasualOS's error code. */
export class CustomizationSharingError extends Error {
  constructor(
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "CustomizationSharingError";
  }
}

/**
 * Raised when saving a shared customization that someone else saved since
 * it was opened. Saving anyway would silently undo their changes.
 */
export class CustomizationSaveConflictError extends Error {
  constructor() {
    super("Someone else saved this customization since it was opened.");
    this.name = "CustomizationSaveConflictError";
  }
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

/** The customization with each of its uploaded files' URLs passed through `map`. */
function withFileUrls(
  customization: SeedBibleCustomization,
  map: (url: string) => string
): SeedBibleCustomization {
  return {
    ...customization,
    logoUrl: customization.logoUrl
      ? map(customization.logoUrl)
      : customization.logoUrl,
    ...(customization.icons
      ? {
          icons: Object.fromEntries(
            Object.entries(customization.icons).map(([iconId, url]) => [
              iconId,
              map(url),
            ])
          ),
        }
      : {}),
  };
}

/** Data read from a record or a page, as a customization, or null when it isn't one. */
function parseCustomization(data: unknown): SeedBibleCustomization | null {
  const parsed = customizationSchema.safeParse(data);
  return parsed.success
    ? { ...parsed.data, variants: narrowVariants(parsed.data.variants) }
    : null;
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
      { key: "dangerColor", label: "Danger" },
      { key: "dangerFontColor", label: "Danger text" },
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
  { name: "Plus Jakarta Sans", value: "Plus Jakarta Sans, sans-serif" },
];

/**
 * The presets for one font field, with a "Default" entry (that field's
 * value in the Seed Bible Light theme) prepended. "Default" is
 * field-specific — unlike the 7 named presets, which apply the exact same
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
  /** The signed-in user's role in each of their studios, keyed by studio ID. */
  studioRoles: ReadonlySignal<Record<string, StudioRole>>;
  /** The signed-in user's role in a customization's studio, or null when it isn't shared (or they aren't in it). */
  getStudioRole: (customization: SeedBibleCustomization) => StudioRole | null;
  /**
   * Set when saving the open draft of a shared customization found that
   * someone else saved it since the draft was opened. Saves stop until
   * `resolveSaveConflict` picks a side.
   */
  saveConflict: ReadonlySignal<CustomizationSaveConflict | null>;
  /**
   * Set (with a new `id` each time) when edits still waiting to auto-save as
   * the editor closed couldn't be saved, because someone else saved first.
   * With the editor closed there's no conflict banner, so the app says so.
   */
  editsDroppedAfterClose: ReadonlySignal<{ id: number; name: string } | null>;
  /** Saves the draft over the other copy, or drops the draft's changes for it. */
  resolveSaveConflict: (choice: "keep-mine" | "use-theirs") => Promise<void>;
  /**
   * Moves one of the user's own customizations into a new studio, with them
   * as its admin, so other people can be added to edit it. Its logo and
   * icons are copied over; sensitive settings and the content library stay
   * in the user's account until they're saved again. The old address keeps
   * a note pointing at the new one, so existing links still work.
   */
  shareWithOthers: (id: string) => Promise<SeedBibleCustomization>;
  /** Everyone in a shared customization's studio. */
  listMembers: (
    customization: SeedBibleCustomization
  ) => Promise<StudioMember[]>;
  /** Adds someone to a shared customization by their sign-in email. Admins only. */
  addMember: (
    customization: SeedBibleCustomization,
    email: string,
    role: StudioRole
  ) => Promise<void>;
  /** Removes someone from a shared customization. Admins only, and not themselves. */
  removeMember: (
    customization: SeedBibleCustomization,
    userId: string
  ) => Promise<void>;
  /**
   * The customization currently applied to the live theme, if any. There
   * are exactly two ways for one to become active: the in-progress edit
   * draft, if one is open (so unsaved edits preview live), or a
   * `?customization=...` share link. The draft takes priority, so opening
   * an editor always previews that customization even if a different one
   * was loaded via the URL.
   */
  activeCustomization: ReadonlySignal<SeedBibleCustomization | null>;
  /**
   * `recordName.id` for `activeCustomization`, or null when nothing is
   * active (or a draft is open before the owner is signed in, so there is
   * no record name to build a share link from).
   */
  activeCustomizationLocator: ReadonlySignal<string | null>;
  /**
   * The variant of the active customization currently in effect: the
   * viewer's own pick, else the default for the scheme in effect (the
   * device's when `isFollowingSystemScheme` or the app theme is System,
   * else the app theme's), else `defaultVariantId`, else the first variant.
   * In a minimal embed the link's theme wins over the viewer's pick: its
   * scheme's default, else `defaultVariantId` if based on that theme, else
   * the first variant based on it, else `defaultVariantId`, else the first.
   */
  activeVariant: ReadonlySignal<CustomizationThemeVariant | null>;
  /** Whether the active customization has both a Light-based and a Dark-based variant, and so can follow the device the way the app-wide System theme does. False when nothing is active. */
  canFollowSystemScheme: ReadonlySignal<boolean>;
  /**
   * Whether `activeVariant` is tracking the device right now — the viewer
   * picked the System card (stored as the `SYSTEM_THEME_ID` sentinel in
   * their variant selections), or never picked a variant here and their
   * app-wide theme is System.
   */
  isFollowingSystemScheme: ReadonlySignal<boolean>;
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
   * The variant that stands for `customization` in a list: its default for
   * the app theme's scheme, else `defaultVariantId`. Ignores the viewer's
   * own variant pick, which only applies to the active customization.
   */
  getPreviewVariant: (
    customization: SeedBibleCustomization
  ) => CustomizationThemeVariant | undefined;
  /**
   * `variant`'s resolved theme (base preset + its own overrides), with any
   * pending `previewEditingVariant*` override layered on top. This is what
   * `activeResolvedTheme` uses, and what `CustomizationEditPane` should use
   * to render a variant it's editing, so a `ColorPicker` drag previews live
   * without touching the draft until the picker commits.
   */
  resolveEditingVariantTheme: (
    variant: CustomizationThemeVariant
  ) => BibleTheme;
  /**
   * The extension ids that should be installed while the active
   * customization is in effect: its own `auto-installed` extensions (minus
   * any the viewer removed), unioned with any `available` extras the viewer
   * added for it via `addExtensionToActiveCustomization`. Empty when
   * nothing is active.
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
   * Builds a seed of the initial `?customization=...` load for the client to
   * reuse instead of re-fetching — see `InitialCustomizationSeed`. Called by
   * `entry-ssr.tsx` after rendering settles; null when there was no
   * `?customization=` param, or when the load hadn't actually completed (the
   * SSR-only timeout backstop fired first).
   */
  getInitialCustomizationSeed: () => InitialCustomizationSeed | null;
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
  /** Rejects, keeping the customization, if it or one of its sensitive proxies can't be erased. */
  remove: (id: string) => Promise<void>;
  /** Uploads the file, stages the resulting URL onto the open draft, and immediately persists it (unlike every other draft field, which auto-saves only after a short debounce). */
  uploadLogo: (file: File) => Promise<void>;
  /**
   * Uploads an SVG as one of the draft's custom icons and immediately
   * persists the draft, like `uploadLogo`. Throws, without uploading, when
   * `getCustomIconFileProblem` rejects the file.
   */
  uploadIcon: (iconId: CustomizationIconId, file: File) => Promise<void>;
  /** Removes one of the draft's custom icons, restoring the app's own, and immediately persists the draft. No-op with no open draft. */
  removeEditingIcon: (iconId: CustomizationIconId) => Promise<void>;
  /** The active customization's custom icons, limited to ids this build knows. Empty when nothing is active. */
  activeIcons: ReadonlySignal<CustomizationIcons>;
  /** A shareable link that auto-loads this customization via `loadByLocator`. */
  getShareLink: (customization: SeedBibleCustomization) => string;
  // Synchronous, draft-only mutators. Each no-ops if `editingCustomization` is
  // null, and otherwise queues a debounced auto-save of the draft.
  updateEditingName: (name: string) => void;
  /** Sets (or clears, given `null`) the draft's default translation. No-op with no open draft. */
  updateEditingDefaultTranslationId: (translationId: string | null) => void;
  /**
   * Points the open draft at a content library record (or at none), and
   * saves it right away: the library already exists by then, so the pointer
   * can't wait for the auto-save debounce.
   */
  setEditingContentRecordName: (recordName: string | null) => Promise<void>;
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
  /**
   * Live, non-committing preview of one color field on a draft variant —
   * reflected in `resolveEditingVariantTheme` immediately, but never
   * written into `editingCustomization` or auto-saved. Meant to be called
   * on a `ColorPicker`'s `onPreview` while the user drags;
   * `setEditingVariantColor` clears any pending preview for the same
   * variant/key once the color is actually committed.
   */
  previewEditingVariantColor: (
    variantId: string,
    key: ThemeColorKey,
    value: string
  ) => void;
  /** Discards a pending `previewEditingVariantColor`, e.g. on the picker's `onCancel`. */
  clearPreviewEditingVariantColor: (
    variantId: string,
    key: ThemeColorKey
  ) => void;
  /** Same as `previewEditingVariantColor`, for one field of a highlight color. */
  previewEditingVariantHighlightColor: (
    variantId: string,
    highlightId: string,
    patch: Partial<ThemeHighlightColor>
  ) => void;
  /** Discards a pending `previewEditingVariantHighlightColor` field, e.g. on `onCancel`. */
  clearPreviewEditingVariantHighlightField: (
    variantId: string,
    highlightId: string,
    field: keyof ThemeHighlightColor
  ) => void;
  /** Makes the variant the draft's default for its kind (see `getVariantDefaultRole`). No-op for an unknown id. */
  setEditingDefaultVariant: (variantId: string) => void;
  /** Removes a variant from the draft. No-op if it's the only remaining variant. */
  removeEditingVariant: (variantId: string) => void;
  /** Persists the viewer's variant choice for the currently active customization. Pass `SYSTEM_THEME_ID` to follow the device's color scheme instead of pinning one variant. No-op if none is active. */
  selectActiveVariant: (variantId: string) => Promise<void>;
  /** Sets an extension's availability on the draft, or with null, removes its entry so it follows the draft's default. No-op with no open draft. */
  setEditingExtensionAvailability: (
    extensionId: string,
    availability: ExtensionAvailability | null
  ) => void;
  /** Sets the availability the draft gives every extension with no explicit entry. No-op with no open draft. */
  setEditingDefaultExtensionAvailability: (
    availability: DefaultExtensionAvailability
  ) => void;
  /** The active customization's effective availability for an extension id. "available" when nothing is active; its default when the id has no explicit entry. */
  getActiveExtensionAvailability: (
    extensionId: string
  ) => ExtensionAvailability;
  /** Sets an extension setting's default value on the draft. No-op with no open draft. */
  setEditingExtensionSettingDefault: (
    extensionId: string,
    key: string,
    value: ExtensionSettingValue
  ) => void;
  /** Removes an extension setting's default value from the draft. No-op with no open draft. */
  clearEditingExtensionSettingDefault: (
    extensionId: string,
    key: string
  ) => void;
  /** The active customization's default for an extension setting, or undefined if nothing is active or it sets no default there. */
  /**
   * Records where one of the customization's own sensitive proxies is (or,
   * with null, forgets it) and saves the customization right away, since the
   * proxy record already exists. Updates the edit draft too when it's the
   * same customization. Resolves to whether it was saved.
   */
  setExtensionSensitiveProxy: (
    customizationId: string,
    extensionId: string,
    proxyId: string,
    pointer: SensitiveProxyPointer | null
  ) => Promise<boolean>;
  getActiveExtensionSettingDefault: (
    extensionId: string,
    key: string
  ) => ExtensionSettingValue | undefined;
  /** Installs an extension for the viewer on the active customization: an "available" one as an extra, an "auto-installed" one the viewer removed by putting it back. No-op if none is active or the extension is hidden there. */
  addExtensionToActiveCustomization: (extensionId: string) => Promise<void>;
  /** Uninstalls an extension for the viewer on the active customization: drops an extra, or records that they removed an "auto-installed" one. No-op if none is active. */
  removeExtensionFromActiveCustomization: (
    extensionId: string
  ) => Promise<void>;
}

/**
 * A prior SSR render's completed `?customization=...` load, handed to the
 * client so it can skip re-fetching over `os.getData()` — see
 * `CustomizationsManager.getInitialCustomizationSeed` (which produces this)
 * and `app/customizationSeed.ts` (which reads it back out of the injected
 * HTML on the client).
 */
export interface InitialCustomizationSeed {
  /**
   * The `?customization=...` locator this seed was resolved for. Checked
   * against the page's own `?customization=` param before use — a seed for a
   * different locator (a mismatched or stale cached HTML page, say) must
   * never be applied as if it were this page's own load.
   */
  locator: string;
  /**
   * The customization SSR resolved for `locator`, or null if that load
   * completed and found nothing (an invalid or deleted link). Only ever
   * built from a load that actually completed — see the caller in
   * `entry-ssr.tsx` — never from one the SSR-only timeout backstop cut
   * short, which would incorrectly tell the client "this doesn't exist" for
   * a link that might still resolve.
   *
   * Typed here as already-narrowed, but it crossed a server/client boundary
   * (embedded as JSON in the page) to get here — nothing enforces that shape
   * on the way in. The consumer (`createCustomizationsManager`'s
   * `parseSeedCustomization`) re-validates it through the same
   * `customizationSchema` a fresh fetch goes through before trusting it, so
   * treat this field as untrusted input, not as a guarantee.
   */
  customization: SeedBibleCustomization | null;
}

export function createCustomizationsManager(
  os: CasualOSManager,
  login: LoginManager,
  theme: ThemeManager,
  navigation: NavigationManager,
  variantSelections: CustomizationVariantSelectionsManager,
  extensionPreferences: CustomizationExtensionPreferencesManager,
  initialCustomizationSeed?: InitialCustomizationSeed,
  /** Apply the seed for the first paint, then download the record again anyway. */
  revalidateInitialCustomizationSeed = false
): CustomizationsManager {
  const customizations = signal<SeedBibleCustomization[]>([]);
  const isLoading = signal(false);
  const studioRoles = signal<Record<string, StudioRole>>({});
  const saveConflict = signal<CustomizationSaveConflict | null>(null);
  const editsDroppedAfterClose = signal<{ id: number; name: string } | null>(
    null
  );
  let editsDroppedAfterCloseCount = 0;
  const editingCustomization = signal<SeedBibleCustomization | null>(null);
  /**
   * The `updatedAt` of the saved copy the open draft is built on. A shared
   * customization whose saved copy has moved on from it was saved by
   * someone else in the meantime.
   */
  let draftBaseUpdatedAt: number | null = null;
  const editingVariantId = signal<string | null>(null);
  /**
   * In-memory-only color overrides from an open `ColorPicker`'s live drag on
   * a variant being edited, keyed by variant id. Never written into
   * `editingCustomization` or auto-saved — `resolveEditingVariantTheme`
   * layers these on top of the draft so a drag previews live (everywhere
   * the variant renders, including the whole app while it's also the
   * active one), and a cancel simply clears the entry.
   */
  const previewVariantOverrides = signal<Record<string, ThemeOverrides>>({});
  /** Same as `previewVariantOverrides`, for highlight colors. */
  const previewVariantHighlightOverrides = signal<
    Record<string, HighlightOverrides>
  >({});
  const linkedCustomization = signal<SeedBibleCustomization | null>(null);
  const linkedCustomizationLocator = signal<string | null>(null);

  const initialCustomizationLoadSettled = signal<boolean>(false);
  let resolveInitialCustomizationLoadPromise: () => void = () => {};
  const initialCustomizationLoadPromise = new Promise<void>((resolve) => {
    resolveInitialCustomizationLoadPromise = resolve;
  });

  /**
   * The `?customization=` locator the linked customization was loaded for.
   * Differs from `linkedCustomizationLocator` when the link's address held a
   * note saying the customization moved into a studio.
   */
  let linkedCustomizationRequestedLocator: string | null = null;

  const loadByLocator = async (locator: string): Promise<void> => {
    const found = await findByLocator(locator, true);
    if (found) {
      linkedCustomization.value = found.customization;
      linkedCustomizationLocator.value = found.locator;
      linkedCustomizationRequestedLocator = locator;
    }
  };

  const findByLocator = async (
    locator: string,
    followMoves: boolean
  ): Promise<{
    customization: SeedBibleCustomization;
    locator: string;
  } | null> => {
    // `id` is always `customization_<uuid>` (no dots); split on the LAST dot
    // so a recordName that happens to contain one still parses correctly.
    const dotIndex = locator.lastIndexOf(".");
    if (dotIndex <= 0 || dotIndex === locator.length - 1) {
      console.warn("Invalid customization locator:", locator);
      return null;
    }
    const recordName = locator.slice(0, dotIndex);
    const id = locator.slice(dotIndex + 1);

    try {
      const result = await os.getData(recordName, id);
      if (!result.success || !result.data) {
        console.warn("Customization not found for locator:", locator);
        return null;
      }
      const customization = parseCustomization(result.data);
      if (customization) {
        return { customization, locator };
      }
      // A customization moved into a studio leaves a note at its old
      // address, so links shared before the move still open it. Only one
      // hop is followed, so two notes pointing at each other can't loop.
      const moved = movedCustomizationSchema.safeParse(result.data);
      if (moved.success && followMoves) {
        return findByLocator(
          buildCustomizationLocator(
            moved.data.movedTo.recordName,
            moved.data.movedTo.id
          ),
          false
        );
      }
      console.warn("Invalid customization record for locator:", locator);
      return null;
    } catch (error) {
      console.error(
        "Failed to load customization from locator:",
        locator,
        error
      );
      return null;
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

  /**
   * True once the initial `?customization=...` load has actually completed
   * (found, not found, or errored) — unlike `initialCustomizationLoadSettled`
   * above, this is never forced true by the SSR-only timeout backstop below.
   * `getInitialCustomizationSeed` relies on that distinction: seeding the
   * client with "not found" for a load the timeout merely gave up waiting on
   * would incorrectly rule out a customization that might still resolve.
   */
  let initialCustomizationLoadCompleted = false;

  /**
   * Validates a same-locator seed the same way `loadByLocator` validates a
   * freshly-fetched record — `initialCustomizationSeed.customization` is
   * typed as an already-narrowed `SeedBibleCustomization`, but it crossed a
   * server/client boundary (embedded as JSON in the page) to get here, so
   * nothing actually enforces that shape at this point except this parse.
   * Skipping it would let the fetch path and the seed path silently drift
   * apart the next time the schema changes (a new required field, a
   * different variant shape): the fetch path would reject a stale/bad
   * record, while the seed path would wave it through as-is.
   */
  function parseSeedCustomization(
    customization: SeedBibleCustomization
  ): SeedBibleCustomization | null {
    return parseCustomization(customization);
  }

  if (initialLocator) {
    const seedForLocator =
      initialCustomizationSeed?.locator === initialLocator
        ? initialCustomizationSeed
        : null;

    // `customization: null` means the seed itself already resolved to "not
    // found" — nothing to validate, that outcome applies as-is. A non-null
    // seed still has to pass the same schema check `loadByLocator` applies to
    // a fresh fetch; an invalid one is treated as no seed at all, falling
    // through to a normal fetch below rather than trusting a shape the
    // schema no longer accepts.
    const validatedSeedCustomization =
      seedForLocator && seedForLocator.customization
        ? parseSeedCustomization(seedForLocator.customization)
        : null;
    const seedIsUsable =
      seedForLocator &&
      (seedForLocator.customization === null || validatedSeedCustomization);

    if (seedIsUsable) {
      // A prior SSR render already resolved this exact locator — apply its
      // result directly instead of repeating the `os.getData()` round trip.
      if (validatedSeedCustomization) {
        linkedCustomization.value = validatedSeedCustomization;
        // A link from before a move into a studio resolves to the studio's
        // copy, the same as `loadByLocator` following the moved note.
        linkedCustomizationLocator.value = validatedSeedCustomization.studioId
          ? buildCustomizationLocator(
              validatedSeedCustomization.studioId,
              validatedSeedCustomization.id
            )
          : initialLocator;
        linkedCustomizationRequestedLocator = initialLocator;
      }
      initialCustomizationLoadCompleted = true;
      settleInitialCustomizationLoad();
      if (revalidateInitialCustomizationSeed) {
        void loadByLocator(initialLocator);
      }
    } else {
      if (seedForLocator) {
        console.warn(
          "Ignoring an initialCustomizationSeed that failed validation; fetching instead:",
          initialLocator
        );
      }
      void loadByLocator(initialLocator).then(() => {
        initialCustomizationLoadCompleted = true;
        settleInitialCustomizationLoad();
      });

      // During SSR the render blocks on `initialCustomizationLoadPromise`, so
      // an `os.getData()` that never answers would hold the request open
      // indefinitely — `loadByLocator` itself always resolves (its try/catch
      // covers every other failure mode), so this timeout is purely a
      // backstop for that one case. Not armed on the client: the promise is
      // only thrown (to suspend) during SSR (see
      // `ExternalResourceDependencies` in `app/main.tsx`), so on the client
      // it's never awaited and a slow load simply applies the customization
      // late, exactly as it did before this feature existed.
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
    }
  } else {
    settleInitialCustomizationLoad();
  }

  /**
   * Builds a seed of the initial `?customization=...` load for
   * `entry-ssr.tsx` to embed in the page, so the client's own
   * `CustomizationsManager` can skip re-fetching what SSR already resolved —
   * see `InitialCustomizationSeed`. Null when there was no `?customization=`
   * param, or when the load hadn't actually completed by the time this was
   * called (the SSR-only timeout backstop fired first).
   */
  const getInitialCustomizationSeed = (): InitialCustomizationSeed | null => {
    if (!initialLocator || !initialCustomizationLoadCompleted) {
      return null;
    }
    return {
      locator: initialLocator,
      // Compared with the locator the load was asked for, not the one it
      // ended at: a link from before a move into a studio ends at the
      // studio's address, and is still this page's customization.
      customization:
        linkedCustomizationRequestedLocator === initialLocator
          ? linkedCustomization.value
          : null,
    };
  };

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
      const userId = login.userId.value;
      return userId
        ? buildCustomizationLocator(
            customizationRecordName(draft, userId),
            draft.id
          )
        : null;
    }
    if (linkedCustomization.value) {
      return linkedCustomizationLocator.value;
    }
    return null;
  });

  // A super property rides on every later event (pageviews, chapter reads,
  // …), which is what lets analytics be split per customization; the person
  // property only remembers the latest one a signed-in viewer arrived through.
  // Session-scoped (sessionStorage, one tab) rather than `register`'s
  // persistent storage, which would leak the tag into a later plain visit's
  // events, or another tab's, until this effect got round to clearing it.
  // Keyed on the share link rather than `activeCustomizationLocator` so an
  // owner previewing their own draft isn't counted as a visit to it.
  effect(() => {
    const locator = linkedCustomizationLocator.value;
    const userId = login.userId.value;
    if (typeof posthog === "undefined" || !posthog) {
      return;
    }
    if (!locator) {
      posthog.unregister_for_session(POSTHOG_CUSTOMIZATION_PROPERTY);
      return;
    }
    posthog.register_for_session({ [POSTHOG_CUSTOMIZATION_PROPERTY]: locator });
    if (userId) {
      posthog.identify(userId, { [POSTHOG_CUSTOMIZATION_PROPERTY]: locator });
    }
  });

  /**
   * The address the active customization had before it moved into a studio,
   * where a viewer's choices made through that address are still kept.
   */
  const previousActiveLocator = computed<string | null>(() => {
    const customization = activeCustomization.value;
    return customization?.studioId && customization.movedFromRecordName
      ? buildCustomizationLocator(
          customization.movedFromRecordName,
          customization.id
        )
      : null;
  });

  const hasExtensionChoices = (locator: string): boolean =>
    extensionPreferences.extraExtensionIdsByLocator.value[locator] !==
      undefined ||
    extensionPreferences.removedExtensionIdsByLocator.value[locator] !==
      undefined;

  /**
   * Where the viewer's extension choices for the active customization are:
   * its own address, or, until they change one there, its old address.
   */
  const extensionChoicesLocator = computed<string | null>(() => {
    const locator = activeCustomizationLocator.value;
    const previous = previousActiveLocator.value;
    if (!locator || !previous || hasExtensionChoices(locator)) {
      return locator;
    }
    return hasExtensionChoices(previous) ? previous : locator;
  });

  /**
   * Copies the viewer's extension choices from the active customization's
   * old address to its current one before the first change there, which
   * would otherwise hide every choice still under the old address.
   */
  const adoptPreviousExtensionChoices = async (
    locator: string
  ): Promise<void> => {
    const previous = previousActiveLocator.value;
    if (!previous || hasExtensionChoices(locator)) {
      return;
    }
    for (const id of extensionPreferences.getExtraExtensionIds(previous)) {
      await extensionPreferences.addExtraExtensionId(locator, id);
    }
    for (const id of extensionPreferences.getRemovedExtensionIds(previous)) {
      await extensionPreferences.addRemovedExtensionId(locator, id);
    }
  };

  const activeExtensionIds = computed<string[]>(() => {
    const customization = activeCustomization.value;
    if (!customization) {
      return [];
    }
    const locator = extensionChoicesLocator.value;
    const removed = locator
      ? extensionPreferences.getRemovedExtensionIds(locator)
      : [];
    const autoInstalled = Object.entries(customization.extensionSettings)
      .filter(([, availability]) => availability === "auto-installed")
      .map(([id]) => id)
      .filter((id) => !removed.includes(id));
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

  const selectedVariantId = computed<string | null>(() => {
    const locator = activeCustomizationLocator.value;
    const previous = previousActiveLocator.value;
    if (!locator) {
      return null;
    }
    return (
      variantSelections.getSelectedVariantId(locator) ??
      (previous ? variantSelections.getSelectedVariantId(previous) : null)
    );
  });

  const canFollowSystemScheme = computed<boolean>(() => {
    const customization = activeCustomization.value;
    if (!customization) {
      return false;
    }
    return (
      customization.variants.some((v) => v.baseTheme === LIGHT_THEME.id) &&
      customization.variants.some((v) => v.baseTheme === DARK_THEME.id)
    );
  });

  const isFollowingSystemScheme = computed<boolean>(() => {
    if (!canFollowSystemScheme.value) {
      return false;
    }
    // An explicit pick wins, including the System card's own sentinel. Only
    // a viewer who has never picked a variant here inherits their app-wide
    // System preference.
    const selectedId = selectedVariantId.value;
    return selectedId
      ? selectedId === SYSTEM_THEME_ID
      : theme.selectedThemeId.value === SYSTEM_THEME_ID;
  });

  // A boolean, not the URL itself, so the active variant (and the theme built
  // from it) is recomputed only when embed mode flips, not on every navigation.
  const isMinimalEmbed = computed(() =>
    isMinimalEmbedUrl(navigation.currentUrl.value)
  );
  const deviceSchemeThemeId = computed(() =>
    theme.prefersDarkScheme.value ? DARK_THEME.id : LIGHT_THEME.id
  );
  /** The app theme's id, with System resolved to the device's scheme. */
  const appSchemeThemeId = computed(() =>
    theme.selectedThemeId.value === SYSTEM_THEME_ID
      ? deviceSchemeThemeId.value
      : theme.selectedThemeId.value
  );
  const activeVariant = computed<CustomizationThemeVariant | null>(() => {
    const customization = activeCustomization.value;
    if (!customization) {
      return null;
    }
    const byId = (id: string | null | undefined) =>
      id ? customization.variants.find((v) => v.id === id) : undefined;
    // The embed link names the theme. A saved variant pick would leave the
    // preview on one look no matter which theme the link asked for.
    if (isMinimalEmbed.value) {
      const linkThemeId = appSchemeThemeId.value;
      const fallbackDefault = byId(customization.defaultVariantId);
      const linked =
        byId(getSchemeDefaultVariantId(customization, linkThemeId)) ??
        (fallbackDefault?.baseTheme === linkThemeId
          ? fallbackDefault
          : undefined) ??
        customization.variants.find(
          (variant) => variant.baseTheme === linkThemeId
        );
      if (linked) {
        return linked;
      }
      // No variant matches the link's theme (only a light variant, or a
      // branding theme id). The viewer's saved pick is not what a visitor
      // to the embed sees — they get the customization's default.
      return (
        byId(customization.defaultVariantId) ??
        customization.variants[0] ??
        null
      );
    }

    const schemeThemeId = isFollowingSystemScheme.value
      ? deviceSchemeThemeId.value
      : appSchemeThemeId.value;

    return (
      byId(selectedVariantId.value) ??
      resolveDefaultVariant(customization, schemeThemeId) ??
      null
    );
  });

  const getPreviewVariant = (
    customization: SeedBibleCustomization
  ): CustomizationThemeVariant | undefined =>
    resolveDefaultVariant(customization, appSchemeThemeId.value);

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

  /**
   * `variant`'s resolved theme, with any pending live-drag preview for it
   * layered on top — same merge style `buildBibleThemeFromCustomizationTheme`
   * itself uses (a plain `variables` spread, `applyHighlightOverrides` for
   * highlights), just sourced from `previewVariantOverrides` instead of the
   * variant's own persisted fields.
   */
  const resolveEditingVariantTheme = (
    variant: CustomizationThemeVariant
  ): BibleTheme => {
    const resolved = buildBibleThemeFromCustomizationTheme(
      variant,
      resolveVariantBaseTheme(variant)
    );
    const colorPreview = previewVariantOverrides.value[variant.id];
    const withColorPreview =
      !colorPreview || Object.keys(colorPreview).length === 0
        ? resolved
        : {
            ...resolved,
            variables: { ...resolved.variables, ...colorPreview },
          };
    const highlightPreview = previewVariantHighlightOverrides.value[variant.id];
    return highlightPreview
      ? applyHighlightOverrides(withColorPreview, highlightPreview)
      : withColorPreview;
  };

  const activeResolvedTheme = computed<BibleTheme | null>(() => {
    const variant = activeVariant.value;
    if (!variant) {
      return null;
    }
    return resolveEditingVariantTheme(variant);
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

  /**
   * Parses the customizations listed from one record, keeping only those
   * that say they belong there: `studioId` for a studio's record, none for a
   * person's own. A copy claiming another home would be saved somewhere
   * other than where it was found.
   */
  const parseListed = (
    items: { data: unknown }[],
    studioId: string | undefined
  ): SeedBibleCustomization[] => {
    const loaded: SeedBibleCustomization[] = [];
    for (const item of items) {
      const customization = parseCustomization(item.data);
      if (!customization) {
        console.warn("Skipping invalid customization record:", item);
        continue;
      }
      if (customization.studioId !== studioId) {
        console.warn(
          "Skipping a customization record stored outside its own record:",
          customization.id
        );
        continue;
      }
      loaded.push(customization);
    }
    return loaded;
  };

  /**
   * The signed-in user's studios. A failed listing leaves out only the
   * shared customizations; their own still load.
   */
  const loadStudios = async (userId: string) => {
    try {
      const result = await os.listStudios(userId);
      if (result.success) {
        return result.studios;
      }
      console.warn("Failed to list studios:", result.errorCode);
    } catch (error) {
      console.warn("Failed to list studios:", error);
    }
    return [];
  };

  const load = async () => {
    const userId = login.userId.value;
    if (!userId) {
      customizations.value = [];
      studioRoles.value = {};
      return;
    }

    isLoading.value = true;
    try {
      const [personal, studios] = await Promise.all([
        os.listAllDataByMarker(userId, CUSTOMIZATION_MARKER),
        loadStudios(userId),
      ]);
      const shared = await Promise.all(
        studios.map(async (studio) => {
          try {
            const result = await os.listAllDataByMarker(
              studio.studioId,
              CUSTOMIZATION_MARKER
            );
            return parseListed(result.items, studio.studioId);
          } catch (error) {
            console.error("Failed to load a studio's customizations:", error);
            return [];
          }
        })
      );
      customizations.value = [
        ...parseListed(personal.items, undefined),
        ...shared.flat(),
      ];
      studioRoles.value = Object.fromEntries(
        studios.map((studio) => [studio.studioId, studio.role])
      );
    } catch (error) {
      console.error("Failed to load customizations:", error);
    } finally {
      isLoading.value = false;
    }
  };

  const persist = (userId: string, record: SeedBibleCustomization) =>
    os.recordData(customizationRecordName(record, userId), record.id, record, {
      marker: CUSTOMIZATION_MARKER,
    });

  /**
   * Keeps a share-link copy of the owner's own customization in step with a
   * save. Without this, closing the editor falls back to the copy fetched
   * when the link loaded, so the owner sees their edits undone until a reload.
   */
  const updateLinkedCopy = (
    userId: string,
    saved: SeedBibleCustomization
  ): void => {
    if (
      linkedCustomizationLocator.value ===
      buildCustomizationLocator(
        customizationRecordName(saved, userId),
        saved.id
      )
    ) {
      linkedCustomization.value = saved;
    }
  };

  // Every draft save and pointer write goes through here, one at a time, so
  // they reach the server in the order they were made: an older copy can't
  // land last and overwrite a newer one, which for a pointer would leave its
  // proxy (and the owner's key) running with nothing pointing at it.
  let writeChain: Promise<unknown> = Promise.resolve();
  const queueWrite = <T,>(run: () => Promise<T>): Promise<T> => {
    const next = writeChain.then(run, run);
    writeChain = next.catch(() => undefined);
    return next;
  };

  const create = async (): Promise<SeedBibleCustomization> => {
    const userId = login.userId.value;
    if (!userId) {
      throw new Error("Cannot create a customization while signed out.");
    }

    const now = Date.now();
    const preset = theme.basePresetTheme.value;
    const variant = buildVariant(preset.name, preset.id);
    const record: SeedBibleCustomization = fillSchemeDefaults({
      id: `customization_${uuid()}`,
      name: `Custom Branding ${customizations.value.length + 1}`,
      variants: [variant],
      defaultVariantId: variant.id,
      logoUrl: null,
      icons: {},
      createdAt: now,
      updatedAt: now,
      extensionSettings: {},
      extensionSettingDefaults: {},
      extensionSensitiveProxies: {},
    });

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
    draftBaseUpdatedAt = existing.updatedAt;
    saveConflict.value = null;
  };

  /**
   * Clears `editingCustomization` and `editingVariantId`. Any edit still
   * waiting on the auto-save debounce is flushed first (in the background —
   * this stays synchronous, since callers rely on the draft being gone
   * immediately), so closing the editor right after a change doesn't drop it.
   */
  const stopEditing = (): void => {
    if (autoSaveTimer !== null) {
      const closing = editingCustomization.value;
      void saveEditingCustomization().catch((error) => {
        if (!(error instanceof CustomizationSaveConflictError)) {
          console.error("Failed to auto-save customization:", error);
          return;
        }
        // The editor is gone, so there's no banner to offer the choice.
        if (saveConflict.value?.customizationId === closing?.id) {
          saveConflict.value = null;
        }
        if (closing) {
          editsDroppedAfterClose.value = {
            id: ++editsDroppedAfterCloseCount,
            name: closing.name,
          };
        }
      });
    }
    editingCustomization.value = null;
    editingVariantId.value = null;
    saveConflict.value = null;
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
    saveConflict.value = null;
  };

  /** Files copied into a studio by a share, old URL to new. */
  const copiedFileUrls = new Map<string, string>();

  /**
   * A draft captured before a share that finished while its save waited in
   * the queue, moved to the studio like the share moved the saved copy.
   * Saving it as captured would write it back to the creator's own record,
   * over the note that points to the studio.
   */
  const rehomedAfterShare = (
    draft: SeedBibleCustomization
  ): SeedBibleCustomization => {
    const known = customizations.value.find((c) => c.id === draft.id);
    if (draft.studioId || !known?.studioId) {
      return draft;
    }
    return {
      ...withFileUrls(draft, (url) => copiedFileUrls.get(url) ?? url),
      studioId: known.studioId,
      movedFromRecordName: known.movedFromRecordName,
    };
  };

  /**
   * The copy of a shared customization on the server right now, or null
   * when it can't be read. Only reads; callers decide what a difference
   * means.
   */
  const fetchSharedCopy = async (
    customization: SeedBibleCustomization
  ): Promise<SeedBibleCustomization | null> => {
    if (!customization.studioId) {
      return null;
    }
    try {
      const result = await os.getData(customization.studioId, customization.id);
      if (!result.success) {
        return null;
      }
      return parseCustomization(result.data);
    } catch {
      return null;
    }
  };

  /**
   * Stops a save of a shared customization's draft from overwriting what
   * someone else saved since the draft was opened. Saves still go ahead
   * when the server copy can't be read: the write will say whether that
   * was more than a hiccup.
   */
  const checkForSaveConflict = async (
    draft: SeedBibleCustomization
  ): Promise<void> => {
    if (!draft.studioId || draftBaseUpdatedAt === null) {
      return;
    }
    const theirs = await fetchSharedCopy(draft);
    if (theirs && theirs.updatedAt !== draftBaseUpdatedAt) {
      saveConflict.value = { customizationId: draft.id, theirs };
      throw new CustomizationSaveConflictError();
    }
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

    let saved: SeedBibleCustomization = { ...current, updatedAt: Date.now() };
    await queueWrite(async () => {
      saved = rehomedAfterShare(saved);
      await checkForSaveConflict(saved);
      // Nothing local changes unless the server kept the record, so a failed
      // save keeps the draft unsaved instead of looking applied.
      const result = await persist(userId, saved);
      if (!result.success) {
        throw new Error(`Failed to save customization: ${result.errorCode}`);
      }
      customizations.value = customizations.value.some((c) => c.id === saved.id)
        ? customizations.value.map((c) => (c.id === saved.id ? saved : c))
        : [...customizations.value, saved];
      updateLinkedCopy(userId, saved);
      if (editingCustomization.value?.id === saved.id) {
        draftBaseUpdatedAt = saved.updatedAt;
      }
    });
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
  const flushAutoSave = (): Promise<void> =>
    saveEditingCustomization().catch((error) => {
      if (error instanceof CustomizationSaveConflictError) {
        // `saveConflict` already tells the editor; it's not a failure.
        return;
      }
      console.error("Failed to auto-save customization:", error);
    });

  const resolveSaveConflict = async (
    choice: "keep-mine" | "use-theirs"
  ): Promise<void> => {
    const conflict = saveConflict.value;
    const draft = editingCustomization.value;
    if (!conflict || draft?.id !== conflict.customizationId) {
      saveConflict.value = null;
      return;
    }
    saveConflict.value = null;
    if (choice === "keep-mine") {
      // Saving over their copy is now a choice, not an accident.
      draftBaseUpdatedAt = conflict.theirs.updatedAt;
      await saveEditingCustomization();
      return;
    }
    if (autoSaveTimer !== null) {
      clearTimeout(autoSaveTimer);
      autoSaveTimer = null;
    }
    customizations.value = customizations.value.map((c) =>
      c.id === conflict.theirs.id ? conflict.theirs : c
    );
    editingCustomization.value = conflict.theirs;
    draftBaseUpdatedAt = conflict.theirs.updatedAt;
    const userId = login.userId.value;
    if (userId) {
      updateLinkedCopy(userId, conflict.theirs);
    }
  };

  const updateEditingName = (name: string): void => {
    const current = editingCustomization.value;
    if (!current) {
      return;
    }
    editingCustomization.value = { ...current, name, updatedAt: Date.now() };
    scheduleAutoSave();
  };

  const updateEditingDefaultTranslationId = (
    translationId: string | null
  ): void => {
    const current = editingCustomization.value;
    if (!current) {
      return;
    }
    editingCustomization.value = {
      ...current,
      defaultTranslationId: translationId ?? undefined,
      updatedAt: Date.now(),
    };
    scheduleAutoSave();
  };

  const setEditingContentRecordName = async (
    recordName: string | null
  ): Promise<void> => {
    const current = editingCustomization.value;
    if (!current) {
      return;
    }
    const withLibrary = (
      customization: SeedBibleCustomization,
      library: string | undefined,
      updatedAt: number
    ): SeedBibleCustomization => {
      const next: SeedBibleCustomization = { ...customization, updatedAt };
      if (library) {
        next.contentRecordName = library;
      } else {
        delete next.contentRecordName;
      }
      return next;
    };
    const previous = current.contentRecordName;
    const saved = await saveFieldChange(
      current.id,
      {
        apply: (customization, updatedAt) =>
          withLibrary(customization, recordName ?? undefined, updatedAt),
        isApplied: (customization) =>
          (customization.contentRecordName ?? null) === recordName,
        undo: (customization, updatedAt) =>
          withLibrary(customization, previous, updatedAt),
      },
      "a customization's content library"
    );
    if (!saved) {
      throw new Error("Failed to save the customization's content library.");
    }
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

    editingCustomization.value = fillSchemeDefaults({
      ...current,
      variants: [...current.variants, variant],
      updatedAt: Date.now(),
    });
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

    editingCustomization.value = fillSchemeDefaults({
      ...current,
      variants: current.variants.map((v) =>
        v.id === variantId
          ? { ...v, baseTheme: preset.id, updatedAt: Date.now() }
          : v
      ),
      updatedAt: Date.now(),
    });
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

  const previewEditingVariantColor = (
    variantId: string,
    key: ThemeColorKey,
    value: string
  ): void => {
    previewVariantOverrides.value = {
      ...previewVariantOverrides.value,
      [variantId]: {
        ...previewVariantOverrides.value[variantId],
        [key]: value,
      },
    };
  };

  const clearPreviewEditingVariantColor = (
    variantId: string,
    key: ThemeColorKey
  ): void => {
    const existing = previewVariantOverrides.value[variantId];
    if (!existing || !(key in existing)) return;
    const next = { ...existing };
    delete next[key];
    const nextAll = { ...previewVariantOverrides.value };
    if (Object.keys(next).length === 0) {
      delete nextAll[variantId];
    } else {
      nextAll[variantId] = next;
    }
    previewVariantOverrides.value = nextAll;
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
    batch(() => {
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
      clearPreviewEditingVariantColor(variantId, key);
      scheduleAutoSave();
    });
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

  const previewEditingVariantHighlightColor = (
    variantId: string,
    highlightId: string,
    patch: Partial<ThemeHighlightColor>
  ): void => {
    const existingForVariant =
      previewVariantHighlightOverrides.value[variantId] ?? {};
    const existingForId = existingForVariant[highlightId] ?? {};
    previewVariantHighlightOverrides.value = {
      ...previewVariantHighlightOverrides.value,
      [variantId]: {
        ...existingForVariant,
        [highlightId]: { ...existingForId, ...patch },
      },
    };
  };

  const clearPreviewEditingVariantHighlightField = (
    variantId: string,
    highlightId: string,
    field: keyof ThemeHighlightColor
  ): void => {
    const existingForVariant =
      previewVariantHighlightOverrides.value[variantId];
    const existingForId = existingForVariant?.[highlightId];
    if (!existingForId || !(field in existingForId)) return;
    const nextForId = { ...existingForId };
    delete nextForId[field];
    const nextForVariant = { ...existingForVariant };
    if (Object.keys(nextForId).length === 0) {
      delete nextForVariant[highlightId];
    } else {
      nextForVariant[highlightId] = nextForId;
    }
    const nextAll = { ...previewVariantHighlightOverrides.value };
    if (Object.keys(nextForVariant).length === 0) {
      delete nextAll[variantId];
    } else {
      nextAll[variantId] = nextForVariant;
    }
    previewVariantHighlightOverrides.value = nextAll;
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
    batch(() => {
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
      for (const field of Object.keys(patch) as (keyof ThemeHighlightColor)[]) {
        clearPreviewEditingVariantHighlightField(variantId, highlightId, field);
      }
      scheduleAutoSave();
    });
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
    const variant = current?.variants.find((v) => v.id === variantId);
    if (!current || !variant) {
      return;
    }

    const role = getVariantDefaultRole(variant);
    const fallbackDefault = current.variants.find(
      (v) => v.id === current.defaultVariantId
    );
    const fallbackRole = fallbackDefault
      ? getVariantDefaultRole(fallbackDefault)
      : role;

    editingCustomization.value = {
      ...current,
      [DEFAULT_ROLE_FIELD_MAP[role]]: variantId,
      ...(fallbackRole === role ? { defaultVariantId: variantId } : {}),
      updatedAt: Date.now(),
    };

    scheduleAutoSave();
  };

  const removeEditingVariant = (variantId: string): void => {
    const current = editingCustomization.value;
    if (!current || current.variants.length <= 1) {
      return;
    }
    const removed = current.variants.find((v) => v.id === variantId);
    if (!removed) {
      return;
    }

    const remaining = current.variants.filter((v) => v.id !== variantId);
    const removedRole = getVariantDefaultRole(removed);
    const nextDefaultVariantId =
      current.defaultVariantId === variantId
        ? (
            remaining.find((v) => getVariantDefaultRole(v) === removedRole) ??
            remaining[0]!
          ).id
        : current.defaultVariantId;

    editingCustomization.value = fillSchemeDefaults({
      ...current,
      variants: remaining,
      defaultVariantId: nextDefaultVariantId,
      updatedAt: Date.now(),
    });
    scheduleAutoSave();
  };

  const remove = async (id: string): Promise<void> => {
    const userId = login.userId.value;
    const existing = customizations.value.find((c) => c.id === id);
    if (!userId || !existing) {
      return;
    }

    // The proxies go first: once the record is gone nothing points at them,
    // and a public one would stay usable by anyone who saw its address.
    for (const byProxy of Object.values(existing.extensionSensitiveProxies)) {
      for (const pointer of Object.values(byProxy)) {
        const erased = await os.eraseProxy(pointer.recordName, pointer.address);
        // A key saved before sharing is kept in its creator's own record,
        // which other members of the studio may not erase. Their delete still
        // goes ahead: with the customization gone, nothing points at the key.
        const othersRecord =
          pointer.recordName !== userId &&
          pointer.recordName !== existing.studioId;
        if (
          othersRecord &&
          !erased.success &&
          erased.errorCode === "not_authorized"
        ) {
          console.warn(
            "Left a sensitive proxy kept in another person's record:",
            pointer.recordName
          );
          continue;
        }
        if (!erased.success && erased.errorCode !== "data_not_found") {
          throw new Error(
            `Failed to clear a customization's sensitive settings: ${erased.errorCode}`
          );
        }
      }
    }

    // A studio stays behind once its customization is gone: CasualOS has no
    // way to delete one.
    const result = await os.eraseData(
      customizationRecordName(existing, userId),
      id
    );
    if (!result.success && result.errorCode !== "data_not_found") {
      throw new Error(`Failed to delete customization: ${result.errorCode}`);
    }
    customizations.value = customizations.value.filter((c) => c.id !== id);
    if (editingCustomization.value?.id === id) {
      editingCustomization.value = null;
    }
  };

  /**
   * Uploads a file for the open draft and returns the draft as it stands
   * once the upload finishes, along with the file's URL. Null when nothing
   * is being edited, or when the editor was closed or switched to another
   * customization while the upload ran, so the file never lands on a
   * customization it wasn't meant for.
   */
  const uploadCustomizationFile = async (
    file: File,
    mimeType: string,
    label: string
  ): Promise<{ draft: SeedBibleCustomization; url: string } | null> => {
    const userId = login.userId.value;
    if (!userId) {
      throw new Error(`Cannot upload this ${label} while signed out.`);
    }
    const editing = editingCustomization.value;
    const startedFor = editing?.id;
    if (!editing || !startedFor) {
      return null;
    }

    const result = await os.recordFile(
      customizationRecordName(editing, userId),
      file,
      {
        mimeType,
        marker: CUSTOMIZATION_MARKER,
      }
    );
    if (result.success === false) {
      throw new Error(`Failed to upload ${label}.`);
    }

    const draft = editingCustomization.value;
    if (!draft || draft.id !== startedFor) {
      return null;
    }
    return { draft, url: result.url };
  };

  const uploadLogo = async (file: File): Promise<void> => {
    const uploaded = await uploadCustomizationFile(file, file.type, "logo");
    if (!uploaded) {
      return;
    }
    editingCustomization.value = {
      ...uploaded.draft,
      logoUrl: uploaded.url,
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

  const uploadIcon = async (
    iconId: CustomizationIconId,
    file: File
  ): Promise<void> => {
    const problem = getCustomIconFileProblem(file);
    if (problem) {
      throw new Error(`Cannot use this file as an icon: ${problem}.`);
    }
    // Sent as SVG even when the browser gave no type, so the files host
    // serves it as one; masks ignore files without an image type.
    const uploaded = await uploadCustomizationFile(file, SVG_MIME_TYPE, "icon");
    if (!uploaded) {
      return;
    }
    editingCustomization.value = {
      ...uploaded.draft,
      icons: { ...uploaded.draft.icons, [iconId]: uploaded.url },
      updatedAt: Date.now(),
    };
    await saveEditingCustomization();
  };

  const removeEditingIcon = async (
    iconId: CustomizationIconId
  ): Promise<void> => {
    const current = editingCustomization.value;
    if (!current) {
      return;
    }
    const icons = { ...current.icons };
    delete icons[iconId];
    editingCustomization.value = {
      ...current,
      icons,
      updatedAt: Date.now(),
    };
    await saveEditingCustomization();
  };

  // Every draft edit (a name keystroke, a color drag) makes a new
  // `activeCustomization`, so the previous result is handed back whenever
  // the icons themselves are unchanged. Otherwise every icon in the app
  // would re-render on each edit.
  let previousActiveIcons: CustomizationIcons = {};
  const activeIcons = computed<CustomizationIcons>(() => {
    const icons = activeCustomization.value?.icons ?? {};
    const next: CustomizationIcons = Object.fromEntries(
      Object.entries(icons).filter(([id]) => isCustomizationIconId(id))
    );
    const unchanged = CUSTOMIZATION_ICON_IDS.every(
      (id) => previousActiveIcons[id] === next[id]
    );
    if (!unchanged) {
      previousActiveIcons = next;
    }
    return previousActiveIcons;
  });

  const setEditingExtensionAvailability = (
    extensionId: string,
    availability: ExtensionAvailability | null
  ): void => {
    const current = editingCustomization.value;
    if (!current) {
      return;
    }
    // An explicit entry is kept even when it matches the current default, so
    // that the author's choice for this extension survives a later change
    // of the default.
    const nextSettings = { ...current.extensionSettings };
    if (availability === null) {
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

  const setEditingDefaultExtensionAvailability = (
    availability: DefaultExtensionAvailability
  ): void => {
    const current = editingCustomization.value;
    if (!current) {
      return;
    }
    editingCustomization.value = {
      ...current,
      defaultExtensionAvailability: availability,
      updatedAt: Date.now(),
    };
    scheduleAutoSave();
  };

  const getActiveExtensionAvailability = (
    extensionId: string
  ): ExtensionAvailability =>
    getExtensionAvailability(activeCustomization.value, extensionId);

  const setEditingExtensionSettingDefault = (
    extensionId: string,
    key: string,
    value: ExtensionSettingValue
  ): void => {
    const current = editingCustomization.value;
    if (!current) {
      return;
    }
    editingCustomization.value = {
      ...current,
      extensionSettingDefaults: {
        ...current.extensionSettingDefaults,
        [extensionId]: {
          ...current.extensionSettingDefaults[extensionId],
          [key]: value,
        },
      },
      updatedAt: Date.now(),
    };
    scheduleAutoSave();
  };

  const clearEditingExtensionSettingDefault = (
    extensionId: string,
    key: string
  ): void => {
    const current = editingCustomization.value;
    const currentExtensionDefaults =
      current?.extensionSettingDefaults[extensionId];
    if (!current || !currentExtensionDefaults) {
      return;
    }
    const nextExtensionDefaults = { ...currentExtensionDefaults };
    delete nextExtensionDefaults[key];
    editingCustomization.value = {
      ...current,
      extensionSettingDefaults: {
        ...current.extensionSettingDefaults,
        [extensionId]: nextExtensionDefaults,
      },
      updatedAt: Date.now(),
    };
    scheduleAutoSave();
  };

  const getActiveExtensionSettingDefault = (
    extensionId: string,
    key: string
  ): ExtensionSettingValue | undefined =>
    getExtensionSettingDefault(activeCustomization.value, extensionId, key);

  /**
   * Applies one small change to a customization and saves it right away,
   * for changes that point at something already created elsewhere (a proxy,
   * a content library), so the customization must record it now or lose
   * track of it.
   *
   * The draft gets the change too, so a later save of it carries the change
   * instead of dropping it. The write itself starts from the newest saved
   * copy rather than the draft: the draft may hold edits the author hasn't
   * saved yet, and might still discard. For a shared customization that's
   * the server's copy, so the write doesn't undo what someone else saved,
   * and can't hit a save conflict. Their changes aren't in the open draft,
   * so its base stays put and its next save still reports the conflict.
   *
   * The draft and the saved copy share one timestamp, so once the write
   * lands they compare equal and the draft doesn't read as unsaved.
   * Resolves to whether it was saved; a failed write takes the change back
   * off the draft, unless something newer has replaced it there since.
   */
  const saveFieldChange = async (
    customizationId: string,
    change: {
      apply: (
        customization: SeedBibleCustomization,
        updatedAt: number
      ) => SeedBibleCustomization;
      /** Whether `customization` still holds this change. */
      isApplied: (customization: SeedBibleCustomization) => boolean;
      undo: (
        customization: SeedBibleCustomization,
        updatedAt: number
      ) => SeedBibleCustomization;
    },
    label: string
  ): Promise<boolean> => {
    const userId = login.userId.value;
    if (
      !userId ||
      !customizations.value.some((c) => c.id === customizationId)
    ) {
      return false;
    }
    const updatedAt = Date.now();
    const draft = editingCustomization.value;
    if (draft?.id === customizationId) {
      editingCustomization.value = change.apply(draft, updatedAt);
    }
    const written = await queueWrite(async () => {
      const known = customizations.value.find((c) => c.id === customizationId);
      if (!known || login.userId.value !== userId) {
        return false;
      }
      const latest = await fetchSharedCopy(known);
      const saved = latest ?? known;
      const draftWasCurrent =
        draftBaseUpdatedAt !== null && draftBaseUpdatedAt === saved.updatedAt;
      const next = change.apply(saved, updatedAt);
      try {
        const result = await persist(userId, next);
        if (!result.success) {
          console.error(`Failed to save ${label}:`, result.errorCode);
          return false;
        }
      } catch (error) {
        console.error(`Failed to save ${label}:`, error);
        return false;
      }
      customizations.value = customizations.value.map((c) =>
        c.id === customizationId ? next : c
      );
      updateLinkedCopy(userId, next);
      if (
        editingCustomization.value?.id === customizationId &&
        (!next.studioId || draftWasCurrent)
      ) {
        draftBaseUpdatedAt = next.updatedAt;
      }
      // "Use their version" switches to the copy the conflict found, which
      // is now older than this write; it must keep this change too.
      const conflict = saveConflict.value;
      if (conflict?.customizationId === customizationId) {
        saveConflict.value = { ...conflict, theirs: next };
      }
      return true;
    });
    if (!written) {
      const current = editingCustomization.value;
      if (current?.id === customizationId && change.isApplied(current)) {
        editingCustomization.value = change.undo(current, Date.now());
      }
    }
    return written;
  };

  const setExtensionSensitiveProxy = (
    customizationId: string,
    extensionId: string,
    proxyId: string,
    pointer: SensitiveProxyPointer | null
  ): Promise<boolean> => {
    const draft = editingCustomization.value;
    const previous =
      draft?.id === customizationId
        ? (draft.extensionSensitiveProxies[extensionId]?.[proxyId] ?? null)
        : null;
    return saveFieldChange(
      customizationId,
      {
        apply: (customization, updatedAt) =>
          withExtensionSensitiveProxy(
            customization,
            extensionId,
            proxyId,
            pointer,
            updatedAt
          ),
        isApplied: (customization) =>
          (customization.extensionSensitiveProxies[extensionId]?.[proxyId] ??
            null) === pointer,
        undo: (customization, updatedAt) =>
          withExtensionSensitiveProxy(
            customization,
            extensionId,
            proxyId,
            previous,
            updatedAt
          ),
      },
      "a customization's sensitive settings"
    );
  };

  const addExtensionToActiveCustomization = async (
    extensionId: string
  ): Promise<void> => {
    const locator = activeCustomizationLocator.value;
    if (!locator) {
      return;
    }
    const availability = getActiveExtensionAvailability(extensionId);
    if (availability === "hidden") {
      return;
    }
    await adoptPreviousExtensionChoices(locator);
    if (availability === "auto-installed") {
      await extensionPreferences.clearRemovedExtensionId(locator, extensionId);
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
    await adoptPreviousExtensionChoices(locator);
    if (getActiveExtensionAvailability(extensionId) === "auto-installed") {
      await extensionPreferences.addRemovedExtensionId(locator, extensionId);
      return;
    }
    await extensionPreferences.removeExtraExtensionId(locator, extensionId);
  };

  const getShareLink = (customization: SeedBibleCustomization): string => {
    const recordName = customizationRecordName(
      customization,
      login.userId.value ?? ""
    );
    return toShareableUrl(
      navigation.linkToBareRoot({
        customization: buildCustomizationLocator(recordName, customization.id),
      })
    ).toString();
  };

  const getStudioRole = (
    customization: SeedBibleCustomization
  ): StudioRole | null =>
    customization.studioId
      ? (studioRoles.value[customization.studioId] ?? null)
      : null;

  /**
   * A copy of one of the owner's files in the studio's record, so it stops
   * depending on the owner's account. A file kept somewhere else, or one
   * that can't be copied, keeps its URL: it still shows, it just stays
   * where it was.
   */
  const copyFileToStudio = async (
    url: string,
    userId: string,
    studioId: string
  ): Promise<string> => {
    try {
      if ((await os.getFileRecordName(url)) !== userId) {
        return url;
      }
      const blob = await os.readFile(url);
      if (!blob) {
        return url;
      }
      const copied = await os.recordFile(studioId, blob, {
        mimeType: blob.type || undefined,
        marker: CUSTOMIZATION_MARKER,
      });
      return copied.url;
    } catch (error) {
      console.warn("Couldn't copy a customization file to its studio:", error);
      return url;
    }
  };

  /** Studios made by shares that failed afterwards, by customization ID. */
  const studiosFromFailedShares = new Map<string, string>();

  const shareWithOthers = async (
    id: string
  ): Promise<SeedBibleCustomization> => {
    const userId = login.userId.value;
    if (!userId) {
      throw new CustomizationSharingError(
        "not_logged_in",
        "Sign in to share a customization."
      );
    }
    // Pending edits land first, so the copy that moves has them.
    if (editingCustomization.value?.id === id) {
      await saveEditingCustomization();
    }
    return queueWrite(async () => {
      const existing = customizations.value.find((c) => c.id === id);
      if (!existing) {
        throw new CustomizationSharingError(
          "not_found",
          "That customization isn't loaded."
        );
      }
      if (existing.studioId) {
        return existing;
      }

      // CasualOS can't delete a studio, so one left by a failed attempt is
      // used again rather than making another each time.
      let studioId = studiosFromFailedShares.get(id);
      if (!studioId) {
        const studio = await os.createStudio(existing.name);
        if (!studio.success) {
          throw new CustomizationSharingError(
            studio.errorCode,
            `Couldn't create a studio: ${studio.errorMessage}`
          );
        }
        studioId = studio.studioId;
        studiosFromFailedShares.set(id, studioId);
      }
      const intoStudio = studioId;

      const fileUrls = [
        ...(existing.logoUrl ? [existing.logoUrl] : []),
        ...Object.values(existing.icons ?? {}),
      ];
      await Promise.all(
        fileUrls.map(async (url) => {
          copiedFileUrls.set(
            url,
            await copyFileToStudio(url, userId, intoStudio)
          );
        })
      );
      const moved: SeedBibleCustomization = {
        ...withFileUrls(existing, (url) => copiedFileUrls.get(url) ?? url),
        studioId,
        movedFromRecordName: userId,
        updatedAt: Date.now(),
      };

      const written = await os.recordData(studioId, id, moved, {
        marker: CUSTOMIZATION_MARKER,
      });
      if (!written.success) {
        throw new CustomizationSharingError(
          String(written.errorCode),
          "Couldn't save the customization to its studio."
        );
      }
      // Replacing the owner's copy with a note both stops it being listed as
      // theirs and lets links shared before the move find the studio's copy.
      const note = await os.recordData(
        userId,
        id,
        { movedTo: { recordName: studioId, id } },
        { marker: MOVED_CUSTOMIZATION_MARKER }
      );
      if (!note.success) {
        // Without the note both copies would load; keep only the original.
        await os.eraseData(studioId, id).catch(() => undefined);
        throw new CustomizationSharingError(
          String(note.errorCode),
          "Couldn't move the customization to its studio."
        );
      }
      studiosFromFailedShares.delete(id);

      const oldLocator = buildCustomizationLocator(userId, id);
      customizations.value = customizations.value.map((c) =>
        c.id === id ? moved : c
      );
      studioRoles.value = { ...studioRoles.value, [studioId]: "admin" };
      const draft = editingCustomization.value;
      if (draft?.id === id) {
        // Edits made while the share ran stay in the draft.
        editingCustomization.value = {
          ...rehomedAfterShare(draft),
          updatedAt: moved.updatedAt,
        };
        draftBaseUpdatedAt = moved.updatedAt;
      }
      if (linkedCustomizationLocator.value === oldLocator) {
        linkedCustomization.value = moved;
        linkedCustomizationLocator.value = buildCustomizationLocator(
          studioId,
          id
        );
      }
      return moved;
    });
  };

  const requireStudioId = (customization: SeedBibleCustomization): string => {
    if (!customization.studioId) {
      throw new CustomizationSharingError(
        "not_shared",
        "Only a shared customization has members."
      );
    }
    return customization.studioId;
  };

  const listMembers = async (
    customization: SeedBibleCustomization
  ): Promise<StudioMember[]> => {
    const result = await os.listStudioMembers(requireStudioId(customization));
    if (!result.success) {
      throw new CustomizationSharingError(
        result.errorCode,
        result.errorMessage
      );
    }
    return result.members;
  };

  const addMember = async (
    customization: SeedBibleCustomization,
    email: string,
    role: StudioRole
  ): Promise<void> => {
    const result = await os.addStudioMember(
      requireStudioId(customization),
      email.trim(),
      role
    );
    if (!result.success) {
      throw new CustomizationSharingError(
        result.errorCode,
        result.errorMessage
      );
    }
  };

  const removeMember = async (
    customization: SeedBibleCustomization,
    userId: string
  ): Promise<void> => {
    const result = await os.removeStudioMember(
      requireStudioId(customization),
      userId
    );
    if (!result.success) {
      throw new CustomizationSharingError(
        result.errorCode,
        result.errorMessage
      );
    }
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
    studioRoles,
    getStudioRole,
    saveConflict,
    editsDroppedAfterClose,
    resolveSaveConflict,
    shareWithOthers,
    listMembers,
    addMember,
    removeMember,
    activeCustomization,
    activeCustomizationLocator,
    activeVariant,
    canFollowSystemScheme,
    isFollowingSystemScheme,
    activeThemeOverrides,
    activeHighlightOverrides,
    activeResolvedTheme,
    resolveVariantBaseTheme,
    getPreviewVariant,
    resolveEditingVariantTheme,
    activeExtensionIds,
    linkedCustomization,
    initialCustomizationLoadPromise,
    initialCustomizationLoadSettled,
    getInitialCustomizationSeed,
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
    uploadIcon,
    removeEditingIcon,
    activeIcons,
    getShareLink,
    updateEditingName,
    updateEditingDefaultTranslationId,
    setEditingContentRecordName,
    removeEditingLogo,
    addEditingVariant,
    applyPresetToEditingVariant,
    renameEditingVariant,
    setEditingVariantColor,
    setEditingVariantFont,
    setEditingVariantHighlightColor,
    resetEditingVariantField,
    resetEditingVariantHighlightColor,
    previewEditingVariantColor,
    clearPreviewEditingVariantColor,
    previewEditingVariantHighlightColor,
    clearPreviewEditingVariantHighlightField,
    setEditingDefaultVariant,
    removeEditingVariant,
    selectActiveVariant,
    setEditingExtensionAvailability,
    setEditingDefaultExtensionAvailability,
    getActiveExtensionAvailability,
    setEditingExtensionSettingDefault,
    clearEditingExtensionSettingDefault,
    getActiveExtensionSettingDefault,
    setExtensionSensitiveProxy,
    addExtensionToActiveCustomization,
    removeExtensionFromActiveCustomization,
  };
}
