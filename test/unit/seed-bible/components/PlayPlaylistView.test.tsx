import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  PlayPlaylistView,
  createQueueDragEndHandler,
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

/**
 * dnd-kit's internals use `ResizeObserver`, which jsdom doesn't implement.
 * Merely mounting `DndContext`/`useSortable` needs it, regardless of whether
 * a drag is simulated, so this is installed for every test in this file.
 */
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const actual = await vi.importActual<
    typeof import("@packages/seed-bible/seed-bible/i18n/I18nManager")
  >("@packages/seed-bible/seed-bible/i18n/I18nManager");
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string, options?: { defaultValue?: string }) =>
        options?.defaultValue ?? key,
      language: "en",
    }),
  };
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
  playing: ReturnType<typeof createPlayingState> | null
): {
  playlists: PlaylistManager;
  goBackFromPlayingView: ReturnType<typeof vi.fn>;
} {
  const goBackFromPlayingView = vi.fn();
  return {
    playlists: {
      playing: signal(playing),
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
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
      MockResizeObserver;
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    delete (globalThis as unknown as { ResizeObserver?: unknown })
      .ResizeObserver;
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

  it("shows a leading icon per item type", () => {
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

    const icons = Array.from(
      container.querySelectorAll(".sb-discover-item-icon")
    ).map((el) => el.textContent);
    expect(icons).toEqual(["menu_book", "link", "notes"]);
  });

  describe("drag to reorder", () => {
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

    describe("createQueueDragEndHandler", () => {
      it("reorders the queue via reorderQueue", () => {
        const playlist = createPlaylist({
          items: [
            verseItem({ ref: { bookId: "GEN", chapter: 1 } }),
            verseItem({ ref: { bookId: "GEN", chapter: 2 } }),
            verseItem({ ref: { bookId: "GEN", chapter: 3 } }),
          ],
        });
        const playing = createPlayingState([playlist]);

        const handleDragEnd = createQueueDragEndHandler(playing.reorderQueue);
        handleDragEnd({
          active: { id: 0 },
          over: { id: 1 },
        } as unknown as DragEndEvent);

        expect(playing.queue.value).toEqual([
          verseItem({ ref: { bookId: "GEN", chapter: 2 } }),
          verseItem({ ref: { bookId: "GEN", chapter: 1 } }),
          verseItem({ ref: { bookId: "GEN", chapter: 3 } }),
        ]);
        // reorderQueue's own logic keeps the current item (index 0) selected
        // as it follows the drag — already covered directly in
        // PlaylistManager.test.ts; asserted again here as a smoke check.
        expect(playing.currentIndex.value).toBe(1);
      });

      it("does nothing when dropped back on itself", () => {
        const reorderQueue = vi.fn();
        const handleDragEnd = createQueueDragEndHandler(reorderQueue);

        handleDragEnd({
          active: { id: 1 },
          over: { id: 1 },
        } as unknown as DragEndEvent);

        expect(reorderQueue).not.toHaveBeenCalled();
      });
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
