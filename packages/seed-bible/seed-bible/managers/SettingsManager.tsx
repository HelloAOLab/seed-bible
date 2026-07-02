import { effect, signal, type Signal } from "@preact/signals";
import type { LoginManager } from "../managers/LoginManager";
import {
  getProfileConfigValue,
  saveProfileConfigValue,
} from "../managers/ProfileConfigSync";
import * as z from "zod/v4";
import type { CasualOSManager } from "./OsManager";
import type { NavigationManager } from "./NavigationManager";

export type BookOrientation = "traditional" | "tanakh";
export type UITextSize = "S" | "M" | "L" | "XL";
export type TextAlignment = "unset" | "left" | "center" | "right";
export type TextSectionId = "bookTitle" | "heading" | "verse";

export interface SelectionUIBehavior {
  showSelectedItems: boolean;
  showHighlightColors: boolean;
  showIconText: boolean;
}

export interface ScriptureElementsBehavior {
  showHeadings: boolean;
  showVerseNumbers: boolean;
  showFootnotes: boolean;
  showHighlights: boolean;
  showRedLettering: boolean;
}

export interface TextSectionConfig {
  font: string;
  weight: string;
  color: string;
  marginVertical: number;
  marginHorizontal: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  alignment: TextAlignment;
  /** Line height for the verse section. Other sections ignore this. */
  lineHeight?: number;
}

export const VERSE_LINE_HEIGHT_OPTIONS: number[] = [1.5, 1.7, 2, 2.5];
export const DEFAULT_VERSE_LINE_HEIGHT = 1.7;

export type TextConfig = Record<TextSectionId, TextSectionConfig>;

export interface ToolbarCustomization {
  /** Tool IDs that should be hidden from the toolbar. */
  hidden: string[];
  /** Tool IDs in preferred display order. IDs not listed keep their default priority after the ordered ones. */
  order: string[];
}

export interface AppSettings {
  bookOrientation: BookOrientation;
  uiTextSize: UITextSize;
  selectionUI: SelectionUIBehavior;
  scriptureElements: ScriptureElementsBehavior;
  textConfig: TextConfig;
  toolbar: ToolbarCustomization;
  keepScreenAwake: boolean;
  /** User-added custom highlight colors (hex strings, max 3). */
  customHighlightColors: string[];
  /** Horizontal padding (px) applied to the bible reader container. */
  scriptureMargin: number;
}

export const AppSettingsSchema = z.object({
  bookOrientation: z.enum(["traditional", "tanakh"]),
  uiTextSize: z.enum(["S", "M", "L", "XL"]),
  selectionUI: z.object({
    showSelectedItems: z.boolean(),
    showHighlightColors: z.boolean(),
    showIconText: z.boolean(),
  }),
  scriptureElements: z.object({
    showHeadings: z.boolean(),
    showVerseNumbers: z.boolean(),
    showFootnotes: z.boolean(),
    showHighlights: z.boolean(),
    showRedLettering: z.boolean(),
  }),
  textConfig: z.object({
    bookTitle: z.object({
      font: z.string(),
      weight: z.string(),
      color: z.string(),
      marginVertical: z.number(),
      marginHorizontal: z.number(),
      bold: z.boolean(),
      italic: z.boolean(),
      underline: z.boolean(),
      alignment: z.enum(["unset", "left", "center", "right"]),
      lineHeight: z.number().optional(),
    }),
    heading: z.object({
      font: z.string(),
      weight: z.string(),
      color: z.string(),
      marginVertical: z.number(),
      marginHorizontal: z.number(),
      bold: z.boolean(),
      italic: z.boolean(),
      underline: z.boolean(),
      alignment: z.enum(["unset", "left", "center", "right"]),
      lineHeight: z.number().optional(),
    }),
    verse: z.object({
      font: z.string(),
      weight: z.string(),
      color: z.string(),
      marginVertical: z.number(),
      marginHorizontal: z.number(),
      bold: z.boolean(),
      italic: z.boolean(),
      underline: z.boolean(),
      alignment: z.enum(["unset", "left", "center", "right"]),
      lineHeight: z.number().optional(),
    }),
  }),
  toolbar: z.object({
    hidden: z.array(z.string()),
    order: z.array(z.string()),
  }),
  keepScreenAwake: z.boolean(),
  customHighlightColors: z.array(z.string()).max(3),
  scriptureMargin: z.number().min(0).max(45),
});

