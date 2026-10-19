import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import {
  PlayPlaylistView,
  queueSceneHeadings,
} from "@packages/seed-bible/seed-bible/components/PlayPlaylistView/PlayPlaylistView";
import {
  createPlayingState,
  type Playlist,
  type PlaylistItemData,
  type PlaylistManager,
} from "@packages/seed-bible/seed-bible/managers/PlaylistManager";
import type {
  TabsManager,
  ReaderTab,
} from "@packages/seed-bible/seed-bible/managers/TabsManager";
import type { TranslationBook } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import type { ModalManager } from "@packages/seed-bible/seed-bible/managers/ModalManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager();
});

function createPlaylist(overrides: Partial<Playlist> = {}): Playlist {
  return {
    id: "playlist-1",
    recordName: "user-1",
    authorUserId: "user-1",
    title: "My Playlist",
    description: null,
    items: [],
    createdAtMs: 1,
    updatedAtMs: 1,
    ...overrides,
  };
}

function verseItem(
  overrides: Partial<PlaylistItemData & { type: "bible-verse" }> = {}
): PlaylistItemData {
  return {
    type: "bible-verse",
    ref: { bookId: "GEN", chapter: 1, verse: 1 },
    ...overrides,
  } as PlaylistItemData;
}

function createMockPlaylists(
  playing: ReturnType<typeof createPlayingState> | null,
  authorName: string | null = null
): {
  playlists: PlaylistManager;
  goBackFromPlayingView: ReturnType<typeof vi.fn>;
} {
  const goBackFromPlayingView = vi.fn();
  return {
    playlists: {
      playing: signal(playing),
      playingAuthorName: signal(authorName),
      goBackFromPlayingView,
    } as unknown as PlaylistManager,
    goBackFromPlayingView,
  };
}

function book(id: string, name: string): TranslationBook {
  return { id, name, commonName: name } as TranslationBook;
}

function createMockTabs(tab: ReaderTab | null = null): TabsManager {
  return {
    tabs: signal(tab ? [tab] : []),
    selectedTabId: signal(tab?.id ?? null),
  } as unknown as TabsManager;
}

function createMockTab(books: TranslationBook[] = []): ReaderTab {
  return {
    id: "tab-1",
    readingState: {
      translationBooks: signal(
        books.length ? { translation: {}, books } : null
      ),
    },
  } as unknown as ReaderTab;
}

const modals = {} as ModalManager;
const state = {} as SeedBibleState;

