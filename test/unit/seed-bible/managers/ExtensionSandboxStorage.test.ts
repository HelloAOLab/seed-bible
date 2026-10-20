import { signal } from "@preact/signals";
import {
  createSandboxStorage,
  mergeSandboxStores,
  sandboxStorageAddress,
  type SandboxStorage,
  type SandboxStorageRecords,
} from "@packages/seed-bible/seed-bible/managers/ExtensionSandboxStorage";
import { SandboxBrokerError } from "@packages/seed-bible/seed-bible/managers/ExtensionSandboxServices";

/**
 * Stands in for the CasualOS records server: one shared "account" store
 * that every simulated device reads and writes.
 */
function createRecords() {
  const data = new Map<string, { data: unknown; marker?: string }>();
  let failReads = false;
  const calls: string[] = [];
  const records: SandboxStorageRecords = {
    getData: (async (recordName: string, address: string) => {
      calls.push(`get ${recordName} ${address}`);
      if (failReads) {
        return { success: false, errorCode: "server_error" };
      }
      const stored = data.get(`${recordName}/${address}`);
      return stored
        ? { success: true, data: structuredClone(stored.data) }
        : { success: false, errorCode: "data_not_found" };
    }) as unknown as SandboxStorageRecords["getData"],
    recordData: (async (
      recordName: string,
      address: string,
      value: unknown,
      options: { marker?: string }
    ) => {
      calls.push(`record ${recordName} ${address}`);
      data.set(`${recordName}/${address}`, {
        data: structuredClone(value),
        marker: options.marker,
      });
      return { success: true };
    }) as unknown as SandboxStorageRecords["recordData"],
  };
  return {
    records,
    calls,
    stored: (userId: string, extensionId: string) =>
      data.get(`${userId}/${sandboxStorageAddress(extensionId)}`),
    failReads: (fail: boolean) => {
      failReads = fail;
    },
  };
}

