import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { CreatePlaylistForm } from "@packages/seed-bible/seed-bible/components/CreatePlaylistForm/CreatePlaylistForm";
import type {
  Playlist,
  PlaylistItemData,
  PlaylistManager,
} from "@packages/seed-bible/seed-bible/managers/PlaylistManager";
import type {
  TabsManager,
  ReaderTab,
} from "@packages/seed-bible/seed-bible/managers/TabsManager";
import type { TranslationBook } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";

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

interface StubPlaylistItemInputProps {
  editItem?: PlaylistItemData;
  editScriptureText?: string;
  onAdd: (item: PlaylistItemData) => void;
  onUpdate?: (item: PlaylistItemData) => void;
  onCancelEdit?: () => void;
}

const STUB_ADDED_ITEM: PlaylistItemData = {
  type: "bible-verse",
  ref: { bookId: "EXO", chapter: 5 },
};
const STUB_UPDATED_ITEM: PlaylistItemData = {
  type: "bible-verse",
  ref: { bookId: "EXO", chapter: 6 },
};

vi.mock(
  "@packages/seed-bible/seed-bible/components/PlaylistItemInput/PlaylistItemInput",
  () => ({
    PlaylistItemInput: (props: StubPlaylistItemInputProps) => (
      <div className="stub-playlist-item-input">
        <span className="stub-edit-scripture-text">
          {props.editScriptureText ?? ""}
        </span>
        <button
          type="button"
          className="stub-add"
          onClick={() => props.onAdd(STUB_ADDED_ITEM)}
        >
          add
        </button>
        <button
          type="button"
          className="stub-update"
          onClick={() => props.onUpdate?.(STUB_UPDATED_ITEM)}
        >
          update
        </button>
        <button
          type="button"
          className="stub-cancel"
          onClick={() => props.onCancelEdit?.()}
        >
          cancel
        </button>
      </div>
    ),
  })
);

function createPlaylist(overrides: Partial<Playlist> = {}): Playlist {
  return {
    id: "playlist-1",
    recordName: "user-1",
    authorUserId: "user-1",
    title: null,
    description: null,
    items: [],
    createdAtMs: 1,
    updatedAtMs: 1,
    ...overrides,
  };
}

function verseItem(bookId: string, chapter: number): PlaylistItemData {
  return { type: "bible-verse", ref: { bookId, chapter } };
}

interface MockPlaylistsResult {
  playlists: PlaylistManager;
  cancelEditingPlaylist: ReturnType<typeof vi.fn>;
  saveEditingPlaylist: ReturnType<typeof vi.fn>;
  addEditingPlaylistItem: ReturnType<typeof vi.fn>;
  updateEditingPlaylistItem: ReturnType<typeof vi.fn>;
  removeEditingPlaylistItem: ReturnType<typeof vi.fn>;
}

function createMockPlaylists(editing: Playlist | null): MockPlaylistsResult {
  const editingPlaylist = signal(editing);
  const cancelEditingPlaylist = vi.fn();
  const saveEditingPlaylist = vi.fn().mockResolvedValue(undefined);
  const addEditingPlaylistItem = vi.fn();
  const updateEditingPlaylistItem = vi.fn();
  const removeEditingPlaylistItem = vi.fn((index: number) => {
    const current = editingPlaylist.value;
    if (!current) return;
    editingPlaylist.value = {
      ...current,
      items: current.items.filter((_, i) => i !== index),
    };
  });

  const playlists = {
    editingPlaylist,
    cancelEditingPlaylist,
    saveEditingPlaylist,
    addEditingPlaylistItem,
    updateEditingPlaylistItem,
    removeEditingPlaylistItem,
  } as unknown as PlaylistManager;

  return {
    playlists,
    cancelEditingPlaylist,
    saveEditingPlaylist,
    addEditingPlaylistItem,
    updateEditingPlaylistItem,
    removeEditingPlaylistItem,
  };
}

function createMockTabs(tab: ReaderTab | null = null): TabsManager {
  return {
    tabs: signal(tab ? [tab] : []),
    selectedTabId: signal(tab?.id ?? null),
  } as unknown as TabsManager;
}

