import { signal } from "@preact/signals";

export interface AppConfig {
  disablePanels: boolean;
}

export type SettingsPresetId = "minimal" | "full";

const FULL_CONFIG: AppConfig = {
  disablePanels: false,
};

const MINIMAL_CONFIG: AppConfig = {
  disablePanels: true,
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

const config = signal<AppConfig>(getPresetConfig(DEFAULT_SETTINGS_PRESET));
let hasConfigBotListener = false;

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

function readConfigFromBot(): AppConfig {
  const settingsPreset = parseSettingsPreset(configBot.tags.settingsPreset);
  const presetConfig = getPresetConfig(settingsPreset);

  return {
    disablePanels: parseBoolean(
      configBot.tags["app.disablePanels"],
      presetConfig.disablePanels
    ),
  };
}

function syncConfigFromBot() {
  config.value = readConfigFromBot();
}

function ensureConfigBotListener() {
  if (hasConfigBotListener) {
    return;
  }

  hasConfigBotListener = true;
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
      changedTags.includes("settingsPreset")
    ) {
      syncConfigFromBot();
    }
  });
}

syncConfigFromBot();

export function useConfig() {
  ensureConfigBotListener();

  const setDisablePanels = (disablePanels: boolean) => {
    config.value = {
      ...config.value,
      disablePanels,
    };
    configBot.tags["app.disablePanels"] = disablePanels;
  };

  return {
    config,
    setDisablePanels,
  };
}
