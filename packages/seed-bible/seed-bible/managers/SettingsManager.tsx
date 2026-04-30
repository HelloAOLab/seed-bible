import { effect, signal, type Signal } from "@preact/signals";

export type BookOrientation = "traditional" | "tanak";
export type UITextSize = "S" | "M" | "L" | "XL";
export type TextAlignment = "left" | "center" | "right";
export type TextSectionId = "bookTitle" | "heading" | "verse";

export interface SelectionUIBehavior {
  showSelectedItems: boolean;
  showHighlightColors: boolean;
  showIconText: boolean;
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
export const DEFAULT_VERSE_LINE_HEIGHT = 1.5;

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
const TAG_TEXT_CONFIG = "app.textConfig";
const TAG_TOOLBAR = "app.toolbarConfig";
const TAG_KEEP_AWAKE = "app.keepScreenAwake";
const TAG_CUSTOM_HIGHLIGHT_COLORS = "app.customHighlightColors";
const TAG_SCRIPTURE_MARGIN = "app.scriptureMargin";

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
    marginVertical: 0,
    marginHorizontal: 0,
    bold: true,
    italic: false,
    underline: false,
    alignment: "left",
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
    alignment: "left",
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
    alignment: "left",
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

export const UI_TEXT_SIZE_ZOOM: Record<UITextSize, number> = {
  S: 0.85,
  M: 1.0,
  L: 1.15,
  XL: 1.3,
};

function parseBookOrientation(
  value: unknown,
  fallback: BookOrientation
): BookOrientation {
  return value === "tanak" || value === "traditional" ? value : fallback;
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

function parseAlignment(
  value: unknown,
  fallback: TextAlignment
): TextAlignment {
  return value === "left" || value === "center" || value === "right"
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

export function createSettings(): SettingsManager {
  const readFromTags = (): AppSettings => ({
    bookOrientation: parseBookOrientation(
      configBot.tags[TAG_BOOK_ORIENTATION],
      DEFAULT_SETTINGS.bookOrientation
    ),
    uiTextSize: parseUITextSize(
      configBot.tags[TAG_UI_TEXT_SIZE],
      DEFAULT_SETTINGS.uiTextSize
    ),
    selectionUI: parseSelectionUI(
      configBot.tags[TAG_SELECTION_UI],
      DEFAULT_SETTINGS.selectionUI
    ),
    textConfig: parseTextConfig(
      configBot.tags[TAG_TEXT_CONFIG],
      DEFAULT_SETTINGS.textConfig
    ),
    toolbar: parseToolbarConfig(
      configBot.tags[TAG_TOOLBAR],
      DEFAULT_SETTINGS.toolbar
    ),
    keepScreenAwake: parseBoolean(
      configBot.tags[TAG_KEEP_AWAKE],
      DEFAULT_SETTINGS.keepScreenAwake
    ),
    customHighlightColors: parseCustomHighlightColors(
      configBot.tags[TAG_CUSTOM_HIGHLIGHT_COLORS]
    ),
    scriptureMargin: parseNumber(
      configBot.tags[TAG_SCRIPTURE_MARGIN],
      DEFAULT_SETTINGS.scriptureMargin
    ),
  });

  const settings = signal<AppSettings>(readFromTags());

  const syncFromBot = () => {
    settings.value = readFromTags();
  };

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
  };

  const setUITextSize = (size: UITextSize) => {
    settings.value = { ...settings.value, uiTextSize: size };
    configBot.tags[TAG_UI_TEXT_SIZE] = size;
  };

  const setSelectionUI = (patch: Partial<SelectionUIBehavior>) => {
    const next = { ...settings.value.selectionUI, ...patch };
    settings.value = { ...settings.value, selectionUI: next };
    configBot.tags[TAG_SELECTION_UI] = JSON.stringify(next);
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
    settings.value = { ...settings.value, textConfig: nextTextConfig };
    configBot.tags[TAG_TEXT_CONFIG] = JSON.stringify(nextTextConfig);
  };

  const setScriptureMargin = (margin: number) => {
    if (!Number.isFinite(margin)) return;
    const clamped = Math.max(0, Math.min(200, margin));
    settings.value = { ...settings.value, scriptureMargin: clamped };
    configBot.tags[TAG_SCRIPTURE_MARGIN] = clamped;
  };

  const setVerseLineHeight = (lineHeight: number) => {
    if (!Number.isFinite(lineHeight)) return;
    const current = settings.value.textConfig;
    const nextTextConfig: TextConfig = {
      ...current,
      verse: { ...current.verse, lineHeight },
    };
    settings.value = { ...settings.value, textConfig: nextTextConfig };
    configBot.tags[TAG_TEXT_CONFIG] = JSON.stringify(nextTextConfig);
  };

  const resetTextConfig = () => {
    settings.value = { ...settings.value, textConfig: DEFAULT_TEXT_CONFIG };
    configBot.tags[TAG_TEXT_CONFIG] = "";
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
    settings.value = { ...settings.value, textConfig: next };
    configBot.tags[TAG_TEXT_CONFIG] = JSON.stringify(next);
  };

  const writeToolbarConfig = (next: ToolbarCustomization) => {
    settings.value = { ...settings.value, toolbar: next };
    const isDefault = next.hidden.length === 0 && next.order.length === 0;
    configBot.tags[TAG_TOOLBAR] = isDefault ? "" : JSON.stringify(next);
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
  };

  const writeCustomHighlightColors = (colors: string[]) => {
    settings.value = { ...settings.value, customHighlightColors: colors };
    configBot.tags[TAG_CUSTOM_HIGHLIGHT_COLORS] =
      colors.length === 0 ? "" : JSON.stringify(colors);
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
    configBot.tags[TAG_TEXT_CONFIG] = "";
    configBot.tags[TAG_TOOLBAR] = "";
    configBot.tags[TAG_KEEP_AWAKE] = false;
    configBot.tags[TAG_CUSTOM_HIGHLIGHT_COLORS] = "";
    configBot.tags[TAG_SCRIPTURE_MARGIN] = DEFAULT_SETTINGS.scriptureMargin;
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

  // Publish the scripture margin (px) as a CSS variable consumed by
  // `.sb-bible-reader`'s horizontal padding.
  effect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.style.setProperty(
      "--sb-scripture-margin",
      `${settings.value.scriptureMargin}px`
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
