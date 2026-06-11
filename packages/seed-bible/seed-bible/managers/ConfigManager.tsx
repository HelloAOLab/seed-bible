import { effect, signal } from "@preact/signals";
import i18n from "i18next";
import { currentHref } from "../app/ssrEnv";
import type { LoginManager, UserProfile } from "../managers/LoginManager";
import {
  getProfileConfigValue,
  saveProfileConfigValue,
} from "../managers/ProfileConfigSync";

export interface AppConfig {
  disablePanels: boolean;
  fontSize: TextSize;
}

export type TextSize = "XS" | "S" | "M" | "L" | "XL" | "XXL";

export type SettingsPresetId = "minimal" | "full";

const FULL_CONFIG: AppConfig = {
  disablePanels: false,
  fontSize: "M",
};

const MINIMAL_CONFIG: AppConfig = {
  disablePanels: true,
  fontSize: "M",
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

export type ConfigManager = ReturnType<typeof createConfig>;

export function createConfig(login: LoginManager) {
  const readConfig = (): AppConfig => {
    const url = new URL(currentHref());
    const settingsPreset = parseSettingsPreset(
      url.searchParams.get("settingsPreset")
    );
    const presetConfig = getPresetConfig(settingsPreset);
    const profile = login.profile.value;
    const fontSizeFromProfile = parseFontSize(
      getProfileConfigValue(profile, "fontSize"),
      parseFontSize(url.searchParams.get("app.fontSize"), presetConfig.fontSize)
    );
    const disablePanelsFromProfile = parseBoolean(
      getProfileConfigValue(profile, "disablePanels"),
      parseBoolean(
        url.searchParams.get("app.disablePanels"),
        presetConfig.disablePanels
      )
    );

    return {
      disablePanels: disablePanelsFromProfile,
      fontSize: fontSizeFromProfile,
    };
  };

  const config = signal<AppConfig>(readConfig());

  const syncConfigFromBot = (
    profile: UserProfile | null = login.profile.value
  ) => {
    const url = new URL(currentHref());
    config.value = readConfig();

    const profileLanguage = getProfileConfigValue(profile, "lang");
    const nextLanguage =
      typeof profileLanguage === "string" && profileLanguage.trim().length > 0
        ? profileLanguage
        : url.searchParams.get("lang");

    if (nextLanguage && nextLanguage !== i18n.language) {
      i18n.changeLanguage(nextLanguage);
    }
  };

  // TODO: Listen to URL changes
  // os.addBotListener(configBot, "onBotChanged", (that: unknown) => {
  //   const changedTagsSource =
  //     that && typeof that === "object" && "tags" in that
  //       ? (that as { tags?: unknown }).tags
  //       : null;
  //   const changedTags = Array.isArray(changedTagsSource)
  //     ? changedTagsSource
  //     : [];

  //   if (
  //     changedTags.includes("app.disablePanels") ||
  //     changedTags.includes("app.fontSize") ||
  //     changedTags.includes("settingsPreset") ||
  //     changedTags.includes("lang")
  //   ) {
  //     syncConfigFromBot();
  //   }
  // });

  effect(() => {
    syncConfigFromBot(login.profile.value);
  });

  const setDisablePanels = (disablePanels: boolean) => {
    const nextConfig = {
      ...config.value,
      disablePanels,
    };
    config.value = nextConfig;
    // TODO: Update the URL here
    // configBot.tags["app.disablePanels"] = disablePanels;
    saveProfileConfigValue(login, "disablePanels", disablePanels);
  };

  const setFontSize = (fontSize: TextSize) => {
    const nextFontSize = parseFontSize(fontSize, config.value.fontSize);
    const nextConfig = {
      ...config.value,
      fontSize: nextFontSize,
    };
    config.value = nextConfig;
    // TODO: Update the URL here
    // configBot.tags["app.fontSize"] = nextFontSize;
    saveProfileConfigValue(login, "fontSize", nextFontSize);
  };

  // os.syncConfigBotTagsToURL(["lang"]);
  i18n.on("languageChanged", (language: string) => {
    console.log("languageChanged event received from i18n:", language);

    // TODO: Update the URL here
    // if (configBot.tags.lang || language !== DEFAULT_LANGUAGE) {
    //   configBot.tags.lang = language;
    // }
    saveProfileConfigValue(login, "lang", language);
  });

  return {
    config,
    setDisablePanels,
    setFontSize,
  };
}
