import { effect, signal } from "@preact/signals";
import i18n from "https://esm.sh/i18next@23.16.8";
import { DEFAULT_LANGUAGE } from "seed-bible.i18n.I18nManager";
import type {
  LoginManager,
  UserProfile,
} from "seed-bible.managers.LoginManager";

export interface AppConfig {
  disablePanels: boolean;
  fontSize: TextSize;
  scriptureFontSize: TextSize;
  scriptureLineSpacing: ScriptureLineSpacing;
  scriptureShowHeadings: boolean;
  scriptureShowVerseNumbers: boolean;
  scriptureShowFootnotes: boolean;
  scriptureShowHighlights: boolean;
}

export type TextSize = "XS" | "S" | "M" | "L" | "XL" | "XXL";
export type ScriptureLineSpacing = "S" | "M" | "L";

export type SettingsPresetId = "minimal" | "full";

const FULL_CONFIG: AppConfig = {
  disablePanels: false,
  fontSize: "M",
  scriptureFontSize: "M",
  scriptureLineSpacing: "M",
  scriptureShowHeadings: true,
  scriptureShowVerseNumbers: true,
  scriptureShowFootnotes: true,
  scriptureShowHighlights: true,
};

const MINIMAL_CONFIG: AppConfig = {
  disablePanels: true,
  fontSize: "M",
  scriptureFontSize: "M",
  scriptureLineSpacing: "M",
  scriptureShowHeadings: true,
  scriptureShowVerseNumbers: true,
  scriptureShowFootnotes: true,
  scriptureShowHighlights: true,
};

const DEFAULT_CONFIG_PRESETS: Record<SettingsPresetId, AppConfig> = {
  minimal: MINIMAL_CONFIG,
  full: FULL_CONFIG,
};

const DEFAULT_SETTINGS_PRESET: SettingsPresetId = "full";

function getPresetConfig(settingsPreset: SettingsPresetId): AppConfig {
  return DEFAULT_CONFIG_PRESETS[settingsPreset] ?? FULL_CONFIG;
}

function parseSettingsPreset(value: unknown): SettingsPresetId {
  if (value === "minimal" || value === "full") {
    return value;
  }

  return DEFAULT_SETTINGS_PRESET;
}

function parseBoolean(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }

    if (normalized === "false") {
      return false;
    }
  }

  return fallback;
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

function parseScriptureLineSpacing(
  value: unknown,
  fallback: ScriptureLineSpacing
): ScriptureLineSpacing {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().toUpperCase();
  switch (normalized) {
    case "S":
    case "M":
    case "L":
      return normalized;
    default:
      return fallback;
  }
}

function getProfileConfigValue(
  profile: UserProfile | null,
  key: string
): unknown {
  const profileConfig = profile?.config;
  if (!profileConfig || typeof profileConfig !== "object") {
    return null;
  }

  return (profileConfig as Record<string, unknown>)[key];
}

export type ConfigManager = ReturnType<typeof createConfig>;

