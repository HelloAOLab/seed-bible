/**
 * Lets the service worker ask "has this user downloaded a translation?"
 * without importing the app: it reads the same IndexedDB database
 * `OfflineTranslationStore` writes (`OFFLINE_DB_NAME`, `translations` store),
 * duplicated here because the worker bundle must stay free of app code.
 */

const OFFLINE_DB_NAME = "seed-bible-offline";
const TRANSLATIONS_STORE = "translations";

/**
 * Whether the translation `translationId` is stored on this device (matched
 * case-insensitively, since URLs and stored ids can differ in case). With a
 * null id — a page that doesn't name a translation — whether any is.
 */
export async function hasDownloadedTranslation(
  factory: IDBFactory,
  translationId: string | null = null
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
          const store = db
            .transaction(TRANSLATIONS_STORE, "readonly")
            .objectStore(TRANSLATIONS_STORE);
          const keysRequest = store.getAllKeys();
          keysRequest.onsuccess = () => {
            const keys = keysRequest.result.map((key) => String(key));
            resolve(
              translationId === null
                ? keys.length > 0
                : keys.some(
                    (key) => key.toLowerCase() === translationId.toLowerCase()
                  )
            );
          };
          keysRequest.onerror = () => resolve(false);
        } catch {
          resolve(false);
        } finally {
          // Safe: the pending request keeps the transaction alive.
          db.close();
        }
      };
    });
  } catch {
    return false;
  }
}
