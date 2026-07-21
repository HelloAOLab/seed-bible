import { render } from "preact";
import { act } from "preact/test-utils";
import { forwardRef } from "preact/compat";
import { useImperativeHandle } from "preact/hooks";
import { signal } from "@preact/signals";
import { CreatePlaylistForm } from "@packages/seed-bible/seed-bible/components/CreatePlaylistForm/CreatePlaylistForm";
import { createModalManager } from "@packages/seed-bible/seed-bible/managers/ModalManager";
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

/**
 * Lets tests drive the stubbed `PlaylistItemInput`'s imperative handle
 * (`isDirty`/`commit`), which `CreatePlaylistForm` uses to warn before Save
 * discards an in-progress "Add item" draft. Reset in `beforeEach`.
 */
const stubItemInputControl = {
  isDirty: false,
  commitResult: true as boolean | Promise<boolean>,
};

vi.mock(
  "@packages/seed-bible/seed-bible/components/PlaylistItemInput/PlaylistItemInput",
  () => ({
    PlaylistItemInput: forwardRef(function StubPlaylistItemInput(
      props: StubPlaylistItemInputProps,
      ref
    ) {
      useImperativeHandle(ref, () => ({
        isDirty: () => stubItemInputControl.isDirty,
        commit: () => stubItemInputControl.commitResult,
      }));
      return (
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
      );
    }),
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
  reorderEditingPlaylistItem: ReturnType<typeof vi.fn>;
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
  const reorderEditingPlaylistItem = vi.fn((from: number, to: number) => {
    const current = editingPlaylist.value;
    if (!current) return;
    const items = [...current.items];
    const [moved] = items.splice(from, 1);
    if (!moved) return;
    items.splice(to, 0, moved);
    editingPlaylist.value = { ...current, items };
  });

  const playlists = {
    editingPlaylist,
    cancelEditingPlaylist,
    saveEditingPlaylist,
    addEditingPlaylistItem,
    updateEditingPlaylistItem,
    removeEditingPlaylistItem,
    reorderEditingPlaylistItem,
  } as unknown as PlaylistManager;

  return {
    playlists,
    cancelEditingPlaylist,
    saveEditingPlaylist,
    addEditingPlaylistItem,
    updateEditingPlaylistItem,
    removeEditingPlaylistItem,
    reorderEditingPlaylistItem,
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
    stubItemInputControl.isDirty = false;
    stubItemInputControl.commitResult = true;
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    vi.restoreAllMocks();
  });

  // The title input and the header back button now live in the pane header
  // (`DiscoverPaneTitle`), covered by the DiscoverPane test suite.

  it("shows the empty-items message for a fresh playlist", () => {
    const { playlists } = createMockPlaylists(createPlaylist());
    const tabs = createMockTabs();
    const modals = createModalManager();

    act(() => {
      render(
        <CreatePlaylistForm
          playlists={playlists}
          tabs={tabs}
          modals={modals}
        />,
        container
      );
    });

    expect(container.querySelector(".sb-discover-empty")?.textContent).toBe(
      "No items yet."
    );
  });

  it("calls cancelEditingPlaylist from the Cancel button", () => {
    const { playlists, cancelEditingPlaylist } =
      createMockPlaylists(createPlaylist());
    const tabs = createMockTabs();
    const modals = createModalManager();

    act(() => {
      render(
        <CreatePlaylistForm
          playlists={playlists}
          tabs={tabs}
          modals={modals}
        />,
        container
      );
    });

    const cancelButton = Array.from(
      container.querySelectorAll(".sb-reading-plans-back")
    ).find((el) => el.textContent === "Cancel") as HTMLButtonElement;
    act(() => {
      cancelButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(cancelEditingPlaylist).toHaveBeenCalledTimes(1);
  });

  it("lists items using their resolved label and falls back to the raw book id", () => {
    const { playlists } = createMockPlaylists(
      createPlaylist({ items: [verseItem("GEN", 1)] })
    );
    const tabs = createMockTabs();
    const modals = createModalManager();

    act(() => {
      render(
        <CreatePlaylistForm
          playlists={playlists}
          tabs={tabs}
          modals={modals}
        />,
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
    const modals = createModalManager();

    act(() => {
      render(
        <CreatePlaylistForm
          playlists={playlists}
          tabs={tabs}
          modals={modals}
        />,
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
    const modals = createModalManager();

    act(() => {
      render(
        <CreatePlaylistForm
          playlists={playlists}
          tabs={tabs}
          modals={modals}
        />,
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
    const modals = createModalManager();

    act(() => {
      render(
        <CreatePlaylistForm
          playlists={playlists}
          tabs={tabs}
          modals={modals}
        />,
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
    const modals = createModalManager();

    act(() => {
      render(
        <CreatePlaylistForm
          playlists={playlists}
          tabs={tabs}
          modals={modals}
        />,
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
    const modals = createModalManager();

    act(() => {
      render(
        <CreatePlaylistForm
          playlists={playlists}
          tabs={tabs}
          modals={modals}
        />,
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
    const modals = createModalManager();

    act(() => {
      render(
        <CreatePlaylistForm
          playlists={playlists}
          tabs={tabs}
          modals={modals}
        />,
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
    const modals = createModalManager();

    act(() => {
      render(
        <CreatePlaylistForm
          playlists={playlists}
          tabs={tabs}
          modals={modals}
        />,
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
    const modals = createModalManager();

    act(() => {
      render(
        <CreatePlaylistForm
          playlists={playlists}
          tabs={tabs}
          modals={modals}
        />,
        container
      );
    });

    const saveButton = container.querySelector(
      ".sb-settings-save-button"
    ) as HTMLButtonElement;
    expect(saveButton.disabled).toBe(false);
    expect(saveButton.textContent).toBe("Save");

    await act(async () => {
      saveButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });
    expect(saveButton.disabled).toBe(true);
    expect(saveButton.textContent).toBe("Saving…");

    await act(async () => {
      rejectSave?.(new Error("save failed"));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(consoleError).toHaveBeenCalled();
    expect(saveButton.disabled).toBe(false);
    expect(saveButton.textContent).toBe("Save");
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
    const modals = createModalManager();

    act(() => {
      render(
        <CreatePlaylistForm
          playlists={playlists}
          tabs={tabs}
          modals={modals}
        />,
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

  it("shows a leading icon per item type", () => {
    const { playlists } = createMockPlaylists(
      createPlaylist({
        items: [
          verseItem("GEN", 1),
          { type: "link", url: "https://example.com" },
          { type: "html", html: "<p>hi</p>" },
        ],
      })
    );
    const tabs = createMockTabs();
    const modals = createModalManager();

    act(() => {
      render(
        <CreatePlaylistForm
          playlists={playlists}
          tabs={tabs}
          modals={modals}
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
    let offsetHeightSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      offsetHeightSpy = vi
        .spyOn(HTMLLIElement.prototype, "offsetHeight", "get")
        .mockReturnValue(40);
    });

    afterEach(() => {
      offsetHeightSpy.mockRestore();
    });

    it("shows a drag handle for each item", () => {
      const { playlists } = createMockPlaylists(
        createPlaylist({
          items: [verseItem("GEN", 1), verseItem("GEN", 2)],
        })
      );
      const tabs = createMockTabs();
      const modals = createModalManager();

      act(() => {
        render(
          <CreatePlaylistForm
            playlists={playlists}
            tabs={tabs}
            modals={modals}
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

    it("dragging an item's handle reorders it and keeps the edited item selected", () => {
      const { playlists, reorderEditingPlaylistItem } = createMockPlaylists(
        createPlaylist({
          items: [
            verseItem("GEN", 1),
            verseItem("GEN", 2),
            verseItem("GEN", 3),
          ],
        })
      );
      const tabs = createMockTabs();
      const modals = createModalManager();

      act(() => {
        render(
          <CreatePlaylistForm
            playlists={playlists}
            tabs={tabs}
            modals={modals}
          />,
          container
        );
      });

      // Start editing the first item (index 0, "GEN 1").
      const itemButtons = container.querySelectorAll(
        ".sb-discover-item-button"
      );
      act(() => {
        itemButtons[0]?.dispatchEvent(
          new MouseEvent("click", { bubbles: true })
        );
      });

      // Drag it past the second item.
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

      expect(reorderEditingPlaylistItem).toHaveBeenCalledWith(0, 1);
      expect(playlists.editingPlaylist.value?.items).toEqual([
        verseItem("GEN", 2),
        verseItem("GEN", 1),
        verseItem("GEN", 3),
      ]);

      // The edit target followed the dragged item to its new position.
      const rows = container.querySelectorAll(".sb-discover-item--row");
      expect(rows[0]?.classList.contains("sb-discover-item--editing")).toBe(
        false
      );
      expect(rows[1]?.classList.contains("sb-discover-item--editing")).toBe(
        true
      );
    });

    it("clicking the edit button still works with the drag handle present", () => {
      const { playlists } = createMockPlaylists(
        createPlaylist({
          items: [verseItem("GEN", 1), verseItem("GEN", 2)],
        })
      );
      const tabs = createMockTabs();
      const modals = createModalManager();

      act(() => {
        render(
          <CreatePlaylistForm
            playlists={playlists}
            tabs={tabs}
            modals={modals}
          />,
          container
        );
      });

      const itemButtons = container.querySelectorAll(
        ".sb-discover-item-button"
      );
      act(() => {
        itemButtons[1]?.dispatchEvent(
          new MouseEvent("click", { bubbles: true })
        );
      });

      const rows = container.querySelectorAll(".sb-discover-item--row");
      expect(rows[1]?.classList.contains("sb-discover-item--editing")).toBe(
        true
      );
    });
  });

  describe("unsaved Add Item content", () => {
    it("clicking Save with a clean draft saves directly, without a confirm dialog", () => {
      const { playlists, saveEditingPlaylist } =
        createMockPlaylists(createPlaylist());
      const tabs = createMockTabs();
      const modals = createModalManager();
      stubItemInputControl.isDirty = false;

      act(() => {
        render(
          <CreatePlaylistForm
            playlists={playlists}
            tabs={tabs}
            modals={modals}
          />,
          container
        );
      });

      const saveButton = container.querySelector(
        ".sb-settings-save-button"
      ) as HTMLButtonElement;
      act(() => {
        saveButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });

      expect(saveEditingPlaylist).toHaveBeenCalledTimes(1);
      expect(modals.modals.value).toHaveLength(0);
    });

    it("clicking Save with a dirty draft opens a confirm dialog instead of saving", () => {
      const { playlists, saveEditingPlaylist } =
        createMockPlaylists(createPlaylist());
      const tabs = createMockTabs();
      const modals = createModalManager();
      stubItemInputControl.isDirty = true;

      act(() => {
        render(
          <CreatePlaylistForm
            playlists={playlists}
            tabs={tabs}
            modals={modals}
          />,
          container
        );
      });

      const saveButton = container.querySelector(
        ".sb-settings-save-button"
      ) as HTMLButtonElement;
      act(() => {
        saveButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });

      expect(saveEditingPlaylist).not.toHaveBeenCalled();
      const modal = modals.modals.value.find(
        (m) => m.id === "playlist-unsaved-item-confirm"
      );
      expect(modal).not.toBeUndefined();
    });

    it("does not warn about a dirty draft while mid-edit of an existing item", () => {
      const { playlists, saveEditingPlaylist } = createMockPlaylists(
        createPlaylist({ items: [verseItem("GEN", 1)] })
      );
      const tabs = createMockTabs();
      const modals = createModalManager();
      stubItemInputControl.isDirty = true;

      act(() => {
        render(
          <CreatePlaylistForm
            playlists={playlists}
            tabs={tabs}
            modals={modals}
          />,
          container
        );
      });

      act(() => {
        container
          .querySelector(".sb-discover-item-button")
          ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });

      const saveButton = container.querySelector(
        ".sb-settings-save-button"
      ) as HTMLButtonElement;
      act(() => {
        saveButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });

      expect(saveEditingPlaylist).toHaveBeenCalledTimes(1);
      expect(modals.modals.value).toHaveLength(0);
    });

    /** Opens the confirm dialog and renders its content into a side container. */
    function openConfirmDialog(
      container: HTMLDivElement,
      modals: ReturnType<typeof createModalManager>
    ): HTMLDivElement {
      const saveButton = container.querySelector(
        ".sb-settings-save-button"
      ) as HTMLButtonElement;
      act(() => {
        saveButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });

      const modal = modals.modals.value.find(
        (m) => m.id === "playlist-unsaved-item-confirm"
      );
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
      return modalContainer;
    }

    it("'Back' closes the dialog without saving, leaving the draft untouched", () => {
      const { playlists, saveEditingPlaylist } =
        createMockPlaylists(createPlaylist());
      const tabs = createMockTabs();
      const modals = createModalManager();
      stubItemInputControl.isDirty = true;

      act(() => {
        render(
          <CreatePlaylistForm
            playlists={playlists}
            tabs={tabs}
            modals={modals}
          />,
          container
        );
      });

      const modalContainer = openConfirmDialog(container, modals);
      const backButton = Array.from(
        modalContainer.querySelectorAll("button")
      ).find((el) => el.textContent === "Back") as HTMLButtonElement;

      act(() => {
        backButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });

      expect(saveEditingPlaylist).not.toHaveBeenCalled();
      expect(
        modals.modals.value.some(
          (m) => m.id === "playlist-unsaved-item-confirm"
        )
      ).toBe(false);

      render(null, modalContainer);
      modalContainer.remove();
    });

    it("'Discard and save' saves without committing the draft", () => {
      const { playlists, saveEditingPlaylist, addEditingPlaylistItem } =
        createMockPlaylists(createPlaylist());
      const tabs = createMockTabs();
      const modals = createModalManager();
      stubItemInputControl.isDirty = true;

      act(() => {
        render(
          <CreatePlaylistForm
            playlists={playlists}
            tabs={tabs}
            modals={modals}
          />,
          container
        );
      });

      const modalContainer = openConfirmDialog(container, modals);
      const discardButton = Array.from(
        modalContainer.querySelectorAll("button")
      ).find(
        (el) => el.textContent === "Discard and save"
      ) as HTMLButtonElement;

      act(() => {
        discardButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });

      expect(addEditingPlaylistItem).not.toHaveBeenCalled();
      expect(saveEditingPlaylist).toHaveBeenCalledTimes(1);

      render(null, modalContainer);
      modalContainer.remove();
    });

    it("'Add and save' commits the draft, then saves, when the draft is valid", async () => {
      const { playlists, saveEditingPlaylist } =
        createMockPlaylists(createPlaylist());
      const tabs = createMockTabs();
      const modals = createModalManager();
      stubItemInputControl.isDirty = true;
      stubItemInputControl.commitResult = true;

      act(() => {
        render(
          <CreatePlaylistForm
            playlists={playlists}
            tabs={tabs}
            modals={modals}
          />,
          container
        );
      });

      const modalContainer = openConfirmDialog(container, modals);
      const addAndSaveButton = Array.from(
        modalContainer.querySelectorAll("button")
      ).find((el) => el.textContent === "Add and save") as HTMLButtonElement;

      await act(async () => {
        addAndSaveButton.dispatchEvent(
          new MouseEvent("click", { bubbles: true })
        );
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(saveEditingPlaylist).toHaveBeenCalledTimes(1);

      render(null, modalContainer);
      modalContainer.remove();
    });

    it("'Add and save' does not save when the draft fails to commit (e.g. invalid input)", async () => {
      const { playlists, saveEditingPlaylist } =
        createMockPlaylists(createPlaylist());
      const tabs = createMockTabs();
      const modals = createModalManager();
      stubItemInputControl.isDirty = true;
      stubItemInputControl.commitResult = false;

      act(() => {
        render(
          <CreatePlaylistForm
            playlists={playlists}
            tabs={tabs}
            modals={modals}
          />,
          container
        );
      });

      const modalContainer = openConfirmDialog(container, modals);
      const addAndSaveButton = Array.from(
        modalContainer.querySelectorAll("button")
      ).find((el) => el.textContent === "Add and save") as HTMLButtonElement;

      await act(async () => {
        addAndSaveButton.dispatchEvent(
          new MouseEvent("click", { bubbles: true })
        );
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(saveEditingPlaylist).not.toHaveBeenCalled();

      render(null, modalContainer);
      modalContainer.remove();
    });
  });
});
