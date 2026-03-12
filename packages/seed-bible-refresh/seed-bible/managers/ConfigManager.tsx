import { signal } from "@preact/signals";

export interface AppConfig {
  disablePanels: boolean;
}

const DEFAULT_CONFIG: AppConfig = {
  disablePanels: false,
};

const config = signal<AppConfig>(DEFAULT_CONFIG);
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
  return {
    disablePanels: parseBoolean(
      configBot.tags["app.disablePanels"],
      DEFAULT_CONFIG.disablePanels
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

    if (changedTags.includes("app.disablePanels")) {
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
