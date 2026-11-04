import { computed, effect, signal, type Signal } from "@preact/signals";
import i18n from "i18next";
import { withMetricFallback } from "../app/fontFallbacks";
import type { LoginManager, UserProfile } from "../managers/LoginManager";
import {
  getProfileConfigValue,
  saveProfileConfigValue,
} from "../managers/ProfileConfigSync";
import type { CasualOSManager } from "./OsManager";
import type { NavigationManager } from "./NavigationManager";
import { isMinimalEmbedUrl } from "./EmbedMode";
import { SYSTEM_THEME_ID } from "./ThemeManager";
import { parseNumber } from "./Utils";
import { CUSTOMIZATION_FONT_PRESETS } from "./CustomizationsManager";

export type BookOrientation = "traditional" | "tanakh";
export type UISize = "S" | "M" | "L" | "XL";

export type TextSize = "XS" | "S" | "M" | "L" | "XL" | "XXL";

export type SettingsPresetId = "minimal" | "full";

interface FontSizePanelsPreset {
  fontSize: TextSize;
  disablePanels: boolean;
}

const FULL_CONFIG: FontSizePanelsPreset = {
  disablePanels: false,
  fontSize: "M",
};

const MINIMAL_CONFIG: FontSizePanelsPreset = {
  disablePanels: true,
  fontSize: "M",
};

const DEFAULT_CONFIG_PRESETS: Record<SettingsPresetId, FontSizePanelsPreset> = {
  minimal: MINIMAL_CONFIG,
  full: FULL_CONFIG,
};

const DEFAULT_SETTINGS_PRESET: SettingsPresetId = "full";

function getPresetConfig(
  settingsPreset: SettingsPresetId
): FontSizePanelsPreset {
  return DEFAULT_CONFIG_PRESETS[settingsPreset] ?? FULL_CONFIG;
}

function parseSettingsPreset(value: unknown): SettingsPresetId {
  if (value === "minimal" || value === "full") {
    return value;
  }

  return DEFAULT_SETTINGS_PRESET;
}

function parseFontSize(value: unknown, fallback: TextSize): TextSize {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().toUpperCase();
  switch (normalized) {
    case "XS":
    case "S":
    case "M":
    case "L":
    case "XL":
    case "XXL":
      return normalized;
    default:
      return fallback;
  }
}

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

export interface DiscoveredContentBehavior {
  showContent: boolean;
  /**
   * Whether discovered content shows in shared sessions too. It is personal —
   * only the reader sees it — so sessions hide it unless this is on.
   */
  showInSharedSessions: boolean;
  /**
   * Whether the reader has acknowledged the hint that only they can see
   * discovered content in a shared session.
   */
  sharedSessionHintSeen: boolean;
}

export const VERSE_LINE_HEIGHT_OPTIONS: number[] = [1.5, 1.7, 2, 2.5];
export const DEFAULT_VERSE_LINE_HEIGHT = 1.7;

export type VerseSelectionEffects = "default" | "enabled" | "disabled";

export interface AppSettings {
  fontSize: TextSize;
  disablePanels: boolean;
  bookOrientation: BookOrientation;
  uiSize: UISize;
  selectionUI: SelectionUIBehavior;
  scriptureElements: ScriptureElementsBehavior;
  verseLineHeight: number;
  fontOverride?: string | undefined;
  discoveredContent: DiscoveredContentBehavior;
  keepScreenAwake: boolean;
  /**
   * Whether picking a Bible translation written in another language may offer
   * to switch the UI to that language. Cleared by the prompt's "Never ask
   * again" option.
   */
  askToSwitchUiLanguage: boolean;
  /** User-added custom highlight colors (hex strings, max 3). */
  customHighlightColors: string[];
  /** Max width of the chapter content in ch. */
  scriptureWidth: number;
  /** Selected theme preset id (owned/consumed by ThemeManager). */
  themeId: string;
  /**
   * Whether the compact discover panel sits beside the scripture text
   * (true, the default) when there's room, or is forced below it, after the
   * license notice, at any viewport width (false). Flipped by the
   * "discover-content-panel" quick tool; consumed by `BibleReadingManager`'s
   * per-tab `discoverContentPanelInline` signal.
   */
  discoverContentPanelInline: boolean;
  verseSelectionEffects?: VerseSelectionEffects;
}

export const DEFAULT_SCRIPTURE_WIDTH = 68; // ch
export const MAX_SCRIPTURE_WIDTH = 192; // ch
export const MIN_SCRIPTURE_WIDTH = 24; // ch

export const MOBILE_SCRIPTURE_MARGIN = 5;

export const MAX_CUSTOM_HIGHLIGHT_COLORS = 3;

/**
 * Attribute `index.html`'s early-config script puts on `<html>` when it has
 * applied saved reader settings before first paint (see `base.inline.css`).
 */
export const EARLY_CONFIG_ATTR = "data-sb-early-config";

/**
 * Device-local copy of the five settings `index.html`'s early-config script
 * paints before first paint. The anonymous local config can't serve: it is
 * emptied once someone signs in, and signed-in readers are the ones most
 * likely to have customised these.
 */
