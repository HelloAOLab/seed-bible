import { signal } from "@preact/signals";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import { acquireSeedBibleUtils } from "@packages/seed-bible-utils";

/** Just enough app state for the utils to start, reading one tab in `translationId`. */
function createContext() {
  const translationId = signal("BSB");
  const getTranslationBooks = vi.fn(async (id: string) => ({
    books: [{ id: "GEN", name: `Genesis (${id})` }],
  }));
  const tab = {
    id: "tab-1",
    sharedSession: null,
    readingState: {
      bookId: signal("GEN"),
      chapterNumber: signal(1),
      translationId,
      translation: signal({ shortName: "BSB" }),
    },
  };
  const context = {
    login: {
      userId: signal<string | null>(null),
      profile: signal(null),
      connectionId: "me",
    },
    os: { connectionId: "me" },
    friends: {},
    tabs: {
      tabs: signal([tab]),
      selectedTabId: signal("tab-1"),
    },
    app: {
      selectedTab: signal(tab),
      currentReadingState: {
        get value() {
          return { translationId: translationId.value, tab };
        },
      },
    },
    bibleData: { getTranslationBooks },
  } as unknown as SeedBibleState;
  return { context, translationId, getTranslationBooks };
}

async function waitForCondition(condition: () => boolean, timeoutMs = 1000) {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error("Timed out waiting for condition");
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

describe("acquireSeedBibleUtils", () => {
  it("hands every extension in one app the same utils", () => {
    const { context } = createContext();
    const first = acquireSeedBibleUtils(context);
    const second = acquireSeedBibleUtils(context);

    expect(second.api).toBe(first.api);

    first.release();
    second.release();
  });

  it("keeps the utils running until the last extension releases them", async () => {
    const { context, translationId } = createContext();
    const first = acquireSeedBibleUtils(context);
    const second = acquireSeedBibleUtils(context);
    const { bookNames } = first.api;
    await waitForCondition(
      () => bookNames.value.get("GEN") === "Genesis (BSB)"
    );

    first.release();
    translationId.value = "KJV";

    await waitForCondition(
      () => bookNames.value.get("GEN") === "Genesis (KJV)"
    );
    second.release();
  });

  it("stops the utils, and builds fresh ones, once all have released", async () => {
    const { context, translationId, getTranslationBooks } = createContext();
    const lease = acquireSeedBibleUtils(context);
    const { bookNames } = lease.api;
    await waitForCondition(
      () => bookNames.value.get("GEN") === "Genesis (BSB)"
    );

    lease.release();
    translationId.value = "KJV";
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(getTranslationBooks).not.toHaveBeenCalledWith("KJV");
    expect(bookNames.value.get("GEN")).toBe("Genesis (BSB)");

    const next = acquireSeedBibleUtils(context);
    expect(next.api).not.toBe(lease.api);
    next.release();
  });

  it("ignores a second release from the same extension", () => {
    const { context } = createContext();
    const first = acquireSeedBibleUtils(context);
    const second = acquireSeedBibleUtils(context);

    first.release();
    first.release();

    expect(acquireSeedBibleUtils(context).api).toBe(second.api);
  });

  it("keeps separate apps' utils apart", () => {
    const a = acquireSeedBibleUtils(createContext().context);
    const b = acquireSeedBibleUtils(createContext().context);

    expect(b.api).not.toBe(a.api);

    a.release();
    b.release();
  });
});