export const DEFAULT_SCRIPTURE_MARGIN = 27;
export const MOBILE_SCRIPTURE_MARGIN = 5;

export const MAX_CUSTOM_HIGHLIGHT_COLORS = 3;

const TAG_BOOK_ORIENTATION = "app.bookOrientation";
const TAG_UI_TEXT_SIZE = "app.uiTextSize";
const TAG_SELECTION_UI = "app.selectionUI";
const TAG_SCRIPTURE_ELEMENTS = "app.scriptureElements";
const TAG_TEXT_CONFIG = "app.textConfig";
const TAG_TOOLBAR = "app.toolbarConfig";
const TAG_KEEP_AWAKE = "app.keepScreenAwake";
const TAG_CUSTOM_HIGHLIGHT_COLORS = "app.customHighlightColors";
const TAG_SCRIPTURE_MARGIN = "app.scriptureMargin";

// Profile.config keys are stored unprefixed (matching the pattern set by
// ConfigManager for `fontSize`, `lang`, `disablePanels`).
const PROFILE_BOOK_ORIENTATION = "bookOrientation";
const PROFILE_UI_TEXT_SIZE = "uiTextSize";
const PROFILE_SELECTION_UI = "selectionUI";
const PROFILE_SCRIPTURE_ELEMENTS = "scriptureElements";
const PROFILE_TEXT_CONFIG = "textConfig";
const PROFILE_TOOLBAR = "toolbarConfig";
const PROFILE_KEEP_AWAKE = "keepScreenAwake";
const PROFILE_CUSTOM_HIGHLIGHT_COLORS = "customHighlightColors";
const PROFILE_SCRIPTURE_MARGIN = "scriptureMargin";

export const TEXT_FONT_OPTIONS: { value: string; label: string }[] = [
  { value: "'Newsreader', serif", label: "Newsreader" },
  { value: "'Plus Jakarta Sans', sans-serif", label: "Plus Jakarta Sans" },
  { value: "'Satoshi', system-ui, sans-serif", label: "Satoshi" },
  { value: "'DM Sans', sans-serif", label: "DM Sans" },
  { value: "'Helvetica Neue', sans-serif", label: "Helvetica Neue" },
  { value: "'Roboto', sans-serif", label: "Roboto" },
  { value: "'Inter', sans-serif", label: "Inter" },
];

export const TEXT_WEIGHT_OPTIONS: { value: string; label: string }[] = [
  { value: "700", label: "bold" },
  { value: "400", label: "regular" },
  { value: "300", label: "light" },
];

// export const TEXT_SECTION_LABELS: Record<TextSectionId, string> = {
//   bookTitle: "Book title",
//   heading: "Heading",
//   verse: "Verse",
// };

const DEFAULT_SELECTION_UI: SelectionUIBehavior = {
  showSelectedItems: true,
  showHighlightColors: true,
  showIconText: true,
};

const DEFAULT_SCRIPTURE_ELEMENTS: ScriptureElementsBehavior = {
  showHeadings: true,
  showVerseNumbers: true,
  showFootnotes: true,
  showHighlights: true,
  showRedLettering: true,
};

/**
 * Empty `color` means "follow the active theme". The reader CSS reads
 * `--sb-{section}-font-color` directly; the text editor's color setting
 * writes to that same variable as a body inline override (so it beats the
 * theme's body-scoped CSS rule). Switching theme presets clears the
 * override — see `resetTextColors`.
 */
