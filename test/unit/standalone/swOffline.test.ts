import { hasDownloadedTranslation } from "../../../standalone/swOffline";

interface FakeDb {
  stores: Record<string, number>;
}

/** Minimal IDBFactory: just enough of open()/count() for the probe. */
function fakeFactory(db: FakeDb | null): {
  factory: IDBFactory;
  aborted: () => boolean;
  closed: () => boolean;
} {
  let aborted = false;
  let closed = false;
  const factory = {
    open() {
      const request: any = {};
      queueMicrotask(() => {
        if (!db) {
          request.transaction = {
            abort: () => {
              aborted = true;
            },
          };
          request.onupgradeneeded();
          return;
        }
        request.result = {
          objectStoreNames: { contains: (n: string) => n in db.stores },
          transaction: () => ({
            objectStore: (n: string) => ({
              count: () => {
                const count: any = { result: db.stores[n] };
                queueMicrotask(() => count.onsuccess());
                return count;
              },
            }),
          }),
          close: () => {
            closed = true;
          },
        };
        request.onsuccess();
      });
      return request;
    },
  } as unknown as IDBFactory;
  return { factory, aborted: () => aborted, closed: () => closed };
}

describe("hasDownloadedTranslation()", () => {
  it("is true when a translation is stored", async () => {
    const f = fakeFactory({ stores: { translations: 2 } });
    expect(await hasDownloadedTranslation(f.factory)).toBe(true);
    expect(f.closed()).toBe(true);
  });

  it("is false when the store is empty", async () => {
    const f = fakeFactory({ stores: { translations: 0 } });
    expect(await hasDownloadedTranslation(f.factory)).toBe(false);
  });

  it("is false, and does not leave an empty database behind, when the database never existed", async () => {
    const f = fakeFactory(null);
    expect(await hasDownloadedTranslation(f.factory)).toBe(false);
    expect(f.aborted()).toBe(true);
  });

  it("is false when the database exists without the translations store", async () => {
    const f = fakeFactory({ stores: {} });
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
