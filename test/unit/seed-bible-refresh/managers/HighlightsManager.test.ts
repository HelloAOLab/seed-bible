import {
  chapterHighlightsSchema,
  createHighlightsManager,
} from "@packages/seed-bible/seed-bible/managers/HighlightsManager";
import type { LoginManager } from "@packages/seed-bible/seed-bible/managers/LoginManager";
import { signal } from "@preact/signals";

describe("HighlightsManager", () => {
  let getDataMock: jest.Mock;
  let recordDataMock: jest.Mock;
  let warnSpy: jest.SpyInstance;
  let login: jest.Mocked<LoginManager>;

  beforeEach(() => {
    getDataMock = jest.fn().mockResolvedValue(null);
    recordDataMock = jest.fn().mockResolvedValue(undefined);
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    login = {
      authBot: signal(null),
      userId: signal("user-1"),
      profile: signal(null),
      updateProfile: jest.fn().mockResolvedValue(undefined),
      login: jest.fn().mockResolvedValue(undefined),
      logout: jest.fn().mockResolvedValue(undefined),
      getUserProfile: jest.fn().mockResolvedValue(null),
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
    const manager = createHighlightsManager(login);

    const result = await manager.getChapterHighlights("BSB", "GEN", 1);

    expect(result).toEqual({ highlights: [] });
    expect(getDataMock).not.toHaveBeenCalled();
  });

  it("getChapterHighlights() loads chapter highlights from the user record", async () => {
    getDataMock.mockResolvedValue({
      highlights: [
        { colorId: "color-1", verse: 3 },
        { colorId: "color-2", verse: [5, 7] },
      ],
    });
    const manager = createHighlightsManager(login);

    const result = await manager.getChapterHighlights("BSB", "GEN", 1);

    expect(getDataMock).toHaveBeenCalledWith("user-1", "highlights:BSB/GEN/1");
    expect(result).toEqual({
      highlights: [
        { colorId: "color-1", verse: 3 },
        { colorId: "color-2", verse: [5, 7] },
      ],
    });
  });

  it("getChapterHighlights() normalizes overlapping stored highlights", async () => {
    getDataMock.mockResolvedValue({
      highlights: [
        { colorId: "color-4", verse: [1, 4] },
        { colorId: "color-5", verse: [3, 5] },
      ],
    });
    const manager = createHighlightsManager(login);

    const result = await manager.getChapterHighlights("BSB", "GEN", 1);

    expect(result).toEqual({
      highlights: [
        { colorId: "color-4", verse: [1, 2] },
        { colorId: "color-5", verse: [3, 5] },
      ],
    });
  });

  it("getChapterHighlights() returns empty highlights when stored data is invalid", async () => {
    getDataMock.mockResolvedValue({ highlights: [{ colorId: "#fff" }] });
    const manager = createHighlightsManager(login);

    const result = await manager.getChapterHighlights("BSB", "GEN", 1);

    expect(result).toEqual({ highlights: [] });
    expect(warnSpy).toHaveBeenCalled();
  });

  it("saveChapterHighlights() stores highlights at the chapter address", async () => {
    const manager = createHighlightsManager(login);

    await manager.saveChapterHighlights("BSB", "GEN", 1, [
      { colorId: "color-1", verse: 1 },
      { colorId: "color-3", verse: [2, 4] },
    ]);

    expect(recordDataMock).toHaveBeenCalledWith(
      "user-1",
      "highlights:BSB/GEN/1",
      {
        highlights: [
          { colorId: "color-1", verse: 1 },
          { colorId: "color-3", verse: [2, 4] },
        ],
      },
      {
        marker: "publicRead:highlights/BSB",
      }
    );
  });

  it("saveChapterHighlights() attempts login before saving when unauthenticated", async () => {
    login.userId.value = null;
    login.login.mockImplementation(async () => {
      login.userId.value = "user-2";
    });
    const manager = createHighlightsManager(login);

    await manager.saveChapterHighlights("BSB", "GEN", 1, [
      { colorId: "color-1", verse: 1 },
    ]);

    expect(login.login).toHaveBeenCalledTimes(1);
    expect(recordDataMock).toHaveBeenCalledWith(
      "user-2",
      "highlights:BSB/GEN/1",
      {
        highlights: [{ colorId: "color-1", verse: 1 }],
      },
      {
        marker: "publicRead:highlights/BSB",
      }
    );
  });

  it("saveChapterHighlights() warns and does not save when login does not authenticate", async () => {
    login.userId.value = null;
    const manager = createHighlightsManager(login);

    await manager.saveChapterHighlights("BSB", "GEN", 1, [
      { colorId: "color-1", verse: 1 },
    ]);

    expect(login.login).toHaveBeenCalledTimes(1);
    expect(recordDataMock).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      "Unable to save highlights: user is not authenticated."
    );
  });

  it("saveChapterHighlights() stores normalized highlights without overlap", async () => {
    const manager = createHighlightsManager(login);

    await manager.saveChapterHighlights("BSB", "GEN", 1, [
      { colorId: "color-4", verse: [1, 4] },
      { colorId: "color-5", verse: [3, 5] },
    ]);

    expect(recordDataMock).toHaveBeenCalledWith(
      "user-1",
      "highlights:BSB/GEN/1",
      {
        highlights: [
          { colorId: "color-4", verse: [1, 2] },
          { colorId: "color-5", verse: [3, 5] },
        ],
      },
      {
        marker: "publicRead:highlights/BSB",
      }
    );
  });

  it("highlightVerse() adds or overrides overlapping highlights", async () => {
    getDataMock.mockResolvedValue({
      highlights: [
        { colorId: "color-6", verse: [1, 3] },
        { colorId: "color-6", verse: [5, 7] },
      ],
    });
    const manager = createHighlightsManager(login);

    await manager.highlightVerse("BSB", "GEN", 1, {
      colorId: "color-5",

      verse: [3, 6],
    });

    expect(recordDataMock).toHaveBeenCalledWith(
      "user-1",
      "highlights:BSB/GEN/1",
      {
        highlights: [
          { colorId: "color-6", verse: [1, 2] },
          { colorId: "color-5", verse: [3, 6] },
          { colorId: "color-6", verse: 7 },
        ],
      },
      {
        marker: "publicRead:highlights/BSB",
      }
    );
  });

  it("highlightVerse() merges adjacent highlights with identical styling", async () => {
    getDataMock.mockResolvedValue({
      highlights: [{ colorId: "color-6", verse: [1, 2] }],
    });
    const manager = createHighlightsManager(login);

    await manager.highlightVerse("BSB", "GEN", 1, {
      colorId: "color-6",
      verse: [3, 4],
    });

    expect(recordDataMock).toHaveBeenCalledWith(
      "user-1",
      "highlights:BSB/GEN/1",
      {
        highlights: [{ colorId: "color-6", verse: [1, 4] }],
      },
      {
        marker: "publicRead:highlights/BSB",
      }
    );
  });

  it("highlightVerses() applies a style to multiple verses in a single save", async () => {
    getDataMock.mockResolvedValue({
      highlights: [{ colorId: "color-6", verse: [1, 8] }],
    });
    const manager = createHighlightsManager(login);

    await manager.highlightVerses("BSB", "GEN", 1, [2, 3, 6], {
      colorId: "custom",
      customColor: "#ffeeaa",
      customFontColor: "#222222",
    });

    expect(recordDataMock).toHaveBeenCalledTimes(1);
    expect(recordDataMock).toHaveBeenCalledWith(
      "user-1",
      "highlights:BSB/GEN/1",
      {
        highlights: [
          { colorId: "color-6", verse: 1 },
          {
            colorId: "custom",
            customColor: "#ffeeaa",
            customFontColor: "#222222",
            verse: [2, 3],
          },
          { colorId: "color-6", verse: [4, 5] },
          {
            colorId: "custom",
            customColor: "#ffeeaa",
            customFontColor: "#222222",
            verse: 6,
          },
          { colorId: "color-6", verse: [7, 8] },
        ],
      },
      {
        marker: "publicRead:highlights/BSB",
      }
    );
  });

  it("unhighlightVerse() removes a verse range and splits impacted highlights", async () => {
    getDataMock.mockResolvedValue({
      highlights: [{ colorId: "color-6", verse: [1, 7] }],
    });
    const manager = createHighlightsManager(login);

    await manager.unhighlightVerse("BSB", "GEN", 1, [3, 5]);

    expect(recordDataMock).toHaveBeenCalledWith(
      "user-1",
      "highlights:BSB/GEN/1",
      {
        highlights: [
          { colorId: "color-6", verse: [1, 2] },
          { colorId: "color-6", verse: [6, 7] },
        ],
      },
      {
        marker: "publicRead:highlights/BSB",
      }
    );
  });

  it("unhighlightVerse() can remove a single highlighted verse", async () => {
    getDataMock.mockResolvedValue({
      highlights: [{ colorId: "color-6", verse: 4 }],
    });
    const manager = createHighlightsManager(login);

    await manager.unhighlightVerse("BSB", "GEN", 1, 4);

    expect(recordDataMock).toHaveBeenCalledWith(
      "user-1",
      "highlights:BSB/GEN/1",
      {
        highlights: [],
      },
      {
        marker: "publicRead:highlights/BSB",
      }
    );
  });
});