const DEFAULT_TEXT_CONFIG: TextConfig = {
  bookTitle: {
    font: "'Newsreader', serif",
    weight: "700",
    color: "",
    marginVertical: 12,
    marginHorizontal: 0,
    bold: true,
    italic: false,
    underline: false,
    alignment: "unset",
  },
  heading: {
    font: "'Plus Jakarta Sans', sans-serif",
    weight: "700",
    color: "",
    marginVertical: 18,
    marginHorizontal: 0,
    bold: true,
    italic: false,
    underline: false,
    alignment: "unset",
  },
  verse: {
    font: "'Plus Jakarta Sans', sans-serif",
    weight: "500",
    color: "",
    marginVertical: 0,
    marginHorizontal: 0,
    bold: false,
    italic: false,
    underline: false,
    alignment: "unset",
    lineHeight: DEFAULT_VERSE_LINE_HEIGHT,
  },
};

/**
 * Maps each text section to the theme color variable it should override.
 * Exported so the settings UI can render the resolved theme color in the
 * "follow theme" swatch.
 */
export const TEXT_SECTION_THEME_COLOR_VAR: Record<TextSectionId, string> = {
  bookTitle: "--sb-book-title-font-color",
  heading: "--sb-chapter-heading-font-color",
  verse: "--sb-verse-font-color",
};

const DEFAULT_TOOLBAR_CONFIG: ToolbarCustomization = {
  hidden: [],
  order: [],
};

const DEFAULT_SETTINGS: AppSettings = {
  bookOrientation: "traditional",
  uiTextSize: "M",
  selectionUI: DEFAULT_SELECTION_UI,
  scriptureElements: DEFAULT_SCRIPTURE_ELEMENTS,
  textConfig: DEFAULT_TEXT_CONFIG,
  toolbar: DEFAULT_TOOLBAR_CONFIG,
  keepScreenAwake: false,
  customHighlightColors: [],
  scriptureMargin: DEFAULT_SCRIPTURE_MARGIN,
};

function parseCustomHighlightColors(value: unknown): string[] {
  let parsed: unknown = value;
  if (typeof parsed === "string" && parsed.length > 0) {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((v): v is string => typeof v === "string" && v.length > 0)
    .slice(0, MAX_CUSTOM_HIGHLIGHT_COLORS);
}

function parseBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return fallback;
}

/**
 * Apply the user's toolbar customization (hidden + explicit order) to a list
 * of tools identified by `id`. Hidden tools are removed; tools listed in
 * `order` come first in that order; remaining tools keep their natural order.
 */
export function applyToolbarCustomization<T extends { id: string }>(
  tools: T[],
  config: ToolbarCustomization
): T[] {
  const hiddenSet = new Set(config.hidden);
  const visible = tools.filter((t) => !hiddenSet.has(t.id));
  if (config.order.length === 0) {
    return visible;
  }
  const byId = new Map(visible.map((t) => [t.id, t] as const));
  const ordered: T[] = [];
  for (const id of config.order) {
    const tool = byId.get(id);
    if (tool) {
      ordered.push(tool);
      byId.delete(id);
    }
  }
  for (const tool of visible) {
    if (byId.has(tool.id)) {
      ordered.push(tool);
    }
  }
  return ordered;
}

export const UI_TEXT_SIZE_OPTIONS: UITextSize[] = ["S", "M", "L", "XL"];

export const UI_TEXT_SIZE_SCALE_MAP: Record<UITextSize, number> = {
  S: 0.85,
  M: 1.0,
  L: 1.15,
  XL: 1.3,
};

function parseBookOrientation(
  value: unknown,
  fallback: BookOrientation
): BookOrientation {
  return value === "tanakh" || value === "traditional" ? value : fallback;
}

function parseUITextSize(value: unknown, fallback: UITextSize): UITextSize {
  if (typeof value !== "string") {
    return fallback;
  }
  const normalized = value.trim().toUpperCase();
  return UI_TEXT_SIZE_OPTIONS.includes(normalized as UITextSize)
    ? (normalized as UITextSize)
    : fallback;
}

function parseSelectionUI(
  value: unknown,
  fallback: SelectionUIBehavior
): SelectionUIBehavior {
  let parsed: unknown = value;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return fallback;
    }
  }
  if (!parsed || typeof parsed !== "object") {
    return fallback;
  }
  const obj = parsed as Record<string, unknown>;
  return {
    showSelectedItems:
      typeof obj.showSelectedItems === "boolean"
        ? obj.showSelectedItems
        : fallback.showSelectedItems,
    showHighlightColors:
      typeof obj.showHighlightColors === "boolean"
        ? obj.showHighlightColors
        : fallback.showHighlightColors,
    showIconText:
      typeof obj.showIconText === "boolean"
        ? obj.showIconText
        : fallback.showIconText,
  };
}