describe("sandboxed extension storage sync", () => {
  let account: ReturnType<typeof createRecords>;
  let clock: number;
  const open: SandboxStorage[] = [];

  beforeEach(() => {
    localStorage.clear();
    account = createRecords();
    clock = 1_000;
  });

  afterEach(async () => {
    for (const storage of open.splice(0)) {
      await storage.dispose();
    }
  });

  /**
   * One device's storage for `ext.demo`. Each device has its own
   * localStorage in reality; tests switch devices with `newDevice()`.
   */
  function device(userId: string | null = "user-1") {
    const login = { userId: signal<string | null>(userId) };
    const storage = createSandboxStorage({
      extensionId: "ext.demo",
      login,
      records: account.records,
      pushDelayMs: 0,
      now: () => clock,
    });
    open.push(storage);
    return { storage, login };
  }

  /** Simulates moving to another device: nothing local carries over. */
  async function newDevice(userId: string | null = "user-1") {
    for (const storage of open.splice(0)) {
      await storage.dispose();
    }
    localStorage.clear();
    const next = device(userId);
    await next.storage.sync();
    return next;
  }

  /** Waits for a write's batched push to reach the account. */
  const synced = async (storage: SandboxStorage) => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await storage.sync();
  };

  it("keeps a signed-out user's storage on the device", async () => {
    const { storage } = device(null);

    storage.set("note", "hi");
    await synced(storage);

    expect(storage.get("note")).toBe("hi");
    expect(account.calls).toEqual([]);
  });

  it("saves a signed-in user's storage to a private record in their account", async () => {
    const { storage } = device();
    await storage.sync();

    clock = 2_000;
    storage.set("note", "hi");
    await synced(storage);

    expect(account.stored("user-1", "ext.demo")).toEqual({
      marker: "private",
      data: { entries: { note: { value: "hi", updatedAtMs: 2_000 } } },
    });
  });

  it("brings it to the user's other devices", async () => {
    const first = device();
    first.storage.set("note", "from the phone");
    await synced(first.storage);

    const { storage } = await newDevice();

    expect(storage.get("note")).toBe("from the phone");
  });

  it("keeps both devices' changes when they change different keys", async () => {
    const phone = device();
    await phone.storage.sync();
    // Switching devices without losing the phone's copy: the laptop has
    // already synced before the phone's change goes out.
    const laptopLogin = { userId: signal<string | null>("user-1") };
    localStorage.clear();
    const laptop = createSandboxStorage({
      extensionId: "ext.demo",
      login: laptopLogin,
      records: account.records,
      pushDelayMs: 0,
      now: () => clock,
    });
    open.push(laptop);
    await laptop.sync();

    phone.storage.set("a", 1);
    laptop.set("b", 2);
    await synced(phone.storage);
    await synced(laptop);

    const { storage } = await newDevice();
    expect(storage.get("a")).toBe(1);
    expect(storage.get("b")).toBe(2);
  });

  it("keeps the newer of two changes to the same key", async () => {
    const first = device();
    clock = 2_000;
    first.storage.set("note", "older");
    await synced(first.storage);

    const second = await newDevice();
    clock = 3_000;
    second.storage.set("note", "newer");
    await synced(second.storage);

    const third = await newDevice();
    expect(third.storage.get("note")).toBe("newer");
  });

  it("doesn't let an older copy bring back a deleted key", async () => {
    const first = device();
    clock = 2_000;
    first.storage.set("note", "x");
    await synced(first.storage);
    const staleCopy = localStorage.getItem(
      "sb-sandbox-storage:ext.demo:user-1"
    );

    const second = await newDevice();
    clock = 3_000;
    second.storage.remove("note");
    await synced(second.storage);

    // The first device comes back with its old copy and syncs.
    await second.storage.dispose();
    localStorage.clear();
    localStorage.setItem("sb-sandbox-storage:ext.demo:user-1", staleCopy!);
    const returning = device();
    await returning.storage.sync();

    expect(returning.storage.get("note")).toBeNull();
    expect(returning.storage.keys()).toEqual([]);
  });

  it("clears the account's copy on uninstall, so other devices drop theirs", async () => {
    const first = device();
    clock = 2_000;
    first.storage.set("note", "x");
    await synced(first.storage);
    const otherDevicesCopy = localStorage.getItem(
      "sb-sandbox-storage:ext.demo:user-1"
    );

    clock = 3_000;
    await first.storage.clear();
    expect(account.stored("user-1", "ext.demo")!.data).toEqual({
      entries: {},
      clearedAtMs: 3_000,
    });

    // Another device still has the data, and syncs afterwards.
    await first.storage.dispose();
    localStorage.clear();
    localStorage.setItem(
      "sb-sandbox-storage:ext.demo:user-1",
      otherDevicesCopy!
    );
    const other = device();
    await other.storage.sync();
    expect(other.storage.get("note")).toBeNull();
    expect(account.stored("user-1", "ext.demo")!.data).toEqual({
      entries: {},
      clearedAtMs: 3_000,
    });

    // Installed again later, it starts empty and keeps what it writes now.
    clock = 4_000;
    other.storage.set("note", "fresh");
    await synced(other.storage);
    const later = await newDevice();
    expect(later.storage.get("note")).toBe("fresh");
  });

  it("keeps each account's storage apart on a shared device", async () => {
    const { storage, login } = device();
    await storage.sync();
    storage.set("note", "Ruth's");
    await synced(storage);

    login.userId.value = null;
    expect(storage.get("note")).toBeNull();

    login.userId.value = "user-2";
    await storage.sync();
    expect(storage.get("note")).toBeNull();
    expect(account.stored("user-2", "ext.demo")).toBeUndefined();

    login.userId.value = "user-1";
    await storage.sync();
    expect(storage.get("note")).toBe("Ruth's");
  });

  it("doesn't write over the account's copy when it couldn't read it", async () => {
    account.failReads(true);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { storage } = device();

    storage.set("note", "offline");
    await synced(storage);

    expect(account.calls.some((call) => call.startsWith("record"))).toBe(false);
    expect(storage.get("note")).toBe("offline");

    account.failReads(false);
    await storage.sync();
    expect(account.stored("user-1", "ext.demo")!.data).toMatchObject({
      entries: { note: { value: "offline" } },
    });
    vi.restoreAllMocks();
  });

  it("sends a write that was waiting when the extension stopped", async () => {
    const login = { userId: signal<string | null>("user-1") };
    const storage = createSandboxStorage({
      extensionId: "ext.demo",
      login,
      records: account.records,
      pushDelayMs: 60_000,
      now: () => clock,
    });
    await storage.sync();

    storage.set("note", "last word");
    await storage.dispose();

    expect(account.stored("user-1", "ext.demo")!.data).toMatchObject({
      entries: { note: { value: "last word" } },
    });
  });

  it("still holds an extension to the size limit", async () => {
    const { storage } = device();
    storage.set("a", "x".repeat(200 * 1024));

    expect(() => storage.set("b", "x".repeat(200 * 1024))).toThrow(
      SandboxBrokerError
    );
    expect(storage.get("b")).toBeNull();
  });

  it("reads what was stored on the device before storage synced", () => {
    localStorage.setItem(
      "sb-sandbox-storage:ext.demo",
      JSON.stringify({ note: "from before" })
    );

    const { storage } = device(null);

    expect(storage.get("note")).toBe("from before");
  });
});

describe("mergeSandboxStores()", () => {
  const day = 24 * 60 * 60 * 1000;

  it("forgets deletes after 90 days", () => {
    const merged = mergeSandboxStores(
      {
        entries: { old: { deletedAtMs: 0 }, recent: { deletedAtMs: 80 * day } },
      },
      { entries: {} },
      100 * day
    );
    expect(merged.entries).toEqual({ recent: { deletedAtMs: 80 * day } });
  });

  it("drops anything from before a clear", () => {
    const merged = mergeSandboxStores(
      { entries: { a: { value: 1, updatedAtMs: 5 } }, clearedAtMs: 10 },
      {
        entries: {
          b: { value: 2, updatedAtMs: 20 },
          c: { value: 3, updatedAtMs: 9 },
        },
      },
      30
    );
    expect(merged).toEqual({
      entries: { b: { value: 2, updatedAtMs: 20 } },
      clearedAtMs: 10,
    });
  });
});
