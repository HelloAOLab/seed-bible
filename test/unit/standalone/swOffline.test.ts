import { hasDownloadedTranslation } from "../../../standalone/swOffline";

interface FakeRequest<T> {
  result?: T;
  transaction?: { abort: () => void };
  onsuccess?: () => void;
  onerror?: () => void;
  onupgradeneeded?: () => void;
}

/** `null` is a database that doesn't exist; otherwise its stored translation ids by store name. */
type FakeDb = Record<string, string[]> | null;

/** Minimal IDBFactory: just enough of open()/getAllKeys() for the probe. */
function fakeFactory(db: FakeDb) {
  let aborted = false;
  let closed = false;
  const factory = {
    open() {
      const request: FakeRequest<unknown> = {};
      queueMicrotask(() => {
        if (!db) {
          request.transaction = {
            abort: () => {
              aborted = true;
            },
          };
          request.onupgradeneeded?.();
          return;
        }
        request.result = {
          objectStoreNames: { contains: (n: string) => n in db },
          transaction: () => ({
            objectStore: (n: string) => ({
              getAllKeys: () => {
                const keys: FakeRequest<string[]> = { result: db[n] };
                queueMicrotask(() => keys.onsuccess?.());
                return keys;
              },
            }),
          }),
          close: () => {
            closed = true;
          },
        };
        request.onsuccess?.();
      });
      return request;
    },
  } as unknown as IDBFactory;
  return { factory, aborted: () => aborted, closed: () => closed };
}

describe("hasDownloadedTranslation()", () => {
  it("with no translation named, is true when any translation is stored", async () => {
    const f = fakeFactory({ translations: ["BSB", "AAB"] });
    expect(await hasDownloadedTranslation(f.factory)).toBe(true);
    expect(f.closed()).toBe(true);
  });

  it("is false when the store is empty", async () => {
    const f = fakeFactory({ translations: [] });
    expect(await hasDownloadedTranslation(f.factory)).toBe(false);
  });

  it("is true only for the translation that was downloaded", async () => {
    const f = fakeFactory({ translations: ["BSB"] });
    expect(await hasDownloadedTranslation(f.factory, "BSB")).toBe(true);
    expect(await hasDownloadedTranslation(f.factory, "AAB")).toBe(false);
  });

  it("matches the translation id regardless of case", async () => {
    const f = fakeFactory({ translations: ["spa_onbv"] });
    expect(await hasDownloadedTranslation(f.factory, "SPA_ONBV")).toBe(true);
  });

  it("is false, and does not leave an empty database behind, when the database never existed", async () => {
    const f = fakeFactory(null);
    expect(await hasDownloadedTranslation(f.factory)).toBe(false);
    expect(f.aborted()).toBe(true);
  });

  it("is false when the database exists without the translations store", async () => {
    const f = fakeFactory({});
    expect(await hasDownloadedTranslation(f.factory)).toBe(false);
  });

  it("is false when IndexedDB throws", async () => {
    const factory = {
      open() {
        throw new Error("blocked");
      },
    } as unknown as IDBFactory;
    expect(await hasDownloadedTranslation(factory)).toBe(false);
  });
});
