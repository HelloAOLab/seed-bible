import { CasualOSManager } from "@packages/seed-bible/seed-bible/managers/OsManager";

type ListDataResult = { success: boolean; items?: unknown[] };

/**
 * `listAllData` pages a whole record. The "Your content" screen has two
 * callers wanting different slices of the same items (annotations and
 * highlights), so the sweep has to be shared rather than run twice.
 */
describe("CasualOSManager.listAllData()", () => {
  let os: ReturnType<typeof CasualOSManager>;

  beforeEach(() => {
    os = CasualOSManager();
  });

  /**
   * Stands in for the SDK's `listData`. Assigned rather than spied on: the
   * records client is a proxy, so `vi.spyOn` finds no own property to replace.
   */
  const stubListData = (
    impl: (options: { recordName: string; address?: string }) => ListDataResult
  ) => {
    const listData = vi.fn(async (options: never) => impl(options));
    (os.client as unknown as { listData: unknown }).listData = listData;
    return listData as unknown as {
      mock: { calls: [{ recordName: string; address?: string }][] };
    };
  };

  /** Pages `pages` in order for each record, then reports the end. */
  const stubPages = (pages: { address: string; data: unknown }[][]) => {
    const calls = new Map<string, number>();
    return stubListData(({ recordName }) => {
      const index = calls.get(recordName) ?? 0;
      calls.set(recordName, index + 1);
      return { success: true, items: pages[index] ?? [] };
    });
  };

  it("walks every page and returns the items in order", async () => {
    const listData = stubPages([
      [{ address: "a", data: 1 }],
      [{ address: "b", data: 2 }],
    ]);

    const result = await os.listAllData("user-1");

    expect(result).toEqual({
      success: true,
      items: [
        { address: "a", data: 1 },
        { address: "b", data: 2 },
      ],
    });
    // Two pages, then one more request that comes back empty.
    expect(listData.mock.calls.length).toBe(3);
    expect(listData.mock.calls[1]![0]).toEqual({
      recordName: "user-1",
      address: "a",
    });
  });

  it("shares one sweep between callers asking at the same time", async () => {
    const listData = stubPages([[{ address: "a", data: 1 }]]);

    const [first, second] = await Promise.all([
      os.listAllData("user-1"),
      os.listAllData("user-1"),
    ]);

    expect(first).toEqual(second);
    expect(first.items).toEqual([{ address: "a", data: 1 }]);
    // One page plus the empty one that ends it — not double that.
    expect(listData.mock.calls.length).toBe(2);
  });

  it("sweeps separately for different records", async () => {
    const listData = stubPages([[{ address: "a", data: 1 }]]);

    await Promise.all([os.listAllData("user-1"), os.listAllData("user-2")]);

    const records = listData.mock.calls.map((call) => call[0]!.recordName);
    expect(records.filter((name) => name === "user-1").length).toBe(2);
    expect(records.filter((name) => name === "user-2").length).toBe(2);
  });

  it("starts a fresh sweep once the shared one has finished", async () => {
    const listData = stubPages([[{ address: "a", data: 1 }]]);

    await os.listAllData("user-1");
    await os.listAllData("user-1");

    // A finished sweep isn't cached — the second call pages again, so an item
    // written in between isn't missed.
    expect(listData.mock.calls.length).toBeGreaterThan(2);
  });

  it("propagates a failed page and doesn't hold on to the failure", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    let first = true;
    const listData = stubListData(() => {
      if (first) {
        first = false;
        return { success: false, errorCode: "not_authorized" } as never;
      }
      return { success: true, items: [] };
    });

    await expect(os.listAllData("user-1")).rejects.toThrow("not_authorized");
    await expect(os.listAllData("user-1")).resolves.toEqual({
      success: true,
      items: [],
    });
    expect(listData.mock.calls.length).toBe(2);
    consoleError.mockRestore();
  });
});
