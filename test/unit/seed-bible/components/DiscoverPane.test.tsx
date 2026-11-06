import { render } from "preact";
import { act } from "preact/test-utils";
import { computed, signal } from "@preact/signals";
import type { ComponentChildren } from "preact";
import type { Mock } from "vitest";
import {
  DiscoverPane,
  DISCOVER_PANE_ID,
  EditPlaylistWithAiButton,
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
import {
  createMockChats,
  createMockProvider,
  type MockChatsResult,
} from "../testUtils/mockChats";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager();
});

// The editor's step list has its own tests; here it only has to show up.
vi.mock(
  "@packages/seed-bible/seed-bible/components/PlaylistEditor/PlaylistEditorPanel",
  () => ({
    PlaylistEditorPanel: ({
      headerActions,
    }: {
      headerActions?: ComponentChildren;
    }) => <div className="stub-playlist-editor-panel">{headerActions}</div>,
  })
);

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
    discover: { scrollToVerse: signal(null) },
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

  it("renders the playlist editor's step list when view is create_playlist", () => {
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

    expect(
      container.querySelector(".stub-playlist-editor-panel")
    ).not.toBeNull();
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

  it("shows the full Discover panel, which can be closed, when the create_annotation view has no draft", () => {
    const closePane = vi.fn();
    const { playlists } = createMockPlaylists({ view: "create_annotation" });
    const { annotations } = createMockAnnotations({ editingAnnotation: null });
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

    expect(container.querySelector(".stub-create-annotation-form")).toBeNull();
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

  it("has no close button on the playing playlist's view", () => {
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

    expect(container.querySelector(".sb-play-playlist")).not.toBeNull();
    expect(
      container.querySelector(".sb-discover-panel-header-close")
    ).toBeNull();
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
    expect(container.querySelector('button[aria-label="Back"]')).toBeNull();
  });
});

describe("EditPlaylistWithAiButton", () => {
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

  it("hides the AI button when no agent can edit playlists", () => {
    function renderTitle() {
      act(() => {
        render(
          <EditPlaylistWithAiButton
            chats={chatsFixture.chats}
            openChatPanel={openChatPanel}
          />,
          container
        );
      });
    }

    renderTitle();
    expect(container.querySelector(".sb-discover-title-ai")).toBeNull();

    // An installed agent that cannot call tools (e.g. Bonfire) still cannot
    // edit the playlist, so the button stays hidden.
    chatsFixture.providers.value = [
      createMockProvider("bonfire", "Bonfire", false),
    ];
    renderTitle();
    expect(container.querySelector(".sb-discover-title-ai")).toBeNull();
    expect(chatsFixture.createLocalSession).not.toHaveBeenCalled();
    expect(openChatPanel).not.toHaveBeenCalled();
  });

  it("with exactly one AI provider, the AI button adds it automatically without showing a menu", () => {
    chatsFixture = createMockChats([createMockProvider("provider-1")]);

    act(() => {
      render(
        <EditPlaylistWithAiButton
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
    expect(aiButton).not.toBeNull();
    act(() => {
      aiButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(chatsFixture.createLocalSession).toHaveBeenCalledTimes(1);
    const history = chatsFixture.createLocalSession.mock.calls[0]![0];
    expect(history.messages).toHaveLength(1);
    expect(history.messages[0]).toMatchObject({
      authors: ["provider-1"],
      type: "text",
      text: "What do you want to add/change?",
    });
    expect(chatsFixture.addParticipant).toHaveBeenCalledWith("provider-1");
    expect(chatsFixture.selectChat).toHaveBeenCalledWith("chat-1");
    expect(openChatPanel).toHaveBeenCalledTimes(1);
  });

  it("with multiple AI providers, the AI button shows a menu and starts the chat with the selected provider", () => {
    chatsFixture = createMockChats([
      createMockProvider("provider-1", "Provider One"),
      createMockProvider("provider-2", "Provider Two"),
    ]);

    act(() => {
      render(
        <EditPlaylistWithAiButton
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

    // The menu opens in a portal, outside the container.
    const menuItems = Array.from(
      document.querySelectorAll('[role="menuitem"]')
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

    act(() => {
      render(
        <EditPlaylistWithAiButton
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
});
