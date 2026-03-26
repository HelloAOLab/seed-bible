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

export type ConfigManager = ReturnType<typeof createConfig>;

export function createConfig() {
  const readConfigFromBot = (): AppConfig => {
    const settingsPreset = parseSettingsPreset(configBot.tags.settingsPreset);
    const presetConfig = getPresetConfig(settingsPreset);

    return {
      disablePanels: parseBoolean(
        configBot.tags["app.disablePanels"],
        presetConfig.disablePanels
      ),
    };
  };

  const config = signal<AppConfig>(readConfigFromBot());

  const syncConfigFromBot = () => {
    config.value = readConfigFromBot();
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
      changedTags.includes("settingsPreset")
    ) {
      syncConfigFromBot();
    }
  });

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