describe("PlayPlaylistView", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it("renders nothing when nothing is playing", () => {
    const { playlists } = createMockPlaylists(null);
    const tabs = createMockTabs();

    act(() => {
      render(
        <PlayPlaylistView
          playlists={playlists}
          tabs={tabs}
          modals={modals}
          state={state}
        />,
        container
      );
    });

    expect(container.querySelector(".sb-play-playlist")).toBeNull();
  });

  // The playlist title and back button now live in the pane header
  // (`DiscoverPaneTitle`), covered by the DiscoverPane test suite.

  it("renders one queue item per item and marks the current one", () => {
    const playlist = createPlaylist({
      items: [
        verseItem({ ref: { bookId: "GEN", chapter: 1 } }),
        verseItem({ ref: { bookId: "GEN", chapter: 2 } }),
      ],
    });
    const playing = createPlayingState([playlist]);
    const { playlists } = createMockPlaylists(playing);
    const tabs = createMockTabs();

    act(() => {
      render(
        <PlayPlaylistView
          playlists={playlists}
          tabs={tabs}
          modals={modals}
          state={state}
        />,
        container
      );
    });

    const items = Array.from(
      container.querySelectorAll(".sb-play-playlist-item")
    );
    expect(items).toHaveLength(2);
    expect(items[0]?.classList.contains("sb-play-playlist-item--current")).toBe(
      true
    );
    expect(items[1]?.classList.contains("sb-play-playlist-item--current")).toBe(
      false
    );
    expect(
      items[0]
        ?.querySelector(".sb-play-playlist-item-button")
        ?.getAttribute("aria-current")
    ).toBe("true");
  });

  it("shows a cover banner when the playing playlist has a hero image", () => {
    const playlist = createPlaylist({
      heroImageUrl: "https://example.com/cover.jpg",
      items: [verseItem()],
    });
    const playing = createPlayingState([playlist]);
    const { playlists } = createMockPlaylists(playing);
    const tabs = createMockTabs();

    act(() => {
      render(
        <PlayPlaylistView
          playlists={playlists}
          tabs={tabs}
          modals={modals}
          state={state}
        />,
        container
      );
    });

    const banner = container.querySelector(
      ".sb-hero-banner img"
    ) as HTMLImageElement;
    expect(banner).not.toBeNull();
    expect(banner.src).toBe("https://example.com/cover.jpg");
    expect(banner.alt).toBe("My Playlist");
    expect(container.querySelector(".sb-hero-banner--empty")).toBeNull();
  });

  it("leaves the author and description to the pane header, and sums the queue's length", () => {
    const playlist = createPlaylist({
      description: "Verses about the love of Jesus.",
      items: [
        verseItem({
          ref: { bookId: "GEN", chapter: 16, verse: 7, endVerse: 13 },
        }),
        { type: "html", html: "<p>Think.</p>" },
      ],
    });
    const { playlists } = createMockPlaylists(
      createPlayingState([playlist]),
      "Ruth"
    );

    act(() => {
      render(
        <PlayPlaylistView
          playlists={playlists}
          tabs={createMockTabs()}
          modals={modals}
          state={state}
        />,
        container
      );
    });

    expect(container.textContent).not.toContain("Ruth");
    expect(container.textContent).not.toContain("Verses about the love");
    expect(container.querySelector(".sb-play-queue-title")?.textContent).toBe(
      "Queue · 2 steps · ~3 min"
    );
  });

  it("hides the cover when the playlist has no image", () => {
    const playlist = createPlaylist({ items: [verseItem()] });
    const playing = createPlayingState([playlist]);
    const { playlists } = createMockPlaylists(playing);
    const tabs = createMockTabs();

    act(() => {
      render(
        <PlayPlaylistView
          playlists={playlists}
          tabs={tabs}
          modals={modals}
          state={state}
        />,
        container
      );
    });

    expect(container.querySelector(".sb-hero-banner")).toBeNull();
    expect(container.querySelector(".sb-hero-banner--empty")).toBeNull();
    expect(container.textContent).not.toContain("No image");
  });

  it("resolves bible-verse item labels using the selected tab's translation books", () => {
    const playlist = createPlaylist({
      items: [verseItem({ ref: { bookId: "GEN", chapter: 1, verse: 1 } })],
    });
    const playing = createPlayingState([playlist]);
    const { playlists } = createMockPlaylists(playing);
    const tab = createMockTab([book("GEN", "Genesis")]);
    const tabs = createMockTabs(tab);

    act(() => {
      render(
        <PlayPlaylistView
          playlists={playlists}
          tabs={tabs}
          modals={modals}
          state={state}
        />,
        container
      );
    });

    expect(
      container.querySelector(
        ".sb-play-playlist-item-button .sb-discover-item-title"
      )?.textContent
    ).toBe("Genesis 1:1");
  });

  it("clicking a queue item jumps playback to that item", () => {
    const playlist = createPlaylist({
      items: [
        verseItem({ ref: { bookId: "GEN", chapter: 1 } }),
        verseItem({ ref: { bookId: "GEN", chapter: 2 } }),
        verseItem({ ref: { bookId: "GEN", chapter: 3 } }),
      ],
    });
    const playing = createPlayingState([playlist]);
    const { playlists } = createMockPlaylists(playing);
    const tabs = createMockTabs();

    act(() => {
      render(
        <PlayPlaylistView
          playlists={playlists}
          tabs={tabs}
          modals={modals}
          state={state}
        />,
        container
      );
    });

    const buttons = container.querySelectorAll(".sb-play-playlist-item-button");
    act(() => {
      buttons[2]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(playing.currentIndex.value).toBe(2);
  });

  it("numbers the queue and says what each step is beneath its title", () => {
    const playlist = createPlaylist({
      items: [
        verseItem({ ref: { bookId: "GEN", chapter: 1 } }),
        { type: "link", url: "https://example.com" },
        { type: "html", html: "<p>hi</p>" },
      ],
    });
    const playing = createPlayingState([playlist]);
    const { playlists } = createMockPlaylists(playing);
    const tabs = createMockTabs();

    act(() => {
      render(
        <PlayPlaylistView
          playlists={playlists}
          tabs={tabs}
          modals={modals}
          state={state}
        />,
        container
      );
    });

    const numbers = Array.from(
      container.querySelectorAll(".sb-play-playlist-item-number")
    ).map((el) => el.textContent);
    expect(numbers).toEqual(["1", "2", "3"]);
    const subtitles = Array.from(
      container.querySelectorAll(".sb-play-playlist-item-subtitle")
    ).map((el) => el.textContent);
    expect(subtitles).toEqual([
      "Scripture · 4 min",
      "Link · 2 min",
      "Note · 1 min",
    ]);
  });

  describe("progress and the current step", () => {
    function renderPlaying(items: PlaylistItemData[], step = 0) {
      const playing = createPlayingState([createPlaylist({ items })]);
      void playing.jumpTo(step);
      const { playlists } = createMockPlaylists(playing);
      const tab = createMockTab([book("GEN", "Genesis")]);
      act(() => {
        render(
          <PlayPlaylistView
            playlists={playlists}
            tabs={createMockTabs(tab)}
            modals={modals}
            state={state}
          />,
          container
        );
      });
      return playing;
    }
    const segments = () =>
      Array.from(container.querySelectorAll(".sb-play-progress-segment")).map(
        (el) => el.classList.contains("sb-play-progress-segment--reached")
      );

    it("fills one progress segment per step reached and says which step this is", () => {
      renderPlaying(
        [
          verseItem({ ref: { bookId: "GEN", chapter: 1 } }),
          { type: "html", html: "<p>Read slowly</p>", title: "A note" },
          { type: "link", url: "https://example.com" },
        ],
        1
      );

      expect(segments()).toEqual([true, true, false]);
      expect(
        container
          .querySelector(".sb-play-progress")
          ?.getAttribute("aria-valuetext")
      ).toBe("Step 2 of 3");
      expect(
        container.querySelector(".sb-play-current-eyebrow")?.textContent
      ).toContain("Note · 2 of 3");
      expect(
        container.querySelector(".sb-play-current-title")?.textContent
      ).toBe("A note");
      expect(
        container.querySelector(".sb-play-current-detail")?.textContent
      ).toBe("Note · Read slowly");
    });

    it("ticks off the steps already behind the current one", () => {
      renderPlaying(
        [
          verseItem({ ref: { bookId: "GEN", chapter: 1 } }),
          verseItem({ ref: { bookId: "GEN", chapter: 2 } }),
          verseItem({ ref: { bookId: "GEN", chapter: 3 } }),
        ],
        1
      );

      const rows = Array.from(
        container.querySelectorAll(".sb-play-playlist-item")
      );
      expect(
        rows.map((row) => row.classList.contains("sb-play-playlist-item--done"))
      ).toEqual([true, false, false]);
      expect(
        rows[0]?.querySelector(".sb-play-playlist-item-number")?.textContent
      ).toBe("check");
      expect(
        rows[1]?.querySelector(".sb-play-playlist-item-number")?.textContent
      ).toBe("2");
    });

    it("scripture steps show the reference as the title with no detail line, and the last step offers Finish", () => {
      renderPlaying([verseItem({ ref: { bookId: "GEN", chapter: 1 } })]);

      expect(
        container.querySelector(".sb-play-current-eyebrow")?.textContent
      ).toContain("Scripture · 1 of 1");
      expect(
        container.querySelector(".sb-play-current-title")?.textContent
      ).toBe("Genesis 1");
      expect(container.querySelector(".sb-play-current-detail")).toBeNull();
      expect(
        container.querySelector(".sb-playlist-item-nav-next")?.textContent
      ).toContain("Finish");
    });

    it("Next step in the card moves playback on", async () => {
      const playing = renderPlaying([
        verseItem({ ref: { bookId: "GEN", chapter: 1 } }),
        verseItem({ ref: { bookId: "GEN", chapter: 2 } }),
      ]);

      await act(async () => {
        container
          .querySelector<HTMLButtonElement>(
            ".sb-play-current .sb-playlist-item-nav-next"
          )
          ?.click();
        await Promise.resolve();
      });

      expect(playing.currentIndex.value).toBe(1);
      expect(segments()).toEqual([true, true]);
    });
  });

  describe("drag to reorder", () => {
    let offsetHeightSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      offsetHeightSpy = vi
        .spyOn(HTMLLIElement.prototype, "offsetHeight", "get")
        .mockReturnValue(40);
    });

    afterEach(() => {
      offsetHeightSpy.mockRestore();
    });

    it("shows a drag handle for each queue item", () => {
      const playlist = createPlaylist({
        items: [
          verseItem({ ref: { bookId: "GEN", chapter: 1 } }),
          verseItem({ ref: { bookId: "GEN", chapter: 2 } }),
        ],
      });
      const playing = createPlayingState([playlist]);
      const { playlists } = createMockPlaylists(playing);
      const tabs = createMockTabs();

      act(() => {
        render(
          <PlayPlaylistView
            playlists={playlists}
            tabs={tabs}
            modals={modals}
            state={state}
          />,
          container
        );
      });

      const handles = container.querySelectorAll(
        ".sb-discover-item-drag-handle"
      );
      expect(handles).toHaveLength(2);
      expect(handles[0]?.getAttribute("aria-label")).toBe("Drag to reorder");
    });

    it("dragging a queue item's handle reorders the queue and keeps the current item highlighted", () => {
      const playlist = createPlaylist({
        items: [
          verseItem({ ref: { bookId: "GEN", chapter: 1 } }),
          verseItem({ ref: { bookId: "GEN", chapter: 2 } }),
          verseItem({ ref: { bookId: "GEN", chapter: 3 } }),
        ],
      });
      const playing = createPlayingState([playlist]);
      const { playlists } = createMockPlaylists(playing);
      const tabs = createMockTabs();

      act(() => {
        render(
          <PlayPlaylistView
            playlists={playlists}
            tabs={tabs}
            modals={modals}
            state={state}
          />,
          container
        );
      });

      // Currently playing item 0; drag it past item 1.
      const handles = container.querySelectorAll(
        ".sb-discover-item-drag-handle"
      );
      act(() => {
        handles[0]?.dispatchEvent(
          new PointerEvent("pointerdown", {
            bubbles: true,
            pointerId: 1,
            clientY: 0,
          })
        );
        window.dispatchEvent(
          new PointerEvent("pointermove", { pointerId: 1, clientY: 45 })
        );
      });

      expect(playing.queue.value).toEqual([
        verseItem({ ref: { bookId: "GEN", chapter: 2 } }),
        verseItem({ ref: { bookId: "GEN", chapter: 1 } }),
        verseItem({ ref: { bookId: "GEN", chapter: 3 } }),
      ]);
      expect(playing.currentIndex.value).toBe(1);

      const items = Array.from(
        container.querySelectorAll(".sb-play-playlist-item")
      );
      expect(
        items[1]?.classList.contains("sb-play-playlist-item--current")
      ).toBe(true);
    });

    it("clicking a queue item still jumps playback with the drag handle present", () => {
      const playlist = createPlaylist({
        items: [
          verseItem({ ref: { bookId: "GEN", chapter: 1 } }),
          verseItem({ ref: { bookId: "GEN", chapter: 2 } }),
        ],
      });
      const playing = createPlayingState([playlist]);
      const { playlists } = createMockPlaylists(playing);
      const tabs = createMockTabs();

      act(() => {
        render(
          <PlayPlaylistView
            playlists={playlists}
            tabs={tabs}
            modals={modals}
            state={state}
          />,
          container
        );
      });

      const buttons = container.querySelectorAll(
        ".sb-play-playlist-item-button"
      );
      act(() => {
        buttons[1]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });

      expect(playing.currentIndex.value).toBe(1);
    });
  });
});