export const READER_SETTINGS_MIRROR_KEY = "sb-reader-settings-early";

const TAG_FONT_SIZE = "app.fontSize";
const TAG_DISABLE_PANELS = "app.disablePanels";
const TAG_BOOK_ORIENTATION = "app.bookOrientation";
const TAG_UI_SIZE = "app.uiSize";
const TAG_SELECTION_UI = "app.selectionUI";
const TAG_SCRIPTURE_ELEMENTS = "app.scriptureElements";
const TAG_DISCOVERED_CONTENT = "app.discoveredContent";
const TAG_TEXT_CONFIG = "app.textConfig";
const TAG_VERSE_LINE_HEIGHT = "app.verseLineHeight";
const TAG_FONT_OVERRIDE = "app.fontOverride";
const TAG_KEEP_AWAKE = "app.keepScreenAwake";
const TAG_ASK_TO_SWITCH_UI_LANGUAGE = "app.askToSwitchUiLanguage";
const TAG_CUSTOM_HIGHLIGHT_COLORS = "app.customHighlightColors";
const TAG_SCRIPTURE_WIDTH = "app.scriptureWidth";
const TAG_THEME_ID = "app.themeId";
const TAG_DISCOVER_CONTENT_PANEL_INLINE = "app.discoverContentPanelInline";
const TAG_VERSE_SELECTION_EFFECTS = "app.verseSelectionEffects";

// Profile.config keys are stored unprefixed.
const PROFILE_FONT_SIZE = "fontSize";
const PROFILE_DISABLE_PANELS = "disablePanels";
const PROFILE_BOOK_ORIENTATION = "bookOrientation";
const PROFILE_UI_SIZE = "uiSize";
const PROFILE_SELECTION_UI = "selectionUI";
const PROFILE_SCRIPTURE_ELEMENTS = "scriptureElements";
const PROFILE_DISCOVERED_CONTENT = "discoveredContent";
const PROFILE_TEXT_CONFIG = "textConfig";
const PROFILE_VERSE_LINE_HEIGHT = "verseLineHeight";
const PROFILE_FONT_OVERRIDE = "fontOverride";
const PROFILE_KEEP_AWAKE = "keepScreenAwake";
const PROFILE_ASK_TO_SWITCH_UI_LANGUAGE = "askToSwitchUiLanguage";
const PROFILE_CUSTOM_HIGHLIGHT_COLORS = "customHighlightColors";
const PROFILE_SCRIPTURE_WIDTH = "scriptureWidth";
const PROFILE_THEME_ID = "themeId";
const PROFILE_DISCOVER_CONTENT_PANEL_INLINE = "discoverContentPanelInline";
const PROFILE_VERSE_SELECTION_EFFECTS = "verseSelectionEffects";

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

const DEFAULT_DISCOVERED_CONTENT: DiscoveredContentBehavior = {
  showContent: true,
  showInSharedSessions: false,
  sharedSessionHintSeen: false,
};

const DEFAULT_SETTINGS: AppSettings = {
  fontSize: "M",
  disablePanels: false,
  bookOrientation: "traditional",
  uiSize: "M",
  selectionUI: DEFAULT_SELECTION_UI,
  scriptureElements: DEFAULT_SCRIPTURE_ELEMENTS,
  verseLineHeight: DEFAULT_VERSE_LINE_HEIGHT,
  fontOverride: undefined,
  discoveredContent: DEFAULT_DISCOVERED_CONTENT,
  keepScreenAwake: false,
  askToSwitchUiLanguage: true,
  customHighlightColors: [],
  scriptureWidth: DEFAULT_SCRIPTURE_WIDTH,
  themeId: SYSTEM_THEME_ID,
  discoverContentPanelInline: true,
  verseSelectionEffects: "default",
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

function parseThemeId(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : fallback;
}

export function parseStringRecord(value: unknown): Record<string, string> {
  let parsed: unknown = value;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return {};
    }
  }
  if (!parsed || typeof parsed !== "object") {
    return {};
  }
  const result: Record<string, string> = {};
  for (const [key, v] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof v === "string") {
      result[key] = v;
    }
  }
  return result;
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
function parseVerseSelectionEffects(
  value: unknown,
  fallback: VerseSelectionEffects
): VerseSelectionEffects {
  return value === "default" || value === "enabled" || value === "disabled"
    ? value
    : fallback;
}

export const UI_SIZE_OPTIONS: UISize[] = ["S", "M", "L", "XL"];