function parseScriptureElements(
  value: unknown,
  fallback: ScriptureElementsBehavior
): ScriptureElementsBehavior {
  let parsed: unknown = value;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return fallback;
    }
  }
  if (!parsed || typeof parsed !== "object") {
    return fallback;
  }
  const obj = parsed as Record<string, unknown>;
  return {
    showHeadings:
      typeof obj.showHeadings === "boolean"
        ? obj.showHeadings
        : fallback.showHeadings,
    showVerseNumbers:
      typeof obj.showVerseNumbers === "boolean"
        ? obj.showVerseNumbers
        : fallback.showVerseNumbers,
    showFootnotes:
      typeof obj.showFootnotes === "boolean"
        ? obj.showFootnotes
        : fallback.showFootnotes,
    showHighlights:
      typeof obj.showHighlights === "boolean"
        ? obj.showHighlights
        : fallback.showHighlights,
    showRedLettering:
      typeof obj.showRedLettering === "boolean"
        ? obj.showRedLettering
        : fallback.showRedLettering,
  };
}

function parseAlignment(
  value: unknown,
  fallback: TextAlignment
): TextAlignment {
  return value === "unset" ||
    value === "left" ||
    value === "center" ||
    value === "right"
    ? value
    : fallback;
}

function parseNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function parseTextSection(
  value: unknown,
  fallback: TextSectionConfig
): TextSectionConfig {
  if (!value || typeof value !== "object") return fallback;
  const obj = value as Record<string, unknown>;
  return {
    font: typeof obj.font === "string" ? obj.font : fallback.font,
    weight: typeof obj.weight === "string" ? obj.weight : fallback.weight,
    color: typeof obj.color === "string" ? obj.color : fallback.color,
    marginVertical: parseNumber(obj.marginVertical, fallback.marginVertical),
    marginHorizontal: parseNumber(
      obj.marginHorizontal,
      fallback.marginHorizontal
    ),
    bold: typeof obj.bold === "boolean" ? obj.bold : fallback.bold,
    italic: typeof obj.italic === "boolean" ? obj.italic : fallback.italic,
    underline:
      typeof obj.underline === "boolean" ? obj.underline : fallback.underline,
    alignment: parseAlignment(obj.alignment, fallback.alignment),
    ...(fallback.lineHeight !== undefined || obj.lineHeight !== undefined
      ? { lineHeight: parseNumber(obj.lineHeight, fallback.lineHeight ?? 1.5) }
      : {}),
  };
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

function parseToolbarConfig(
  value: unknown,
  fallback: ToolbarCustomization
): ToolbarCustomization {
  let parsed: unknown = value;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return fallback;
    }
  }
  if (!parsed || typeof parsed !== "object") return fallback;
  const obj = parsed as Record<string, unknown>;
  return {
    hidden: parseStringArray(obj.hidden),
    order: parseStringArray(obj.order),
  };
}

function parseTextConfig(value: unknown, fallback: TextConfig): TextConfig {
  let parsed: unknown = value;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return fallback;
    }
  }
  if (!parsed || typeof parsed !== "object") return fallback;
  const obj = parsed as Record<string, unknown>;
  return {
    bookTitle: parseTextSection(obj.bookTitle, fallback.bookTitle),
    heading: parseTextSection(obj.heading, fallback.heading),
    verse: parseTextSection(obj.verse, fallback.verse),
  };
}