describe("scenes and notes in the player", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it("places a scene heading over the first step of each scene, counting expanded steps", () => {
    const headings = queueSceneHeadings(
      [
        { type: "scene", title: "Intro" },
        { type: "html", html: "<p>Welcome</p>" },
        { type: "scene", title: "Scene 1 · Hagar" },
        // Expands into two steps, one per chapter.
        verseItem({ ref: { bookId: "GEN", chapter: 16, endChapter: 17 } }),
        { type: "scene", title: "Scene 2 · Moses" },
        verseItem({ ref: { bookId: "EXO", chapter: 3 } }),
      ],
      4
    );
    expect(Array.from(headings.entries())).toEqual([
      [0, "Intro"],
      [1, "Scene 1 · Hagar"],
      [3, "Scene 2 · Moses"],
    ]);
  });

  it("gives no headings once the queue no longer matches the playlist", () => {
    expect(
      queueSceneHeadings([{ type: "scene", title: "Intro" }, verseItem()], 2)
        .size
    ).toBe(0);
  });

  it("shows scene headings in the queue and never a scene as a step", () => {
    const playing = createPlayingState([
      createPlaylist({
        items: [
          { type: "scene", title: "Intro" },
          verseItem({ ref: { bookId: "GEN", chapter: 1 } }),
          { type: "scene", title: "Scene 1" },
          verseItem({ ref: { bookId: "GEN", chapter: 2 } }),
        ],
      }),
    ]);
    const { playlists } = createMockPlaylists(playing);
    act(() => {
      render(
        <PlayPlaylistView
          playlists={playlists}
          tabs={createMockTabs()}
          modals={modals}
          state={state}
        />,
        container
      );
    });

    expect(container.querySelectorAll(".sb-play-playlist-item")).toHaveLength(
      2
    );
    expect(
      Array.from(container.querySelectorAll(".sb-play-playlist-scene")).map(
        (el) => el.textContent
      )
    ).toEqual(["Intro", "Scene 1"]);
    expect(
      container
        .querySelector(".sb-play-progress")
        ?.getAttribute("aria-valuemax")
    ).toBe("2");
  });

  it("shows a passage's note in the current step card, headed by the note's title", async () => {
    const playing = createPlayingState([
      createPlaylist({
        items: [
          verseItem({
            ref: { bookId: "GEN", chapter: 16, verse: 7, endVerse: 13 },
            note: "<p>Observe who <b>speaks</b>.</p>",
            noteTitle: "Hagar and the Angel",
          }),
        ],
      }),
    ]);
    const { playlists } = createMockPlaylists(playing);
    act(() => {
      render(
        <PlayPlaylistView
          playlists={playlists}
          tabs={createMockTabs(createMockTab([book("GEN", "Genesis")]))}
          modals={modals}
          state={state}
        />,
        container
      );
    });

    expect(
      container.querySelector(".sb-play-current-eyebrow")?.textContent
    ).toContain("Note + Scripture · 1 of 1");
    expect(container.querySelector(".sb-play-current-title")?.textContent).toBe(
      "Hagar and the Angel"
    );
    // The note's HTML is sanitized before it shows.
    await vi.waitFor(() =>
      expect(
        container.querySelector(".sb-play-current-note")?.textContent
      ).toContain("Observe who speaks.")
    );
  });
});
