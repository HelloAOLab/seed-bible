export function getStorageBot(): Record<string, any> {
  const G = globalThis as Record<string, any>;

  if (G.LocaleStorage) {
    return G.LocaleStorage;
  }

  const legacyBot = getBot("system", "storage.tempStorageBot");
  if (legacyBot) {
    G.LocaleStorage = legacyBot;
    return legacyBot;
  }

  const storageBot =
    getBot("system", "ext_discover.storage") ??
    getBot("system", "ext_discover.host") ??
    getBot("system", "ext_discover");

  if (storageBot) {
    G.LocaleStorage = storageBot;
    return storageBot;
  }

  return G.thisBot ?? {};
}
