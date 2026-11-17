import { createDatabaseConnection } from "@packages/seed-bible/seed-bible/managers/indexedDbUtils";

interface FakeDatabase {
  id: number;
  closing: boolean;
  onclose: (() => void) | null;
  onversionchange: (() => void) | null;
  transaction: (storeNames: string | string[]) => { db: number };
  close: () => void;
}

/**
 * Stands in for the browser's IndexedDB: every `open` hands out a new
 * connection, and a connection marked `closing` refuses new transactions the
 * way Chrome does once it has decided to close it.
 */
function installFakeIndexedDb() {
  const opened: FakeDatabase[] = [];

  const open = () => {
    const database: FakeDatabase = {
      id: opened.length + 1,
      closing: false,
      onclose: null,
      onversionchange: null,
      transaction(storeNames) {
        if (storeNames === "missing-store") {
          throw new DOMException("No such store", "NotFoundError");
        }
        if (this.closing) {
          throw new DOMException(
            "Failed to execute 'transaction' on 'IDBDatabase': The database connection is closing.",
            "InvalidStateError"
          );
        }
        return { db: this.id };
      },
      close() {
        this.closing = true;
      },
    };
    opened.push(database);
    const request: {
      result: FakeDatabase;
      onsuccess: (() => void) | null;
    } = { result: database, onsuccess: null };
    queueMicrotask(() => request.onsuccess?.());
    return request;
  };

  vi.stubGlobal("indexedDB", { open });
  return opened;
}

function firstConnection(opened: FakeDatabase[]): FakeDatabase {
  const [database] = opened;
  if (!database) {
    throw new Error("No connection was opened.");
  }
  return database;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createDatabaseConnection()", () => {
  it("reuses one connection across transactions", async () => {
    const opened = installFakeIndexedDb();
    const connection = createDatabaseConnection("db", 1, () => {});

    await connection.transaction("store", "readonly");
    await connection.transaction("store", "readonly");

    expect(opened).toHaveLength(1);
  });

  it("reopens when the browser has started closing the cached connection", async () => {
    const opened = installFakeIndexedDb();
    const connection = createDatabaseConnection("db", 1, () => {});
    await connection.transaction("store", "readonly");

    // The browser decides to close the connection (e.g. the tab was frozen in
    // the background) before its close event has been delivered.
    firstConnection(opened).closing = true;

    const transaction = await connection.transaction("store", "readonly");

    expect(transaction).toEqual({ db: 2 });
    expect(opened).toHaveLength(2);
  });

  it("reopens after the browser reports the connection closed", async () => {
    const opened = installFakeIndexedDb();
    const connection = createDatabaseConnection("db", 1, () => {});
    await connection.transaction("store", "readonly");

    firstConnection(opened).closing = true;
    firstConnection(opened).onclose?.();

    expect(await connection.transaction("store", "readonly")).toEqual({
      db: 2,
    });
  });

  it("ignores a late close event from a connection it already replaced", async () => {
    const opened = installFakeIndexedDb();
    const connection = createDatabaseConnection("db", 1, () => {});
    await connection.transaction("store", "readonly");

    firstConnection(opened).closing = true;
    await connection.transaction("store", "readonly");
    firstConnection(opened).onclose?.();
    await connection.transaction("store", "readonly");

    expect(opened).toHaveLength(2);
  });

  it("passes on errors that aren't about a closing connection", async () => {
    const opened = installFakeIndexedDb();
    const connection = createDatabaseConnection("db", 1, () => {});

    await expect(
      connection.transaction("missing-store", "readonly")
    ).rejects.toThrow("No such store");
    expect(opened).toHaveLength(1);
  });
});
