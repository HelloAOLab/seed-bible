import { render, type ComponentChildren } from "preact";
import { act } from "preact/test-utils";
import { computed, signal } from "@preact/signals";
import {
  DiscoverPane,
  DiscoverPaneHeader,
  DiscoverPaneTitle,
} from "@packages/seed-bible/seed-bible/components/DiscoverPane/DiscoverPane";
import { createModalManager } from "@packages/seed-bible/seed-bible/managers/ModalManager";
import type {
  Playlist,
  PlaylistManager,
  PlaylistPlayHistory,
} from "@packages/seed-bible/seed-bible/managers/PlaylistManager";
import { createPlayingState } from "@packages/seed-bible/seed-bible/managers/PlaylistManager";
import type {
  Annotation,
  AnnotationsManager,
} from "@packages/seed-bible/seed-bible/managers/AnnotationsManager";
import type {
  TabsManager,
  ReaderTab,
} from "@packages/seed-bible/seed-bible/managers/TabsManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import type { Mock } from "vitest";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager();
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

vi.mock("@packages/seed-bible/seed-bible/managers/Sanitization", () => ({
  setSafeHtml: vi.fn(async (html: string, element: HTMLElement) => {
    element.innerHTML = html;
  }),
}));

vi.mock(
  "@packages/seed-bible/seed-bible/components/CreateAnnotationForm/CreateAnnotationForm",
  () => ({
    CreateAnnotationForm: ({
      annotations,
    }: {
      annotations: AnnotationsManager;
    }) => (
      <div className="stub-create-annotation-form">
        {annotations.editingAnnotation.value?.id}
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

function createAnnotation(overrides: Partial<Annotation> = {}): Annotation {
  return {
    id: "ann-1",
    bookId: "GEN",
    chapterNumber: 1,
    data: { type: "comment", html: "<p>Hello</p>" },
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
  cancelEditingPlaylist: ReturnType<typeof vi.fn>;
  goBackFromPlayingView: ReturnType<typeof vi.fn>;
  continueFromHistory: ReturnType<typeof vi.fn>;
  replayFromHistory: ReturnType<typeof vi.fn>;
  removePlayHistory: ReturnType<typeof vi.fn>;
}

function createMockPlaylists(
  overrides: {
    view?:
      | "discover"
      | "create_playlist"
      | "play_playlist"
      | "create_annotation"
      | null;
    userPlaylists?: Playlist[];
    userPlaylistHistory?: PlaylistPlayHistory[];
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
  const cancelEditingPlaylist = vi.fn();
  const goBackFromPlayingView = vi.fn();
  const continueFromHistory = vi.fn().mockResolvedValue(undefined);
  const replayFromHistory = vi.fn().mockResolvedValue(undefined);
  const removePlayHistory = vi.fn().mockResolvedValue(undefined);

  const view = signal(overrides.view ?? "discover");
  const editingPlaylist = signal(overrides.editingPlaylist ?? null);
  const playlists = {
    view,
    actualView: view,
    userPlaylists: signal(overrides.userPlaylists ?? []),
    editingPlaylist,
    userPlaylistHistory: signal(overrides.userPlaylistHistory ?? []),
    playing: signal(overrides.playing ?? null),
    createNewPlaylist,
    startPlaying,
    editPlaylist,
    deletePlaylist,
    getPlaylistUrl,
    cancelEditingPlaylist,
    continueFromHistory,
    replayFromHistory,
    removePlayHistory,
    saveEditingPlaylist: vi.fn().mockResolvedValue(undefined),
    updateEditingPlaylistMetadata: vi.fn(
      (updates: Partial<Pick<Playlist, "title" | "description">>) => {
        const current = editingPlaylist.value;
        if (!current) return;
        editingPlaylist.value = { ...current, ...updates };
      }
    ),
    addEditingPlaylistItem: vi.fn(),
    updateEditingPlaylistItem: vi.fn(),
    removeEditingPlaylistItem: vi.fn(),
    goBackFromPlayingView,
  } as unknown as PlaylistManager;

  return {
    playlists,
    createNewPlaylist,
    startPlaying,
    editPlaylist,
    deletePlaylist,
    getPlaylistUrl,
    cancelEditingPlaylist,
    goBackFromPlayingView,
    continueFromHistory,
    replayFromHistory,
    removePlayHistory,
  };
}

interface MockAnnotationsResult {
  annotations: AnnotationsManager;
  createNewAnnotation: ReturnType<typeof vi.fn>;
  editAnnotation: ReturnType<typeof vi.fn>;
  saveEditingAnnotation: ReturnType<typeof vi.fn>;
  cancelEditingAnnotation: ReturnType<typeof vi.fn>;
  deleteAnnotationAndRefresh: ReturnType<typeof vi.fn>;
}

function createMockAnnotations(
  overrides: {
    editingAnnotation?: Annotation | null;
    annotationsForChapter?: Annotation[];
    deleteAnnotationAndRefreshImpl?: () => Promise<void>;
    hasRecordOverride?: boolean;
    pendingSyncCount?: number;
  } = {}
): MockAnnotationsResult {
  const createNewAnnotation = vi.fn();
  const editAnnotation = vi.fn();
  const saveEditingAnnotation = vi.fn().mockResolvedValue(undefined);
  const cancelEditingAnnotation = vi.fn();
  const deleteAnnotationAndRefresh = vi.fn(
    overrides.deleteAnnotationAndRefreshImpl ?? (() => Promise.resolve())
  );
  const chapterAnnotations = signal<Annotation[]>(
    overrides.annotationsForChapter ?? []
  );

  const annotations = {
    editingAnnotation: signal(overrides.editingAnnotation ?? null),
    getAnnotationsForChapter: vi.fn(() => chapterAnnotations),
    createNewAnnotation,
    editAnnotation,
    saveEditingAnnotation,
    cancelEditingAnnotation,
    deleteAnnotationAndRefresh,
    hasRecordOverride: overrides.hasRecordOverride ?? false,
    // The pane shows how much is waiting to sync, so this has to be present.
    sync: {
      pendingCount: signal(overrides.pendingSyncCount ?? 0),
      pendingCountForChapter: vi.fn(() => overrides.pendingSyncCount ?? 0),
      conflicts: signal([]),
    },
  } as unknown as AnnotationsManager;

  return {
    annotations,
    createNewAnnotation,
    editAnnotation,
    saveEditingAnnotation,
    cancelEditingAnnotation,
    deleteAnnotationAndRefresh,
  };
}

type ChatProvider =
  import("@packages/seed-bible/seed-bible/managers/ChatsManager").ChatProvider;

interface MockChatsResult {
  chats: import("@packages/seed-bible/seed-bible/managers/ChatsManager").ChatsManager;
  createLocalSession: ReturnType<typeof vi.fn>;
  selectChat: ReturnType<typeof vi.fn>;
  addParticipant: ReturnType<typeof vi.fn>;
  providers: ReturnType<typeof signal<ChatProvider[]>>;
}

function createMockProvider(
  id: string,
  name = id,
  supportsToolCalling = true
): ChatProvider {
  return {
    id,
    name,
    supportsSharedChats: false,
    supportsToolCalling,
  } as unknown as ChatProvider;
}

/** A fake `ChatsManager` exposing just the surface `DiscoverPaneTitle`'s AI button uses. */
function createMockChats(
  providers: ChatProvider[] = [],
  existingChats: import("@packages/seed-bible/seed-bible/managers/ChatsManager").ChatSession[] = []
): MockChatsResult {
  const selectChat = vi.fn();
  const addParticipant = vi.fn();
  const createLocalSession = vi.fn(() => ({ id: "chat-1", addParticipant }));
  const providersSignal = signal(providers);
  const chats = {
    chats: signal(existingChats),
    createLocalSession,
    selectChat,
    providers: providersSignal,
  } as unknown as import("@packages/seed-bible/seed-bible/managers/ChatsManager").ChatsManager;
  return {
    chats,
    createLocalSession,
    selectChat,
    addParticipant,
    providers: providersSignal,
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
    bookId?: string | null;
    chapterNumber?: number;
    chapterData?: {
      book: { id?: string; name: string; commonName?: string };
      chapter: { number: number };
    } | null;
    discoveredCrossReferences?: unknown[];
    discoveredStudyNotes?: unknown[];
    discoveredContent?: unknown[];
    translationId?: string;
    selectTranslationAndChapter?: ReturnType<typeof vi.fn>;
    decorateVerses?: ReturnType<typeof vi.fn>;
  } = {}
): ReaderTab {
  return {
    id: "tab-1",
    readingState: {
      bookId: signal(overrides.bookId ?? "GEN"),
      chapterNumber: signal(overrides.chapterNumber ?? 1),
      chapterData: signal(overrides.chapterData ?? null),
      discoveredCrossReferences: signal(
        overrides.discoveredCrossReferences ?? []
      ),
      discoveredStudyNotes: signal(overrides.discoveredStudyNotes ?? []),
      discoveredContent: signal(overrides.discoveredContent ?? []),
      translationBooks: signal(null),
      translationId: signal(overrides.translationId ?? "BSB"),
      selectTranslationAndChapter:
        overrides.selectTranslationAndChapter ??
        vi.fn().mockResolvedValue(undefined),
      decorateVerses: overrides.decorateVerses ?? vi.fn(() => "decoration-1"),
    },
  } as unknown as ReaderTab;
}

function createMockState(
  isMobile = false,
  overrides: {
    getUserProfile?: ReturnType<typeof vi.fn>;
    openVerseReference?: ReturnType<typeof vi.fn>;
  } = {}
): SeedBibleState {
  return {
    app: {
      isMobile: signal(isMobile),
      toast: vi.fn(),
      openVerseReference:
        overrides.openVerseReference ?? vi.fn().mockResolvedValue(undefined),
    },
    login: {
      userId: signal(null),
      getUserProfile:
        overrides.getUserProfile ?? vi.fn().mockResolvedValue({ name: "" }),
    },
    discover: {
      scrollToVerse: signal(null),
    },
    panes: {
      closeFullscreenPanes: vi.fn(),
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

  it("DiscoverPaneHeader shows the create menu only in the discover sub-view, with Annotation and Playlist items", () => {
    const { playlists, createNewPlaylist } = createMockPlaylists({
      view: "discover",
    });
    const { annotations, createNewAnnotation } = createMockAnnotations();

    act(() => {
      render(
        <DiscoverPaneHeader playlists={playlists} annotations={annotations} />,
        container
      );
    });

    const createButton = container.querySelector(
      ".sb-discover-create"
    ) as HTMLButtonElement;
    expect(createButton).not.toBeNull();

    const annotationItem = Array.from(
      container.querySelectorAll('[role="menuitem"]')
    ).find((el) => el.textContent?.includes("Annotation")) as
      | HTMLButtonElement
      | undefined;
    const playlistItem = Array.from(
      container.querySelectorAll('[role="menuitem"]')
    ).find((el) => el.textContent?.includes("Playlist")) as
      | HTMLButtonElement
      | undefined;
    expect(annotationItem).not.toBeUndefined();
    expect(playlistItem).not.toBeUndefined();

    act(() => {
      annotationItem?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(createNewAnnotation).toHaveBeenCalledTimes(1);

    act(() => {
      playlistItem?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(createNewPlaylist).toHaveBeenCalledTimes(1);

    // Hidden while creating/playing a playlist.
    act(() => {
      playlists.view.value = "create_playlist";
    });
    expect(container.querySelector(".sb-discover-create")).toBeNull();
  });

  it("shows the empty-playlists message when there are no playlists", () => {
    const { playlists } = createMockPlaylists({ userPlaylists: [] });
    const { annotations } = createMockAnnotations();
    const tabs = createMockTabs();
    const modals = createModalManager();
    const state = createMockState();

    act(() => {
      render(
        <DiscoverPane
          tabs={tabs}
          playlists={playlists}
          annotations={annotations}
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
    const { annotations } = createMockAnnotations();
    const tabs = createMockTabs();
    const modals = createModalManager();
    const state = createMockState();

    act(() => {
      render(
        <DiscoverPane
          tabs={tabs}
          playlists={playlists}
          annotations={annotations}
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
      items[0]?.querySelector(".sb-expandable-text-body")?.textContent
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
    const { annotations } = createMockAnnotations();
    const tabs = createMockTabs();
    const modals = createModalManager();
    const state = createMockState();

    act(() => {
      render(
        <DiscoverPane
          tabs={tabs}
          playlists={playlists}
          annotations={annotations}
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
    const { annotations } = createMockAnnotations();
    const tabs = createMockTabs();
    const modals = createModalManager();
    const state = createMockState();

    act(() => {
      render(
        <DiscoverPane
          tabs={tabs}
          playlists={playlists}
          annotations={annotations}
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
    const { annotations } = createMockAnnotations();
    const tabs = createMockTabs();
    const modals = createModalManager();
    const state = createMockState();

    act(() => {
      render(
        <DiscoverPane
          tabs={tabs}
          playlists={playlists}
          annotations={annotations}
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
    const { annotations } = createMockAnnotations();
    const tabs = createMockTabs();
    const modals = createModalManager();
    const state = createMockState();

    act(() => {
      render(
        <DiscoverPane
          tabs={tabs}
          playlists={playlists}
          annotations={annotations}
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
    const { annotations } = createMockAnnotations();
    const tabs = createMockTabs();
    const modals = createModalManager();
    const state = createMockState();

    act(() => {
      render(
        <DiscoverPane
          tabs={tabs}
          playlists={playlists}
          annotations={annotations}
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

  it("hides the record-override banner when annotations are not routed through an override", () => {
    const { playlists } = createMockPlaylists();
    const { annotations } = createMockAnnotations({
      hasRecordOverride: false,
    });
    const tab = createMockTab();
    const tabs = createMockTabs(tab);
    const modals = createModalManager();
    const state = createMockState();

    act(() => {
      render(
        <DiscoverPane
          tabs={tabs}
          playlists={playlists}
          annotations={annotations}
          modals={modals}
          state={state}
          toast={state.app.toast}
        />,
        container
      );
    });

    expect(
      container.querySelector(".sb-annotation-override-banner")
    ).toBeNull();
  });

  it("shows the record-override banner when annotations are routed through a team record, with a button that reloads the URL without the query param", async () => {
    const { playlists } = createMockPlaylists();
    const { annotations } = createMockAnnotations({
      hasRecordOverride: true,
    });
    const tab = createMockTab();
    const tabs = createMockTabs(tab);
    const modals = createModalManager();
    const state = createMockState();

    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      value: new URL(
        "https://example.com/read?book=GEN&annotationRecordKey=team-record"
      ),
      writable: true,
      configurable: true,
    });

    try {
      act(() => {
        render(
          <DiscoverPane
            tabs={tabs}
            playlists={playlists}
            annotations={annotations}
            modals={modals}
            state={state}
            toast={state.app.toast}
          />,
          container
        );
      });

      // The banner is lazily loaded, so it only mounts once the dynamic
      // import resolves - which (being a real, unmocked import rather than a
      // pre-resolved one) can take more than a single tick.
      await vi.waitFor(() => {
        expect(
          container.querySelector(".sb-annotation-override-banner")
        ).not.toBeNull();
      });

      const banner = container.querySelector(".sb-annotation-override-banner");
      expect(banner?.textContent).toContain(
        "Notes are being saved and loaded from your team's account."
      );

      const button = container.querySelector(
        ".sb-annotation-override-banner-button"
      ) as HTMLButtonElement;
      expect(button?.textContent).toBe("Save to my account");

      act(() => {
        button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });

      expect(window.location.href).toBe("https://example.com/read?book=GEN");
    } finally {
      Object.defineProperty(window, "location", {
        value: originalLocation,
        writable: true,
        configurable: true,
      });
    }
  });

  it("shows the empty-annotations message when there are no annotations for the chapter", () => {
    const { playlists } = createMockPlaylists();
    const { annotations } = createMockAnnotations({
      annotationsForChapter: [],
    });
    const tab = createMockTab();
    const tabs = createMockTabs(tab);
    const modals = createModalManager();
    const state = createMockState();

    act(() => {
      render(
        <DiscoverPane
          tabs={tabs}
          playlists={playlists}
          annotations={annotations}
          modals={modals}
          state={state}
          toast={state.app.toast}
        />,
        container
      );
    });

    const emptyStates = Array.from(
      container.querySelectorAll(".sb-discover-empty")
    ).map((el) => el.textContent);
    expect(emptyStates).toContain("You have no annotations");
  });

  it("says how many changes are waiting to sync, and stays quiet when none are", () => {
    function renderWith(pendingSyncCount: number): string | null {
      const { playlists } = createMockPlaylists();
      const { annotations } = createMockAnnotations({ pendingSyncCount });
      const tab = createMockTab();
      const state = createMockState();
      const target = document.createElement("div");
      document.body.appendChild(target);

      act(() => {
        render(
          <DiscoverPane
            tabs={createMockTabs(tab)}
            playlists={playlists}
            annotations={annotations}
            modals={createModalManager()}
            state={state}
            toast={state.app.toast}
          />,
          target
        );
      });

      const text =
        target.querySelector(".sb-annotations-pending-sync")?.textContent ??
        null;
      render(null, target);
      target.remove();
      return text;
    }

    expect(renderWith(0)).toBeNull();
    expect(renderWith(1)).toBe("1 change waiting to sync");
    expect(renderWith(3)).toBe("3 changes waiting to sync");
  });

  it("lists annotations with a book/chapter/verse location label and a sanitized preview", () => {
    const { playlists } = createMockPlaylists();
    const annotation = createAnnotation({
      id: "a1",
      verseNumber: 3,
      data: { type: "comment", html: "<p>Great verse</p>" },
    });
    const { annotations } = createMockAnnotations({
      annotationsForChapter: [annotation],
    });
    const tab = createMockTab({
      chapterData: {
        book: { id: "GEN", name: "Genesis" },
        chapter: { number: 1 },
      },
    });
    const tabs = createMockTabs(tab);
    const modals = createModalManager();
    const state = createMockState();

    act(() => {
      render(
        <DiscoverPane
          tabs={tabs}
          playlists={playlists}
          annotations={annotations}
          modals={modals}
          state={state}
          toast={state.app.toast}
        />,
        container
      );
    });

    const items = container.querySelectorAll(".sb-annotation-item");
    expect(items).toHaveLength(1);
    expect(
      container.querySelector(".sb-annotation-group-header-title")?.textContent
    ).toBe("Genesis 1:3");
    expect(
      items[0]?.querySelector(".sb-annotation-item-preview")?.textContent
    ).toBe("Great verse");
  });

  it("clicking a verse-reference link inside an annotation's preview navigates to that reference, without also navigating to the annotation's own verse", async () => {
    const { playlists } = createMockPlaylists();
    const annotation = createAnnotation({
      id: "a1",
      bookId: "GEN",
      chapterNumber: 1,
      verseNumber: 3,
      data: {
        type: "comment",
        html: '<p>See <a class="sb-verse-reference-link" href="/read?book=JHN&chapter=3">John 3:16</a></p>',
      },
    });
    const { annotations } = createMockAnnotations({
      annotationsForChapter: [annotation],
    });
    const selectTranslationAndChapter = vi.fn().mockResolvedValue(undefined);
    const tab = createMockTab({
      chapterData: {
        book: { id: "GEN", name: "Genesis" },
        chapter: { number: 1 },
      },
      selectTranslationAndChapter,
    });
    const tabs = createMockTabs(tab);
    const modals = createModalManager();
    const openVerseReference = vi.fn().mockResolvedValue(undefined);
    const state = createMockState(false, { openVerseReference });

    act(() => {
      render(
        <DiscoverPane
          tabs={tabs}
          playlists={playlists}
          annotations={annotations}
          modals={modals}
          state={state}
          toast={state.app.toast}
        />,
        container
      );
    });

    const link = container.querySelector(
      ".sb-annotation-item-preview a.sb-verse-reference-link"
    ) as HTMLAnchorElement;
    expect(link).not.toBeNull();

    await act(async () => {
      link.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true })
      );
      await Promise.resolve();
    });

    expect(openVerseReference).toHaveBeenCalledWith(
      expect.objectContaining({ book: "JHN", chapter: 3, verse: 16 })
    );
    // The row's own navigate-on-click (to GEN 1:3) must not also fire.
    expect(selectTranslationAndChapter).not.toHaveBeenCalled();
  });

  it("clicking an annotation row navigates to its verse and emphasizes it, without opening it for editing", async () => {
    const { playlists } = createMockPlaylists();
    const annotation = createAnnotation({
      id: "a1",
      bookId: "GEN",
      chapterNumber: 1,
      verseNumber: 3,
      endVerseNumber: 5,
      data: { type: "comment", html: "<p>Great verse</p>" },
    });
    const { annotations, editAnnotation } = createMockAnnotations({
      annotationsForChapter: [annotation],
    });
    const selectTranslationAndChapter = vi.fn().mockResolvedValue(undefined);
    const decorateVerses = vi.fn(() => "decoration-1");
    const tab = createMockTab({
      translationId: "BSB",
      chapterData: {
        book: { id: "GEN", name: "Genesis" },
        chapter: { number: 1 },
      },
      selectTranslationAndChapter,
      decorateVerses,
    });
    const tabs = createMockTabs(tab);
    const modals = createModalManager();
    const state = createMockState();

    act(() => {
      render(
        <DiscoverPane
          tabs={tabs}
          playlists={playlists}
          annotations={annotations}
          modals={modals}
          state={state}
          toast={state.app.toast}
        />,
        container
      );
    });

    const item = container.querySelector(
      ".sb-annotation-item"
    ) as HTMLLIElement;

    await act(async () => {
      item.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(selectTranslationAndChapter).toHaveBeenCalledWith("BSB", "GEN", 1, {
      scrollToVerse: 3,
    });
    expect(decorateVerses).toHaveBeenCalledWith(
      "GEN",
      1,
      [3, 4, 5],
      expect.objectContaining({
        className: "sb-verse-decoration-diminish",
        containerClassName: "sb-chapter-decoration-diminish",
        removeAfterMs: 3000,
      })
    );
    expect(editAnnotation).not.toHaveBeenCalled();
  });

  it("clicking an annotation row with a gapped verse selection only emphasizes the annotation's actual verses", async () => {
    const { playlists } = createMockPlaylists();
    const annotation = createAnnotation({
      id: "a1",
      bookId: "GEN",
      chapterNumber: 1,
      verseNumber: 3,
      endVerseNumber: 7,
      verseNumbers: [3, 4, 5, 7],
      data: { type: "comment", html: "<p>Great verse</p>" },
    });
    const { annotations } = createMockAnnotations({
      annotationsForChapter: [annotation],
    });
    const selectTranslationAndChapter = vi.fn().mockResolvedValue(undefined);
    const decorateVerses = vi.fn(() => "decoration-1");
    const tab = createMockTab({
      translationId: "BSB",
      chapterData: {
        book: { id: "GEN", name: "Genesis" },
        chapter: { number: 1 },
      },
      selectTranslationAndChapter,
      decorateVerses,
    });
    const tabs = createMockTabs(tab);
    const modals = createModalManager();
    const state = createMockState();

    act(() => {
      render(
        <DiscoverPane
          tabs={tabs}
          playlists={playlists}
          annotations={annotations}
          modals={modals}
          state={state}
          toast={state.app.toast}
        />,
        container
      );
    });

    const item = container.querySelector(
      ".sb-annotation-item"
    ) as HTMLLIElement;

    await act(async () => {
      item.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(decorateVerses).toHaveBeenCalledWith(
      "GEN",
      1,
      [3, 4, 5, 7],
      expect.objectContaining({
        className: "sb-verse-decoration-diminish",
        containerClassName: "sb-chapter-decoration-diminish",
        removeAfterMs: 3000,
      })
    );
  });

  it("clicking an annotation row with no verse targeting does not navigate or emphasize anything", async () => {
    const { playlists } = createMockPlaylists();
    const annotation = createAnnotation({
      id: "a1",
      bookId: "GEN",
      chapterNumber: 1,
      verseNumber: null,
    });
    const { annotations } = createMockAnnotations({
      annotationsForChapter: [annotation],
    });
    const selectTranslationAndChapter = vi.fn().mockResolvedValue(undefined);
    const decorateVerses = vi.fn(() => "decoration-1");
    const tab = createMockTab({
      chapterData: {
        book: { id: "GEN", name: "Genesis" },
        chapter: { number: 1 },
      },
      selectTranslationAndChapter,
      decorateVerses,
    });
    const tabs = createMockTabs(tab);
    const modals = createModalManager();
    const state = createMockState();

    act(() => {
      render(
        <DiscoverPane
          tabs={tabs}
          playlists={playlists}
          annotations={annotations}
          modals={modals}
          state={state}
          toast={state.app.toast}
        />,
        container
      );
    });

    const item = container.querySelector(
      ".sb-annotation-item"
    ) as HTMLLIElement;

    await act(async () => {
      item.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(selectTranslationAndChapter).not.toHaveBeenCalled();
    expect(decorateVerses).not.toHaveBeenCalled();
  });

  it("shows just the book/chapter for annotations with no verse targeting", () => {
    const { playlists } = createMockPlaylists();
    const annotation = createAnnotation({ id: "a1", verseNumber: null });
    const { annotations } = createMockAnnotations({
      annotationsForChapter: [annotation],
    });
    const tab = createMockTab({
      chapterData: {
        book: { id: "GEN", name: "Genesis" },
        chapter: { number: 1 },
      },
    });
    const tabs = createMockTabs(tab);
    const modals = createModalManager();
    const state = createMockState();

    act(() => {
      render(
        <DiscoverPane
          tabs={tabs}
          playlists={playlists}
          annotations={annotations}
          modals={modals}
          state={state}
          toast={state.app.toast}
        />,
        container
      );
    });

    expect(
      container.querySelector(".sb-annotation-group-header-title")?.textContent
    ).toBe("Genesis 1");
  });

  it("shows a book/chapter/verse-range label for annotations spanning multiple verses", () => {
    const { playlists } = createMockPlaylists();
    const annotation = createAnnotation({
      id: "a1",
      verseNumber: 3,
      endVerseNumber: 5,
    });
    const { annotations } = createMockAnnotations({
      annotationsForChapter: [annotation],
    });
    const tab = createMockTab({
      chapterData: {
        book: { id: "GEN", name: "Genesis" },
        chapter: { number: 1 },
      },
    });
    const tabs = createMockTabs(tab);
    const modals = createModalManager();
    const state = createMockState();

    act(() => {
      render(
        <DiscoverPane
          tabs={tabs}
          playlists={playlists}
          annotations={annotations}
          modals={modals}
          state={state}
          toast={state.app.toast}
        />,
        container
      );
    });

    expect(
      container.querySelector(".sb-annotation-group-header-title")?.textContent
    ).toBe("Genesis 1:3-5");
  });

  it("shows a grouped range plus a non-contiguous verse for gapped selections", () => {
    const { playlists } = createMockPlaylists();
    const annotation = createAnnotation({
      id: "a1",
      verseNumber: 3,
      endVerseNumber: 7,
      verseNumbers: [3, 4, 5, 7],
    });
    const { annotations } = createMockAnnotations({
      annotationsForChapter: [annotation],
    });
    const tab = createMockTab({
      chapterData: {
        book: { id: "GEN", name: "Genesis" },
        chapter: { number: 1 },
      },
    });
    const tabs = createMockTabs(tab);
    const modals = createModalManager();
    const state = createMockState();

    act(() => {
      render(
        <DiscoverPane
          tabs={tabs}
          playlists={playlists}
          annotations={annotations}
          modals={modals}
          state={state}
          toast={state.app.toast}
        />,
        container
      );
    });

    expect(
      container.querySelector(".sb-annotation-group-header-title")?.textContent
    ).toBe("Genesis 1:3-5,7");
  });

  it("groups annotations with the same verse range together and gives each distinct range its own group, ordered by verse", () => {
    const { playlists } = createMockPlaylists();
    const wholeChapter = createAnnotation({
      id: "chapter-note",
      verseNumber: null,
    });
    const verse3a = createAnnotation({ id: "verse-3-a", verseNumber: 3 });
    const verse3b = createAnnotation({ id: "verse-3-b", verseNumber: 3 });
    const verse7 = createAnnotation({ id: "verse-7", verseNumber: 7 });
    const { annotations } = createMockAnnotations({
      annotationsForChapter: [verse7, verse3a, wholeChapter, verse3b],
    });
    const tab = createMockTab({
      chapterData: {
        book: { id: "GEN", name: "Genesis" },
        chapter: { number: 1 },
      },
    });
    const tabs = createMockTabs(tab);
    const modals = createModalManager();
    const state = createMockState();

    act(() => {
      render(
        <DiscoverPane
          tabs={tabs}
          playlists={playlists}
          annotations={annotations}
          modals={modals}
          state={state}
          toast={state.app.toast}
        />,
        container
      );
    });

    const groupTitles = Array.from(
      container.querySelectorAll(".sb-annotation-group-header-title")
    ).map((el) => el.textContent);
    expect(groupTitles).toEqual(["Genesis 1", "Genesis 1:3", "Genesis 1:7"]);

    const groups = container.querySelectorAll(".sb-annotation-group");
    expect(groups[1]?.querySelectorAll(".sb-annotation-item")).toHaveLength(2);
  });

  it("collapses and re-expands a group's annotations when its header is clicked", () => {
    const { playlists } = createMockPlaylists();
    const annotation = createAnnotation({ id: "a1", verseNumber: 3 });
    const { annotations } = createMockAnnotations({
      annotationsForChapter: [annotation],
    });
    const tab = createMockTab();
    const tabs = createMockTabs(tab);
    const modals = createModalManager();
    const state = createMockState();

    act(() => {
      render(
        <DiscoverPane
          tabs={tabs}
          playlists={playlists}
          annotations={annotations}
          modals={modals}
          state={state}
          toast={state.app.toast}
        />,
        container
      );
    });

    const header = container.querySelector(
      ".sb-annotation-group-header"
    ) as HTMLButtonElement;
    expect(header.getAttribute("aria-expanded")).toBe("true");
    expect(container.querySelectorAll(".sb-annotation-item")).toHaveLength(1);

    act(() => {
      header.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(header.getAttribute("aria-expanded")).toBe("false");
    expect(container.querySelectorAll(".sb-annotation-item")).toHaveLength(0);

    act(() => {
      header.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(header.getAttribute("aria-expanded")).toBe("true");
    expect(container.querySelectorAll(".sb-annotation-item")).toHaveLength(1);
  });

  it("shows the comment's author name resolved from their profile and a formatted updated time", async () => {
    const { playlists } = createMockPlaylists();
    const annotation = createAnnotation({
      id: "a1",
      verseNumber: 3,
      data: {
        type: "comment",
        html: "<p>Hi</p>",
        userId: "user-42",
        userName: "Loading Placeholder",
        updatedAtMs: Date.UTC(2026, 0, 5, 10, 30),
      },
    });
    const { annotations } = createMockAnnotations({
      annotationsForChapter: [annotation],
    });
    const getUserProfile = vi.fn().mockResolvedValue({ name: "Jordan Rivera" });
    const tab = createMockTab();
    const tabs = createMockTabs(tab);
    const modals = createModalManager();
    const state = createMockState(false, { getUserProfile });

    act(() => {
      render(
        <DiscoverPane
          tabs={tabs}
          playlists={playlists}
          annotations={annotations}
          modals={modals}
          state={state}
          toast={state.app.toast}
        />,
        container
      );
    });

    expect(getUserProfile).toHaveBeenCalledWith("user-42");
    await vi.waitFor(() => {
      expect(
        container.querySelector(".sb-annotation-comment-author-name")
          ?.textContent
      ).toBe("Jordan Rivera");
    });
    const expectedUpdated = new Intl.DateTimeFormat("en", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(Date.UTC(2026, 0, 5, 10, 30)));
    expect(
      container.querySelector(".sb-annotation-comment-updated")?.textContent
    ).toBe(`| ${expectedUpdated}`);
  });

  it("shows the comment's avatar resolved from their profile picture, before the name", async () => {
    const { playlists } = createMockPlaylists();
    const annotation = createAnnotation({
      id: "a1",
      verseNumber: 3,
      data: {
        type: "comment",
        html: "<p>Hi</p>",
        userId: "user-99",
      },
    });
    const { annotations } = createMockAnnotations({
      annotationsForChapter: [annotation],
    });
    const getUserProfile = vi.fn().mockResolvedValue({
      name: "Jordan Rivera",
      pictureUrl: "https://example.com/jordan.png",
    });
    const tab = createMockTab();
    const tabs = createMockTabs(tab);
    const modals = createModalManager();
    const state = createMockState(false, { getUserProfile });

    act(() => {
      render(
        <DiscoverPane
          tabs={tabs}
          playlists={playlists}
          annotations={annotations}
          modals={modals}
          state={state}
          toast={state.app.toast}
        />,
        container
      );
    });

    await vi.waitFor(() => {
      const avatar = container.querySelector(
        ".sb-tab-user-icon-has-image"
      ) as HTMLElement;
      expect(avatar).not.toBeNull();
      expect(avatar?.style.backgroundImage).toContain(
        "https://example.com/jordan.png"
      );
    });

    const author = container.querySelector(".sb-annotation-comment-author")!;
    const avatarIndex = Array.from(author.children).findIndex((el) =>
      el.classList.contains("sb-tab-user-icon")
    );
    const nameIndex = Array.from(author.children).findIndex((el) =>
      el.classList.contains("sb-annotation-comment-author-name")
    );
    expect(avatarIndex).toBeGreaterThanOrEqual(0);
    expect(avatarIndex).toBeLessThan(nameIndex);
  });

  it("shows a generic account icon for the current user's own notes when nobody else has annotated", () => {
    const { playlists } = createMockPlaylists();
    const annotation = createAnnotation({
      id: "a1",
      verseNumber: 3,
      data: {
        type: "comment",
        html: "<p>Hi</p>",
        userId: "user-self",
      },
    });
    const { annotations } = createMockAnnotations({
      annotationsForChapter: [annotation],
    });
    const tab = createMockTab();
    const tabs = createMockTabs(tab);
    const modals = createModalManager();
    const state = createMockState();
    state.login.userId.value = "user-self";

    act(() => {
      render(
        <DiscoverPane
          tabs={tabs}
          playlists={playlists}
          annotations={annotations}
          modals={modals}
          state={state}
          toast={state.app.toast}
        />,
        container
      );
    });

    expect(container.querySelector(".sb-tab-user-icon-generic")).not.toBeNull();
    expect(
      container.querySelector(".sb-tab-user-icon-generic")?.textContent
    ).toContain("account_circle");
    expect(container.querySelector(".sb-tab-user-icon-animal")).toBeNull();
  });

  it("shows the current user's profile picture on their own notes even when nobody else has annotated", async () => {
    const { playlists } = createMockPlaylists();
    const annotation = createAnnotation({
      id: "a1",
      verseNumber: 3,
      data: {
        type: "comment",
        html: "<p>Hi</p>",
        userId: "user-self-with-picture",
      },
    });
    const { annotations } = createMockAnnotations({
      annotationsForChapter: [annotation],
    });
    const tab = createMockTab();
    const tabs = createMockTabs(tab);
    const modals = createModalManager();
    const getUserProfile = vi.fn().mockResolvedValue({
      name: "Ada",
      pictureUrl: "https://example.com/ada.png",
    });
    const state = createMockState(false, { getUserProfile });
    state.login.userId.value = "user-self-with-picture";

    act(() => {
      render(
        <DiscoverPane
          tabs={tabs}
          playlists={playlists}
          annotations={annotations}
          modals={modals}
          state={state}
          toast={state.app.toast}
        />,
        container
      );
    });

    await vi.waitFor(() => {
      const avatar = container.querySelector(
        ".sb-tab-user-icon-has-image"
      ) as HTMLElement;
      expect(avatar).not.toBeNull();
      expect(avatar?.style.backgroundImage).toContain(
        "https://example.com/ada.png"
      );
    });
    expect(container.querySelector(".sb-tab-user-icon-generic")).toBeNull();
    expect(container.querySelector(".sb-tab-user-icon-animal")).toBeNull();
  });

  it("shows the animal fallback for the current user's notes when other people have also annotated", () => {
    const { playlists } = createMockPlaylists();
    const own = createAnnotation({
      id: "a1",
      verseNumber: 3,
      data: {
        type: "comment",
        html: "<p>Mine</p>",
        userId: "user-self",
      },
    });
    const other = createAnnotation({
      id: "a2",
      verseNumber: 4,
      data: {
        type: "comment",
        html: "<p>Theirs</p>",
        userId: "user-other",
      },
    });
    const { annotations } = createMockAnnotations({
      annotationsForChapter: [own, other],
    });
    const tab = createMockTab();
    const tabs = createMockTabs(tab);
    const modals = createModalManager();
    const state = createMockState();
    state.login.userId.value = "user-self";

    act(() => {
      render(
        <DiscoverPane
          tabs={tabs}
          playlists={playlists}
          annotations={annotations}
          modals={modals}
          state={state}
          toast={state.app.toast}
        />,
        container
      );
    });

    const animals = container.querySelectorAll(".sb-tab-user-icon-animal");
    expect(animals.length).toBe(2);
    expect(container.querySelector(".sb-tab-user-icon-generic")).toBeNull();
  });

  it("shows a deterministic fallback avatar (derived from the user id) when another author has no profile picture", () => {
    const { playlists } = createMockPlaylists();
    const annotation = createAnnotation({
      id: "a1",
      verseNumber: 3,
      data: {
        type: "comment",
        html: "<p>Hi</p>",
        userId: "user-no-picture",
        userName: "No Picture",
      },
    });
    const { annotations } = createMockAnnotations({
      annotationsForChapter: [annotation],
    });
    const tab = createMockTab();
    const tabs = createMockTabs(tab);
    const modals = createModalManager();
    const state = createMockState();

    act(() => {
      render(
        <DiscoverPane
          tabs={tabs}
          playlists={playlists}
          annotations={annotations}
          modals={modals}
          state={state}
          toast={state.app.toast}
        />,
        container
      );
    });

    expect(container.querySelector(".sb-tab-user-icon-animal")).not.toBeNull();
    expect(container.querySelector(".sb-tab-user-icon-has-image")).toBeNull();
  });

  it("the annotation Edit menu item calls editAnnotation", () => {
    const { playlists } = createMockPlaylists();
    const annotation = createAnnotation({ id: "a1" });
    const { annotations, editAnnotation } = createMockAnnotations({
      annotationsForChapter: [annotation],
    });
    const tab = createMockTab();
    const tabs = createMockTabs(tab);
    const modals = createModalManager();
    const state = createMockState();

    act(() => {
      render(
        <DiscoverPane
          tabs={tabs}
          playlists={playlists}
          annotations={annotations}
          modals={modals}
          state={state}
          toast={state.app.toast}
        />,
        container
      );
    });

    const editItem = Array.from(
      container.querySelectorAll('[role="menuitem"]')
    ).find((el) => el.textContent?.includes("Edit")) as
      | HTMLButtonElement
      | undefined;
    expect(editItem).not.toBeUndefined();

    act(() => {
      editItem?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(editAnnotation).toHaveBeenCalledWith(annotation);
  });

  it("the annotation Delete menu item opens a confirm modal; confirming deletes and closes it", async () => {
    const { playlists } = createMockPlaylists();
    const annotation = createAnnotation({ id: "a1" });
    const { annotations, deleteAnnotationAndRefresh } = createMockAnnotations({
      annotationsForChapter: [annotation],
    });
    const tab = createMockTab();
    const tabs = createMockTabs(tab);
    const modals = createModalManager();
    const state = createMockState();

    act(() => {
      render(
        <DiscoverPane
          tabs={tabs}
          playlists={playlists}
          annotations={annotations}
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
      (m) => m.id === "delete-annotation-confirm-a1"
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
      "Delete this annotation? This can't be undone."
    );

    const confirmButton = modalContainer.querySelector(
      ".sb-session-settings-end"
    ) as HTMLButtonElement;

    await act(async () => {
      confirmButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(deleteAnnotationAndRefresh).toHaveBeenCalledWith(annotation);
    expect(
      modals.modals.value.some((m) => m.id === "delete-annotation-confirm-a1")
    ).toBe(false);

    render(null, modalContainer);
    modalContainer.remove();
  });

  it("shows a toast but still closes the modal when deleting an annotation fails", async () => {
    const { playlists } = createMockPlaylists();
    const annotation = createAnnotation({ id: "a1" });
    const { annotations } = createMockAnnotations({
      annotationsForChapter: [annotation],
      deleteAnnotationAndRefreshImpl: () => Promise.reject(new Error("nope")),
    });
    const tab = createMockTab();
    const tabs = createMockTabs(tab);
    const modals = createModalManager();
    const state = createMockState();

    act(() => {
      render(
        <DiscoverPane
          tabs={tabs}
          playlists={playlists}
          annotations={annotations}
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
      (m) => m.id === "delete-annotation-confirm-a1"
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
      "Couldn't delete the annotation."
    );
    expect(
      modals.modals.value.some((m) => m.id === "delete-annotation-confirm-a1")
    ).toBe(false);

    render(null, modalContainer);
    modalContainer.remove();
  });

  it("shows the select-a-tab hint for annotations, cross references, study notes, and content when no tab is selected", () => {
    const { playlists } = createMockPlaylists();
    const { annotations } = createMockAnnotations();
    const tabs = createMockTabs();
    const modals = createModalManager();
    const state = createMockState();

    act(() => {
      render(
        <DiscoverPane
          tabs={tabs}
          playlists={playlists}
          annotations={annotations}
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
    expect(hints).toHaveLength(4);
  });

  it("hides cross reference / study note / content sections entirely when there are no results", () => {
    const { playlists } = createMockPlaylists();
    const { annotations } = createMockAnnotations();
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
          annotations={annotations}
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
    const { annotations } = createMockAnnotations();
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
          annotations={annotations}
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
    const { annotations } = createMockAnnotations();
    const tabs = createMockTabs();
    const modals = createModalManager();
    const state = createMockState();

    act(() => {
      render(
        <DiscoverPane
          tabs={tabs}
          playlists={playlists}
          annotations={annotations}
          modals={modals}
          state={state}
          toast={state.app.toast}
        />,
        container
      );
    });

    // The title input now lives in the pane header (DiscoverPaneTitle); the
    // form body still renders its Save button.
    expect(container.querySelector(".sb-settings-save-button")).not.toBeNull();
    expect(container.querySelector(".sb-discover-create")).toBeNull();
  });

  it("renders CreateAnnotationForm when view is create_annotation", () => {
    const { playlists } = createMockPlaylists({ view: "create_annotation" });
    const { annotations } = createMockAnnotations({
      editingAnnotation: createAnnotation({ id: "ann-9" }),
    });
    const tabs = createMockTabs();
    const modals = createModalManager();
    const state = createMockState();

    act(() => {
      render(
        <DiscoverPane
          tabs={tabs}
          playlists={playlists}
          annotations={annotations}
          modals={modals}
          state={state}
          toast={state.app.toast}
        />,
        container
      );
    });

    expect(
      container.querySelector(".stub-create-annotation-form")?.textContent
    ).toBe("ann-9");
    expect(container.querySelector(".sb-discover-create")).toBeNull();
  });

  it("renders PlayPlaylistView when view is play_playlist", () => {
    const playlist = createPlaylist();
    const { playlists } = createMockPlaylists({
      view: "play_playlist",
      playing: createPlayingState([playlist]),
    });
    const { annotations } = createMockAnnotations();
    const tabs = createMockTabs();
    const modals = createModalManager();
    const state = createMockState();

    act(() => {
      render(
        <DiscoverPane
          tabs={tabs}
          playlists={playlists}
          annotations={annotations}
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

describe("DiscoverPaneTitle", () => {
  let container: HTMLDivElement;
  let chatsFixture: MockChatsResult;
  let openChatPanel: Mock<() => void>;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    chatsFixture = createMockChats();
    openChatPanel = vi.fn<() => void>();
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    vi.restoreAllMocks();
  });

  it("shows the plain 'Discover' label in the discover view", () => {
    const { playlists } = createMockPlaylists({ view: "discover" });
    const { annotations } = createMockAnnotations();

    act(() => {
      render(
        <DiscoverPaneTitle
          playlists={playlists}
          annotations={annotations}
          tabs={createMockTabs()}
          chats={chatsFixture.chats}
          openChatPanel={openChatPanel}
        />,

        container
      );
    });

    expect(container.textContent).toBe("Discover");
    expect(container.querySelector(".sb-reading-plans-back")).toBeNull();
  });

  it("shows a back button and the playlist title in the play view", () => {
    const { playlists, goBackFromPlayingView } = createMockPlaylists({
      view: "play_playlist",
      playing: createPlayingState([
        createPlaylist({ title: "Evening Reading" }),
      ]),
    });
    const { annotations } = createMockAnnotations();

    act(() => {
      render(
        <DiscoverPaneTitle
          playlists={playlists}
          annotations={annotations}
          tabs={createMockTabs()}
          chats={chatsFixture.chats}
          openChatPanel={openChatPanel}
        />,

        container
      );
    });

    expect(container.querySelector(".sb-discover-title")?.textContent).toBe(
      "Evening Reading"
    );

    const backButton = container.querySelector(
      ".sb-reading-plans-back"
    ) as HTMLButtonElement;
    act(() => {
      backButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(goBackFromPlayingView).toHaveBeenCalledTimes(1);
  });

  it("falls back to 'Untitled playlist' in the play view", () => {
    const { playlists } = createMockPlaylists({
      view: "play_playlist",
      playing: createPlayingState([createPlaylist({ title: null })]),
    });
    const { annotations } = createMockAnnotations();

    act(() => {
      render(
        <DiscoverPaneTitle
          playlists={playlists}
          annotations={annotations}
          tabs={createMockTabs()}
          chats={chatsFixture.chats}
          openChatPanel={openChatPanel}
        />,

        container
      );
    });

    expect(container.querySelector(".sb-discover-title")?.textContent).toBe(
      "Untitled playlist"
    );
  });

  it("resets to the 'Discover' title when playback stops without `view` being reset (tab switch)", () => {
    // Mirrors PlaylistManager's real `actualView`: it derives from `view` and
    // `playing`, falling back to "discover" once `playing` goes null even
    // though nothing ever writes `view` back from "play_playlist". A prior
    // bug had the header read the raw `view` signal instead of `actualView`,
    // so switching tabs away from an active playlist left the back arrow and
    // "Untitled playlist" showing even after the pane body reset.
    const view = signal<"discover" | "create_playlist" | "play_playlist">(
      "play_playlist"
    );
    const playing = signal<ReturnType<typeof createPlayingState> | null>(
      createPlayingState([createPlaylist({ title: "Evening Reading" })])
    );
    const actualView = computed(() => {
      if (view.value === "play_playlist" && !playing.value) {
        return "discover";
      }
      return view.value;
    });
    const playlists = {
      view,
      actualView,
      playing,
      editingPlaylist: signal(null),
      goBackFromPlayingView: vi.fn(),
    } as unknown as PlaylistManager;
    const { annotations } = createMockAnnotations();

    act(() => {
      render(
        <DiscoverPaneTitle
          playlists={playlists}
          annotations={annotations}
          tabs={createMockTabs()}
          chats={chatsFixture.chats}
          openChatPanel={openChatPanel}
        />,

        container
      );
    });
    expect(container.querySelector(".sb-discover-title")?.textContent).toBe(
      "Evening Reading"
    );

    // Simulate switching to a non-playlist tab: `playing` clears, but nothing
    // ever resets the raw `view` signal away from "play_playlist".
    act(() => {
      playing.value = null;
    });

    expect(container.textContent).toBe("Discover");
    expect(container.querySelector(".sb-reading-plans-back")).toBeNull();
  });

  it("shows a back button and an editable title input in the create view", () => {
    const { playlists, cancelEditingPlaylist } = createMockPlaylists({
      view: "create_playlist",
      editingPlaylist: createPlaylist({ title: "Draft" }),
    });
    const { annotations } = createMockAnnotations();

    act(() => {
      render(
        <DiscoverPaneTitle
          playlists={playlists}
          annotations={annotations}
          tabs={createMockTabs()}
          chats={chatsFixture.chats}
          openChatPanel={openChatPanel}
        />,

        container
      );
    });

    const input = container.querySelector(
      ".sb-playlist-input"
    ) as HTMLInputElement;
    expect(input.value).toBe("Draft");

    act(() => {
      input.value = "Morning Devotion";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(playlists.editingPlaylist.value?.title).toBe("Morning Devotion");

    const backButton = container.querySelector(
      ".sb-reading-plans-back"
    ) as HTMLButtonElement;
    act(() => {
      backButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(cancelEditingPlaylist).toHaveBeenCalledTimes(1);
  });

  it("with no AI providers, the AI button starts a local chat seeded with a prompt message and no participant", () => {
    const { playlists } = createMockPlaylists({
      view: "create_playlist",
      editingPlaylist: createPlaylist({ title: "Draft" }),
    });
    const { annotations } = createMockAnnotations();

    act(() => {
      render(
        <DiscoverPaneTitle
          playlists={playlists}
          annotations={annotations}
          tabs={createMockTabs()}
          chats={chatsFixture.chats}
          openChatPanel={openChatPanel}
        />,
        container
      );
    });

    // No menu with zero (or one) provider: a plain button, not the
    // context-menu trigger.
    expect(container.querySelector('[role="menu"]')).toBeNull();

    const aiButton = container.querySelector(
      ".sb-discover-title-ai"
    ) as HTMLButtonElement;
    expect(aiButton).not.toBeNull();

    act(() => {
      aiButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(chatsFixture.createLocalSession).toHaveBeenCalledTimes(1);
    const history = chatsFixture.createLocalSession.mock.calls[0]![0];
    expect(history.providerIds).toEqual([]);
    expect(history.messages).toHaveLength(1);
    expect(history.messages[0]).toMatchObject({
      authors: [],
      type: "text",
      text: "What do you want to add/change?",
    });

    expect(chatsFixture.addParticipant).not.toHaveBeenCalled();
    expect(chatsFixture.selectChat).toHaveBeenCalledWith("chat-1");
    expect(openChatPanel).toHaveBeenCalledTimes(1);
  });

  it("with exactly one AI provider, the AI button adds it automatically without showing a menu", () => {
    chatsFixture = createMockChats([createMockProvider("provider-1")]);
    const { playlists } = createMockPlaylists({
      view: "create_playlist",
      editingPlaylist: createPlaylist({ title: "Draft" }),
    });
    const { annotations } = createMockAnnotations();

    act(() => {
      render(
        <DiscoverPaneTitle
          playlists={playlists}
          annotations={annotations}
          tabs={createMockTabs()}
          chats={chatsFixture.chats}
          openChatPanel={openChatPanel}
        />,
        container
      );
    });

    expect(container.querySelector('[role="menu"]')).toBeNull();

    const aiButton = container.querySelector(
      ".sb-discover-title-ai"
    ) as HTMLButtonElement;
    act(() => {
      aiButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(chatsFixture.createLocalSession).toHaveBeenCalledTimes(1);
    expect(chatsFixture.addParticipant).toHaveBeenCalledWith("provider-1");
    expect(chatsFixture.selectChat).toHaveBeenCalledWith("chat-1");
    expect(openChatPanel).toHaveBeenCalledTimes(1);
  });

  it("with multiple AI providers, the AI button shows a menu and starts the chat with the selected provider", () => {
    chatsFixture = createMockChats([
      createMockProvider("provider-1", "Provider One"),
      createMockProvider("provider-2", "Provider Two"),
    ]);
    const { playlists } = createMockPlaylists({
      view: "create_playlist",
      editingPlaylist: createPlaylist({ title: "Draft" }),
    });
    const { annotations } = createMockAnnotations();

    act(() => {
      render(
        <DiscoverPaneTitle
          playlists={playlists}
          annotations={annotations}
          tabs={createMockTabs()}
          chats={chatsFixture.chats}
          openChatPanel={openChatPanel}
        />,
        container
      );
    });

    const aiButton = container.querySelector(
      ".sb-discover-title-ai"
    ) as HTMLButtonElement;
    expect(aiButton).not.toBeNull();
    // Not yet started: opening the menu shouldn't create a chat by itself.
    expect(chatsFixture.createLocalSession).not.toHaveBeenCalled();

    act(() => {
      aiButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const menuItems = Array.from(
      container.querySelectorAll('[role="menuitem"]')
    ) as HTMLButtonElement[];
    expect(menuItems.map((item) => item.textContent)).toEqual([
      "Provider One",
      "Provider Two",
    ]);

    act(() => {
      menuItems[1]!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(chatsFixture.createLocalSession).toHaveBeenCalledTimes(1);
    expect(chatsFixture.addParticipant).toHaveBeenCalledWith("provider-2");
    expect(chatsFixture.selectChat).toHaveBeenCalledWith("chat-1");
    expect(openChatPanel).toHaveBeenCalledTimes(1);
  });

  it("excludes AI providers that don't support tool calling from the AI button", () => {
    chatsFixture = createMockChats([
      createMockProvider("provider-1", "Provider One"),
      createMockProvider("provider-2", "No Tools", false),
    ]);
    const { playlists } = createMockPlaylists({
      view: "create_playlist",
      editingPlaylist: createPlaylist({ title: "Draft" }),
    });
    const { annotations } = createMockAnnotations();

    act(() => {
      render(
        <DiscoverPaneTitle
          playlists={playlists}
          annotations={annotations}
          tabs={createMockTabs()}
          chats={chatsFixture.chats}
          openChatPanel={openChatPanel}
        />,
        container
      );
    });

    // Only one tool-calling provider remains, so no menu is shown and it's
    // added automatically, same as the single-provider case.
    expect(container.querySelector('[role="menu"]')).toBeNull();

    const aiButton = container.querySelector(
      ".sb-discover-title-ai"
    ) as HTMLButtonElement;
    act(() => {
      aiButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(chatsFixture.createLocalSession).toHaveBeenCalledTimes(1);
    expect(chatsFixture.addParticipant).toHaveBeenCalledWith("provider-1");
    expect(chatsFixture.addParticipant).not.toHaveBeenCalledWith("provider-2");
  });

  it("stores a whitespace-only title as null in the create view", () => {
    const { playlists } = createMockPlaylists({
      view: "create_playlist",
      editingPlaylist: createPlaylist({ title: "Something" }),
    });
    const { annotations } = createMockAnnotations();

    act(() => {
      render(
        <DiscoverPaneTitle
          playlists={playlists}
          annotations={annotations}
          tabs={createMockTabs()}
          chats={chatsFixture.chats}
          openChatPanel={openChatPanel}
        />,

        container
      );
    });

    const input = container.querySelector(
      ".sb-playlist-input"
    ) as HTMLInputElement;
    act(() => {
      input.value = "   ";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });

    expect(playlists.editingPlaylist.value?.title).toBeNull();
  });

  function createHistoryEntry(
    overrides: Partial<PlaylistPlayHistory> = {}
  ): PlaylistPlayHistory {
    return {
      id: "hist-1",
      recordName: "user-1",
      userId: "user-1",
      playlistId: "playlist-1",
      playlistRecordName: "user-1",
      playlistTitle: "Shared Study",
      playlistDescription: null,
      previousHistoryId: null,
      totalSteps: 4,
      currentStep: 1,
      lastItem: {
        type: "bible-verse",
        ref: { bookId: "JHN", chapter: 3, verse: 16 },
      },
      startedAtMs: 1_000,
      endedAtMs: 1_000 + 65_000,
      durationMs: 65_000,
      createdAtMs: 1_000,
      updatedAtMs: 1_000 + 65_000,
      ...overrides,
    };
  }

  it("shows the empty playlist-history message when there is no history", () => {
    const { playlists } = createMockPlaylists({ userPlaylistHistory: [] });
    const tabs = createMockTabs();
    const modals = createModalManager();
    const state = createMockState();
    const { annotations } = createMockAnnotations();

    act(() => {
      render(
        <DiscoverPane
          tabs={tabs}
          playlists={playlists}
          annotations={annotations}
          modals={modals}
          state={state}
          toast={state.app.toast}
        />,
        container
      );
    });

    const emptyStates = Array.from(
      container.querySelectorAll(".sb-discover-empty")
    ).map((el) => el.textContent);
    expect(emptyStates).toContain(
      "Play a saved playlist while signed in and it will show up here."
    );
  });

  it("lists playlist history with status, play to continue, and no Continue listening section", async () => {
    const entry = createHistoryEntry();
    const { playlists, continueFromHistory, replayFromHistory } =
      createMockPlaylists({
        userPlaylistHistory: [entry],
      });
    const tabs = createMockTabs();
    const modals = createModalManager();
    const state = createMockState();
    const { annotations } = createMockAnnotations();

    act(() => {
      render(
        <DiscoverPane
          tabs={tabs}
          playlists={playlists}
          annotations={annotations}
          modals={modals}
          state={state}
          toast={state.app.toast}
        />,
        container
      );
    });

    expect(container.textContent).not.toContain("Continue listening");
    const item = container.querySelector(
      ".sb-playlist-history-item"
    ) as HTMLLIElement;
    expect(item).not.toBeNull();
    expect(item.querySelector(".sb-discover-item-title")?.textContent).toBe(
      "Shared Study"
    );
    expect(
      item.querySelector(".sb-discover-item-description")?.textContent
    ).toMatch(/50% complete/);
    expect(
      item.querySelector(".sb-discover-item-description")?.textContent
    ).toContain("JHN 3:16");
    expect(container.querySelector(".sb-playlist-history-details")).toBeNull();

    const play = item.querySelector(
      ".sb-discover-item-play"
    ) as HTMLButtonElement;
    expect(play.getAttribute("aria-label")).toBe("Continue");

    await act(async () => {
      play.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(continueFromHistory).toHaveBeenCalledWith(entry);
    expect(replayFromHistory).not.toHaveBeenCalled();
  });

  it("replays a completed history entry from the play button", async () => {
    const entry = createHistoryEntry({
      currentStep: 3,
      totalSteps: 4,
    });
    const { playlists, replayFromHistory, continueFromHistory } =
      createMockPlaylists({
        userPlaylistHistory: [entry],
      });
    const tabs = createMockTabs();
    const modals = createModalManager();
    const state = createMockState();
    const { annotations } = createMockAnnotations();

    act(() => {
      render(
        <DiscoverPane
          tabs={tabs}
          playlists={playlists}
          annotations={annotations}
          modals={modals}
          state={state}
          toast={state.app.toast}
        />,
        container
      );
    });

    const play = container.querySelector(
      ".sb-playlist-history-item .sb-discover-item-play"
    ) as HTMLButtonElement;
    expect(play.getAttribute("aria-label")).toBe("Replay");

    await act(async () => {
      play.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(replayFromHistory).toHaveBeenCalledWith(entry);
    expect(continueFromHistory).not.toHaveBeenCalled();
  });

  it("removes a history session from the overflow menu", async () => {
    const entry = createHistoryEntry();
    const { playlists, removePlayHistory } = createMockPlaylists({
      userPlaylistHistory: [entry],
    });
    const tabs = createMockTabs();
    const modals = createModalManager();
    const state = createMockState();
    const { annotations } = createMockAnnotations();

    act(() => {
      render(
        <DiscoverPane
          tabs={tabs}
          playlists={playlists}
          annotations={annotations}
          modals={modals}
          state={state}
          toast={state.app.toast}
        />,
        container
      );
    });

    const remove = Array.from(
      container.querySelectorAll('[role="menuitem"]')
    ).find((el) => el.textContent?.includes("Remove from history")) as
      | HTMLButtonElement
      | undefined;
    expect(remove).toBeDefined();

    await act(async () => {
      remove!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(removePlayHistory).toHaveBeenCalledWith(entry);
  });

  function renderAnnotationTitle(editing: Annotation) {
    const { playlists } = createMockPlaylists({ view: "create_annotation" });
    const { annotations, cancelEditingAnnotation } = createMockAnnotations({
      editingAnnotation: editing,
    });
    const tab = createMockTab({
      bookId: editing.bookId,
      chapterNumber: editing.chapterNumber,
      chapterData: {
        book: { id: editing.bookId, name: "Genesis" },
        chapter: { number: editing.chapterNumber },
      },
    });
    const tabs = createMockTabs(tab);

    act(() => {
      render(
        <DiscoverPaneTitle
          playlists={playlists}
          annotations={annotations}
          tabs={tabs}
          chats={chatsFixture.chats}
          openChatPanel={openChatPanel}
        />,
        container
      );
    });

    return { cancelEditingAnnotation };
  }

  it("shows 'Annotate {book} {chapter}' when no verses are selected", () => {
    renderAnnotationTitle(
      createAnnotation({ bookId: "GEN", chapterNumber: 3 })
    );

    expect(container.querySelector(".sb-discover-title")?.textContent).toBe(
      "Annotate Genesis 3"
    );
  });

  it("shows 'Annotate {book} {chapter}:{verse}' when a single verse is selected", () => {
    renderAnnotationTitle(
      createAnnotation({
        bookId: "GEN",
        chapterNumber: 3,
        verseNumber: 5,
      })
    );

    expect(container.querySelector(".sb-discover-title")?.textContent).toBe(
      "Annotate Genesis 3:5"
    );
  });

  it("shows 'Annotate {book} {chapter}:{verse}-{endVerse}' when a range is selected", () => {
    renderAnnotationTitle(
      createAnnotation({
        bookId: "GEN",
        chapterNumber: 3,
        verseNumber: 3,
        endVerseNumber: 5,
      })
    );

    expect(container.querySelector(".sb-discover-title")?.textContent).toBe(
      "Annotate Genesis 3:3-5"
    );
  });

  it("shows a range plus a non-contiguous verse when the selection has a gap", () => {
    renderAnnotationTitle(
      createAnnotation({
        bookId: "GEN",
        chapterNumber: 3,
        verseNumber: 3,
        endVerseNumber: 7,
        verseNumbers: [3, 4, 5, 7],
      })
    );

    expect(container.querySelector(".sb-discover-title")?.textContent).toBe(
      "Annotate Genesis 3:3-5,7"
    );
  });

  it("back button in the create_annotation view calls cancelEditingAnnotation", () => {
    const { cancelEditingAnnotation } = renderAnnotationTitle(
      createAnnotation({ bookId: "GEN", chapterNumber: 3 })
    );

    const backButton = container.querySelector(
      ".sb-reading-plans-back"
    ) as HTMLButtonElement;
    act(() => {
      backButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(cancelEditingAnnotation).toHaveBeenCalledTimes(1);
  });
});
