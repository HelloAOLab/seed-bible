import { render } from "preact";
import { act } from "preact/test-utils";
import {
  PlaylistItemInlinePreview,
  type ScriptureChapterLoader,
} from "@packages/seed-bible/seed-bible/components/PlaylistItemInlinePreview/PlaylistItemInlinePreview";
import type { TranslationBookChapter } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import type { PlaylistItemData } from "@packages/seed-bible/seed-bible/managers/PlaylistManager";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager();
});

/** A chapter whose verse N reads "c<chapter>v<N>". */
function chapterOf(
  chapter: number,
  verseCount: number
): TranslationBookChapter {
  return {
    chapter: {
      number: chapter,
      footnotes: [],
      content: [
        { type: "heading", content: ["A heading"] },
        ...Array.from({ length: verseCount }, (_, i) => ({
          type: "verse" as const,
          number: i + 1,
          content: [`c${chapter}v${i + 1}`],
        })),
      ],
    },
  } as unknown as TranslationBookChapter;
}

async function waitForCondition(check: () => boolean, timeoutMs = 1000) {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error("Timed out waiting for condition");
    }
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
}

describe("PlaylistItemInlinePreview", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  function renderPreview(
    item: PlaylistItemData,
    loadChapter?: ScriptureChapterLoader
  ) {
    act(() => {
      render(
        <PlaylistItemInlinePreview item={item} loadChapter={loadChapter} />,
        container
      );
    });
  }

  const text = () =>
    container.querySelector(".sb-item-inline-preview")?.textContent ?? "";

  it("shows only the verses in the referenced range", async () => {
    const loadChapter = vi.fn(async (_t, _b, chapter: number) =>
      chapterOf(chapter, 10)
    );
    renderPreview(
      {
        type: "bible-verse",
        ref: { bookId: "JHN", chapter: 3, verse: 2, endVerse: 4 },
      },
      loadChapter
    );

    await waitForCondition(() => text().includes("c3v2"));
    expect(text()).toContain("c3v3");
    expect(text()).toContain("c3v4");
    expect(text()).not.toContain("c3v1");
    expect(text()).not.toContain("c3v5");
    expect(text()).not.toContain("A heading");
    expect(loadChapter).toHaveBeenCalledWith(undefined, "JHN", 3);
  });

  it("shows a whole chapter when no verse is given, in the item's translation", async () => {
    const loadChapter = vi.fn(async (_t, _b, chapter: number) =>
      chapterOf(chapter, 3)
    );
    renderPreview(
      {
        type: "bible-verse",
        translationId: "KJV",
        ref: { bookId: "GEN", chapter: 1 },
      },
      loadChapter
    );

    await waitForCondition(() => text().includes("c1v3"));
    expect(text()).toContain("c1v1");
    expect(loadChapter).toHaveBeenCalledWith("KJV", "GEN", 1);
  });

  it("loads every chapter of a cross-chapter range", async () => {
    const loadChapter = vi.fn(async (_t, _b, chapter: number) =>
      chapterOf(chapter, 5)
    );
    renderPreview(
      {
        type: "bible-verse",
        ref: {
          bookId: "JHN",
          chapter: 1,
          verse: 4,
          endChapter: 3,
          endVerse: 2,
        },
      },
      loadChapter
    );

    await waitForCondition(() => text().includes("c3v2"));
    expect(text()).toContain("c1v4");
    expect(text()).toContain("c1v5");
    expect(text()).not.toContain("c1v3");
    expect(text()).toContain("c2v1");
    expect(text()).toContain("c2v5");
    expect(text()).not.toContain("c3v3");
    expect(loadChapter).toHaveBeenCalledTimes(3);
  });

  it("says the passage couldn't load when the chapter request fails", async () => {
    renderPreview(
      { type: "bible-verse", ref: { bookId: "JHN", chapter: 3 } },
      vi.fn().mockRejectedValue(new Error("offline"))
    );

    await waitForCondition(() => text().includes("Couldn't load"));
  });

  it("says the passage couldn't load when there is no loader", () => {
    renderPreview({ type: "bible-verse", ref: { bookId: "JHN", chapter: 3 } });
    expect(text()).toContain("Couldn't load");
  });

  it("shows the title and URL of a link item", () => {
    renderPreview({
      type: "link",
      title: "Sermon notes",
      url: "https://example.com/notes",
    });
    expect(text()).toContain("Sermon notes");
    const link = container.querySelector("a");
    expect(link?.getAttribute("href")).toBe("https://example.com/notes");
    expect(link?.getAttribute("target")).toBe("_blank");
  });

  it("shows the text of a text item", async () => {
    renderPreview({ type: "html", html: "<p>Pray first</p>" });
    await waitForCondition(() => text().includes("Pray first"));
  });
});
