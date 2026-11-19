/**
 * Small helpers for talking to IndexedDB with promises instead of events.
 *
 * IndexedDB's API predates promises: every operation hands back a request or a
 * transaction object that fires `onsuccess`/`onerror` later. These two wrappers
 * are all the app needs to write ordinary `await` code against it, and they are
 * shared so each store doesn't grow its own copy.
 */

/** Resolves with a request's result, or rejects with its error. */
export function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("IndexedDB request failed."));
  });
}

/**
 * Resolves once a transaction commits.
 *
 * Awaiting the transaction rather than its individual requests is what makes a
 * multi-write change atomic: either every `put`/`delete` in it lands, or none
 * of them do.
 */
export function transactionToPromise(
  transaction: IDBTransaction
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction failed."));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction aborted."));
  });
}

/** A cached connection to one database that reconnects when the browser drops it. */
export interface DatabaseConnection {
  /**
   * Starts a transaction on the cached connection, opening it on first use.
   *
   * If the connection has started closing, it is discarded and the
   * transaction is retried once on a fresh connection.
   */
  transaction(
    storeNames: string | string[],
    mode: IDBTransactionMode
  ): Promise<IDBTransaction>;
}

/**
 * Opens `name` at `version` lazily and keeps the connection for reuse.
 *
 * The browser can close a connection on its own: another tab bumping the
 * version, or (Chrome on Android especially) the page being frozen in the
 * background or its storage being cleared. A store that kept using the dead
 * handle would fail every call afterward with "The database connection is
 * closing", so a closed connection is forgotten and the next call reopens.
 *
 * Only starting a transaction is retried. A transaction already running when
 * the connection closes is aborted by the browser and its caller sees the
 * error; retrying a half-finished write blindly could apply it twice.
 */
export function createDatabaseConnection(
  name: string,
  version: number,
  upgrade: (
    database: IDBDatabase,
    event: IDBVersionChangeEvent,
    upgradeTransaction: IDBTransaction | null
  ) => void
): DatabaseConnection {
  let databasePromise: Promise<IDBDatabase> | null = null;
  let openDatabaseHandle: IDBDatabase | null = null;

  // Only clears the cache when it still holds this handle, so a late close
  // event from an old connection can't throw away a newer one.
  const forget = (database: IDBDatabase) => {
    if (openDatabaseHandle === database) {
      openDatabaseHandle = null;
      databasePromise = null;
    }
  };

  const open = (): Promise<IDBDatabase> => {
    if (databasePromise) {
      return databasePromise;
    }

    databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(name, version);

      request.onupgradeneeded = (event) =>
        upgrade(request.result, event, request.transaction);

      request.onsuccess = () => {
        const database = request.result;
        openDatabaseHandle = database;
        database.onversionchange = () => {
          database.close();
          forget(database);
        };
        database.onclose = () => forget(database);
        resolve(database);
      };

      request.onerror = () =>
        reject(request.error ?? new Error("Failed to open IndexedDB."));
      request.onblocked = () =>
        reject(new Error("IndexedDB upgrade blocked by another tab."));
    }).catch((error: unknown) => {
      databasePromise = null;
      throw error;
    });

    return databasePromise;
  };

  return {
    async transaction(storeNames, mode) {
      const database = await open();
      try {
        return database.transaction(storeNames, mode);
      } catch (error) {
        // The close event can arrive after the connection already refuses new
        // transactions, so the failed call itself is the first sign.
        if (
          !(error instanceof DOMException) ||
          error.name !== "InvalidStateError"
        ) {
          throw error;
        }
        forget(database);
        return (await open()).transaction(storeNames, mode);
      }
    },
  };
}
