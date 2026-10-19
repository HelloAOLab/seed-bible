import { render } from "preact";
import { act } from "preact/test-utils";
import { forwardRef } from "preact/compat";
import { useImperativeHandle } from "preact/hooks";
import { signal } from "@preact/signals";
import { PlaylistEditorScreen } from "@packages/seed-bible/seed-bible/components/PlaylistEditor/PlaylistEditorScreen";
import { createModalManager } from "@packages/seed-bible/seed-bible/managers/ModalManager";
import type {
  Playlist,
  PlaylistItemData,
  PlaylistManager,
} from "@packages/seed-bible/seed-bible/managers/PlaylistManager";
import type { TabsManager } from "@packages/seed-bible/seed-bible/managers/TabsManager";
import type { ChatsManager } from "@packages/seed-bible/seed-bible/managers/ChatsManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager();
});

interface StubPlaylistItemInputProps {
  id?: string;
  editItem?: PlaylistItemData;
  onAdd: (item: PlaylistItemData) => void;
  onUpdate?: (item: PlaylistItemData) => void;
  onCancelEdit?: () => void;
}

const stubItemInputControl = { isDirty: false };

vi.mock(
  "@packages/seed-bible/seed-bible/components/PlaylistItemInput/PlaylistItemInput",
  () => ({
    PlaylistItemInput: forwardRef(function StubPlaylistItemInput(
      props: StubPlaylistItemInputProps,
      ref
    ) {
      useImperativeHandle(ref, () => ({
        isDirty: () => stubItemInputControl.isDirty,
        commit: () => true,
      }));
      return (
        <div
          id={props.id}
          className={
            props.editItem
              ? "stub-playlist-item-input stub-playlist-item-input--edit"
              : "stub-playlist-item-input stub-playlist-item-input--add"
          }
          data-edit-type={props.editItem?.type}
        >
          <button
            type="button"
            className="stub-update"
            onClick={() =>
              props.onUpdate?.({ type: "html", html: "<p>Changed</p>" })
            }
          >
            update
          </button>
        </div>
      );
    }),
  })
);

vi.mock(
  "@packages/seed-bible/seed-bible/components/HeroImageField/HeroImageField",
  () => ({
    HeroImageField: () => <div className="stub-hero-image-field" />,
  })
);

function verseItem(bookId: string, chapter: number): PlaylistItemData {
  return { type: "bible-verse", ref: { bookId, chapter } };
}

function createPlaylist(items: PlaylistItemData[]): Playlist {
  return {
    id: "playlist-1",
    recordName: "user-1",
    authorUserId: "user-1",
    title: "Angel of the LORD",
    description: null,
    items,
    createdAtMs: 1,
    updatedAtMs: 1,
  };
}

function createMocks(items: PlaylistItemData[]) {
  const editingPlaylist = signal<Playlist | null>(createPlaylist(items));
  const updateEditingPlaylistItem = vi.fn();
  const removeEditingPlaylistItem = vi.fn((index: number) => {
    const current = editingPlaylist.value!;
    editingPlaylist.value = {
      ...current,
      items: current.items.filter((_, i) => i !== index),
    };
  });
  const saveEditingPlaylist = vi.fn().mockResolvedValue(undefined);
  const cancelEditingPlaylist = vi.fn();
  const playlists = {
    editingPlaylist,
    updateEditingPlaylistItem,
    removeEditingPlaylistItem,
    addEditingPlaylistItem: vi.fn(),
    reorderEditingPlaylistItem: vi.fn(),
    updateEditingPlaylistMetadata: vi.fn(),
    saveEditingPlaylist,
    cancelEditingPlaylist,
    isEditingPlaylistDirty: vi.fn(() => false),
    uploadHeroImage: vi.fn(),
  } as unknown as PlaylistManager;
  const tabs = {
    tabs: signal([]),
    selectedTabId: signal(null),
  } as unknown as TabsManager;
  const chats = {
    providers: signal([]),
    chats: signal([]),
  } as unknown as ChatsManager;
  const state = {
    bibleData: undefined,
    os: undefined,
    login: undefined,
    gallery: undefined,
  } as unknown as SeedBibleState;
  return {
    playlists,
    tabs,
    chats,
    state,
    updateEditingPlaylistItem,
    removeEditingPlaylistItem,
    saveEditingPlaylist,
    cancelEditingPlaylist,
  };
}

