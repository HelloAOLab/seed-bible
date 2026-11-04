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

const stubItemInputControl = { isDirty: false, commits: true };

vi.mock(
  "@packages/seed-bible/seed-bible/components/PlaylistItemInput/PlaylistItemInput",
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import("@packages/seed-bible/seed-bible/components/PlaylistItemInput/PlaylistItemInput")
    >()),
    PlaylistItemInput: forwardRef(function StubPlaylistItemInput(
      props: StubPlaylistItemInputProps,
      ref
    ) {
      useImperativeHandle(ref, () => ({
        isDirty: () => stubItemInputControl.isDirty,
        commit: () => {
          if (!stubItemInputControl.commits) {
            return false;
          }
          props.onUpdate?.({ type: "html", html: "<p>Changed</p>" });
          stubItemInputControl.isDirty = false;
          return true;
        },
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

function createPlaylist(
  items: PlaylistItemData[],
  overrides: Partial<Playlist> = {}
): Playlist {
  return {
    id: "playlist-1",
    recordName: "user-1",
    authorUserId: "user-1",
    title: "Angel of the LORD",
    description: null,
    items,
    createdAtMs: 1,
    updatedAtMs: 1,
    ...overrides,
  };
}

interface MockOptions {
  playlist?: Partial<Playlist>;
  mobile?: boolean;
}

function createMocks(items: PlaylistItemData[], options: MockOptions = {}) {
  const editingPlaylist = signal<Playlist | null>(
    createPlaylist(items, options.playlist)
  );
  const updateEditingPlaylistItem = vi.fn(
    (index: number, item: PlaylistItemData) => {
      const current = editingPlaylist.value!;
      editingPlaylist.value = {
        ...current,
        items: current.items.map((old, i) => (i === index ? item : old)),
      };
    }
  );
  const updateEditingPlaylistMetadata = vi.fn((updates: Partial<Playlist>) => {
    editingPlaylist.value = { ...editingPlaylist.value!, ...updates };
  });
  const reorderEditingPlaylistItem = vi.fn((from: number, to: number) => {
    const next = [...editingPlaylist.value!.items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved!);
    editingPlaylist.value = { ...editingPlaylist.value!, items: next };
  });
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
    insertEditingPlaylistItem: vi.fn(),
    reorderEditingPlaylistItem,
    userPlaylists: signal([]),
    updateEditingPlaylistMetadata,
    saveEditingPlaylist,
    cancelEditingPlaylist,
    isEditingPlaylistDirty: vi.fn(() => false),
    uploadHeroImage: vi.fn(),
  } as unknown as PlaylistManager;
  // A tab reading a translation with a couple of books, so references read
  // and the passage card can name the translation.
  const tab = {
    id: "tab-1",
    readingState: {
      translationId: signal("AAB"),
      translation: signal({ shortName: "AAB" }),
      translationBooks: signal({
        books: [
          {
            id: "GEN",
            name: "Genesis",
            commonName: "Genesis",
            numberOfChapters: 50,
            firstChapterNumber: 1,
          },
          {
            id: "EXO",
            name: "Exodus",
            commonName: "Exodus",
            numberOfChapters: 40,
            firstChapterNumber: 1,
          },
        ],
      }),
    },
  };
  const tabs = {
    tabs: signal([tab]),
    selectedTabId: signal("tab-1"),
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
    app: { isMobile: signal(options.mobile ?? false) },
  } as unknown as SeedBibleState;
  return {
    playlists,
    tabs,
    chats,
    state,
    updateEditingPlaylistItem,
    updateEditingPlaylistMetadata,
    reorderEditingPlaylistItem,
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
    stubItemInputControl.commits = true;
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  function renderScreen(items: PlaylistItemData[], options?: MockOptions) {
    const mocks = createMocks(items, options);
    const modals = createModalManager();
    act(() => {
      render(
        <PlaylistEditorScreen
          state={mocks.state}
          playlists={mocks.playlists}
          tabs={mocks.tabs}
          modals={modals}
          chats={mocks.chats}
          openChatPanel={vi.fn()}
        />,
        container
      );
    });
    return { ...mocks, modals };
  }

  const rowButtons = () =>
    container.querySelectorAll<HTMLButtonElement>(".sb-discover-item-button");
  const main = () => container.querySelector(".sb-playlist-editor-main")!;
  const settings = () =>
    container.querySelector(".sb-playlist-editor-settings")!;

  it("starts with no step open: the numbered steps, with the length in the head", () => {
    renderScreen([
      verseItem("GEN", 16),
      { type: "html", html: "<p>Hi</p>", title: "A note" },
    ]);

    expect(
      container.querySelector<HTMLInputElement>(".sb-playlist-editor-title")
        ?.value
    ).toBe("Angel of the LORD");
    expect(
      container.querySelector(".sb-playlist-editor-summary")?.textContent
    ).toBe("Draft · not saved yet");
    expect(
      container.querySelector(".sb-playlist-editor-column-count")?.textContent
    ).toBe("2 · ~5 min");
    expect(
      Array.from(
        container.querySelectorAll(".sb-playlist-editor-item-number")
      ).map((el) => el.textContent)
    ).toEqual(["1", "2"]);
    expect(
      Array.from(
        container.querySelectorAll(".sb-playlist-editor-item-subtitle")
      ).map((el) => el.textContent)
    ).toEqual(["Scripture · 4 min", "Note · 1 min"]);
    expect(main().textContent).toContain("Pick a step on the left");
    expect(main().querySelector(".stub-playlist-item-input")).toBeNull();
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
    ).toBe("Step 2 · Note");
    const types = Array.from(
      settings().querySelectorAll<HTMLButtonElement>(".sb-playlist-editor-type")
    );
    expect(types.map((b) => b.textContent)).toEqual([
      "Note",
      "Scripture",
      "Note + Scripture",
      "Compare",
      "Video",
      "Question",
    ]);
    expect(types[0]!.getAttribute("aria-checked")).toBe("true");
    expect(
      settings().querySelector(".sb-playlist-editor-time-value")?.textContent
    ).toBe("1 min");
    expect(settings().textContent).toContain("Pause here for discussion");
    // Rows mark the open step but carry no caret: the editor isn't in the row.
    expect(rowButtons()[1]!.getAttribute("aria-current")).toBe("true");
    expect(container.querySelector(".sb-discover-item-caret")).toBeNull();
  });

  it("saving the step's editor updates that step, keeping its settings, and stays on it", () => {
    const { updateEditingPlaylistItem } = renderScreen([
      verseItem("GEN", 16),
      { type: "html", html: "<p>Hi</p>", pause: true, minutes: 3 },
    ]);
    act(() => rowButtons()[1]!.click());

    act(() => {
      main().querySelector<HTMLButtonElement>(".stub-update")!.click();
    });

    expect(updateEditingPlaylistItem).toHaveBeenCalledWith(1, {
      type: "html",
      html: "<p>Changed</p>",
      pause: true,
      minutes: 3,
    });
    expect(
      main().querySelector(".stub-playlist-item-input--edit")
    ).not.toBeNull();
  });

  it("the settings set the step's length and group-session flags", () => {
    const { updateEditingPlaylistItem } = renderScreen([
      { type: "html", html: "<p>Hi</p>" },
    ]);
    act(() => rowButtons()[0]!.click());

    act(() => {
      settings()
        .querySelector<HTMLInputElement>(".sb-playlist-editor-check input")!
        .click();
    });
    expect(updateEditingPlaylistItem).toHaveBeenLastCalledWith(0, {
      type: "html",
      html: "<p>Hi</p>",
      pause: true,
    });

    act(() => {
      Array.from(
        settings().querySelectorAll<HTMLButtonElement>(
          ".sb-playlist-editor-time-link"
        )
      )
        .find((b) => b.textContent === "edit")!
        .click();
    });
    const input = settings().querySelector<HTMLInputElement>(
      ".sb-playlist-editor-time-input"
    )!;
    act(() => {
      input.value = "6";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(updateEditingPlaylistItem).toHaveBeenLastCalledWith(0, {
      type: "html",
      html: "<p>Hi</p>",
      pause: true,
      minutes: 6,
    });
  });

  it("picking another type opens the Add-a-step modal, whose step takes the open step's place with its settings", () => {
    const { updateEditingPlaylistItem, modals } = renderScreen([
      verseItem("GEN", 16),
      { type: "html", html: "<p>Hi</p>", pause: true, minutes: 3 },
    ]);
    act(() => rowButtons()[1]!.click());

    act(() => {
      Array.from(
        settings().querySelectorAll<HTMLButtonElement>(
          ".sb-playlist-editor-type"
        )
      )
        .find((b) => b.textContent === "Question")!
        .click();
    });
    const modal = modals.modals.value.find(
      (m) => m.id === "playlist-add-step"
    )!;
    expect(modal.title).toBe("Change the step's type");

    const host = document.createElement("div");
    document.body.appendChild(host);
    act(() => {
      render(<>{modal.content({ t: (key: string) => key })}</>, host);
    });
    const field = host.querySelector<HTMLTextAreaElement>(
      ".sb-add-step-fields textarea"
    )!;
    act(() => {
      field.value = "Why?";
      field.dispatchEvent(new Event("input", { bubbles: true }));
    });
    act(() => {
      Array.from(host.querySelectorAll("button"))
        .find((b) => b.textContent?.startsWith("Add step"))!
        .click();
    });
    render(null, host);
    host.remove();

    expect(updateEditingPlaylistItem).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        type: "question",
        prompt: "Why?",
        pause: true,
        minutes: 3,
      })
    );
    expect(modals.modals.value).toHaveLength(0);
    // The editor stays open, now on the step's new kind.
    expect(
      main()
        .querySelector(".stub-playlist-item-input--edit")
        ?.getAttribute("data-edit-type")
    ).toBe("question");
    expect(
      main().querySelector(".sb-playlist-editor-eyebrow")?.textContent
    ).toBe("Step 2 · Question");
    expect(rowButtons()[1]!.getAttribute("aria-current")).toBe("true");
  });

  it("warns when a step repeats the passage before it, and can drop the earlier one", () => {
    const { removeEditingPlaylistItem } = renderScreen([
      verseItem("GEN", 16),
      verseItem("GEN", 16),
    ]);
    expect(
      container.querySelectorAll(".sb-playlist-editor-item-warning")
    ).toHaveLength(1);
    act(() => rowButtons()[1]!.click());

    expect(settings().textContent).toContain("Same passage as step 1");
    act(() => {
      Array.from(settings().querySelectorAll("button"))
        .find((b) => b.textContent === "Remove step 1")!
        .click();
    });
    expect(removeEditingPlaylistItem).toHaveBeenCalledWith(0);
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
    expect(main().textContent).toContain("Pick a step on the left");
  });

  it("'Add step' opens the Add-a-step modal, placing what it adds after the open step", async () => {
    const { modals, playlists } = renderScreen([
      verseItem("GEN", 16),
      verseItem("GEN", 22),
    ]);
    act(() => rowButtons()[0]!.click());

    act(() => {
      container
        .querySelector<HTMLButtonElement>(".sb-playlist-add-toggle")!
        .click();
    });
    const modal = modals.modals.value.find(
      (m) => m.id === "playlist-add-step"
    )!;
    expect(modal.title).toBe("Add a step");

    const host = document.createElement("div");
    document.body.appendChild(host);
    act(() => {
      render(<>{modal.content({ t: (key: string) => key })}</>, host);
    });
    expect(host.querySelector(".sb-add-step-position")?.textContent).toBe(
      "After step 1"
    );
    const input = host.querySelector<HTMLInputElement>(
      ".sb-passage-picker-input"
    )!;
    act(() => {
      input.value = "Exodus 3";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      Array.from(host.querySelectorAll("button"))
        .find((b) => b.textContent?.startsWith("Add step"))!
        .click();
      await Promise.resolve();
    });
    render(null, host);
    host.remove();

    expect(playlists.insertEditingPlaylistItem).toHaveBeenCalledWith(1, {
      type: "bible-verse",
      ref: { bookId: "EXO", chapter: 3 },
    });
  });

  it("Preview shows the open step as the reader sees it", () => {
    renderScreen([{ type: "html", html: "<p>Hi there</p>", title: "A note" }]);
    act(() => rowButtons()[0]!.click());
    act(() => {
      Array.from(container.querySelectorAll("button"))
        .find((b) => b.textContent === "Preview")!
        .click();
    });
    expect(main().querySelector(".stub-playlist-item-input")).toBeNull();
    expect(main().querySelector(".sb-step-preview-title")?.textContent).toBe(
      "A note"
    );
    expect(
      main().querySelector(".sb-step-preview-eyebrow")?.textContent
    ).toContain("Note · Step 1 of 1 · 1 min");
  });

  it("Back leaves the editor, and the header says when the draft has unsaved changes", () => {
    const { cancelEditingPlaylist, playlists } = renderScreen([
      verseItem("GEN", 16),
    ]);
    expect(
      Array.from(container.querySelectorAll("button")).find(
        (b) => b.textContent === "Save"
      )
    ).toBeUndefined();

    (
      playlists.isEditingPlaylistDirty as ReturnType<typeof vi.fn>
    ).mockReturnValue(true);
    act(() => rowButtons()[0]!.click());
    expect(
      container.querySelector(".sb-playlist-editor-summary")?.textContent
    ).toBe("Draft · unsaved changes");

    // With nothing unsaved, Back leaves without asking.
    (
      playlists.isEditingPlaylistDirty as ReturnType<typeof vi.fn>
    ).mockReturnValue(false);
    act(() => {
      container
        .querySelector<HTMLButtonElement>(".sb-playlist-editor-back")!
        .click();
    });
    expect(cancelEditingPlaylist).toHaveBeenCalledTimes(1);
  });

  const buttonByText = (text: string, root: ParentNode = container) =>
    Array.from(root.querySelectorAll<HTMLButtonElement>("button")).find(
      (b) => b.textContent === text
    );

  /** Renders the modal with `id` into its own host, returning the host. */
  function renderModal(
    modals: ReturnType<typeof createModalManager>,
    id: string
  ) {
    const modal = modals.modals.value.find((m) => m.id === id)!;
    const host = document.createElement("div");
    document.body.appendChild(host);
    act(() => {
      render(<>{modal.content({ t: (key: string) => key })}</>, host);
    });
    return host;
  }

  it("lists a fresh playlist's steps as empty, with no way to test it with a group", () => {
    renderScreen([]);

    expect(
      container.querySelector(".sb-playlist-editor-steps")?.textContent
    ).toContain("No items yet.");
    expect(buttonByText("Test with a group")).toBeUndefined();
  });

  it("names each step's passage in the translation being read", () => {
    renderScreen([verseItem("EXO", 3), verseItem("XYZ", 1)]);

    expect(
      Array.from(rowButtons()).map(
        (b) => b.querySelector(".sb-discover-item-title")?.textContent
      )
    ).toEqual(["Exodus 3", "XYZ 1"]);
  });

  it("saves the open step's unsaved edits when another step is opened", async () => {
    const { updateEditingPlaylistItem } = renderScreen([
      verseItem("GEN", 16),
      { type: "html", html: "<p>Hi</p>" },
    ]);
    act(() => rowButtons()[1]!.click());
    stubItemInputControl.isDirty = true;

    await act(async () => {
      rowButtons()[0]!.click();
      await Promise.resolve();
    });

    expect(updateEditingPlaylistItem).toHaveBeenCalledWith(1, {
      type: "html",
      html: "<p>Changed</p>",
    });
    expect(rowButtons()[0]!.getAttribute("aria-current")).toBe("true");
  });

  it("keeps a step open when its unsaved edits don't save", async () => {
    renderScreen([verseItem("GEN", 16), { type: "html", html: "<p>Hi</p>" }]);
    act(() => rowButtons()[1]!.click());
    stubItemInputControl.isDirty = true;
    stubItemInputControl.commits = false;

    await act(async () => {
      rowButtons()[0]!.click();
      await Promise.resolve();
    });

    expect(rowButtons()[1]!.getAttribute("aria-current")).toBe("true");
  });

  describe("a new playlist's details", () => {
    const labels = () =>
      Array.from(
        container.querySelectorAll(".sb-playlist-editor-field-label")
      ).map((el) => el.textContent);

    it("starts on its title, description and cover, and Next goes on to the steps", () => {
      const { playlists } = renderScreen([], { playlist: { title: null } });

      expect(container.querySelector(".sb-playlist-details")).not.toBeNull();
      expect(container.querySelector(".sb-playlist-editor-columns")).toBeNull();
      expect(labels()).toEqual([
        "Title",
        "Description",
        "Cover image",
        "Who can open it",
      ]);
      expect(
        container.querySelector(".sb-playlist-details-heading")?.textContent
      ).toBe("New playlist");
      expect(container.querySelector(".stub-hero-image-field")).not.toBeNull();

      const title = container.querySelector<HTMLInputElement>(
        ".sb-playlist-details-title"
      )!;
      act(() => {
        title.value = "Hagar";
        title.dispatchEvent(new Event("input", { bubbles: true }));
      });
      expect(playlists.editingPlaylist.value?.title).toBe("Hagar");

      act(() => buttonByText("Next")!.click());

      expect(container.querySelector(".sb-playlist-details")).toBeNull();
      expect(
        container.querySelector<HTMLInputElement>(".sb-playlist-editor-title")
          ?.value
      ).toBe("Hagar");
      expect(
        container.querySelector(".sb-playlist-editor-columns")
      ).not.toBeNull();
    });

    it("leaves the editor from a new playlist's details", () => {
      const { cancelEditingPlaylist } = renderScreen([], {
        playlist: { title: null },
      });
      act(() => {
        container
          .querySelector<HTMLButtonElement>(".sb-playlist-editor-back")!
          .click();
      });
      expect(cancelEditingPlaylist).toHaveBeenCalledTimes(1);
    });

    it("offers who can open it, defaulting to me and my friends, and sets each choice", () => {
      const { playlists } = renderScreen([], { playlist: { title: null } });
      const choices = () =>
        Array.from(
          container.querySelectorAll<HTMLButtonElement>(
            ".sb-playlist-visibility-choice"
          )
        );
      expect(
        choices().map(
          (b) => b.querySelector(".sb-playlist-visibility-title")?.textContent
        )
      ).toEqual(["Only me", "Me and my friends", "Anyone with a link"]);
      // A playlist saved before the choice existed is shared with friends.
      expect(choices().map((b) => b.getAttribute("aria-checked"))).toEqual([
        "false",
        "true",
        "false",
      ]);

      act(() => choices()[0]!.click());
      expect(playlists.editingPlaylist.value?.visibility).toBe("private");
      expect(choices()[0]!.getAttribute("aria-checked")).toBe("true");

      act(() => choices()[2]!.click());
      expect(playlists.editingPlaylist.value?.visibility).toBe("unlisted");
      expect(choices()[2]!.getAttribute("aria-checked")).toBe("true");

      act(() => choices()[1]!.click());
      expect(playlists.editingPlaylist.value?.visibility).toBe("public");
    });

    it("opens a playlist that already has a title straight on its steps", () => {
      renderScreen([], { playlist: { description: "Something" } });
      expect(container.querySelector(".sb-playlist-details")).toBeNull();
      expect(
        container.querySelector(".sb-playlist-editor-columns")
      ).not.toBeNull();
    });

    it("keeps a description's line breaks, and stores a blank one as none", () => {
      const { playlists } = renderScreen([], { playlist: { title: null } });
      const description = container.querySelector<HTMLTextAreaElement>(
        ".sb-playlist-description-input"
      )!;

      act(() => {
        description.value = "First line\nSecond line";
        description.dispatchEvent(new Event("input", { bubbles: true }));
      });
      expect(playlists.editingPlaylist.value?.description).toBe(
        "First line\nSecond line"
      );

      act(() => {
        description.value = "   ";
        description.dispatchEvent(new Event("input", { bubbles: true }));
      });
      expect(playlists.editingPlaylist.value?.description).toBeNull();
    });
  });

  it("keeps the title, description and cover editable on the steps screen", () => {
    const { playlists, modals } = renderScreen([verseItem("GEN", 16)]);

    const title = container.querySelector<HTMLInputElement>(
      ".sb-playlist-editor-title"
    )!;
    act(() => {
      title.value = "   ";
      title.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(playlists.editingPlaylist.value?.title).toBeNull();

    const description = container.querySelector<HTMLTextAreaElement>(
      ".sb-playlist-editor-description"
    )!;
    act(() => {
      description.value = "The God who sees";
      description.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(playlists.editingPlaylist.value?.description).toBe(
      "The God who sees"
    );

    const cover = container.querySelector<HTMLButtonElement>(
      ".sb-playlist-editor-cover"
    )!;
    expect(cover.querySelector("img")).toBeNull();
    act(() => cover.click());
    const host = renderModal(modals, "playlist-editor-cover");
    expect(host.querySelector(".stub-hero-image-field")).not.toBeNull();
    render(null, host);
    host.remove();

    act(() => {
      playlists.updateEditingPlaylistMetadata({
        heroImageUrl: "https://example.com/cover.jpg",
      });
    });
    expect(cover.querySelector("img")?.getAttribute("src")).toBe(
      "https://example.com/cover.jpg"
    );
  });

  describe("leaving with unsaved changes", () => {
    function leaveDirty() {
      const mocks = renderScreen([verseItem("GEN", 16)]);
      (
        mocks.playlists.isEditingPlaylistDirty as ReturnType<typeof vi.fn>
      ).mockReturnValue(true);
      act(() => {
        container
          .querySelector<HTMLButtonElement>(".sb-playlist-editor-back")!
          .click();
      });
      const host = renderModal(
        mocks.modals,
        "playlist-unsaved-changes-confirm"
      );
      return { ...mocks, host };
    }

    afterEach(() => {
      document.body
        .querySelectorAll("body > div:not(:first-child)")
        .forEach((el) => {
          render(null, el);
          el.remove();
        });
    });

    it("asks first, and Confirm discards the changes", () => {
      const { cancelEditingPlaylist, modals, host } = leaveDirty();
      expect(cancelEditingPlaylist).not.toHaveBeenCalled();

      act(() => buttonByText("Confirm", host)!.click());

      expect(cancelEditingPlaylist).toHaveBeenCalledTimes(1);
      expect(modals.modals.value).toHaveLength(0);
    });

    it("Save & exit saves the playlist", () => {
      const { saveEditingPlaylist, cancelEditingPlaylist, host } = leaveDirty();

      act(() => buttonByText("Save & exit", host)!.click());

      expect(saveEditingPlaylist).toHaveBeenCalledTimes(1);
      expect(cancelEditingPlaylist).not.toHaveBeenCalled();
    });

    it("Go back stays in the editor", () => {
      const { cancelEditingPlaylist, saveEditingPlaylist, modals, host } =
        leaveDirty();

      act(() => buttonByText("Go back", host)!.click());

      expect(modals.modals.value).toHaveLength(0);
      expect(cancelEditingPlaylist).not.toHaveBeenCalled();
      expect(saveEditingPlaylist).not.toHaveBeenCalled();
      expect(
        container.querySelector(".sb-playlist-editor-header")
      ).not.toBeNull();
    });
  });

  describe("on a phone", () => {
    const steps = () => container.querySelector(".sb-playlist-editor-steps")!;
    const stepbar = () =>
      container.querySelector(".sb-playlist-editor-stepbar");

    it("shows the step list, or one step with the way back and to the steps beside it", () => {
      renderScreen(
        [verseItem("GEN", 16), { type: "html", html: "<p>Hi</p>" }],
        { mobile: true }
      );

      expect(steps().hasAttribute("hidden")).toBe(false);
      expect(main().hasAttribute("hidden")).toBe(true);
      expect(settings().hasAttribute("hidden")).toBe(true);
      expect(stepbar()).toBeNull();

      act(() => rowButtons()[0]!.click());

      expect(steps().hasAttribute("hidden")).toBe(true);
      expect(main().hasAttribute("hidden")).toBe(false);
      expect(settings().hasAttribute("hidden")).toBe(false);
      expect(
        stepbar()?.querySelector(".sb-playlist-editor-stepbar-count")
          ?.textContent
      ).toBe("Step 1 of 2");
      const [previous, next] = Array.from(
        stepbar()!.querySelectorAll<HTMLButtonElement>(
          ".sb-playlist-editor-stepbar-arrow"
        )
      );
      expect(previous!.disabled).toBe(true);

      act(() => next!.click());
      expect(
        main().querySelector(".sb-playlist-editor-eyebrow")?.textContent
      ).toBe("Step 2 · Note");
      expect(
        stepbar()!.querySelectorAll<HTMLButtonElement>(
          ".sb-playlist-editor-stepbar-arrow"
        )[1]!.disabled
      ).toBe(true);

      act(() => buttonByText("chevron_leftAll steps")!.click());
      expect(stepbar()).toBeNull();
      expect(steps().hasAttribute("hidden")).toBe(false);
      expect(main().hasAttribute("hidden")).toBe(true);
    });

    it("shows all three columns on a wide screen", () => {
      renderScreen([verseItem("GEN", 16)]);
      act(() => rowButtons()[0]!.click());

      expect(steps().hasAttribute("hidden")).toBe(false);
      expect(main().hasAttribute("hidden")).toBe(false);
      expect(stepbar()).toBeNull();
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

    it("moves a step by its handle, keeping the open step open", () => {
      const { playlists, reorderEditingPlaylistItem } = renderScreen([
        verseItem("GEN", 1),
        verseItem("GEN", 2),
        verseItem("GEN", 3),
      ]);
      const handles = container.querySelectorAll(
        ".sb-discover-item-drag-handle"
      );
      expect(handles).toHaveLength(3);
      expect(handles[0]?.getAttribute("aria-label")).toBe("Drag to reorder");
      act(() => rowButtons()[0]!.click());

      act(() => {
        handles[0]!.dispatchEvent(
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
      expect(rowButtons()[1]!.getAttribute("aria-current")).toBe("true");
    });
  });

  describe("review and publish", () => {
    const reviewButton = () => buttonByText("Review & publish")!;
    const publishButton = () =>
      container.querySelector<HTMLButtonElement>(
        ".sb-shared-page-modal-start"
      )!;

    it("shows the playlist as a shared link would, with no details to fill in again", () => {
      renderScreen([verseItem("GEN", 16), verseItem("GEN", 16)], {
        playlist: { description: "The God who sees" },
      });

      act(() => reviewButton().click());

      const review = container.querySelector(".sb-playlist-review")!;
      expect(container.querySelector(".sb-playlist-editor-header")).toBeNull();
      expect(
        review.querySelector(".sb-playlist-review-heading")?.textContent
      ).toBe("Review & publish");
      expect(
        review.querySelector(".sb-playlist-review-title")?.textContent
      ).toBe("Angel of the LORD");
      expect(
        review.querySelector(".sb-shared-page-modal-description")?.textContent
      ).toBe("The God who sees");
      expect(
        review.querySelector(".sb-shared-page-modal-count")?.textContent
      ).toBe("2 steps · ~8 min");
      expect(
        Array.from(
          review.querySelectorAll(".sb-playlist-review-step-label")
        ).map((el) => el.textContent)
      ).toEqual(["Genesis 16", "Genesis 16"]);
      // The title, description and cover are edited on the steps screen.
      expect(review.querySelector("input, textarea")).toBeNull();
      expect(review.querySelector(".stub-hero-image-field")).toBeNull();

      const checks = Array.from(
        review.querySelectorAll(".sb-playlist-review-check")
      ).map((el) => el.textContent);
      expect(checks[0]).toContain("All passages found in AAB");
      expect(checks.join(" ")).toContain(
        "Steps 1 and 2 show the same passage."
      );
      expect(buttonByText("Test with a group")).toBeUndefined();

      act(() => buttonByText("Keep editing")!.click());
      expect(container.querySelector(".sb-playlist-review")).toBeNull();
      expect(
        container.querySelector(".sb-playlist-editor-header")
      ).not.toBeNull();
    });

    const visibilityLine = () =>
      container.querySelector(".sb-playlist-review-visibility");

    it("says who can open it, with no choice to make there, and saves a private one as a draft", () => {
      const { playlists } = renderScreen([verseItem("GEN", 16)]);
      act(() => reviewButton().click());

      expect(container.querySelector(".sb-playlist-visibility")).toBeNull();
      expect(visibilityLine()?.textContent).toBe(
        "Who can open it: Me and my friends Change"
      );
      expect(publishButton().textContent).toBe("Publish");

      act(() => {
        playlists.updateEditingPlaylistMetadata({ visibility: "private" });
      });
      expect(visibilityLine()?.textContent).toBe(
        "Who can open it: Only me Change"
      );
      expect(publishButton().textContent).toBe("Save draft");

      act(() => {
        playlists.updateEditingPlaylistMetadata({ visibility: "unlisted" });
      });
      expect(visibilityLine()?.textContent).toBe(
        "Who can open it: Anyone with a link Change"
      );
      expect(publishButton().textContent).toBe("Publish");
    });

    it("'Change' opens the playlist's details, whose back arrow returns to the steps", () => {
      const { playlists } = renderScreen([verseItem("GEN", 16)]);
      act(() => reviewButton().click());

      act(() => buttonByText("Change", visibilityLine()!)!.click());

      expect(container.querySelector(".sb-playlist-review")).toBeNull();
      expect(container.querySelector(".sb-playlist-details")).not.toBeNull();
      expect(
        container.querySelector(".sb-playlist-details-heading")?.textContent
      ).toBe("Playlist details");
      act(() => {
        container
          .querySelectorAll<HTMLButtonElement>(
            ".sb-playlist-visibility-choice"
          )[2]!
          .click();
      });
      expect(playlists.editingPlaylist.value?.visibility).toBe("unlisted");

      act(() => {
        container
          .querySelector<HTMLButtonElement>(".sb-playlist-editor-back")!
          .click();
      });
      expect(playlists.editingPlaylist.value).not.toBeNull();
      expect(container.querySelector(".sb-playlist-details")).toBeNull();
      expect(
        container.querySelector(".sb-playlist-editor-columns")
      ).not.toBeNull();
    });

    it("leaves a playlist an earlier build made unlisted as it is", () => {
      const { updateEditingPlaylistMetadata } = renderScreen(
        [verseItem("GEN", 16)],
        { playlist: { visibility: "unlisted" } }
      );
      act(() => reviewButton().click());
      act(() => buttonByText("Change", visibilityLine()!)!.click());
      const link = container.querySelectorAll<HTMLButtonElement>(
        ".sb-playlist-visibility-choice"
      )[2]!;
      expect(link.getAttribute("aria-checked")).toBe("true");

      act(() => link.click());

      expect(updateEditingPlaylistMetadata).not.toHaveBeenCalled();
    });

    it("can't publish a playlist with no steps", () => {
      renderScreen([]);
      act(() => reviewButton().click());
      expect(publishButton().disabled).toBe(true);
    });

    it("saves the open step's unsaved edits before showing the review", async () => {
      const { updateEditingPlaylistItem } = renderScreen([
        { type: "html", html: "<p>Hi</p>" },
      ]);
      act(() => rowButtons()[0]!.click());
      stubItemInputControl.isDirty = true;

      await act(async () => {
        reviewButton().click();
        await Promise.resolve();
      });

      expect(updateEditingPlaylistItem).toHaveBeenCalledWith(0, {
        type: "html",
        html: "<p>Changed</p>",
      });
      expect(container.querySelector(".sb-playlist-review")).not.toBeNull();
    });

    it("stays on the step when its unsaved edits don't save", async () => {
      renderScreen([{ type: "html", html: "<p>Hi</p>" }]);
      act(() => rowButtons()[0]!.click());
      stubItemInputControl.isDirty = true;
      stubItemInputControl.commits = false;

      await act(async () => {
        reviewButton().click();
        await Promise.resolve();
      });

      expect(container.querySelector(".sb-playlist-review")).toBeNull();
      expect(rowButtons()[0]!.getAttribute("aria-current")).toBe("true");
    });

    it("'Fix' opens the step a check points at, and Publish saves", async () => {
      const { saveEditingPlaylist } = renderScreen([
        verseItem("GEN", 16),
        verseItem("GEN", 16),
      ]);
      act(() => reviewButton().click());

      act(() => {
        container
          .querySelector<HTMLButtonElement>(
            ".sb-playlist-review-checks .sb-playlist-review-check-fix"
          )!
          .click();
      });
      expect(container.querySelector(".sb-playlist-review")).toBeNull();
      expect(
        main().querySelector(".stub-playlist-item-input--edit")
      ).not.toBeNull();
      expect(rowButtons()[1]!.getAttribute("aria-current")).toBe("true");

      act(() => reviewButton().click());
      await act(async () => {
        publishButton().click();
        await Promise.resolve();
      });
      expect(saveEditingPlaylist).toHaveBeenCalledTimes(1);
    });

    it("disables Publish while saving, saves once for a double click, and offers it again if saving fails", async () => {
      const { saveEditingPlaylist } = renderScreen([verseItem("GEN", 16)]);
      let fail: (error: Error) => void = () => {};
      (saveEditingPlaylist as ReturnType<typeof vi.fn>).mockReturnValue(
        new Promise<void>((_, reject) => {
          fail = reject;
        })
      );
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      act(() => reviewButton().click());

      act(() => publishButton().click());
      act(() => publishButton().click());

      expect(saveEditingPlaylist).toHaveBeenCalledTimes(1);
      expect(publishButton().disabled).toBe(true);
      expect(publishButton().textContent).toBe("Saving…");

      await act(async () => {
        fail(new Error("offline"));
        await Promise.resolve();
      });

      expect(publishButton().disabled).toBe(false);
      expect(publishButton().textContent).toBe("Publish");
      errorSpy.mockRestore();
    });
  });
});