function book(id: string, name: string): TranslationBook {
  return { id, name, commonName: name } as TranslationBook;
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

describe("CreatePlaylistForm", () => {
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

  function titleInput(): HTMLInputElement {
    return container.querySelector(".sb-playlist-input") as HTMLInputElement;
  }

  it("shows an empty title and empty-items message for a fresh playlist", () => {
    const { playlists } = createMockPlaylists(createPlaylist());
    const tabs = createMockTabs();

    act(() => {
      render(
        <CreatePlaylistForm playlists={playlists} tabs={tabs} />,
        container
      );
    });

    expect(titleInput().value).toBe("");
    expect(container.querySelector(".sb-discover-empty")?.textContent).toBe(
      "No items yet."
    );
  });

  it("typing a title updates editingPlaylist.title", () => {
    const { playlists } = createMockPlaylists(createPlaylist());
    const tabs = createMockTabs();

    act(() => {
      render(
        <CreatePlaylistForm playlists={playlists} tabs={tabs} />,
        container
      );
    });

    act(() => {
      const input = titleInput();
      input.value = "Morning Devotion";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });

    expect(playlists.editingPlaylist.value?.title).toBe("Morning Devotion");
  });

  it("stores a whitespace-only title as null", () => {
    const { playlists } = createMockPlaylists(
      createPlaylist({ title: "Something" })
    );
    const tabs = createMockTabs();

    act(() => {
      render(
        <CreatePlaylistForm playlists={playlists} tabs={tabs} />,
        container
      );
    });

    act(() => {
      const input = titleInput();
      input.value = "   ";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });

    expect(playlists.editingPlaylist.value?.title).toBeNull();
  });

  it("calls cancelEditingPlaylist from both the back button and the Cancel button", () => {
    const { playlists, cancelEditingPlaylist } =
      createMockPlaylists(createPlaylist());
    const tabs = createMockTabs();

    act(() => {
      render(
        <CreatePlaylistForm playlists={playlists} tabs={tabs} />,
        container
      );
    });

    const backButton = container.querySelector(
      ".sb-discover-header .sb-reading-plans-back"
    ) as HTMLButtonElement;
    act(() => {
      backButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(cancelEditingPlaylist).toHaveBeenCalledTimes(1);

    const cancelButton = Array.from(
      container.querySelectorAll(".sb-reading-plans-back")
    ).find((el) => el.textContent === "Cancel") as HTMLButtonElement;
    act(() => {
      cancelButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(cancelEditingPlaylist).toHaveBeenCalledTimes(2);
  });

  it("lists items using their resolved label and falls back to the raw book id", () => {
    const { playlists } = createMockPlaylists(
      createPlaylist({ items: [verseItem("GEN", 1)] })
    );
    const tabs = createMockTabs();

    act(() => {
      render(
        <CreatePlaylistForm playlists={playlists} tabs={tabs} />,
        container
      );
    });

    expect(
      container.querySelector(".sb-discover-item-title")?.textContent
    ).toBe("GEN 1");
  });

  it("resolves book names from the selected tab's translation", () => {
    const { playlists } = createMockPlaylists(
      createPlaylist({ items: [verseItem("GEN", 1)] })
    );
    const tab = createMockTab([book("GEN", "Genesis")]);
    const tabs = createMockTabs(tab);

    act(() => {
      render(
        <CreatePlaylistForm playlists={playlists} tabs={tabs} />,
        container
      );
    });

    expect(
      container.querySelector(".sb-discover-item-title")?.textContent
    ).toBe("Genesis 1");
  });

  it("marks the clicked item as being edited and seeds the input's editScriptureText", () => {
    const { playlists } = createMockPlaylists(
      createPlaylist({
        items: [verseItem("GEN", 1), verseItem("GEN", 2)],
      })
    );
    const tab = createMockTab([book("GEN", "Genesis")]);
    const tabs = createMockTabs(tab);

    act(() => {
      render(
        <CreatePlaylistForm playlists={playlists} tabs={tabs} />,
        container
      );
    });

    const itemButtons = container.querySelectorAll(".sb-discover-item-button");
    act(() => {
      itemButtons[1]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const items = container.querySelectorAll(".sb-discover-item--row");
    expect(items[0]?.classList.contains("sb-discover-item--editing")).toBe(
      false
    );
    expect(items[1]?.classList.contains("sb-discover-item--editing")).toBe(
      true
    );
    expect(itemButtons[1]?.getAttribute("aria-current")).toBe("true");
    expect(
      container.querySelector(".stub-edit-scripture-text")?.textContent
    ).toBe("Genesis 2");
  });

  it("adding an item via the input calls addEditingPlaylistItem", () => {
    const { playlists, addEditingPlaylistItem } =
      createMockPlaylists(createPlaylist());
    const tabs = createMockTabs();

    act(() => {
      render(
        <CreatePlaylistForm playlists={playlists} tabs={tabs} />,
        container
      );
    });

    const addButton = container.querySelector(".stub-add") as HTMLButtonElement;
    act(() => {
      addButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(addEditingPlaylistItem).toHaveBeenCalledWith(STUB_ADDED_ITEM);
  });

  it("saving an edit calls updateEditingPlaylistItem with the edited index and exits edit mode", () => {
    const { playlists, updateEditingPlaylistItem } = createMockPlaylists(
      createPlaylist({ items: [verseItem("GEN", 1)] })
    );
    const tabs = createMockTabs();

    act(() => {
      render(
        <CreatePlaylistForm playlists={playlists} tabs={tabs} />,
        container
      );
    });

    act(() => {
      container
        .querySelector(".sb-discover-item-button")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(
      container
        .querySelector(".sb-discover-item--row")
        ?.classList.contains("sb-discover-item--editing")
    ).toBe(true);

    act(() => {
      container
        .querySelector(".stub-update")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(updateEditingPlaylistItem).toHaveBeenCalledWith(
      0,
      STUB_UPDATED_ITEM
    );
    expect(
      container
        .querySelector(".sb-discover-item--row")
        ?.classList.contains("sb-discover-item--editing")
    ).toBe(false);
  });

  it("cancelling an edit exits edit mode without calling update", () => {
    const { playlists, updateEditingPlaylistItem } = createMockPlaylists(
      createPlaylist({ items: [verseItem("GEN", 1)] })
    );
    const tabs = createMockTabs();

    act(() => {
      render(
        <CreatePlaylistForm playlists={playlists} tabs={tabs} />,
        container
      );
    });

    act(() => {
      container
        .querySelector(".sb-discover-item-button")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    act(() => {
      container
        .querySelector(".stub-cancel")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(updateEditingPlaylistItem).not.toHaveBeenCalled();
    expect(
      container
        .querySelector(".sb-discover-item--row")
        ?.classList.contains("sb-discover-item--editing")
    ).toBe(false);
  });

  it("deleting the item currently being edited drops out of edit mode", () => {
    const { playlists, removeEditingPlaylistItem } = createMockPlaylists(
      createPlaylist({ items: [verseItem("GEN", 1), verseItem("GEN", 2)] })
    );
    const tabs = createMockTabs();

    act(() => {
      render(
        <CreatePlaylistForm playlists={playlists} tabs={tabs} />,
        container
      );
    });

    const itemButtons = container.querySelectorAll(".sb-discover-item-button");
    act(() => {
      itemButtons[1]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const deleteButtons = container.querySelectorAll(
      ".sb-discover-item-delete"
    );
    act(() => {
      deleteButtons[1]?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      );
    });

    expect(removeEditingPlaylistItem).toHaveBeenCalledWith(1);
    expect(playlists.editingPlaylist.value?.items).toHaveLength(1);
    expect(container.querySelector(".sb-discover-item--editing")).toBeNull();
  });

  it("deleting an item before the one being edited shifts the edit index down", () => {
    const { playlists } = createMockPlaylists(
      createPlaylist({
        items: [verseItem("GEN", 1), verseItem("GEN", 2), verseItem("GEN", 3)],
      })
    );
    const tabs = createMockTabs();

    act(() => {
      render(
        <CreatePlaylistForm playlists={playlists} tabs={tabs} />,
        container
      );
    });

    // Start editing the last item (index 2, "GEN 3").
    const itemButtons = container.querySelectorAll(".sb-discover-item-button");
    act(() => {
      itemButtons[2]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    // Delete the first item (index 0); the edited item is now at index 1.
    const deleteButtons = container.querySelectorAll(
      ".sb-discover-item-delete"
    );
    act(() => {
      deleteButtons[0]?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      );
    });

    expect(playlists.editingPlaylist.value?.items).toHaveLength(2);
    const rows = container.querySelectorAll(".sb-discover-item--row");
    expect(rows[0]?.classList.contains("sb-discover-item--editing")).toBe(
      false
    );
    expect(rows[1]?.classList.contains("sb-discover-item--editing")).toBe(true);
  });

  it("disables the Save button while saving and re-enables it if saving fails", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    let rejectSave: ((error: Error) => void) | null = null;
    const { playlists } = createMockPlaylists(createPlaylist());
    (
      playlists.saveEditingPlaylist as ReturnType<typeof vi.fn>
    ).mockImplementation(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectSave = reject;
        })
    );
    const tabs = createMockTabs();

    act(() => {
      render(
        <CreatePlaylistForm playlists={playlists} tabs={tabs} />,
        container
      );
    });

    const saveButton = container.querySelector(
      ".sb-settings-save-button"
    ) as HTMLButtonElement;
    expect(saveButton.disabled).toBe(false);

    await act(async () => {
      saveButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });
    expect(saveButton.disabled).toBe(true);

    await act(async () => {
      rejectSave?.(new Error("save failed"));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(consoleError).toHaveBeenCalled();
    expect(saveButton.disabled).toBe(false);
  });

  it("does not call saveEditingPlaylist twice for a double click while saving", async () => {
    const { playlists, saveEditingPlaylist } =
      createMockPlaylists(createPlaylist());
    let resolveSave: (() => void) | undefined;
    saveEditingPlaylist.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve;
        })
    );
    const tabs = createMockTabs();

    act(() => {
      render(
        <CreatePlaylistForm playlists={playlists} tabs={tabs} />,
        container
      );
    });

    const saveButton = container.querySelector(
      ".sb-settings-save-button"
    ) as HTMLButtonElement;

    await act(async () => {
      saveButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });
    await act(async () => {
      saveButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(saveEditingPlaylist).toHaveBeenCalledTimes(1);
    resolveSave?.();
  });
});
