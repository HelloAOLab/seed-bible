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
