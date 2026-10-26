import { render } from "preact";
import { act } from "preact/test-utils";
import { computed, signal } from "@preact/signals";
import {
  DiscoverPane,
  DISCOVER_PANE_ID,
} from "@packages/seed-bible/seed-bible/components/Discover/DiscoverPane";
import { createModalManager } from "@packages/seed-bible/seed-bible/managers/ModalManager";
import {
  createPlayingState,
  type Playlist,
  type PlaylistManager,
} from "@packages/seed-bible/seed-bible/managers/PlaylistManager";
import type {
  Annotation,
  AnnotationsManager,
} from "@packages/seed-bible/seed-bible/managers/AnnotationsManager";
import type { TabsManager } from "@packages/seed-bible/seed-bible/managers/TabsManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import { createMockChats } from "../testUtils/mockChats";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager();
});

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

/** Just what the pane's views read: the view, the draft and the playback. */
function createMockPlaylists(
  overrides: {
    view?:
      | "discover"
      | "create_playlist"
      | "play_playlist"
      | "create_annotation";
    editingPlaylist?: Playlist | null;
    playing?: ReturnType<typeof createPlayingState> | null;
  } = {}
): { playlists: PlaylistManager } {
  const view = signal(overrides.view ?? "discover");
  const editingPlaylist = signal(overrides.editingPlaylist ?? null);
  const playlists = {
    view,
    actualView: view,
    editingPlaylist,
    playing: signal(overrides.playing ?? null),
    openingPlayback: signal(false),
    playingAuthorName: signal(null),
    isEditingPlaylistDirty: vi.fn(() => false),
    cancelEditingPlaylist: vi.fn(),
    saveEditingPlaylist: vi.fn().mockResolvedValue(undefined),
    updateEditingPlaylistMetadata: vi.fn(),
    uploadHeroImage: vi.fn().mockResolvedValue("https://example.com/hero.jpg"),
    addEditingPlaylistItem: vi.fn(),
    updateEditingPlaylistItem: vi.fn(),
    removeEditingPlaylistItem: vi.fn(),
    goBackFromPlayingView: vi.fn(),
  } as unknown as PlaylistManager;
  return { playlists };
}

function createMockAnnotations(
  overrides: { editingAnnotation?: Annotation | null } = {}
): { annotations: AnnotationsManager } {
  const annotations = {
    editingAnnotation: signal(overrides.editingAnnotation ?? null),
  } as unknown as AnnotationsManager;
  return { annotations };
}

function createMockTabs(): TabsManager {
  return {
    tabs: signal([]),
    selectedTabId: signal(null),
  } as unknown as TabsManager;
}

function createMockState(
  overrides: { closePane?: ReturnType<typeof vi.fn> } = {}
): SeedBibleState {
  return {
    app: { toast: vi.fn() },
    panes: { closePane: overrides.closePane ?? vi.fn() },
    chats: createMockChats().chats,
    sidebar: { openChatPanel: vi.fn() },
  } as unknown as SeedBibleState;
}

describe("DiscoverPane", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    vi.restoreAllMocks();
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

    // The form renders its own header (with the title input) and its Save
    // button.
    expect(container.querySelector(".sb-settings-save-button")).not.toBeNull();
    expect(container.querySelector(".sb-dcp-create-btn")).toBeNull();
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
    expect(container.querySelector(".sb-dcp-create-btn")).toBeNull();
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
    expect(container.querySelector(".sb-dcp-create-btn")).toBeNull();
  });
  it("shows the full Discover panel in the discover view, whose close button closes the pane as the user", () => {
    const closePane = vi.fn();
    const { playlists } = createMockPlaylists({ view: "discover" });
    const { annotations } = createMockAnnotations();
    const state = createMockState({ closePane });

    act(() => {
      render(
        <DiscoverPane
          tabs={createMockTabs()}
          playlists={playlists}
          annotations={annotations}
          modals={createModalManager()}
          state={state}
          toast={state.app.toast}
        />,
        container
      );
    });

    expect(
      container.querySelector(".sb-discover-content-panel--full")
    ).not.toBeNull();

    act(() => {
      container
        .querySelector(".sb-discover-panel-header-close")!
        .dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(closePane).toHaveBeenCalledWith(DISCOVER_PANE_ID, "user");
  });

  it("closes the pane as the user from a sub-view's close button", () => {
    const closePane = vi.fn();
    const { playlists } = createMockPlaylists({
      view: "play_playlist",
      playing: createPlayingState([createPlaylist()]),
    });
    const { annotations } = createMockAnnotations();
    const state = createMockState({ closePane });

    act(() => {
      render(
        <DiscoverPane
          tabs={createMockTabs()}
          playlists={playlists}
          annotations={annotations}
          modals={createModalManager()}
          state={state}
          toast={state.app.toast}
        />,
        container
      );
    });

    act(() => {
      container
        .querySelector(".sb-discover-panel-header-close")!
        .dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    // "user" (not "programmatic") is what makes the pane's onClose stop the
    // playing playlist.
    expect(closePane).toHaveBeenCalledWith(DISCOVER_PANE_ID, "user");
  });

  it("leaves the play view when playback stops without `view` being reset (tab switch)", () => {
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
    const playlists = {
      ...createMockPlaylists().playlists,
      view,
      actualView: computed(() =>
        view.value === "play_playlist" && !playing.value
          ? "discover"
          : view.value
      ),
      playing,
    } as unknown as PlaylistManager;
    const { annotations } = createMockAnnotations();
    const state = createMockState();

    act(() => {
      render(
        <DiscoverPane
          tabs={createMockTabs()}
          playlists={playlists}
          annotations={annotations}
          modals={createModalManager()}
          state={state}
          toast={state.app.toast}
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

    expect(container.querySelector(".sb-play-playlist")).toBeNull();
    expect(container.querySelector(".sb-reading-plans-back")).toBeNull();
  });
});
