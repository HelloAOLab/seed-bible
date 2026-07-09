import { render, type ComponentChildren } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { DiscoverPane } from "@packages/seed-bible/seed-bible/components/DiscoverPane/DiscoverPane";
import { createModalManager } from "@packages/seed-bible/seed-bible/managers/ModalManager";
import type {
  Playlist,
  PlaylistManager,
} from "@packages/seed-bible/seed-bible/managers/PlaylistManager";
import { createPlayingState } from "@packages/seed-bible/seed-bible/managers/PlaylistManager";
import type {
  TabsManager,
  ReaderTab,
} from "@packages/seed-bible/seed-bible/managers/TabsManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const actual = await vi.importActual<
    typeof import("@packages/seed-bible/seed-bible/i18n/I18nManager")
  >("@packages/seed-bible/seed-bible/i18n/I18nManager");
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string, options?: Record<string, unknown>) => {
        let str = (options?.defaultValue as string | undefined) ?? key;
        for (const [optionKey, value] of Object.entries(options ?? {})) {
          if (optionKey === "defaultValue") continue;
          str = str.replaceAll(`{{${optionKey}}}`, String(value));
        }
        return str;
      },
      language: "en",
    }),
  };
});

vi.mock(
  "@packages/seed-bible/seed-bible/components/ContextMenu/ContextMenu",
  () => ({
    closeContextMenus: vi.fn(),
    ContextMenuItem: ({
      children,
      onClick,
      className,
    }: {
      children: ComponentChildren;
      onClick?: (event: MouseEvent) => void;
      className?: string;
    }) => (
      <button
        className={className}
        onClick={(event) => onClick?.(event as unknown as MouseEvent)}
        role="menuitem"
      >
        {children}
      </button>
    ),
    ContextMenuWithButton: ({
      children,
      buttonClassName,
      onClick,
    }: {
      children: ComponentChildren;
      buttonClassName?: string;
      onClick?: (event: MouseEvent) => void;
    }) => (
      <div className="stub-context-menu-anchor">
        <button
          className={buttonClassName}
          onClick={(event) => onClick?.(event as unknown as MouseEvent)}
        >
          menu
        </button>
        <div>{children}</div>
      </div>
    ),
  })
);

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

interface MockPlaylistsResult {
  playlists: PlaylistManager;
  createNewPlaylist: ReturnType<typeof vi.fn>;
  startPlaying: ReturnType<typeof vi.fn>;
  editPlaylist: ReturnType<typeof vi.fn>;
  deletePlaylist: ReturnType<typeof vi.fn>;
  getPlaylistUrl: ReturnType<typeof vi.fn>;
}

function createMockPlaylists(
  overrides: {
    view?: "discover" | "create_playlist" | "play_playlist" | null;
    userPlaylists?: Playlist[];
    editingPlaylist?: Playlist | null;
    playing?: ReturnType<typeof createPlayingState> | null;
    deletePlaylistImpl?: () => Promise<void>;
  } = {}
): MockPlaylistsResult {
  const createNewPlaylist = vi.fn();
  const startPlaying = vi.fn();
  const editPlaylist = vi.fn();
  const deletePlaylist = vi.fn(
    overrides.deletePlaylistImpl ?? (() => Promise.resolve())
  );
  const getPlaylistUrl = vi.fn(
    (playlist: Playlist) => `https://example.com/?playlist=${playlist.id}`
  );

  const playlists = {
    view: signal(overrides.view ?? "discover"),
    userPlaylists: signal(overrides.userPlaylists ?? []),
    editingPlaylist: signal(overrides.editingPlaylist ?? null),
    playing: signal(overrides.playing ?? null),
    createNewPlaylist,
    startPlaying,
    editPlaylist,
    deletePlaylist,
    getPlaylistUrl,
    cancelEditingPlaylist: vi.fn(),
    saveEditingPlaylist: vi.fn().mockResolvedValue(undefined),
    addEditingPlaylistItem: vi.fn(),
    updateEditingPlaylistItem: vi.fn(),
    removeEditingPlaylistItem: vi.fn(),
    goBackFromPlayingView: vi.fn(),
  } as unknown as PlaylistManager;

  return {
    playlists,
    createNewPlaylist,
    startPlaying,
    editPlaylist,
    deletePlaylist,
    getPlaylistUrl,
  };
}