export const UI_SIZE_SCALE_MAP: Record<UISize, number> = {
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

function parseUISize(value: unknown, fallback: UISize): UISize {
  if (typeof value !== "string") {
    return fallback;
  }
  const normalized = value.trim().toUpperCase();
  return UI_SIZE_OPTIONS.includes(normalized as UISize)
    ? (normalized as UISize)
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

function parseDiscoveredContent(
  value: unknown,
  fallback: DiscoveredContentBehavior
): DiscoveredContentBehavior {
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
    showContent:
      typeof obj.showContent === "boolean"
        ? obj.showContent
        : fallback.showContent,
    showInSharedSessions:
      typeof obj.showInSharedSessions === "boolean"
        ? obj.showInSharedSessions
        : fallback.showInSharedSessions,
    sharedSessionHintSeen:
      typeof obj.sharedSessionHintSeen === "boolean"
        ? obj.sharedSessionHintSeen
        : fallback.sharedSessionHintSeen,
  };
}

// The verse line-height used to live inside the per-section `textConfig`
// (the removed "All settings" text editor). Every other field of that blob is
// deliberately ignored so old customizations stop applying, but the line
// height is still set from Display & Theme, so a value saved there before it
// got its own key is still honored.
function readLegacyVerseLineHeight(textConfig: unknown): unknown {
  let parsed: unknown = textConfig;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return undefined;
    }
  }
  if (!parsed || typeof parsed !== "object") return undefined;
  const verse = (parsed as Record<string, unknown>).verse;
  if (!verse || typeof verse !== "object") return undefined;
  return (verse as Record<string, unknown>).lineHeight;
}

// "No override" is persisted as this sentinel rather than `undefined`: the
// `??` chain in `readSettings` skips `undefined`, so a signed-in user's
// cleared profile value would fall through to a stale `login.localConfig`
// font saved while signed out.
const NO_FONT_OVERRIDE = "default";

function parseFontOverride(
  value: unknown,
  fallback: AppSettings["fontOverride"]
): AppSettings["fontOverride"] {
  if (value === NO_FONT_OVERRIDE) return undefined;
  return CUSTOMIZATION_FONT_PRESETS.some((option) => option.value === value)
    ? (value as string)
    : fallback;
}

export interface SettingsManager {
  settings: Signal<AppSettings>;
  setFontSize: (fontSize: TextSize) => void;
  setDisablePanels: (disablePanels: boolean) => void;
  /**
   * Enables/disables the "switch your UI language?" prompt shown after picking
   * a translation written in another language. See
   * `AppSettings.askToSwitchUiLanguage`.
   */
  setAskToSwitchUiLanguage: (askToSwitchUiLanguage: boolean) => void;
  /**
   * Persists the user's chosen UI language to their profile. Wired into
   * `I18nManager`'s `requestLanguageChange` (the selector path) via
   * `setLanguagePersister`, so it runs ONLY for explicit selector choices —
   * never for URL-driven changes (a shared `?lang=` link or browser
   * back/forward), which stay view-only, and never for the profile-to-i18n
   * sync effect (which would just write the value straight back).
   */
  persistLanguage: (language: string) => void;
  setBookOrientation: (orientation: BookOrientation) => void;
  setUISize: (size: UISize) => void;
  setSelectionUI: (patch: Partial<SelectionUIBehavior>) => void;
  setScriptureElements: (patch: Partial<ScriptureElementsBehavior>) => void;
  setDiscoveredContent: (patch: Partial<DiscoveredContentBehavior>) => void;
  /** Set the max width of the chapter content (Scripture Width control). */
  setScriptureWidth: (width: number) => void;
  /** Set the verse line-height (Scripture line-spacing control). */
  setVerseLineHeight: (lineHeight: number) => void;
  setKeepScreenAwake: (enabled: boolean) => void;
  addCustomHighlightColor: (color: string) => void;
  removeCustomHighlightColor: (color: string) => void;
  resetToDefaults: () => void;
  /** Persists the selected theme preset id. Consumed by ThemeManager. */
  setThemeId: (themeId: string) => void;
  /**
   * Persists whether the compact discover panel sits inline beside the
   * scripture text. Consumed by `BibleReadingManager`'s per-tab
   * `discoverContentPanelInline` signal.
   */
  setDiscoverContentPanelInline: (discoverContentPanelInline: boolean) => void;
  setFontOverride: (value: AppSettings["fontOverride"]) => void;
  setVerseSelectionEffects: (value: VerseSelectionEffects) => void;
}

