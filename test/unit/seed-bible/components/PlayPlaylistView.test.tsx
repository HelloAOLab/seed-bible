import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { PlayPlaylistView } from "@packages/seed-bible/seed-bible/components/PlayPlaylistView/PlayPlaylistView";
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
      items[0]?.querySelector("button")?.getAttribute("aria-current")
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
    expect(
      container.querySelector(".sb-play-controls-label")?.textContent
    ).toBe("Genesis 1:1");
  });

  it("falls back to the raw book id when no translation books are loaded", () => {
    const playlist = createPlaylist({
      items: [verseItem({ ref: { bookId: "GEN", chapter: 1, verse: 1 } })],
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

    expect(
      container.querySelector(".sb-play-controls-label")?.textContent
    ).toBe("GEN 1:1");
  });

  it("shows 'Now playing' in the controls bar when the queue is empty", () => {
    const playlist = createPlaylist({ items: [] });
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

    expect(
      container.querySelector(".sb-play-controls-label")?.textContent
    ).toBe("Now playing");
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

  it("disables previous/next at the ends of the queue and enables them otherwise", () => {
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

    const [previousButton, nextButton] = Array.from(
      container.querySelectorAll<HTMLButtonElement>(".sb-play-controls-button")
    );
    expect(previousButton?.disabled).toBe(true);
    expect(nextButton?.disabled).toBe(false);

    act(() => {
      nextButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(playing.currentIndex.value).toBe(1);
    expect(previousButton?.disabled).toBe(false);
    expect(nextButton?.disabled).toBe(true);

    act(() => {
      previousButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(playing.currentIndex.value).toBe(0);
  });
});