function applyTextConfigToCSSVars(config: TextConfig) {
  if (typeof document === "undefined") return;
  const root = document.documentElement.style;
  // The theme writes `--sb-*-font-color` to `body { ... }`. Inline styles on
  // body win over CSS rules on body, so we override there. Writing to :root
  // would lose to body's own custom property.
  const body = document.body?.style ?? null;
  for (const [section, cfg] of Object.entries(config)) {
    const prefix = `--text-${section}`;
    root.setProperty(`${prefix}-font`, cfg.font);
    root.setProperty(`${prefix}-weight`, cfg.bold ? "700" : cfg.weight);
    root.setProperty(`${prefix}-font-style`, cfg.italic ? "italic" : "normal");
    root.setProperty(
      `${prefix}-text-decoration`,
      cfg.underline ? "underline" : "none"
    );
    root.setProperty(`${prefix}-alignment`, cfg.alignment);
    root.setProperty(`${prefix}-margin-top`, `${cfg.marginVertical}px`);
    root.setProperty(`${prefix}-margin-bottom`, `${cfg.marginVertical}px`);
    root.setProperty(`${prefix}-margin-left`, `${cfg.marginHorizontal}px`);
    root.setProperty(`${prefix}-margin-right`, `${cfg.marginHorizontal}px`);
    if (cfg.lineHeight !== undefined) {
      root.setProperty(`${prefix}-line-height`, String(cfg.lineHeight));
    }

    if (body) {
      const themeVar = TEXT_SECTION_THEME_COLOR_VAR[section as TextSectionId];
      if (cfg.color) {
        body.setProperty(themeVar, cfg.color);
      } else {
        body.removeProperty(themeVar);
      }
    }
  }
}

export interface SettingsManager {
  settings: Signal<AppSettings>;
  setBookOrientation: (orientation: BookOrientation) => void;
  setUITextSize: (size: UITextSize) => void;
  setSelectionUI: (patch: Partial<SelectionUIBehavior>) => void;
  setScriptureElements: (patch: Partial<ScriptureElementsBehavior>) => void;
  updateTextSection: (
    section: TextSectionId,
    patch: Partial<TextSectionConfig>
  ) => void;
  /** Set the same horizontal margin on bookTitle, heading, and verse (Scripture Margins control). */
  setScriptureMargin: (margin: number) => void;
  /** Set the verse line-height (Scripture line-spacing control). */
  setVerseLineHeight: (lineHeight: number) => void;
  /** Clear per-section color overrides so the active theme drives text colors. */
  resetTextColors: () => void;
  resetTextConfig: () => void;
  setToolbarHidden: (toolId: string, hidden: boolean) => void;
  setToolbarOrder: (order: string[]) => void;
  resetToolbarConfig: () => void;
  setKeepScreenAwake: (enabled: boolean) => void;
  addCustomHighlightColor: (color: string) => void;
  removeCustomHighlightColor: (color: string) => void;
  setAllSettings: (next: AppSettings) => void;
  resetToDefaults: () => void;
}

