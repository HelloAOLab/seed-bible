import { effect, signal, type Signal } from "@preact/signals";
import type { LoginManager } from "seed-bible.managers.LoginManager";
import {
  getProfileConfigValue,
  saveProfileConfigValue,
} from "seed-bible.managers.ProfileConfigSync";
import { z } from "zod";

export type BookOrientation = "traditional" | "tanak";
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

export const VERSE_LINE_HEIGHT_OPTIONS: number[] = [1.5, 2, 2.5];
export const DEFAULT_VERSE_LINE_HEIGHT = 2;

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
    weight: "300",
    color: "",
    marginVertical: 18,
    marginHorizontal: 0,
    bold: false,
    italic: true,
    underline: false,
    alignment: "unset",
  },
  verse: {
    font: "'Newsreader', serif",
    weight: "400",
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

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

export const BookOrientationSchema = z.enum(["traditional", "tanak"]);
export const UITextSizeSchema = z.enum(["S", "M", "L", "XL"]);
export const TextAlignmentSchema = z.enum(["unset", "left", "center", "right"]);

export const SelectionUIBehaviorSchema = z.object({
  showSelectedItems: z.boolean(),
  showHighlightColors: z.boolean(),
  showIconText: z.boolean(),
});

export const ScriptureElementsBehaviorSchema = z.object({
  showHeadings: z.boolean(),
  showVerseNumbers: z.boolean(),
  showFootnotes: z.boolean(),
  showHighlights: z.boolean(),
  showRedLettering: z.boolean(),
});

export const TextSectionConfigSchema = z.object({
  font: z.string(),
  weight: z.string(),
  color: z.string(),
  marginVertical: z.number(),
  marginHorizontal: z.number(),
  bold: z.boolean(),
  italic: z.boolean(),
  underline: z.boolean(),
  alignment: TextAlignmentSchema,
  lineHeight: z.number().optional(),
});

export const TextConfigSchema = z.object({
  bookTitle: TextSectionConfigSchema,
  heading: TextSectionConfigSchema,
  verse: TextSectionConfigSchema,
});

export const ToolbarCustomizationSchema = z.object({
  hidden: z.array(z.string()),
  order: z.array(z.string()),
});

export const AppSettingsSchema = z.object({
  bookOrientation: BookOrientationSchema.catch(
    DEFAULT_SETTINGS.bookOrientation
  ),
  uiTextSize: UITextSizeSchema.catch(DEFAULT_SETTINGS.uiTextSize),
  selectionUI: SelectionUIBehaviorSchema.catch(DEFAULT_SETTINGS.selectionUI),
  scriptureElements: ScriptureElementsBehaviorSchema.catch(
    DEFAULT_SETTINGS.scriptureElements
  ),
  textConfig: TextConfigSchema.catch(DEFAULT_SETTINGS.textConfig),
  toolbar: ToolbarCustomizationSchema.catch(DEFAULT_SETTINGS.toolbar),
  keepScreenAwake: z.boolean().catch(DEFAULT_SETTINGS.keepScreenAwake),
  customHighlightColors: z
    .array(z.string())
    .catch(DEFAULT_SETTINGS.customHighlightColors),
  scriptureMargin: z.number().catch(DEFAULT_SETTINGS.scriptureMargin),
});

// ---------------------------------------------------------------------------

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

export const UI_TEXT_SIZE_ZOOM: Record<UITextSize, number> = {
  S: 0.85,
  M: 1.0,
  L: 1.15,
  XL: 1.3,
};

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
  resetToDefaults: () => void;
}

