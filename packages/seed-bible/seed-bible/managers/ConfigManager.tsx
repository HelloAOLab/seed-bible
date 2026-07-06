import { effect, signal } from "@preact/signals";
import i18n from "i18next";
import type { LoginManager, UserProfile } from "../managers/LoginManager";
import {
  getProfileConfigValue,
  saveProfileConfigValue,
} from "../managers/ProfileConfigSync";
import type { NavigationManager } from "./NavigationManager";

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

// localStorage key holding the anonymous local config cache so edits survive a
// browser refresh (the profile remains the source of truth once logged in).
const LOCAL_CONFIG_STORAGE_KEY = "sb-app-config";

type LocalConfigTags = Record<string, string | boolean | number>;

function readStoredTags(): LocalConfigTags {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(LOCAL_CONFIG_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as LocalConfigTags;
    }
  } catch {
    // Ignore malformed/unavailable storage; fall back to an empty cache.
  }
  return {};
}

function writeStoredTags(tags: LocalConfigTags): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(LOCAL_CONFIG_STORAGE_KEY, JSON.stringify(tags));
  } catch {
    // Best-effort; the profile record is the durable source of truth.
  }
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

export function createConfig(
  login: LoginManager,
  navigation: NavigationManager
) {
  // Local cache for anonymous use, seeded from localStorage then the URL (so a
  // deep-linked value still overrides a stored one). The profile is the source
  // of truth once the user logs in; until then this holds edits so they survive
  // re-reads triggered by unrelated URL changes (e.g. opening or closing the
  // settings page) and browser refreshes — writes are mirrored to localStorage
  // via `setLocalTag`. Mirrors the pattern in SettingsManager.
  const localConfigCache = {
    tags: {
      ...readStoredTags(),
      ...(Object.fromEntries(
        navigation.currentUrl.value.searchParams
      ) as LocalConfigTags),
    } as LocalConfigTags,
  };

  const setLocalTag = (key: string, value: string | boolean | number) => {
    localConfigCache.tags[key] = value;
    writeStoredTags(localConfigCache.tags);
  };

  const readConfig = (): AppConfig => {
    const url = navigation.currentUrl.value;
    const settingsPreset = parseSettingsPreset(
      url.searchParams.get("settingsPreset")
    );
    const presetConfig = getPresetConfig(settingsPreset);
    const profile = login.profile.value;
    const fontSizeFromProfile = parseFontSize(
      getProfileConfigValue(profile, "fontSize") ??
        localConfigCache.tags["app.fontSize"],
      presetConfig.fontSize
    );
    const disablePanelsFromProfile = parseBoolean(
      getProfileConfigValue(profile, "disablePanels") ??
        localConfigCache.tags["app.disablePanels"],
      presetConfig.disablePanels
    );

    return {
      disablePanels: disablePanelsFromProfile,
      fontSize: fontSizeFromProfile,
    };
  };

  const config = signal<AppConfig>(readConfig());

  // Set while `syncConfigFromBot` is applying a language it just read from the
  // profile, so the `languageChanged` listener below doesn't mistake that
  // profile-to-i18n sync for a user-driven change and write the same value
  // straight back to the profile it came from.
  let isApplyingProfileLanguage = false;

  const syncConfigFromBot = (
    profile: UserProfile | null = login.profile.value
  ) => {
    const url = navigation.currentUrl.value;
    config.value = readConfig();

    const profileLanguage = getProfileConfigValue(profile, "lang");
    const nextLanguage =
      typeof profileLanguage === "string" && profileLanguage.trim().length > 0
        ? profileLanguage
        : url.searchParams.get("lang");

    if (nextLanguage && nextLanguage !== i18n.language) {
      isApplyingProfileLanguage = true;
      void i18n.changeLanguage(nextLanguage).finally(() => {
        isApplyingProfileLanguage = false;
      });
    }
  };

  effect(() => {
    syncConfigFromBot(login.profile.value);
  });

  const setDisablePanels = (disablePanels: boolean) => {
    const nextConfig = {
      ...config.value,
      disablePanels,
    };
    config.value = nextConfig;
    setLocalTag("app.disablePanels", disablePanels);
    saveProfileConfigValue(login, "disablePanels", disablePanels);
  };

  const setFontSize = (fontSize: TextSize) => {
    const nextFontSize = parseFontSize(fontSize, config.value.fontSize);
    const nextConfig = {
      ...config.value,
      fontSize: nextFontSize,
    };
    config.value = nextConfig;
    setLocalTag("app.fontSize", nextFontSize);
    saveProfileConfigValue(login, "fontSize", nextFontSize);
  };

  i18n.on("languageChanged", (language: string) => {
    if (isApplyingProfileLanguage) {
      return;
    }
    console.log("languageChanged event received from i18n:", language);
    saveProfileConfigValue(login, "lang", language);
  });

  return {
    config,
    setDisablePanels,
    setFontSize,
  };
}