export function createSettings(
  os: CasualOSManager,
  login: LoginManager,
  navigation: NavigationManager
): SettingsManager {
  const configBot = {
    tags: Object.fromEntries(
      navigation.currentUrl.value.searchParams
    ) as Record<string, string | boolean | number>,
  };

  // Read each setting with the precedence: user profile > local configBot tag
  // > default. The profile is the source of truth when the user is logged
  // in; configBot.tags acts as a local cache for anonymous use and offline
  // bootstrapping before the profile loads.
  const readSettings = (): AppSettings => {
    const profile = login.profile.value;
    return {
      bookOrientation: parseBookOrientation(
        getProfileConfigValue(profile, PROFILE_BOOK_ORIENTATION) ??
          configBot.tags[TAG_BOOK_ORIENTATION],
        DEFAULT_SETTINGS.bookOrientation
      ),
      uiTextSize: parseUITextSize(
        getProfileConfigValue(profile, PROFILE_UI_TEXT_SIZE) ??
          configBot.tags[TAG_UI_TEXT_SIZE],
        DEFAULT_SETTINGS.uiTextSize
      ),
      selectionUI: parseSelectionUI(
        getProfileConfigValue(profile, PROFILE_SELECTION_UI) ??
          configBot.tags[TAG_SELECTION_UI],
        DEFAULT_SETTINGS.selectionUI
      ),
      scriptureElements: parseScriptureElements(
        getProfileConfigValue(profile, PROFILE_SCRIPTURE_ELEMENTS) ??
          configBot.tags[TAG_SCRIPTURE_ELEMENTS],
        DEFAULT_SETTINGS.scriptureElements
      ),
      textConfig: parseTextConfig(
        getProfileConfigValue(profile, PROFILE_TEXT_CONFIG) ??
          configBot.tags[TAG_TEXT_CONFIG],
        DEFAULT_SETTINGS.textConfig
      ),
      toolbar: parseToolbarConfig(
        getProfileConfigValue(profile, PROFILE_TOOLBAR) ??
          configBot.tags[TAG_TOOLBAR],
        DEFAULT_SETTINGS.toolbar
      ),
      keepScreenAwake: parseBoolean(
        getProfileConfigValue(profile, PROFILE_KEEP_AWAKE) ??
          configBot.tags[TAG_KEEP_AWAKE],
        DEFAULT_SETTINGS.keepScreenAwake
      ),
      customHighlightColors: parseCustomHighlightColors(
        getProfileConfigValue(profile, PROFILE_CUSTOM_HIGHLIGHT_COLORS) ??
          configBot.tags[TAG_CUSTOM_HIGHLIGHT_COLORS]
      ),
      scriptureMargin: parseNumber(
        getProfileConfigValue(profile, PROFILE_SCRIPTURE_MARGIN) ??
          configBot.tags[TAG_SCRIPTURE_MARGIN],
        DEFAULT_SETTINGS.scriptureMargin
      ),
    };
  };

  const settings = signal<AppSettings>(readSettings());

  const syncFromBot = () => {
    settings.value = readSettings();
  };

  // Re-read whenever the user logs in/out so the profile's saved settings
  // overlay the local cache.
  effect(() => {
    // Track profile.value as a dependency.
    void login.profile.value;
    syncFromBot();
  });

  const setBookOrientation = (orientation: BookOrientation) => {
    settings.value = { ...settings.value, bookOrientation: orientation };
    configBot.tags[TAG_BOOK_ORIENTATION] = orientation;
    saveProfileConfigValue(login, PROFILE_BOOK_ORIENTATION, orientation);
  };

  const setUITextSize = (size: UITextSize) => {
    settings.value = { ...settings.value, uiTextSize: size };
    configBot.tags[TAG_UI_TEXT_SIZE] = size;
    saveProfileConfigValue(login, PROFILE_UI_TEXT_SIZE, size);
  };

  const setSelectionUI = (patch: Partial<SelectionUIBehavior>) => {
    const next = { ...settings.value.selectionUI, ...patch };
    settings.value = { ...settings.value, selectionUI: next };
    configBot.tags[TAG_SELECTION_UI] = JSON.stringify(next);
    saveProfileConfigValue(login, PROFILE_SELECTION_UI, next);
  };

  const setScriptureElements = (patch: Partial<ScriptureElementsBehavior>) => {
    const next = { ...settings.value.scriptureElements, ...patch };
    settings.value = { ...settings.value, scriptureElements: next };
    configBot.tags[TAG_SCRIPTURE_ELEMENTS] = JSON.stringify(next);
    saveProfileConfigValue(login, PROFILE_SCRIPTURE_ELEMENTS, next);
  };

  const writeTextConfig = (next: TextConfig) => {
    settings.value = { ...settings.value, textConfig: next };
    configBot.tags[TAG_TEXT_CONFIG] = JSON.stringify(next);
    saveProfileConfigValue(login, PROFILE_TEXT_CONFIG, next);
  };

  const updateTextSection = (
    section: TextSectionId,
    patch: Partial<TextSectionConfig>
  ) => {
    const nextSection = { ...settings.value.textConfig[section], ...patch };
    const nextTextConfig = {
      ...settings.value.textConfig,
      [section]: nextSection,
    };
    writeTextConfig(nextTextConfig);
  };

  const setScriptureMargin = (margin: number) => {
    if (!Number.isFinite(margin)) return;
    const clamped = Math.max(0, Math.min(45, margin));
    settings.value = { ...settings.value, scriptureMargin: clamped };
    saveProfileConfigValue(login, PROFILE_SCRIPTURE_MARGIN, clamped);
  };

  const setVerseLineHeight = (lineHeight: number) => {
    if (!Number.isFinite(lineHeight)) return;
    const current = settings.value.textConfig;
    const nextTextConfig: TextConfig = {
      ...current,
      verse: { ...current.verse, lineHeight },
    };
    writeTextConfig(nextTextConfig);
  };

  const resetTextConfig = () => {
    settings.value = { ...settings.value, textConfig: DEFAULT_TEXT_CONFIG };
    configBot.tags[TAG_TEXT_CONFIG] = "";
    saveProfileConfigValue(login, PROFILE_TEXT_CONFIG, DEFAULT_TEXT_CONFIG);
  };

  const resetTextColors = () => {
    const current = settings.value.textConfig;
    let changed = false;
    const next = {} as TextConfig;
    for (const section of Object.keys(current) as TextSectionId[]) {
      const cfg = current[section];
      if (cfg.color !== "") {
        changed = true;
        next[section] = { ...cfg, color: "" };
      } else {
        next[section] = cfg;
      }
    }
    if (!changed) return;
    writeTextConfig(next);
  };

  const writeToolbarConfig = (next: ToolbarCustomization) => {
    settings.value = { ...settings.value, toolbar: next };
    const isDefault = next.hidden.length === 0 && next.order.length === 0;
    configBot.tags[TAG_TOOLBAR] = isDefault ? "" : JSON.stringify(next);
    saveProfileConfigValue(login, PROFILE_TOOLBAR, next);
  };

  const setToolbarHidden = (toolId: string, hidden: boolean) => {
    const current = settings.value.toolbar;
    const hiddenSet = new Set(current.hidden);
    if (hidden) hiddenSet.add(toolId);
    else hiddenSet.delete(toolId);
    writeToolbarConfig({ ...current, hidden: [...hiddenSet] });
  };

  const setToolbarOrder = (order: string[]) => {
    writeToolbarConfig({ ...settings.value.toolbar, order });
  };

  const resetToolbarConfig = () => {
    writeToolbarConfig(DEFAULT_TOOLBAR_CONFIG);
  };

  const setKeepScreenAwake = async (enabled: boolean) => {
    if (settings.value.keepScreenAwake === enabled) return;
    let nextValue = enabled;
    if (enabled) {
      try {
        await os.requestWakeLock();
      } catch {
        nextValue = false;
      }
    } else {
      os.disableWakeLock();
    }
    settings.value = { ...settings.value, keepScreenAwake: nextValue };
    saveProfileConfigValue(login, PROFILE_KEEP_AWAKE, nextValue);
  };

  const writeCustomHighlightColors = (colors: string[]) => {
    settings.value = { ...settings.value, customHighlightColors: colors };
    configBot.tags[TAG_CUSTOM_HIGHLIGHT_COLORS] =
      colors.length === 0 ? "" : JSON.stringify(colors);
    saveProfileConfigValue(login, PROFILE_CUSTOM_HIGHLIGHT_COLORS, colors);
  };

  const addCustomHighlightColor = (color: string) => {
    const normalized = color.trim().toLowerCase();
    if (!normalized) return;
    const current = settings.value.customHighlightColors;
    // Move to front if already present; evict oldest when over the cap.
    const withoutDuplicate = current.filter(
      (c) => c.toLowerCase() !== normalized
    );
    writeCustomHighlightColors(
      [normalized, ...withoutDuplicate].slice(0, MAX_CUSTOM_HIGHLIGHT_COLORS)
    );
  };

  const removeCustomHighlightColor = (color: string) => {
    const normalized = color.trim().toLowerCase();
    writeCustomHighlightColors(
      settings.value.customHighlightColors.filter(
        (c) => c.toLowerCase() !== normalized
      )
    );
  };

  const setAllSettings = (next: AppSettings) => {
    next = AppSettingsSchema.parse(next);
    settings.value = next;
    if (login.userId.value) {
      const existingProfile = login.profile.value;
      login.updateProfile({
        config: {
          ...(existingProfile?.config ?? {}),
          ...next,
        },
      });
    }
  };

  const resetToDefaults = () => {
    settings.value = DEFAULT_SETTINGS;
    configBot.tags[TAG_BOOK_ORIENTATION] = DEFAULT_SETTINGS.bookOrientation;
    configBot.tags[TAG_UI_TEXT_SIZE] = DEFAULT_SETTINGS.uiTextSize;
    configBot.tags[TAG_SELECTION_UI] = JSON.stringify(
      DEFAULT_SETTINGS.selectionUI
    );
    configBot.tags[TAG_SCRIPTURE_ELEMENTS] = JSON.stringify(
      DEFAULT_SETTINGS.scriptureElements
    );
    configBot.tags[TAG_TEXT_CONFIG] = "";
    configBot.tags[TAG_TOOLBAR] = "";
    configBot.tags[TAG_KEEP_AWAKE] = false;
    configBot.tags[TAG_CUSTOM_HIGHLIGHT_COLORS] = "";
    configBot.tags[TAG_SCRIPTURE_MARGIN] = DEFAULT_SETTINGS.scriptureMargin;
    saveProfileConfigValue(
      login,
      PROFILE_BOOK_ORIENTATION,
      DEFAULT_SETTINGS.bookOrientation
    );
    saveProfileConfigValue(
      login,
      PROFILE_UI_TEXT_SIZE,
      DEFAULT_SETTINGS.uiTextSize
    );
    saveProfileConfigValue(
      login,
      PROFILE_SELECTION_UI,
      DEFAULT_SETTINGS.selectionUI
    );
    saveProfileConfigValue(
      login,
      PROFILE_SCRIPTURE_ELEMENTS,
      DEFAULT_SETTINGS.scriptureElements
    );
    saveProfileConfigValue(
      login,
      PROFILE_TEXT_CONFIG,
      DEFAULT_SETTINGS.textConfig
    );
    saveProfileConfigValue(login, PROFILE_TOOLBAR, DEFAULT_SETTINGS.toolbar);
    saveProfileConfigValue(
      login,
      PROFILE_KEEP_AWAKE,
      DEFAULT_SETTINGS.keepScreenAwake
    );
    saveProfileConfigValue(login, PROFILE_CUSTOM_HIGHLIGHT_COLORS, []);
    saveProfileConfigValue(
      login,
      PROFILE_SCRIPTURE_MARGIN,
      DEFAULT_SETTINGS.scriptureMargin
    );
  };

  // Scale UI surfaces via `--sb-ui-scale`, which drives `html { font-size }`
  // (see main.css). Chrome sized in `rem` tracks this; reader text keeps its
  // own font-size knob (`.sb-bible-reader` carries `.sb-font-size-*`), so it
  // stays independent without the old root-`zoom` + counter-zoom hack.
  effect(() => {
    if (typeof document === "undefined") {
      return;
    }
    const scale = UI_TEXT_SIZE_SCALE_MAP[settings.value.uiTextSize];
    document.documentElement.style.setProperty("--sb-ui-scale", String(scale));
  });

  // Publish per-section text config as CSS variables (`--text-<section>-*`)
  // so reader styles can consume typography preferences.
  effect(() => {
    applyTextConfigToCSSVars(settings.value.textConfig);
  });

  // Publish the scripture margin (%) as a CSS variable consumed by
  // `.sb-bible-reader`'s horizontal padding.
  effect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.style.setProperty(
      "--sb-scripture-margin",
      `${settings.value.scriptureMargin}%`
    );
  });

  // Keep the OS wake-lock in sync with the persisted setting. Survives
  // SettingsPage mount/unmount so re-opening settings shows the real state.
  effect(() => {
    const enabled = settings.value.keepScreenAwake;
    if (enabled) {
      void os.requestWakeLock();
    } else {
      void os.disableWakeLock();
    }
  });

  return {
    settings,
    setBookOrientation,
    setUITextSize,
    setSelectionUI,
    setScriptureElements,
    updateTextSection,
    setScriptureMargin,
    setVerseLineHeight,
    resetTextColors,
    resetTextConfig,
    setToolbarHidden,
    setToolbarOrder,
    resetToolbarConfig,
    setKeepScreenAwake,
    addCustomHighlightColor,
    removeCustomHighlightColor,
    setAllSettings,
    resetToDefaults,
  };
}
