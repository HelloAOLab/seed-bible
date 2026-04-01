import {
  chapterHighlightsSchema,
  createHighlightsManager,
} from "@packages/seed-bible/seed-bible/managers/HighlightsManager";

describe("HighlightsManager", () => {
  let getDataMock: jest.Mock;
  let recordDataMock: jest.Mock;
  let warnSpy: jest.SpyInstance;
  let login: {
    userId: {
      value: string | null;
    };
  };

  beforeEach(() => {
    getDataMock = jest.fn().mockResolvedValue(null);
    recordDataMock = jest.fn().mockResolvedValue(undefined);
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    login = {
      userId: {
        value: "user-1",
      },
    };

    (globalThis as any).os = {
      ...(globalThis as any).os,
      getData: getDataMock,
      recordData: recordDataMock,
    };
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("getChapterHighlights() returns empty highlights when unauthenticated", async () => {
    login.userId.value = null;
    const manager = createHighlightsManager(login as any);

    const result = await manager.getChapterHighlights("BSB", "GEN", 1);

    expect(result).toEqual({ highlights: [] });
    expect(getDataMock).not.toHaveBeenCalled();
  });

  it("getChapterHighlights() loads chapter highlights from the user record", async () => {
    getDataMock.mockResolvedValue({
      highlights: [
        { color: "#ffff00", fontColor: "#000000", verse: 3 },
        { color: "#aabbcc", fontColor: "#111111", verse: [5, 7] },
      ],
    });
    const manager = createHighlightsManager(login as any);

    const result = await manager.getChapterHighlights("BSB", "GEN", 1);

    expect(getDataMock).toHaveBeenCalledWith("user-1", "highlights:BSB/GEN/1");
    expect(result).toEqual({
      highlights: [
        { color: "#ffff00", fontColor: "#000000", verse: 3 },
        { color: "#aabbcc", fontColor: "#111111", verse: [5, 7] },
      ],
    });
  });

  it("getChapterHighlights() returns empty highlights when stored data is invalid", async () => {
    getDataMock.mockResolvedValue({ highlights: [{ color: "#fff" }] });
    const manager = createHighlightsManager(login as any);

    const result = await manager.getChapterHighlights("BSB", "GEN", 1);

    expect(result).toEqual({ highlights: [] });
    expect(warnSpy).toHaveBeenCalled();
  });

  it("saveChapterHighlights() stores highlights at the chapter address", async () => {
    const manager = createHighlightsManager(login as any);

    await manager.saveChapterHighlights("BSB", "GEN", 1, [
      { color: "#ffff00", fontColor: "#000000", verse: 1 },
      { color: "#ffeeaa", fontColor: "#222222", verse: [2, 4] },
    ]);

    expect(recordDataMock).toHaveBeenCalledWith(
      "user-1",
      "highlights:BSB/GEN/1",
      {
        highlights: [
          { color: "#ffff00", fontColor: "#000000", verse: 1 },
          { color: "#ffeeaa", fontColor: "#222222", verse: [2, 4] },
        ],
      }
    );
  });

  it("saveChapterHighlights() does not save when unauthenticated", async () => {
    login.userId.value = null;
    const manager = createHighlightsManager(login as any);

    await manager.saveChapterHighlights("BSB", "GEN", 1, [
      { color: "#ffff00", fontColor: "#000000", verse: 1 },
    ]);

    expect(recordDataMock).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      "Cannot save highlights: no authenticated user"
    );
  });
});

describe("chapterHighlightsSchema", () => {
  it("validates single-verse and range highlights", () => {
    const result = chapterHighlightsSchema.safeParse({
      highlights: [
        { color: "#ffff00", fontColor: "#000000", verse: 6 },
        { color: "#00ff00", fontColor: "#111111", verse: [8, 10] },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("rejects verse ranges where start is greater than end", () => {
    const result = chapterHighlightsSchema.safeParse({
      highlights: [{ color: "#ffff00", fontColor: "#000000", verse: [10, 8] }],
    });

    expect(result.success).toBe(false);
  });
});