export function createSettings(
  os: CasualOSManager,
  login: LoginManager,
  navigation: NavigationManager
): SettingsManager {
  // A per-instance, non-persisted overlay: seeded once from the URL's query
  // params at construction (deep-linking — e.g. a partner site embedding
  // Seed Bible with `?app.fontSize=XL` to preset a starting value), then
  // kept up to date by every setter below (mirroring the pre-merge
  // `configBot.tags` this replaces). It sits between `profile` and
  // `login.localConfig` in the read precedence, so a URL param only ever
  // sets the *starting* value for this session: if `readSettings()` instead
  // re-read `navigation.currentUrl.value` fresh on every call, the
  // still-present param would permanently outrank `login.localConfig`,
  // reverting every anonymous edit back to the URL's value in the same tick
  // it was made (since every setter's `saveProfileConfigValue` call writes
  // to `login.localConfig`, which the effect below reactively re-reads).
  const sessionOverrides: Record<string, unknown> = Object.fromEntries(
    navigation.currentUrl.value.searchParams
  );
  // A boolean, not the URL itself, so `readSettings()` (and every reader of
  // `settings`) reruns only when embed mode flips, not on every navigation.
  const isMinimalEmbed = computed(() =>
    isMinimalEmbedUrl(navigation.currentUrl.value)
  );

  // Read each setting with the precedence: user profile > this session's
  // URL/override cache > `login.localConfig` (the anonymous, device-only
  // store shared with every other config/settings caller via
  // `saveProfileConfigValue`) > preset/default. The profile is the source
  // of truth once logged in; `login.localConfig` covers anonymous use and
  // offline bootstrapping before the profile loads — every setter below
  // already writes there via `saveProfileConfigValue`, so reading it back
  // here is what makes anonymous edits survive a refresh.
  const readSettings = (): AppSettings => {
    const profile = login.profile.value;
    const local = login.localConfig.value;
    const settingsPreset = parseSettingsPreset(sessionOverrides.settingsPreset);
    const presetConfig = getPresetConfig(settingsPreset);

    const readFrom = (
      source: UserProfile | null,
      profileKey: string,
      urlKey: string
    ): unknown =>
      getProfileConfigValue(source, profileKey) ??
      sessionOverrides[urlKey] ??
      local[profileKey];
    const read = (profileKey: string, urlKey: string): unknown =>
      readFrom(profile, profileKey, urlKey);

    // While a signed-in account's profile is still loading, its theme comes
    // from the copy cached on this device. `index.html`'s pre-hydration
    // script paints from that same copy, so reading the default (System)
    // here instead would repaint over it on the first post-mount theme
    // change, then flip back once the load lands.
    //
    // Only from right after mount, like `localConfig`. The theme picks a
    // shared customization's variant, which is rendered into a `<style>`
    // Preact leaves alone while hydrating, so it only repaints on a change
    // after mount.
    const themeProfile =
      profile ??
      (login.isLocalConfigHydrated.value ? login.cachedProfile.value : null);
    const readTheme = (profileKey: string, urlKey: string): unknown =>
      readFrom(themeProfile, profileKey, urlKey);

    // The embed link's theme is the look the site owner chose. The viewer's
    // saved theme would otherwise paint over it, so the
    // preview (and every signed-in visitor) would ignore the link. The same
    // goes for the viewer's saved font override, which beats every theme font.
    const embedTheme = sessionOverrides[TAG_THEME_ID];
    const pinnedEmbedTheme =
      isMinimalEmbed.value &&
      typeof embedTheme === "string" &&
      embedTheme.trim().length > 0
        ? embedTheme.trim()
        : undefined;

    return {
      fontSize: parseFontSize(
        read(PROFILE_FONT_SIZE, TAG_FONT_SIZE),
        presetConfig.fontSize
      ),
      fontOverride: parseFontOverride(
        pinnedEmbedTheme
          ? sessionOverrides[TAG_FONT_OVERRIDE]
          : read(PROFILE_FONT_OVERRIDE, TAG_FONT_OVERRIDE),
        DEFAULT_SETTINGS.fontOverride
      ),
      disablePanels: parseBoolean(
        read(PROFILE_DISABLE_PANELS, TAG_DISABLE_PANELS),
        presetConfig.disablePanels
      ),
      bookOrientation: parseBookOrientation(
        read(PROFILE_BOOK_ORIENTATION, TAG_BOOK_ORIENTATION),
        DEFAULT_SETTINGS.bookOrientation
      ),
      uiSize: parseUISize(
        read(PROFILE_UI_SIZE, TAG_UI_SIZE),
        DEFAULT_SETTINGS.uiSize
      ),
      selectionUI: parseSelectionUI(
        read(PROFILE_SELECTION_UI, TAG_SELECTION_UI),
        DEFAULT_SETTINGS.selectionUI
      ),
      scriptureElements: parseScriptureElements(
        read(PROFILE_SCRIPTURE_ELEMENTS, TAG_SCRIPTURE_ELEMENTS),
        DEFAULT_SETTINGS.scriptureElements
      ),
      // The legacy key is checked inside each layer, not after all of them,
      // so a profile's old value still outranks a newer one on the device.
      verseLineHeight: parseNumber(
        getProfileConfigValue(profile, PROFILE_VERSE_LINE_HEIGHT) ??
          readLegacyVerseLineHeight(
            getProfileConfigValue(profile, PROFILE_TEXT_CONFIG)
          ) ??
          sessionOverrides[TAG_VERSE_LINE_HEIGHT] ??
          readLegacyVerseLineHeight(sessionOverrides[TAG_TEXT_CONFIG]) ??
          local[PROFILE_VERSE_LINE_HEIGHT] ??
          readLegacyVerseLineHeight(local[PROFILE_TEXT_CONFIG]),
        DEFAULT_SETTINGS.verseLineHeight
      ),
      discoveredContent: parseDiscoveredContent(
        read(PROFILE_DISCOVERED_CONTENT, TAG_DISCOVERED_CONTENT),
        DEFAULT_SETTINGS.discoveredContent
      ),
      verseSelectionEffects: parseVerseSelectionEffects(
        read(PROFILE_VERSE_SELECTION_EFFECTS, TAG_VERSE_SELECTION_EFFECTS),
        DEFAULT_SETTINGS.verseSelectionEffects ?? "default"
      ),
      keepScreenAwake: parseBoolean(
        read(PROFILE_KEEP_AWAKE, TAG_KEEP_AWAKE),
        DEFAULT_SETTINGS.keepScreenAwake
      ),
      askToSwitchUiLanguage: parseBoolean(
        read(PROFILE_ASK_TO_SWITCH_UI_LANGUAGE, TAG_ASK_TO_SWITCH_UI_LANGUAGE),
        DEFAULT_SETTINGS.askToSwitchUiLanguage
      ),
      customHighlightColors: parseCustomHighlightColors(
        read(PROFILE_CUSTOM_HIGHLIGHT_COLORS, TAG_CUSTOM_HIGHLIGHT_COLORS)
      ),
      scriptureWidth: parseNumber(
        read(PROFILE_SCRIPTURE_WIDTH, TAG_SCRIPTURE_WIDTH),
        DEFAULT_SETTINGS.scriptureWidth
      ),
      themeId: parseThemeId(
        pinnedEmbedTheme ?? readTheme(PROFILE_THEME_ID, TAG_THEME_ID),
        DEFAULT_SETTINGS.themeId
      ),
      discoverContentPanelInline: parseBoolean(
        read(
          PROFILE_DISCOVER_CONTENT_PANEL_INLINE,
          TAG_DISCOVER_CONTENT_PANEL_INLINE
        ),
        DEFAULT_SETTINGS.discoverContentPanelInline
      ),
    };
  };

  const settings = signal<AppSettings>(readSettings());

  // Re-read whenever the profile or the anonymous local config changes —
  // `readSettings()` reads both, so this effect stays in sync with
  // login/logout and anonymous edits (which land in `login.localConfig` via
  // `saveProfileConfigValue`). Safe to also depend on `login.localConfig`
  // now: `sessionOverrides` (above), not a fresh URL read, is what sits
  // above it in precedence, and setters keep both in sync, so a re-read
  // triggered by this effect can no longer revert a same-session edit.
  effect(() => {
    settings.value = readSettings();
  });

  const setFontSize = (fontSize: TextSize) => {
    const nextFontSize = parseFontSize(fontSize, settings.value.fontSize);
    settings.value = { ...settings.value, fontSize: nextFontSize };
    sessionOverrides[TAG_FONT_SIZE] = nextFontSize;
    saveProfileConfigValue(login, PROFILE_FONT_SIZE, nextFontSize);
  };

  const setDisablePanels = (disablePanels: boolean) => {
    settings.value = { ...settings.value, disablePanels };
    sessionOverrides[TAG_DISABLE_PANELS] = disablePanels;
    saveProfileConfigValue(login, PROFILE_DISABLE_PANELS, disablePanels);
  };

  const setAskToSwitchUiLanguage = (askToSwitchUiLanguage: boolean) => {
    settings.value = { ...settings.value, askToSwitchUiLanguage };
    sessionOverrides[TAG_ASK_TO_SWITCH_UI_LANGUAGE] = askToSwitchUiLanguage;
    saveProfileConfigValue(
      login,
      PROFILE_ASK_TO_SWITCH_UI_LANGUAGE,
      askToSwitchUiLanguage
    );
  };

  // Apply the profile's saved UI language, but ONLY when the profile itself
  // changes (i.e. on login / profile load) — deliberately NOT on every URL
  // change.
  //
  // The `?lang=` query param is owned by I18nManager (see its
  // `syncSignalsToUrl({ lang })`), which is the single source of truth for
  // the URL <-> `i18n.language` relationship. If this ran on URL changes
  // too, it would fight the user's in-session language switch: picking a
  // language writes `?lang=` first, that URL write would re-run this
  // effect, and the profile's still-unsaved previous language would revert
  // `i18n.language` (leaving only `?translation=` applied). Only read
  // `login.profile` here so the effect subscribes to the profile alone.
  effect(() => {
    const profileLanguage = getProfileConfigValue(login.profile.value, "lang");
    const nextLanguage =
      typeof profileLanguage === "string" && profileLanguage.trim().length > 0
        ? profileLanguage
        : null;

    if (nextLanguage && nextLanguage !== i18n.language) {
      void i18n.changeLanguage(nextLanguage);
    }
  });

  const persistLanguage = (language: string) => {
    void saveProfileConfigValue(login, "lang", language);
  };

  const setBookOrientation = (orientation: BookOrientation) => {
    settings.value = { ...settings.value, bookOrientation: orientation };
    sessionOverrides[TAG_BOOK_ORIENTATION] = orientation;
    saveProfileConfigValue(login, PROFILE_BOOK_ORIENTATION, orientation);
  };

  const setUISize = (size: UISize) => {
    settings.value = { ...settings.value, uiSize: size };
    sessionOverrides[TAG_UI_SIZE] = size;
    saveProfileConfigValue(login, PROFILE_UI_SIZE, size);
  };

  const setSelectionUI = (patch: Partial<SelectionUIBehavior>) => {
    const next = { ...settings.value.selectionUI, ...patch };
    settings.value = { ...settings.value, selectionUI: next };
    sessionOverrides[TAG_SELECTION_UI] = next;
    saveProfileConfigValue(login, PROFILE_SELECTION_UI, next);
  };

  const setScriptureElements = (patch: Partial<ScriptureElementsBehavior>) => {
    const next = { ...settings.value.scriptureElements, ...patch };
    settings.value = { ...settings.value, scriptureElements: next };
    sessionOverrides[TAG_SCRIPTURE_ELEMENTS] = next;
    saveProfileConfigValue(login, PROFILE_SCRIPTURE_ELEMENTS, next);
  };

  const setDiscoveredContent = (patch: Partial<DiscoveredContentBehavior>) => {
    const next = { ...settings.value.discoveredContent, ...patch };
    settings.value = { ...settings.value, discoveredContent: next };
    sessionOverrides[TAG_DISCOVERED_CONTENT] = next;
    saveProfileConfigValue(login, PROFILE_DISCOVERED_CONTENT, next);
  };

  const setScriptureWidth = (width: number) => {
    if (!Number.isFinite(width)) return;
    const clamped = Math.max(
      MIN_SCRIPTURE_WIDTH,
      Math.min(MAX_SCRIPTURE_WIDTH, width)
    );
    settings.value = { ...settings.value, scriptureWidth: clamped };
    sessionOverrides[TAG_SCRIPTURE_WIDTH] = clamped;
    saveProfileConfigValue(login, PROFILE_SCRIPTURE_WIDTH, clamped);
  };
  const setVerseSelectionEffects = (value: VerseSelectionEffects) => {
    settings.value = {
      ...settings.value,
      verseSelectionEffects: value,
    };

    sessionOverrides[TAG_VERSE_SELECTION_EFFECTS] = value;

    saveProfileConfigValue(login, PROFILE_VERSE_SELECTION_EFFECTS, value);
  };

  const setVerseLineHeight = (lineHeight: number) => {
    if (!Number.isFinite(lineHeight)) return;
    settings.value = { ...settings.value, verseLineHeight: lineHeight };
    sessionOverrides[TAG_VERSE_LINE_HEIGHT] = lineHeight;
    saveProfileConfigValue(login, PROFILE_VERSE_LINE_HEIGHT, lineHeight);
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
    sessionOverrides[TAG_KEEP_AWAKE] = nextValue;
    saveProfileConfigValue(login, PROFILE_KEEP_AWAKE, nextValue);
  };

  const writeCustomHighlightColors = (colors: string[]) => {
    settings.value = { ...settings.value, customHighlightColors: colors };
    sessionOverrides[TAG_CUSTOM_HIGHLIGHT_COLORS] = colors;
    saveProfileConfigValue(login, PROFILE_CUSTOM_HIGHLIGHT_COLORS, colors);
  };

  // Next ring-buffer slot to overwrite once all 3 custom colours are filled.
  // Empty/partial palettes always append, so this only matters at the cap:
  // the 4th pick replaces slot 0 (the 1st), the 5th replaces slot 1 (the 2nd).
  let nextCustomHighlightSlot = 0;

  const addCustomHighlightColor = (color: string) => {
    const normalized = color.trim().toLowerCase();
    if (!normalized) return;
    const current = settings.value.customHighlightColors;
    if (current.some((c) => c.toLowerCase() === normalized)) {
      return;
    }
    if (current.length < MAX_CUSTOM_HIGHLIGHT_COLORS) {
      writeCustomHighlightColors([...current, normalized]);
      nextCustomHighlightSlot = 0;
      return;
    }
    const next = [...current];
    next[nextCustomHighlightSlot] = normalized;
    nextCustomHighlightSlot =
      (nextCustomHighlightSlot + 1) % MAX_CUSTOM_HIGHLIGHT_COLORS;
    writeCustomHighlightColors(next);
  };

  const removeCustomHighlightColor = (color: string) => {
    const normalized = color.trim().toLowerCase();
    writeCustomHighlightColors(
      settings.value.customHighlightColors.filter(
        (c) => c.toLowerCase() !== normalized
      )
    );
    nextCustomHighlightSlot = 0;
  };

  const setThemeId = (themeId: string) => {
    settings.value = { ...settings.value, themeId };
    sessionOverrides[TAG_THEME_ID] = themeId;
    saveProfileConfigValue(login, PROFILE_THEME_ID, themeId);
  };

  const setDiscoverContentPanelInline = (
    discoverContentPanelInline: boolean
  ) => {
    settings.value = { ...settings.value, discoverContentPanelInline };
    sessionOverrides[TAG_DISCOVER_CONTENT_PANEL_INLINE] =
      discoverContentPanelInline;
    saveProfileConfigValue(
      login,
      PROFILE_DISCOVER_CONTENT_PANEL_INLINE,
      discoverContentPanelInline
    );
  };

  const setFontOverride: SettingsManager["setFontOverride"] = (override) => {
    const stored = override ?? NO_FONT_OVERRIDE;
    settings.value = { ...settings.value, fontOverride: override };
    sessionOverrides[TAG_FONT_OVERRIDE] = stored;
    saveProfileConfigValue(login, PROFILE_FONT_OVERRIDE, stored);
  };

  const resetToDefaults = () => {
    nextCustomHighlightSlot = 0;
    settings.value = DEFAULT_SETTINGS;
    sessionOverrides[TAG_FONT_SIZE] = DEFAULT_SETTINGS.fontSize;
    sessionOverrides[TAG_DISABLE_PANELS] = DEFAULT_SETTINGS.disablePanels;
    sessionOverrides[TAG_BOOK_ORIENTATION] = DEFAULT_SETTINGS.bookOrientation;
    sessionOverrides[TAG_UI_SIZE] = DEFAULT_SETTINGS.uiSize;
    sessionOverrides[TAG_SELECTION_UI] = DEFAULT_SETTINGS.selectionUI;
    sessionOverrides[TAG_SCRIPTURE_ELEMENTS] =
      DEFAULT_SETTINGS.scriptureElements;
    sessionOverrides[TAG_VERSE_LINE_HEIGHT] = DEFAULT_SETTINGS.verseLineHeight;
    sessionOverrides[TAG_DISCOVERED_CONTENT] =
      DEFAULT_SETTINGS.discoveredContent;
    sessionOverrides[TAG_KEEP_AWAKE] = DEFAULT_SETTINGS.keepScreenAwake;
    sessionOverrides[TAG_ASK_TO_SWITCH_UI_LANGUAGE] =
      DEFAULT_SETTINGS.askToSwitchUiLanguage;
    sessionOverrides[TAG_CUSTOM_HIGHLIGHT_COLORS] = [];
    sessionOverrides[TAG_SCRIPTURE_WIDTH] = DEFAULT_SETTINGS.scriptureWidth;
    sessionOverrides[TAG_THEME_ID] = DEFAULT_SETTINGS.themeId;
    sessionOverrides[TAG_DISCOVER_CONTENT_PANEL_INLINE] =
      DEFAULT_SETTINGS.discoverContentPanelInline;
    sessionOverrides[TAG_FONT_OVERRIDE] = NO_FONT_OVERRIDE;
    sessionOverrides[TAG_VERSE_SELECTION_EFFECTS] =
      DEFAULT_SETTINGS.verseSelectionEffects ?? "default";

    saveProfileConfigValue(login, PROFILE_FONT_SIZE, DEFAULT_SETTINGS.fontSize);
    saveProfileConfigValue(
      login,
      PROFILE_DISABLE_PANELS,
      DEFAULT_SETTINGS.disablePanels
    );
    saveProfileConfigValue(
      login,
      PROFILE_BOOK_ORIENTATION,
      DEFAULT_SETTINGS.bookOrientation
    );
    saveProfileConfigValue(login, PROFILE_UI_SIZE, DEFAULT_SETTINGS.uiSize);
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
      PROFILE_VERSE_LINE_HEIGHT,
      DEFAULT_SETTINGS.verseLineHeight
    );
    saveProfileConfigValue(
      login,
      PROFILE_DISCOVERED_CONTENT,
      DEFAULT_SETTINGS.discoveredContent
    );
    saveProfileConfigValue(
      login,
      PROFILE_VERSE_SELECTION_EFFECTS,
      DEFAULT_SETTINGS.verseSelectionEffects ?? "default"
    );
    saveProfileConfigValue(
      login,
      PROFILE_KEEP_AWAKE,
      DEFAULT_SETTINGS.keepScreenAwake
    );
    saveProfileConfigValue(
      login,
      PROFILE_ASK_TO_SWITCH_UI_LANGUAGE,
      DEFAULT_SETTINGS.askToSwitchUiLanguage
    );
    saveProfileConfigValue(login, PROFILE_CUSTOM_HIGHLIGHT_COLORS, []);
    saveProfileConfigValue(
      login,
      PROFILE_SCRIPTURE_WIDTH,
      DEFAULT_SETTINGS.scriptureWidth
    );
    saveProfileConfigValue(login, PROFILE_THEME_ID, DEFAULT_SETTINGS.themeId);
    saveProfileConfigValue(
      login,
      PROFILE_DISCOVER_CONTENT_PANEL_INLINE,
      DEFAULT_SETTINGS.discoverContentPanelInline
    );
    saveProfileConfigValue(login, PROFILE_FONT_OVERRIDE, NO_FONT_OVERRIDE);
  };

  // `index.html`'s early-config script may already have painted the device's
  // saved UI size, reader font size, scripture width, line height and
  // scripture font straight from localStorage. This manager's first run still
  // sees the SSR-matching defaults (see `LoginManager.localConfig`), so
  // writing them would undo that until `hydrateLocalConfig()` re-derives the settings a moment later, and
  // for a signed-in reader even that re-derive only has defaults until the
  // profile arrives (the anonymous local config is empty once signed in), which
  // would widen the column to the default and then narrow it again. Each effect
  // below therefore holds its write back for the first run and for as long as a
  // signed-in account's profile is still loading; the re-derive always
  // produces a new `settings` object, so every one of them runs again with the
  // real values.
  const hadEarlyConfig =
    typeof document !== "undefined" &&
    document.documentElement.hasAttribute(EARLY_CONFIG_ATTR);
  let sawProfileLoading = false;
  const isProfileStillLoading = () => {
    if (login.userId.value === null || login.profile.value !== null) {
      return false;
    }
    const loading = login.isProfileLoading?.value ?? false;
    sawProfileLoading ||= loading;
    // Not started yet, or in flight; a load that ended without a profile
    // (offline, server error) releases the hold so settings stay editable.
    return loading || !sawProfileLoading;
  };
  const skipFirstWriteAfterEarlyConfig = () => {
    let first = hadEarlyConfig;
    return () => {
      // Evaluated first so the effect subscribes to the login signals.
      const waiting = hadEarlyConfig && isProfileStillLoading();
      const skip = first || waiting;
      first = false;
      return skip;
    };
  };

  // Scale UI surfaces via `--sb-ui-scale`, which drives `html { font-size }`
  // (see app/styles/base.css). Chrome sized in `rem` tracks this; reader text keeps its
  // own font-size knob (`.sb-bible-reader` carries `.sb-font-size-*`), so it
  // stays independent without the old root-`zoom` + counter-zoom hack.
  const skipUiScaleWrite = skipFirstWriteAfterEarlyConfig();
  effect(() => {
    if (typeof document === "undefined") {
      return;
    }
    const scale = UI_SIZE_SCALE_MAP[settings.value.uiSize];
    if (skipUiScaleWrite()) return;
    document.documentElement.style.setProperty("--sb-ui-scale", String(scale));
  });

  const skipFontOverrideWrite = skipFirstWriteAfterEarlyConfig();
  effect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement.style;
    const override = settings.value.fontOverride;
    if (skipFontOverrideWrite()) return;
    if (override) {
      root.setProperty(
        "--sb-scripture-font-override",
        withMetricFallback(override)
      );
    } else {
      root.removeProperty("--sb-scripture-font-override");
    }
  });

  // The early-config script sizes the reader through a CSS rule keyed on
  // `EARLY_CONFIG_ATTR` instead of the `.sb-font-size-*` class (which doesn't
  // exist yet); once the real settings are in, the class takes over again.
  const skipFontSizeWrite = skipFirstWriteAfterEarlyConfig();
  effect(() => {
    if (typeof document === "undefined") return;
    void settings.value.fontSize;
    if (skipFontSizeWrite()) return;
    document.documentElement.removeAttribute(EARLY_CONFIG_ATTR);
  });

  const skipVerseLineHeightWrite = skipFirstWriteAfterEarlyConfig();
  effect(() => {
    if (typeof document === "undefined") return;
    const lineHeight = settings.value.verseLineHeight;
    if (skipVerseLineHeightWrite()) return;
    document.documentElement.style.setProperty(
      "--text-verse-line-height",
      String(lineHeight)
    );
  });

  // Publish the scripture margin (%) as a CSS variable consumed by
  // `.sb-bible-reader`'s horizontal padding.
  const skipScriptureWidthWrite = skipFirstWriteAfterEarlyConfig();
  effect(() => {
    if (typeof document === "undefined") return;
    const width = settings.value.scriptureWidth;
    if (skipScriptureWidthWrite()) return;
    document.documentElement.style.setProperty(
      "--sb-scripture-width",
      `${width}ch`
    );
  });

  // Keep the early-config script's copy current, signed in or out. Never
  // written on the first run (it only sees the SSR-matching defaults, which
  // would wipe the saved copy), nor while a signed-in account's profile is
  // still loading (the same defaults), nor when the link itself sets
  // `app.*` values, which the script ignores too and which aren't the
  // reader's own choices. A reset writes the defaults, so none get stuck.
  let isFirstMirrorWrite = true;
  effect(() => {
    const current = settings.value;
    const signedInWithoutProfile =
      login.userId.value !== null && login.profile.value === null;
    const snapshot = {
      uiSize: current.uiSize,
      fontSize: current.fontSize,
      scriptureWidth: current.scriptureWidth,
      verseLineHeight: current.verseLineHeight,
      fontOverride: current.fontOverride,
    };
    if (isFirstMirrorWrite) {
      isFirstMirrorWrite = false;
      return;
    }
    if (
      signedInWithoutProfile ||
      typeof window === "undefined" ||
      /[?&]app\./.test(window.location.search)
    ) {
      return;
    }
    try {
      localStorage.setItem(
        READER_SETTINGS_MIRROR_KEY,
        JSON.stringify(snapshot)
      );
    } catch {
      // Storage blocked or full: the next visit just paints the defaults.
    }
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
    setFontSize,
    setDisablePanels,
    setAskToSwitchUiLanguage,
    persistLanguage,
    setBookOrientation,
    setUISize: setUISize,
    setSelectionUI,
    setScriptureElements,
    setDiscoveredContent,
    setScriptureWidth,
    setVerseLineHeight,
    setKeepScreenAwake,
    addCustomHighlightColor,
    removeCustomHighlightColor,
    resetToDefaults,
    setThemeId,
    setDiscoverContentPanelInline,
    setFontOverride,
    setVerseSelectionEffects,
  };
}
