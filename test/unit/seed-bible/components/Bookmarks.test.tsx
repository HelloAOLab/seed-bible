import { render } from "preact";
import { act } from "preact/test-utils";
import { formatV1SessionKey } from "@casual-simulation/aux-common";
import { Sidebar } from "@packages/seed-bible/seed-bible/components/Tabs/Tabs";
import {
  BookmarkStackIcon,
  openBookmarkModal,
} from "@packages/seed-bible/seed-bible/components/Bookmarks/Bookmarks";
import {
  MAX_BOOKMARKS,
  type Bookmark,
} from "@packages/seed-bible/seed-bible/managers/BookmarksManager";
import type { ModalRegistration } from "@packages/seed-bible/seed-bible/managers/ModalManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import type { Mock } from "vitest";
import { createTestSeedBibleState } from "../testUtils/createTestSeedBibleState";
import { TestHost } from "./TestHost";

vi.mock("@packages/seed-bible/seed-bible/components/SettingsPage", () => ({
  SettingsPage: () => <div>Settings Page</div>,
}));

vi.mock("@packages/seed-bible/seed-bible/components/SidebarSearch", () => ({
  SidebarSearch: () => <div>Sidebar Search</div>,
}));

const USER_ID = "user-1";
/** The chapter the test state's default tab opens on. */
const AAB_GEN_1 = { translationId: "AAB", bookId: "GEN", chapterNumber: 1 };
const AAB_EXO_3 = { translationId: "AAB", bookId: "EXO", chapterNumber: 3 };

