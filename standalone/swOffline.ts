/**
 * Lets the service worker ask "has this user downloaded a translation?"
 * without importing the app: it reads the same IndexedDB database
 * `OfflineTranslationStore` writes (`OFFLINE_DB_NAME`, `translations` store),
 * duplicated here because the worker bundle must stay free of app code.
 */

const OFFLINE_DB_NAME = "seed-bible-offline";
const TRANSLATIONS_STORE = "translations";

export async function hasDownloadedTranslation(
  factory: IDBFactory
): Promise<boolean> {
  try {
    return await new Promise<boolean>((resolve) => {
      const request = factory.open(OFFLINE_DB_NAME);
      // Opening with no version creates an empty database if none exists,
      // which would then block the app from creating its stores at version 1.
      // Aborting the upgrade transaction undoes that.
      request.onupgradeneeded = () => {
        request.transaction?.abort();
        resolve(false);
      };
      request.onerror = () => resolve(false);
      request.onsuccess = () => {
        const db = request.result;
        try {
          if (!db.objectStoreNames.contains(TRANSLATIONS_STORE)) {
            resolve(false);
            return;
          }
          const count = db
            .transaction(TRANSLATIONS_STORE, "readonly")
            .objectStore(TRANSLATIONS_STORE)
            .count();
          count.onsuccess = () => resolve(count.result > 0);
          count.onerror = () => resolve(false);
        } catch {
          resolve(false);
        } finally {
          // Safe: the pending count request keeps the transaction alive.
          db.close();
        }
      };
    });
  } catch {
    return false;
  }
}