export function createSettings(login: LoginManager): SettingsManager {
  // Read each setting with the precedence: user profile > local configBot tag
  // > default. The profile is the source of truth when the user is logged
  // in; configBot.tags acts as a local cache for anonymous use and offline
  // bootstrapping before the profile loads.
  const readSettings = (): AppSettings => {
    const profile = login.profile.value;
    return AppSettingsSchema.parse({
      bookOrientation:
        profile?.config?.[PROFILE_BOOK_ORIENTATION] ??
        configBot.tags[TAG_BOOK_ORIENTATION] ??
        DEFAULT_SETTINGS.bookOrientation,
      uiTextSize:
        profile?.config?.[PROFILE_UI_TEXT_SIZE] ??
        configBot.tags[TAG_UI_TEXT_SIZE] ??
        DEFAULT_SETTINGS.uiTextSize,
      selectionUI:
        profile?.config?.[PROFILE_SELECTION_UI] ??
        configBot.tags[TAG_SELECTION_UI] ??
        DEFAULT_SETTINGS.selectionUI,
      scriptureElements:
        profile?.config?.[PROFILE_SCRIPTURE_ELEMENTS] ??
        configBot.tags[TAG_SCRIPTURE_ELEMENTS] ??
        DEFAULT_SETTINGS.scriptureElements,
      textConfig:
        profile?.config?.[PROFILE_TEXT_CONFIG] ??
        configBot.tags[TAG_TEXT_CONFIG] ??
        DEFAULT_SETTINGS.textConfig,
      toolbar:
        profile?.config?.[PROFILE_TOOLBAR] ??
        configBot.tags[TAG_TOOLBAR] ??
        DEFAULT_SETTINGS.toolbar,
      keepScreenAwake:
        profile?.config?.[PROFILE_KEEP_AWAKE] ??
        configBot.tags[TAG_KEEP_AWAKE] ??
        DEFAULT_SETTINGS.keepScreenAwake,
      customHighlightColors:
        profile?.config?.[PROFILE_CUSTOM_HIGHLIGHT_COLORS] ??
        configBot.tags[TAG_CUSTOM_HIGHLIGHT_COLORS] ??
        DEFAULT_SETTINGS.customHighlightColors,
      scriptureMargin:
        profile?.config?.[PROFILE_SCRIPTURE_MARGIN] ??
        configBot.tags[TAG_SCRIPTURE_MARGIN] ??
        DEFAULT_SETTINGS.scriptureMargin,
    });
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

  os.addBotListener(configBot, "onBotChanged", (that: unknown) => {
    const changedTagsSource =
      that && typeof that === "object" && "tags" in that
        ? (that as { tags?: unknown }).tags
        : null;
    const changedTags = Array.isArray(changedTagsSource)
      ? changedTagsSource
      : [];

    if (
      changedTags.includes(TAG_BOOK_ORIENTATION) ||
      changedTags.includes(TAG_UI_TEXT_SIZE) ||
      changedTags.includes(TAG_SELECTION_UI) ||
      changedTags.includes(TAG_SCRIPTURE_ELEMENTS) ||
      changedTags.includes(TAG_TEXT_CONFIG) ||
      changedTags.includes(TAG_TOOLBAR) ||
      changedTags.includes(TAG_KEEP_AWAKE) ||
      changedTags.includes(TAG_CUSTOM_HIGHLIGHT_COLORS) ||
      changedTags.includes(TAG_SCRIPTURE_MARGIN)
    ) {
      syncFromBot();
    }
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
    configBot.tags[TAG_SCRIPTURE_MARGIN] = clamped;
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

  const setKeepScreenAwake = (enabled: boolean) => {
    if (settings.value.keepScreenAwake === enabled) return;
    settings.value = { ...settings.value, keepScreenAwake: enabled };
    configBot.tags[TAG_KEEP_AWAKE] = enabled;
    saveProfileConfigValue(login, PROFILE_KEEP_AWAKE, enabled);
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

  // Scale UI surfaces via `zoom` on the document root, while exposing
  // `--sb-ui-zoom` so reader content (e.g. `.sb-chapter-content`) can
  // counter-zoom and remain controlled by its own font-size setting.
  effect(() => {
    if (typeof document === "undefined") {
      return;
    }
    const zoom = UI_TEXT_SIZE_ZOOM[settings.value.uiTextSize];
    const root = document.documentElement;
    root.style.setProperty("--sb-ui-zoom", String(zoom));
    (root.style as CSSStyleDeclaration & { zoom: string }).zoom = String(zoom);
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
    resetToDefaults,
  };
}