describe("chapterHighlightsSchema", () => {
  it("validates single-verse and range highlights", () => {
    const result = chapterHighlightsSchema.safeParse({
      highlights: [
        { colorId: "color-1", verse: 6 },
        { colorId: "color-6", verse: [8, 10] },
      ],
    });

    expect(result).toEqual({
      success: true,
      data: {
        highlights: [
          { colorId: "color-1", verse: 6 },
          { colorId: "color-6", verse: [8, 10] },
        ],
      },
    });
  });

  it("validates custom colors", () => {
    const result = chapterHighlightsSchema.safeParse({
      highlights: [
        {
          colorId: "custom",
          customColor: "#00ff00",
          customFontColor: "#000000",
          verse: 6,
        },
        {
          colorId: "custom",
          customColor: "#00ff00",
          customFontColor: "#000000",
          verse: [8, 10],
        },
      ],
    });

    expect(result).toEqual({
      success: true,
      data: {
        highlights: [
          {
            colorId: "custom",
            customColor: "#00ff00",
            customFontColor: "#000000",
            verse: 6,
          },
          {
            colorId: "custom",
            customColor: "#00ff00",
            customFontColor: "#000000",
            verse: [8, 10],
          },
        ],
      },
    });
  });

  it("rejects verse ranges where start is greater than end", () => {
    const result = chapterHighlightsSchema.safeParse({
      highlights: [{ colorId: "color-1", verse: [10, 8] }],
    });

    expect(result.success).toBe(false);
  });
});
