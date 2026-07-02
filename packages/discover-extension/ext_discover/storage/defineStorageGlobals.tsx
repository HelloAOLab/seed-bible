import { getStorageBot } from "ext_discover.storage.getStorageBot";
import { historySaver } from "ext_discover.storage.historySaver";
import { iconsSaver } from "ext_discover.storage.iconsSaver";
import { progressSaver } from "ext_discover.storage.progressSaver";
import { registerVisitedExperiences } from "ext_discover.storage.registerVisitedExperiences";

function ensureLocalStorageBot() {
  const localStorage = getBot("system", "storage.localStorage");

  if (localStorage?.tags?.experincesArray) {
    return;
  }

  const storageBotClone =
    getBot("system", "ext_discover.storage") ??
    getBot("system", "storage.tempStorageBot");

  if (!storageBotClone) {
    return;
  }

  create(storageBotClone, {
    space: "local",
    system: "storage.localStorage",
  });
}

export function defineStorageGlobals() {
  const storageBot = getStorageBot();
  const G = globalThis as Record<string, any>;

  G.LocaleStorage = storageBot;

  storageBot.historySaver = historySaver;
  storageBot.progressSaver = progressSaver;
  storageBot.iconsSaver = iconsSaver;

  registerVisitedExperiences();
  progressSaver();
  iconsSaver();
  void historySaver();

  ensureLocalStorageBot();
}