describe("PlaylistEditorScreen", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    stubItemInputControl.isDirty = false;
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  function renderScreen(items: PlaylistItemData[]) {
    const mocks = createMocks(items);
    act(() => {
      render(
        <PlaylistEditorScreen
          state={mocks.state}
          playlists={mocks.playlists}
          tabs={mocks.tabs}
          modals={createModalManager()}
          chats={mocks.chats}
          openChatPanel={vi.fn()}
        />,
        container
      );
    });
    return mocks;
  }

  const rowButtons = () =>
    container.querySelectorAll<HTMLButtonElement>(".sb-discover-item-button");
  const main = () => container.querySelector(".sb-playlist-editor-main")!;
  const settings = () =>
    container.querySelector(".sb-playlist-editor-settings")!;

  it("starts on the playlist's details, with the steps listed on the left", () => {
    renderScreen([
      { type: "scene", title: "Intro" },
      verseItem("GEN", 16),
      { type: "html", html: "<p>Hi</p>", title: "A note" },
    ]);

    expect(
      container.querySelector<HTMLInputElement>(".sb-playlist-editor-title")
        ?.value
    ).toBe("Angel of the LORD");
    expect(
      container.querySelector(".sb-playlist-editor-summary")?.textContent
    ).toBe("2 steps");
    expect(main().querySelector(".sb-playlist-editor-details")).not.toBeNull();
    expect(main().querySelector(".stub-playlist-item-input")).toBeNull();
    expect(rowButtons()).toHaveLength(3);
    expect(settings().textContent).toContain(
      "Select a step to see its settings."
    );
  });

  it("opens a step's editor in the middle column and its settings on the right", () => {
    renderScreen([verseItem("GEN", 16), { type: "html", html: "<p>Hi</p>" }]);

    act(() => rowButtons()[1]!.click());

    const editorEl = main().querySelector(".stub-playlist-item-input--edit");
    expect(editorEl?.getAttribute("data-edit-type")).toBe("html");
    expect(
      main().querySelector(".sb-playlist-editor-eyebrow")?.textContent
    ).toBe("Step 2 · Text");
    expect(settings().textContent).toContain("Text");
    expect(settings().textContent).toContain("Step 2 of 2");
    // Rows mark the open step but carry no caret: the editor isn't in the row.
    expect(rowButtons()[1]!.getAttribute("aria-current")).toBe("true");
    expect(container.querySelector(".sb-discover-item-caret")).toBeNull();
  });

  it("saving the step's editor updates that step and returns to the details", () => {
    const { updateEditingPlaylistItem } = renderScreen([
      verseItem("GEN", 16),
      { type: "html", html: "<p>Hi</p>" },
    ]);
    act(() => rowButtons()[1]!.click());

    act(() => {
      main().querySelector<HTMLButtonElement>(".stub-update")!.click();
    });

    expect(updateEditingPlaylistItem).toHaveBeenCalledWith(1, {
      type: "html",
      html: "<p>Changed</p>",
    });
    expect(main().querySelector(".sb-playlist-editor-details")).not.toBeNull();
  });

  it("'Delete step' in the settings removes the open step", () => {
    const { removeEditingPlaylistItem } = renderScreen([
      verseItem("GEN", 16),
      { type: "html", html: "<p>Hi</p>" },
    ]);
    act(() => rowButtons()[0]!.click());

    act(() => {
      settings()
        .querySelector<HTMLButtonElement>(".sb-playlist-editor-delete")!
        .click();
    });

    expect(removeEditingPlaylistItem).toHaveBeenCalledWith(0);
    expect(rowButtons()).toHaveLength(1);
    expect(main().querySelector(".sb-playlist-editor-details")).not.toBeNull();
  });

  it("'Add step' brings the add box into the middle column; 'Playlist details' returns", () => {
    renderScreen([verseItem("GEN", 16)]);
    act(() => rowButtons()[0]!.click());

    act(() => {
      container
        .querySelector<HTMLButtonElement>(".sb-playlist-add-toggle")!
        .click();
    });
    expect(
      main().querySelector(".stub-playlist-item-input--add")
    ).not.toBeNull();
    expect(main().querySelector(".stub-playlist-item-input--edit")).toBeNull();

    act(() => {
      container
        .querySelector<HTMLButtonElement>(".sb-playlist-editor-details-row")!
        .click();
    });
    expect(main().querySelector(".sb-playlist-editor-details")).not.toBeNull();
  });

  it("Save saves the playlist and Back leaves the editor", async () => {
    const { saveEditingPlaylist, cancelEditingPlaylist } = renderScreen([
      verseItem("GEN", 16),
    ]);

    await act(async () => {
      Array.from(container.querySelectorAll("button"))
        .find((b) => b.textContent === "Save")
        ?.click();
      await Promise.resolve();
    });
    expect(saveEditingPlaylist).toHaveBeenCalledTimes(1);

    act(() => {
      container
        .querySelector<HTMLButtonElement>(".sb-playlist-editor-back")!
        .click();
    });
    expect(cancelEditingPlaylist).toHaveBeenCalledTimes(1);
  });
});