function createMockTabs(tab: ReaderTab | null = null): TabsManager {
  return {
    tabs: signal(tab ? [tab] : []),
    selectedTabId: signal(tab?.id ?? null),
  } as unknown as TabsManager;
}

function createMockTab(
  overrides: {
    chapterData?: {
      book: { name: string };
      chapter: { number: number };
    } | null;
    discoveredCrossReferences?: unknown[];
    discoveredStudyNotes?: unknown[];
    discoveredContent?: unknown[];
  } = {}
): ReaderTab {
  return {
    id: "tab-1",
    readingState: {
      chapterData: signal(overrides.chapterData ?? null),
      discoveredCrossReferences: signal(
        overrides.discoveredCrossReferences ?? []
      ),
      discoveredStudyNotes: signal(overrides.discoveredStudyNotes ?? []),
      discoveredContent: signal(overrides.discoveredContent ?? []),
      translationBooks: signal(null),
    },
  } as unknown as ReaderTab;
}

function createMockState(isMobile = false): SeedBibleState {
  return {
    app: {
      isMobile: signal(isMobile),
      toast: vi.fn(),
    },
  } as unknown as SeedBibleState;
}

describe("DiscoverPane", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn() },
      configurable: true,
    });
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    vi.restoreAllMocks();
  });

  it("shows the generic title when there is no current chapter", () => {
    const { playlists } = createMockPlaylists();
    const tabs = createMockTabs();
    const modals = createModalManager();
    const state = createMockState();

    act(() => {
      render(
        <DiscoverPane
          tabs={tabs}
          playlists={playlists}
          modals={modals}
          state={state}
          toast={state.app.toast}
        />,
        container
      );
    });

    expect(container.querySelector(".sb-discover-title")?.textContent).toBe(
      "Discover"
    );
  });

  it("shows the book/chapter title when a tab has chapter data", () => {
    const { playlists } = createMockPlaylists();
    const tab = createMockTab({
      chapterData: { book: { name: "Genesis" }, chapter: { number: 1 } },
    });
    const tabs = createMockTabs(tab);
    const modals = createModalManager();
    const state = createMockState();

    act(() => {
      render(
        <DiscoverPane
          tabs={tabs}
          playlists={playlists}
          modals={modals}
          state={state}
          toast={state.app.toast}
        />,
        container
      );
    });

    expect(container.querySelector(".sb-discover-title")?.textContent).toBe(
      "Discover Genesis 1"
    );
  });

  it("applies the mobile class only when state.app.isMobile is true", () => {
    const { playlists } = createMockPlaylists();
    const tabs = createMockTabs();
    const modals = createModalManager();
    const state = createMockState(true);

    act(() => {
      render(
        <DiscoverPane
          tabs={tabs}
          playlists={playlists}
          modals={modals}
          state={state}
          toast={state.app.toast}
        />,
        container
      );
    });

    expect(
      container
        .querySelector(".sb-discover-panel")
        ?.classList.contains("sb-discover-panel--mobile")
    ).toBe(true);
  });

  it("clicking + Create calls createNewPlaylist", () => {
    const { playlists, createNewPlaylist } = createMockPlaylists();
    const tabs = createMockTabs();
    const modals = createModalManager();
    const state = createMockState();

    act(() => {
      render(
        <DiscoverPane
          tabs={tabs}
          playlists={playlists}
          modals={modals}
          state={state}
          toast={state.app.toast}
        />,
        container
      );
    });

    const createButton = container.querySelector(
      ".sb-discover-create"
    ) as HTMLButtonElement;
    act(() => {
      createButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(createNewPlaylist).toHaveBeenCalledTimes(1);
  });

  it("shows a close button only when onClose is provided, and calls it when clicked", () => {
    const { playlists } = createMockPlaylists();
    const tabs = createMockTabs();
    const modals = createModalManager();
    const state = createMockState();

    act(() => {
      render(
        <DiscoverPane
          tabs={tabs}
          playlists={playlists}
          modals={modals}
          state={state}
          toast={state.app.toast}
        />,
        container
      );
    });
    expect(container.querySelector(".sb-discover-close")).toBeNull();

    const onClose = vi.fn();
    act(() => {
      render(
        <DiscoverPane
          tabs={tabs}
          playlists={playlists}
          modals={modals}
          state={state}
          toast={state.app.toast}
          onClose={onClose}
        />,
        container
      );
    });
    const closeButton = container.querySelector(
      ".sb-discover-close"
    ) as HTMLButtonElement;
    expect(closeButton).not.toBeNull();

    act(() => {
      closeButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows the empty-playlists message when there are no playlists", () => {
    const { playlists } = createMockPlaylists({ userPlaylists: [] });
    const tabs = createMockTabs();
    const modals = createModalManager();
    const state = createMockState();

    act(() => {
      render(
        <DiscoverPane
          tabs={tabs}
          playlists={playlists}
          modals={modals}
          state={state}
          toast={state.app.toast}
        />,
        container
      );
    });

    expect(
      container.querySelector(".sb-playlist-item .sb-discover-empty")
    ).toBeNull();
    const emptyStates = Array.from(
      container.querySelectorAll(".sb-discover-empty")
    ).map((el) => el.textContent);
    expect(emptyStates).toContain("You haven't created any playlists yet.");
  });

  it("lists playlists with title/description, falling back to 'Untitled playlist'", () => {
    const { playlists } = createMockPlaylists({
      userPlaylists: [
        createPlaylist({
          id: "p1",
          title: "Evening Reading",
          description: "A short evening study",
        }),
        createPlaylist({ id: "p2", title: null }),
      ],
    });
    const tabs = createMockTabs();
    const modals = createModalManager();
    const state = createMockState();

    act(() => {
      render(
        <DiscoverPane
          tabs={tabs}
          playlists={playlists}
          modals={modals}
          state={state}
          toast={state.app.toast}
        />,
        container
      );
    });

    const items = container.querySelectorAll(".sb-playlist-item");
    expect(items).toHaveLength(2);
    expect(
      items[0]?.querySelector(".sb-discover-item-title")?.textContent
    ).toBe("Evening Reading");
    expect(
      items[0]?.querySelector(".sb-discover-item-description")?.textContent
    ).toBe("A short evening study");
    expect(
      items[1]?.querySelector(".sb-discover-item-title")?.textContent
    ).toBe("Untitled playlist");
  });

  it("clicking a playlist row or its play button starts playing exactly once", () => {
    const playlist = createPlaylist();
    const { playlists, startPlaying } = createMockPlaylists({
      userPlaylists: [playlist],
    });
    const tabs = createMockTabs();
    const modals = createModalManager();
    const state = createMockState();

    act(() => {
      render(
        <DiscoverPane
          tabs={tabs}
          playlists={playlists}
          modals={modals}
          state={state}
          toast={state.app.toast}
        />,
        container
      );
    });

    const playButton = container.querySelector(
      ".sb-discover-item-play"
    ) as HTMLButtonElement;
    act(() => {
      playButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(startPlaying).toHaveBeenCalledTimes(1);
    expect(startPlaying).toHaveBeenCalledWith(playlist);

    const row = container.querySelector(".sb-playlist-item") as HTMLLIElement;
    act(() => {
      row.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(startPlaying).toHaveBeenCalledTimes(2);
  });

  it("the Share menu item copies the playlist URL and shows a toast", () => {
    const playlist = createPlaylist({ id: "p1" });
    const { playlists, getPlaylistUrl } = createMockPlaylists({
      userPlaylists: [playlist],
    });
    const tabs = createMockTabs();
    const modals = createModalManager();
    const state = createMockState();

    act(() => {
      render(
        <DiscoverPane
          tabs={tabs}
          playlists={playlists}
          modals={modals}
          state={state}
          toast={state.app.toast}
        />,
        container
      );
    });

    const shareItem = Array.from(
      container.querySelectorAll('[role="menuitem"]')
    ).find((el) => el.textContent?.includes("Share playlist")) as
      | HTMLButtonElement
      | undefined;
    expect(shareItem).not.toBeUndefined();

    act(() => {
      shareItem?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(getPlaylistUrl).toHaveBeenCalledWith(playlist);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      "https://example.com/?playlist=p1"
    );
    expect(state.app.toast).toHaveBeenCalledWith(
      "Playlist URL copied to clipboard"
    );
  });

  it("the Edit menu item calls editPlaylist", () => {
    const playlist = createPlaylist();
    const { playlists, editPlaylist } = createMockPlaylists({
      userPlaylists: [playlist],
    });
    const tabs = createMockTabs();
    const modals = createModalManager();
    const state = createMockState();

    act(() => {
      render(
        <DiscoverPane
          tabs={tabs}
          playlists={playlists}
          modals={modals}
          state={state}
          toast={state.app.toast}
        />,
        container
      );
    });

    const editItem = Array.from(
      container.querySelectorAll('[role="menuitem"]')
    ).find((el) => el.textContent?.includes("Edit playlist")) as
      | HTMLButtonElement
      | undefined;

    act(() => {
      editItem?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(editPlaylist).toHaveBeenCalledWith(playlist);
  });

  it("the Delete menu item opens a confirm modal; confirming deletes and closes it", async () => {
    const playlist = createPlaylist({ id: "p1", title: "Doomed" });
    const { playlists, deletePlaylist } = createMockPlaylists({
      userPlaylists: [playlist],
    });
    const tabs = createMockTabs();
    const modals = createModalManager();
    const state = createMockState();

    act(() => {
      render(
        <DiscoverPane
          tabs={tabs}
          playlists={playlists}
          modals={modals}
          state={state}
          toast={state.app.toast}
        />,
        container
      );
    });

    const deleteItem = Array.from(
      container.querySelectorAll('[role="menuitem"]')
    ).find((el) => el.textContent?.includes("Delete")) as
      | HTMLButtonElement
      | undefined;

    act(() => {
      deleteItem?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const modal = modals.modals.value.find(
      (m) => m.id === "delete-playlist-confirm-p1"
    );
    expect(modal).not.toBeUndefined();

    const modalContainer = document.createElement("div");
    document.body.appendChild(modalContainer);
    act(() => {
      render(
        modal!.content({
          t: (key, options) => (options?.defaultValue as string) ?? key,
        }),
        modalContainer
      );
    });
    expect(modalContainer.textContent).toContain(
      'Delete "Doomed"? This can\'t be undone.'
    );

    const confirmButton = modalContainer.querySelector(
      ".sb-session-settings-end"
    ) as HTMLButtonElement;

    await act(async () => {
      confirmButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(deletePlaylist).toHaveBeenCalledWith(playlist);
    expect(
      modals.modals.value.some((m) => m.id === "delete-playlist-confirm-p1")
    ).toBe(false);

    render(null, modalContainer);
    modalContainer.remove();
  });

  it("shows a toast but still closes the modal when deleting fails", async () => {
    const playlist = createPlaylist({ id: "p1" });
    const { playlists } = createMockPlaylists({
      userPlaylists: [playlist],
      deletePlaylistImpl: () => Promise.reject(new Error("nope")),
    });
    const tabs = createMockTabs();
    const modals = createModalManager();
    const state = createMockState();

    act(() => {
      render(
        <DiscoverPane
          tabs={tabs}
          playlists={playlists}
          modals={modals}
          state={state}
          toast={state.app.toast}
        />,
        container
      );
    });

    const deleteItem = Array.from(
      container.querySelectorAll('[role="menuitem"]')
    ).find((el) => el.textContent?.includes("Delete")) as
      | HTMLButtonElement
      | undefined;
    act(() => {
      deleteItem?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const modal = modals.modals.value.find(
      (m) => m.id === "delete-playlist-confirm-p1"
    )!;
    const modalContainer = document.createElement("div");
    document.body.appendChild(modalContainer);
    act(() => {
      render(modal.content({ t: (key) => key }), modalContainer);
    });

    const confirmButton = modalContainer.querySelector(
      ".sb-session-settings-end"
    ) as HTMLButtonElement;

    await act(async () => {
      confirmButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(state.app.toast).toHaveBeenCalledWith(
      "Couldn't delete the playlist."
    );
    expect(
      modals.modals.value.some((m) => m.id === "delete-playlist-confirm-p1")
    ).toBe(false);

    render(null, modalContainer);
    modalContainer.remove();
  });

  it("shows the select-a-tab hint for cross references, study notes, and content when no tab is selected", () => {
    const { playlists } = createMockPlaylists();
    const tabs = createMockTabs();
    const modals = createModalManager();
    const state = createMockState();

    act(() => {
      render(
        <DiscoverPane
          tabs={tabs}
          playlists={playlists}
          modals={modals}
          state={state}
          toast={state.app.toast}
        />,
        container
      );
    });

    const hints = Array.from(
      container.querySelectorAll(".sb-discover-empty")
    ).filter(
      (el) => el.textContent === "Select a tab to discover related material."
    );
    expect(hints).toHaveLength(3);
  });

  it("hides cross reference / study note / content sections entirely when there are no results", () => {
    const { playlists } = createMockPlaylists();
    const tab = createMockTab({
      chapterData: { book: { name: "Genesis" }, chapter: { number: 1 } },
    });
    const tabs = createMockTabs(tab);
    const modals = createModalManager();
    const state = createMockState();

    act(() => {
      render(
        <DiscoverPane
          tabs={tabs}
          playlists={playlists}
          modals={modals}
          state={state}
          toast={state.app.toast}
        />,
        container
      );
    });

    const sectionTitles = Array.from(
      container.querySelectorAll(".sb-discover-section-title")
    ).map((el) => el.textContent);
    expect(sectionTitles).not.toContain("Cross references");
    expect(sectionTitles).not.toContain("Study notes");
    expect(sectionTitles).not.toContain("Content");
  });

  it("renders cross references, study notes, and content results for the selected tab", () => {
    const { playlists } = createMockPlaylists();
    const tab = createMockTab({
      chapterData: { book: { name: "Genesis" }, chapter: { number: 1 } },
      discoveredCrossReferences: [
        {
          providerId: "p1",
          results: [
            {
              type: "cross-reference",
              reference: { chapter: 1, bookData: { name: "Genesis" } },
              crossReference: {
                chapter: 5,
                verse: 3,
                bookData: { commonName: "Exodus", name: "Exodus" },
              },
            },
          ],
        },
      ],
      discoveredStudyNotes: [
        {
          providerId: "p1",
          results: [
            {
              type: "study-note",
              reference: { chapter: 1, bookData: { name: "Genesis" } },
              content: "A helpful note.",
            },
          ],
        },
      ],
      discoveredContent: [
        {
          providerId: "p1",
          results: [
            {
              type: "content",
              title: "Background",
              description: "Some context",
              content: "The full article.",
            },
          ],
        },
      ],
    });
    const tabs = createMockTabs(tab);
    const modals = createModalManager();
    const state = createMockState();

    act(() => {
      render(
        <DiscoverPane
          tabs={tabs}
          playlists={playlists}
          modals={modals}
          state={state}
          toast={state.app.toast}
        />,
        container
      );
    });

    const sectionTitles = Array.from(
      container.querySelectorAll(".sb-discover-section-title")
    ).map((el) => el.textContent);
    expect(sectionTitles).toContain("Cross references");
    expect(sectionTitles).toContain("Study notes");
    expect(sectionTitles).toContain("Content");

    expect(container.textContent).toContain("Exodus 5:3");
    expect(container.textContent).toContain("A helpful note.");
    expect(container.textContent).toContain("Background");
    expect(container.textContent).toContain("Some context");
    expect(container.textContent).toContain("The full article.");
  });

  it("renders CreatePlaylistForm when view is create_playlist", () => {
    const { playlists } = createMockPlaylists({
      view: "create_playlist",
      editingPlaylist: createPlaylist(),
    });
    const tabs = createMockTabs();
    const modals = createModalManager();
    const state = createMockState();

    act(() => {
      render(
        <DiscoverPane
          tabs={tabs}
          playlists={playlists}
          modals={modals}
          state={state}
          toast={state.app.toast}
        />,
        container
      );
    });

    expect(container.querySelector(".sb-playlist-input")).not.toBeNull();
    expect(container.querySelector(".sb-discover-create")).toBeNull();
  });

  it("renders PlayPlaylistView when view is play_playlist", () => {
    const playlist = createPlaylist();
    const { playlists } = createMockPlaylists({
      view: "play_playlist",
      playing: createPlayingState([playlist]),
    });
    const tabs = createMockTabs();
    const modals = createModalManager();
    const state = createMockState();

    act(() => {
      render(
        <DiscoverPane
          tabs={tabs}
          playlists={playlists}
          modals={modals}
          state={state}
          toast={state.app.toast}
        />,
        container
      );
    });

    expect(container.querySelector(".sb-play-playlist")).not.toBeNull();
    expect(container.querySelector(".sb-discover-create")).toBeNull();
  });
});
