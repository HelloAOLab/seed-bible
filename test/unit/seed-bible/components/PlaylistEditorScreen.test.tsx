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
    insertEditingPlaylistItem: vi.fn(),
    reorderEditingPlaylistItem: vi.fn(),
    userPlaylists: signal([]),
    updateEditingPlaylistMetadata: vi.fn(),
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

  it("starts with no step open: the steps grouped under their scenes, with the length in the head", () => {
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
    ).toBe("Draft · not saved yet");
    expect(
      container.querySelector(".sb-playlist-editor-column-count")?.textContent
    ).toBe("2 · ~5 min");
    expect(
      container.querySelector(".sb-playlist-step-group-title")?.textContent
    ).toBe("Scene 1 · Intro");
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

  it("puts the steps before the first scene under Intro, and folds a scene away", () => {
    renderScreen([
      { type: "html", html: "<p>Hi</p>", title: "Overview" },
      { type: "scene", title: "Hagar" },
      verseItem("GEN", 16),
    ]);
    const heads = Array.from(
      container.querySelectorAll(".sb-playlist-step-group-title")
    ).map((el) => el.textContent);
    expect(heads).toEqual(["Intro", "Scene 1 · Hagar"]);
    expect(rowButtons()).toHaveLength(2);

    act(() => {
      container
        .querySelectorAll<HTMLButtonElement>(
          ".sb-playlist-step-group-toggle"
        )[1]!
        .click();
    });
    expect(rowButtons()).toHaveLength(1);
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
      { type: "scene", title: "Hagar" },
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
      "After step 1 · Scene 1 · Hagar"
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

    expect(playlists.insertEditingPlaylistItem).toHaveBeenCalledWith(2, {
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

  describe("review and publish", () => {
    const reviewButton = () =>
      Array.from(container.querySelectorAll("button")).find(
        (b) => b.textContent === "Review & publish"
      )!;

    it("shows the last look in the middle column, with who can open it and what to check", () => {
      const { playlists } = renderScreen([
        { type: "scene", title: "Intro" },
        verseItem("GEN", 16),
        verseItem("GEN", 16),
      ]);

      act(() => reviewButton().click());

      const review = main().querySelector(".sb-playlist-review")!;
      expect(review).not.toBeNull();
      expect(
        review.querySelector(".sb-playlist-review-card-title")?.textContent
      ).toBe("Angel of the LORD");
      expect(
        review.querySelector(".sb-playlist-review-card-meta")?.textContent
      ).toBe("2 steps · 1 scenes");
      const checks = Array.from(
        review.querySelectorAll(".sb-playlist-review-check")
      ).map((el) => el.textContent);
      expect(checks.join(" ")).toContain(
        "Steps 1 and 2 show the same passage."
      );

      act(() => {
        Array.from(
          review.querySelectorAll<HTMLButtonElement>(
            ".sb-playlist-visibility-choice"
          )
        )
          .find((b) => b.textContent?.includes("Anyone with the link"))
          ?.click();
      });
      expect(playlists.updateEditingPlaylistMetadata).toHaveBeenCalledWith({
        visibility: "unlisted",
      });
    });

    it("'Fix' opens the step a check points at, and Publish saves", async () => {
      const { saveEditingPlaylist } = renderScreen([
        verseItem("GEN", 16),
        verseItem("GEN", 16),
      ]);
      act(() => reviewButton().click());

      act(() => {
        main()
          .querySelector<HTMLButtonElement>(".sb-playlist-review-check-fix")!
          .click();
      });
      expect(main().querySelector(".sb-playlist-review")).toBeNull();
      expect(
        main().querySelector(".stub-playlist-item-input--edit")
      ).not.toBeNull();
      expect(rowButtons()[1]!.getAttribute("aria-current")).toBe("true");

      act(() => reviewButton().click());
      await act(async () => {
        main()
          .querySelector<HTMLButtonElement>(".sb-playlist-review-publish")!
          .click();
        await Promise.resolve();
      });
      expect(saveEditingPlaylist).toHaveBeenCalledTimes(1);
    });
  });
});