export function createConfig(login: LoginManager) {
  const readConfig = (): AppConfig => {
    const settingsPreset = parseSettingsPreset(configBot.tags.settingsPreset);
    const presetConfig = getPresetConfig(settingsPreset);

    const fontSizeFromProfile = parseFontSize(
      getProfileConfigValue(login.profile.value, "fontSize"),
      parseFontSize(configBot.tags["app.fontSize"], presetConfig.fontSize)
    );

    const scriptureFontSizeFromProfile = parseFontSize(
      getProfileConfigValue(login.profile.value, "scriptureFontSize"),
      parseFontSize(
        configBot.tags["app.scriptureFontSize"],
        presetConfig.scriptureFontSize
      )
    );

    const scriptureLineSpacingFromProfile = parseScriptureLineSpacing(
      getProfileConfigValue(login.profile.value, "scriptureLineSpacing"),
      parseScriptureLineSpacing(
        configBot.tags["app.scriptureLineSpacing"],
        presetConfig.scriptureLineSpacing
      )
    );

    const scriptureShowHeadingsFromProfile = parseBoolean(
      getProfileConfigValue(login.profile.value, "scriptureShowHeadings"),
      parseBoolean(
        configBot.tags["app.scriptureShowHeadings"],
        presetConfig.scriptureShowHeadings
      )
    );

    const scriptureShowVerseNumbersFromProfile = parseBoolean(
      getProfileConfigValue(login.profile.value, "scriptureShowVerseNumbers"),
      parseBoolean(
        configBot.tags["app.scriptureShowVerseNumbers"],
        presetConfig.scriptureShowVerseNumbers
      )
    );

    const scriptureShowFootnotesFromProfile = parseBoolean(
      getProfileConfigValue(login.profile.value, "scriptureShowFootnotes"),
      parseBoolean(
        configBot.tags["app.scriptureShowFootnotes"],
        presetConfig.scriptureShowFootnotes
      )
    );

    const scriptureShowHighlightsFromProfile = parseBoolean(
      getProfileConfigValue(login.profile.value, "scriptureShowHighlights"),
      parseBoolean(
        configBot.tags["app.scriptureShowHighlights"],
        presetConfig.scriptureShowHighlights
      )
    );

    return {
      disablePanels: parseBoolean(
        configBot.tags["app.disablePanels"],
        presetConfig.disablePanels
      ),
      fontSize: fontSizeFromProfile,
      scriptureFontSize: scriptureFontSizeFromProfile,
      scriptureLineSpacing: scriptureLineSpacingFromProfile,
      scriptureShowHeadings: scriptureShowHeadingsFromProfile,
      scriptureShowVerseNumbers: scriptureShowVerseNumbersFromProfile,
      scriptureShowFootnotes: scriptureShowFootnotesFromProfile,
      scriptureShowHighlights: scriptureShowHighlightsFromProfile,
    };
  };

  const config = signal<AppConfig>(readConfig());

  const syncConfigFromBot = (
    profile: UserProfile | null = login.profile.value
  ) => {
    config.value = readConfig();

    const profileLanguage = getProfileConfigValue(profile, "lang");
    const nextLanguage =
      typeof profileLanguage === "string" && profileLanguage.trim().length > 0
        ? profileLanguage
        : configBot.tags.lang;

    if (nextLanguage && nextLanguage !== i18n.language) {
      i18n.changeLanguage(nextLanguage);
    }
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
      changedTags.includes("app.disablePanels") ||
      changedTags.includes("app.fontSize") ||
      changedTags.includes("app.scriptureFontSize") ||
      changedTags.includes("app.scriptureLineSpacing") ||
      changedTags.includes("app.scriptureShowHeadings") ||
      changedTags.includes("app.scriptureShowVerseNumbers") ||
      changedTags.includes("app.scriptureShowFootnotes") ||
      changedTags.includes("app.scriptureShowHighlights") ||
      changedTags.includes("settingsPreset") ||
      changedTags.includes("lang")
    ) {
      syncConfigFromBot();
    }
  });

  effect(() => {
    syncConfigFromBot(login.profile.value);
  });

  const saveProfileConfigValue = (key: string, value: unknown) => {
    if (!login.userId.value) {
      return;
    }

    const existingProfile = login.profile.value;
    const existingConfig =
      existingProfile?.config && typeof existingProfile.config === "object"
        ? (existingProfile.config as Record<string, unknown>)
        : {};

    if (existingConfig[key] === value) {
      console.log(`Profile already has the correct ${key}. No update needed.`);
      return;
    }

    login.updateProfile({
      config: {
        ...existingConfig,
        [key]: value,
      },
    });
  };

  const setDisablePanels = (disablePanels: boolean) => {
    const nextConfig = {
      ...config.value,
      disablePanels,
    };
    config.value = nextConfig;
    configBot.tags["app.disablePanels"] = disablePanels;
  };

  const setFontSize = (fontSize: TextSize) => {
    const nextFontSize = parseFontSize(fontSize, config.value.fontSize);
    const nextConfig = {
      ...config.value,
      fontSize: nextFontSize,
    };
    config.value = nextConfig;
    configBot.tags["app.fontSize"] = nextFontSize;
    saveProfileConfigValue("fontSize", nextFontSize);
  };

  os.syncConfigBotTagsToURL(["lang"]);
  i18n.on("languageChanged", (language: string) => {
    console.log("languageChanged event received from i18n:", language);
    if (configBot.tags.lang || language !== DEFAULT_LANGUAGE) {
      configBot.tags.lang = language;
    }
    saveProfileConfigValue("lang", language);
  });

  return {
    config,
    setDisablePanels,
    setFontSize,
  };
}