function aBookmark(overrides: Partial<Bookmark> = {}): Bookmark {
  return {
    id: "bm-1",
    name: "Reading plan",
    colorId: "blue",
    ...AAB_EXO_3,
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

describe("bookmarks", () => {
  let container: HTMLDivElement;
  let state: SeedBibleState;
  let recordData: Mock;
  /** Bookmarks the records server holds when the user signs in. */
  let storedBookmarks: Bookmark[] | null;
  let extraContainers: HTMLDivElement[];

  beforeEach(async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    extraContainers = [];
    storedBookmarks = null;

    state = await createTestSeedBibleState();

    // The records server is the one boundary faked here.
    (vi.spyOn(state.os, "getData") as unknown as Mock).mockImplementation(
      async (_userId: string, address: string) =>
        address === "readingBookmarks" && storedBookmarks
          ? { success: true, data: { bookmarks: storedBookmarks } }
          : {
              success: false,
              errorCode: "data_not_found",
              errorMessage: "Data not found",
            }
    );
    recordData = vi
      .spyOn(state.os, "recordData")
      .mockResolvedValue(undefined as never) as unknown as Mock;
  });

  afterEach(() => {
    for (const extra of extraContainers) {
      render(null, extra);
      extra.remove();
    }
    render(null, container);
    container.remove();
    // Sign out before the record mocks come off, so the live login effects
    // don't reload against the unmocked client.
    state.os.sessionKey.value = null;
    localStorage.removeItem("sessionKey");
    vi.restoreAllMocks();
  });

  async function signIn(bookmarks: Bookmark[] | null = null) {
    storedBookmarks = bookmarks;
    await act(async () => {
      state.os.sessionKey.value = formatV1SessionKey(
        USER_ID,
        "session-1",
        "secret-1",
        Date.now() + 1000 * 60 * 60
      );
    });
    await act(async () => {
      await state.bookmarks.ensureLoaded();
    });
  }

  function renderInto(children: preact.ComponentChildren): HTMLDivElement {
    const target = document.createElement("div");
    document.body.appendChild(target);
    extraContainers.push(target);
    act(() => {
      render(<TestHost state={state}>{children}</TestHost>, target);
    });
    return target;
  }

  /** Opens the modal the way the reader button does and renders its body. */
  async function openModal(location = AAB_GEN_1): Promise<HTMLDivElement> {
    const openModalSpy = vi.spyOn(state.modals, "openModal");
    await act(async () => {
      await openBookmarkModal(state, location);
    });
    expect(openModalSpy).toHaveBeenCalledTimes(1);
    const modal: ModalRegistration = openModalSpy.mock.calls[0]![0];
    const content =
      typeof modal.content === "function"
        ? modal.content({
            t: (key: string, options?: Record<string, unknown>) =>
              (options?.defaultValue as string | undefined) ?? key,
          })
        : modal.content;
    return renderInto(content);
  }

  const rows = (root: ParentNode) =>
    Array.from(root.querySelectorAll<HTMLElement>(".sb-bookmark-picker-row"));
  const rowName = (row: HTMLElement) =>
    row.querySelector(".sb-bookmark-picker-name")!.textContent;
  const checkedRow = (root: ParentNode) =>
    rows(root).find(
      (row) =>
        row.querySelector("[role='radio']")!.getAttribute("aria-checked") ===
        "true"
    );
  const button = (root: ParentNode, selector: string) =>
    root.querySelector<HTMLButtonElement>(selector)!;
  const click = async (element: HTMLElement) => {
    await act(async () => {
      element.click();
    });
  };
  const type = async (input: HTMLInputElement, value: string) => {
    await act(async () => {
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  };

  describe("the bookmark modal", () => {
    it("places a first bookmark with a single press of Save", async () => {
      await signIn();
      const modal = await openModal();

      // The premade bookmark is the ordinary create form, already selected.
      expect(rows(modal)).toHaveLength(1);
      expect(checkedRow(modal)).toBeDefined();
      expect(
        modal.querySelector<HTMLInputElement>(".sb-bookmark-form-name")!.value
      ).toBe("My bookmark");
      // Nothing is stored until Save.
      expect(recordData).not.toHaveBeenCalled();

      await click(button(modal, ".sb-bookmark-picker-save"));

      expect(state.bookmarks.bookmarks.value).toEqual([
        expect.objectContaining({
          name: "My bookmark",
          colorId: "orange",
          ...AAB_GEN_1,
        }),
      ]);
      expect(recordData).toHaveBeenCalledWith(
        USER_ID,
        "readingBookmarks",
        { bookmarks: state.bookmarks.bookmarks.value },
        { marker: "publicRead" }
      );
    });

    it("moves the preselected first bookmark to this chapter", async () => {
      await signIn([
        aBookmark({ id: "older", name: "Sermon prep", updatedAt: 100 }),
        aBookmark({ id: "newer", name: "Reading plan", updatedAt: 200 }),
      ]);
      const modal = await openModal();

      expect(rowName(checkedRow(modal)!)).toBe("Reading plan");
      await click(button(modal, ".sb-bookmark-picker-save"));

      const moved = state.bookmarks.bookmarks.value.find(
        (bookmark) => bookmark.id === "newer"
      );
      expect(moved).toMatchObject(AAB_GEN_1);
      expect(state.bookmarks.bookmarks.value).toHaveLength(2);
    });

    it("moves whichever bookmark the user picks", async () => {
      await signIn([
        aBookmark({ id: "older", name: "Sermon prep", updatedAt: 100 }),
        aBookmark({ id: "newer", name: "Reading plan", updatedAt: 200 }),
      ]);
      const modal = await openModal();

      const sermonPrep = rows(modal).find(
        (row) => rowName(row) === "Sermon prep"
      )!;
      await click(sermonPrep.querySelector<HTMLElement>("[role='radio']")!);
      await click(button(modal, ".sb-bookmark-picker-save"));

      expect(state.bookmarks.bookmarks.value[0]).toMatchObject({
        id: "older",
        ...AAB_GEN_1,
      });
    });

    it("creates an additional bookmark with its own name and color", async () => {
      await signIn([aBookmark()]);
      const modal = await openModal();

      await click(button(modal, ".sb-bookmark-add-new"));
      await type(
        modal.querySelector<HTMLInputElement>(".sb-bookmark-form-name")!,
        "Sermon prep"
      );
      await click(
        modal.querySelector<HTMLElement>(
          ".sb-bookmark-form-color[aria-label='Green']"
        )!
      );
      await click(button(modal, ".sb-bookmark-picker-save"));

      expect(state.bookmarks.bookmarks.value).toHaveLength(2);
      expect(state.bookmarks.bookmarks.value[0]).toMatchObject({
        name: "Sermon prep",
        colorId: "green",
        ...AAB_GEN_1,
      });
      // The existing bookmark stayed where it was.
      expect(
        state.bookmarks.bookmarks.value.find((b) => b.id === "bm-1")
      ).toMatchObject(AAB_EXO_3);
    });

    it("disables New bookmark at the cap and says why", async () => {
      await signIn(
        Array.from({ length: MAX_BOOKMARKS }, (_, i) =>
          aBookmark({ id: `bm-${i}`, name: `Bookmark ${i}` })
        )
      );
      const modal = await openModal();

      expect(button(modal, ".sb-bookmark-add-new").disabled).toBe(true);
      expect(modal.querySelector(".sb-bookmark-cap-note")!.textContent).toBe(
        `You can have up to ${MAX_BOOKMARKS} bookmarks. Move or remove one to make room.`
      );
    });

    it("deletes a bookmark from its row, and offers the premade one again once none are left", async () => {
      await signIn([aBookmark()]);
      const modal = await openModal();

      await click(button(modal, ".sb-bookmark-picker-remove"));

      expect(state.bookmarks.bookmarks.value).toEqual([]);
      expect(rows(modal)).toHaveLength(1);
      expect(
        modal.querySelector<HTMLInputElement>(".sb-bookmark-form-name")!.value
      ).toBe("My bookmark");
    });

    it("asks a signed-out visitor to sign in first", async () => {
      const loginSpy = vi.spyOn(state.login, "login").mockResolvedValue(null);
      const openModalSpy = vi.spyOn(state.modals, "openModal");

      await act(async () => {
        await openBookmarkModal(state, AAB_GEN_1);
      });

      expect(loginSpy).toHaveBeenCalledTimes(1);
      expect(openModalSpy).not.toHaveBeenCalled();
    });

    it("does not open over a record it could not read", async () => {
      // Opening anyway would offer "My bookmark" to someone who has bookmarks,
      // and saving it would overwrite them.
      vi.spyOn(state.os, "getData").mockResolvedValue({
        success: false,
        errorCode: "server_error",
        errorMessage: "Server error",
      });
      await signIn();
      const openModalSpy = vi.spyOn(state.modals, "openModal");

      await act(async () => {
        await openBookmarkModal(state, AAB_GEN_1);
      });

      expect(openModalSpy).not.toHaveBeenCalled();
    });
  });

  describe("the reader button's icon", () => {
    const icon = (bookmarks: Bookmark[]) =>
      renderInto(<BookmarkStackIcon bookmarks={bookmarks} />);
    const fills = (root: HTMLElement) =>
      Array.from(root.querySelectorAll("path")).map((path) =>
        path.getAttribute("fill")
      );

    it("is an outline when nothing is here", () => {
      const root = icon([]);
      expect(root.querySelector("svg")!.getAttribute("fill")).toBe("none");
      expect(root.querySelector("path")!.getAttribute("stroke")).toBe(
        "currentColor"
      );
    });

    it("is filled in the bookmark's color for one", () => {
      expect(fills(icon([aBookmark({ colorId: "red" })]))).toEqual([
        "var(--sb-bookmark-red-color)",
      ]);
    });

    it("fans several, most recently moved painted on top", () => {
      const root = icon([
        aBookmark({ id: "a", colorId: "red" }),
        aBookmark({ id: "b", colorId: "green" }),
      ]);
      // SVG paints later paths over earlier ones, so the front one is last.
      expect(fills(root)).toEqual([
        "var(--sb-bookmark-green-color)",
        "var(--sb-bookmark-red-color)",
      ]);
    });

    it("stops at three ribbons", () => {
      const root = icon(
        ["red", "green", "blue", "purple", "yellow"].map((colorId, i) =>
          aBookmark({ id: `bm-${i}`, colorId })
        )
      );
      expect(fills(root)).toHaveLength(3);
    });
  });

  describe("the sidebar", () => {
    async function renderSidebar() {
      await act(async () => {
        state.sidebar.openSidebar();
      });
      act(() => {
        render(
          <TestHost state={state}>
            <Sidebar state={state} />
          </TestHost>,
          container
        );
      });
    }

    it("marks a tab whose chapter holds a bookmark in that bookmark's color", async () => {
      await signIn([
        aBookmark({
          id: "a",
          name: "Sermon prep",
          colorId: "red",
          ...AAB_GEN_1,
          updatedAt: 100,
        }),
        aBookmark({
          id: "b",
          name: "Reading plan",
          colorId: "green",
          ...AAB_GEN_1,
          updatedAt: 200,
        }),
      ]);
      await renderSidebar();

      const dots = container.querySelectorAll<HTMLElement>(
        ".sb-tab-bookmark-dot"
      );
      expect(dots).toHaveLength(1);
      // One dot, in the most recently moved bookmark's color.
      expect(dots[0]!.style.background).toBe("var(--sb-bookmark-green-color)");
      expect(dots[0]!.getAttribute("aria-label")).toBe(
        "2 bookmarks on this chapter: Reading plan, Sermon prep"
      );
    });

    it("shows no dot for a bookmark in another translation", async () => {
      await signIn([aBookmark({ ...AAB_GEN_1, translationId: "BSB" })]);
      await renderSidebar();

      expect(container.querySelector(".sb-tab-bookmark-dot")).toBeNull();
    });

    it("renames and recolors a bookmark from the panel with the shared form", async () => {
      await signIn([aBookmark()]);
      await act(async () => {
        state.bookmarks.isPanelOpen.value = true;
      });
      await renderSidebar();

      const panel = container.querySelector<HTMLElement>(
        ".sb-bookmarks-panel"
      )!;
      await click(
        panel.querySelector<HTMLElement>("[aria-label='Edit Reading plan']")!
      );
      await type(
        panel.querySelector<HTMLInputElement>(".sb-bookmark-form-name")!,
        "Sermon prep"
      );
      await click(
        panel.querySelector<HTMLElement>(
          ".sb-bookmark-form-color[aria-label='Purple']"
        )!
      );
      await click(button(panel, ".sb-bookmark-picker-save"));

      expect(state.bookmarks.bookmarks.value).toEqual([
        aBookmark({ name: "Sermon prep", colorId: "purple" }),
      ]);
    });

    it("deletes a bookmark from the panel", async () => {
      await signIn([aBookmark()]);
      await act(async () => {
        state.bookmarks.isPanelOpen.value = true;
      });
      await renderSidebar();

      await click(
        container.querySelector<HTMLElement>(
          ".sb-bookmarks-panel [aria-label='Remove Reading plan']"
        )!
      );

      expect(state.bookmarks.bookmarks.value).toEqual([]);
    });

    it("places a new bookmark on the chapter being read", async () => {
      await signIn([aBookmark()]);
      await act(async () => {
        state.bookmarks.isPanelOpen.value = true;
      });
      await renderSidebar();

      const panel = container.querySelector<HTMLElement>(
        ".sb-bookmarks-panel"
      )!;
      await click(button(panel, ".sb-bookmark-add-new"));
      await click(button(panel, ".sb-bookmark-picker-save"));

      expect(state.bookmarks.bookmarks.value[0]).toMatchObject({
        name: "My bookmark",
        ...AAB_GEN_1,
      });
    });

    it("closes the saves list when the bookmarks panel opens, and the reverse", async () => {
      await act(async () => {
        state.saves.isFilterActive.value = true;
      });
      await act(async () => {
        state.bookmarks.isPanelOpen.value = true;
      });
      expect(state.saves.isFilterActive.value).toBe(false);

      await act(async () => {
        state.saves.isFilterActive.value = true;
      });
      expect(state.bookmarks.isPanelOpen.value).toBe(false);
    });
  });
});
