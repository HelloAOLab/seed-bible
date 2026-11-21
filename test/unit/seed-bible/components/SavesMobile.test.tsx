import { render, type ComponentChildren } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { formatV1SessionKey } from "@casual-simulation/aux-common";
import { Sidebar } from "@packages/seed-bible/seed-bible/components/Tabs/Tabs";
import type { ModalRegistration } from "@packages/seed-bible/seed-bible/managers/ModalManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import {
  createTestSeedBibleState,
  waitFor,
} from "../testUtils/createTestSeedBibleState";
import { TestHost } from "./TestHost";

vi.mock("../i18n/I18nManager", () => ({
  useI18n: () => ({
    t: (key: string, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}));

vi.mock("../components/ContextMenu", () => ({
  closeContextMenus: vi.fn(),
  ContextMenuItem: ({
    children,
    onClick,
    className,
  }: {
    children: ComponentChildren;
    onClick?: () => void;
    className?: string;
  }) => (
    <button className={className} onClick={onClick}>
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
    onClick?: () => void;
  }) => (
    <div>
      <button className={buttonClassName} onClick={onClick}>
        Menu
      </button>
      <div>{children}</div>
    </div>
  ),
}));

vi.mock("../components/SettingsPage", () => ({
  SettingsPage: () => <div>Settings Page</div>,
}));

/** The width `app.isMobile` needs to see for the mobile saves screen. */
const MOBILE_VIEWPORT_WIDTH = 400;

const USER_ID = "user-1";

describe("mobile saves screen", () => {
  let container: HTMLDivElement;
  let state: SeedBibleState;
  let originalInnerWidth: number;
  /** Extra roots created by `renderModalContent`, torn down in afterEach. */
  let modalContainers: HTMLDivElement[];

  beforeEach(async () => {
    originalInnerWidth = window.innerWidth;
    // `viewportWidth` is seeded from `window.innerWidth` when the state is
    // created, so this has to be set before `createTestSeedBibleState`.
    window.innerWidth = MOBILE_VIEWPORT_WIDTH;

    container = document.createElement("div");
    document.body.appendChild(container);
    modalContainers = [];

    // Tabs persist to localStorage, so a test that opens one would otherwise
    // hand the next test's state an extra, selected tab.
    localStorage.clear();
    state = await createTestSeedBibleState();

    // Saves only load and persist for a signed-in user, and the records
    // backend is the one boundary worth faking here.
    vi.spyOn(state.os, "getData").mockResolvedValue({
      success: false,
      errorCode: "data_not_found",
      errorMessage: "Data not found",
    });
    vi.spyOn(state.os, "recordData").mockResolvedValue(undefined as never);

    await act(async () => {
      state.os.sessionKey.value = formatV1SessionKey(
        USER_ID,
        "session-1",
        "secret-1",
        Date.now() + 1000 * 60 * 60
      );
      window.dispatchEvent(new Event("resize"));
    });
  });

  afterEach(() => {
    for (const modalContainer of modalContainers) {
      render(null, modalContainer);
      modalContainer.remove();
    }
    render(null, container);
    container.remove();
    window.innerWidth = originalInnerWidth;
    // Sign the state back out before the record mocks come off, otherwise its
    // still-live login effects reload saves against the unmocked client —
    // and the persisted key would sign the *next* test's state in mid-setup.
    state.os.sessionKey.value = null;
    localStorage.removeItem("sessionKey");
    vi.restoreAllMocks();
  });

  async function openSavesScreen() {
    await act(async () => {
      state.sidebar.openSidebar();
      state.saves.openedFromToolbar.value = true;
      state.saves.isFilterActive.value = true;
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

  /**
   * Renders what a modal handed to `openModal` would show, so a test can
   * click through the real picker instead of calling the manager directly.
   * `content` may be a render function or plain children, the same two forms
   * `ModalManager` accepts. The modal host lives outside the Sidebar tree, so
   * this gets its own container; `afterEach` tears it down.
   */
  function renderModalContent(modal: ModalRegistration): HTMLDivElement {
    const content =
      typeof modal.content === "function"
        ? modal.content({
            t: (key: string, options?: Record<string, unknown>) =>
              (options?.defaultValue as string | undefined) ?? key,
          })
        : modal.content;

    const modalContainer = document.createElement("div");
    document.body.appendChild(modalContainer);
    modalContainers.push(modalContainer);
    act(() => {
      render(<TestHost state={state}>{content}</TestHost>, modalContainer);
    });
    return modalContainer;
  }

  /** The regular tab list, rather than the saves screen the tests below use. */
  async function openTabsList() {
    await act(async () => {
      state.sidebar.openSidebar();
      state.saves.isFilterActive.value = false;
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

  describe("saving a tab's chapter", () => {
    /** The tab list's rows, without the "add a tab" row that ends it. */
    const tabRows = () =>
      Array.from(container.querySelectorAll<HTMLElement>(".sb-tab-row")).filter(
        (row) => row.querySelector(".sb-tab-main-title")
      );
    const selectedRow = () =>
      container.querySelector<HTMLElement>(".sb-tab-row-selected")!;
    const savedMarker = (row: HTMLElement) =>
      row.querySelector<HTMLElement>(".sb-tab-saved-marker");

    /** The items of the selected tab's options menu, once it's open. */
    async function openSelectedTabMenu() {
      const menuButton = selectedRow().querySelector<HTMLButtonElement>(
        "[aria-label='Open tab menu']"
      );
      expect(menuButton).not.toBeNull();
      await act(async () => {
        menuButton!.click();
      });
      return Array.from(
        document.querySelectorAll<HTMLElement>(".sb-tab-menu-item")
      );
    }

    /** Opens the selected tab's options menu and picks an item by its label. */
    async function chooseFromSelectedTabMenu(label: string) {
      const item = (await openSelectedTabMenu()).find(
        (element) => element.textContent?.trim() === label
      );
      expect(item).toBeDefined();
      await act(async () => {
        item!.click();
      });
    }

    it("offers Save chapter in the tab's menu, which opens the folder picker for the whole chapter", async () => {
      const openModal = vi.spyOn(state.modals, "openModal");
      await openTabsList();

      await chooseFromSelectedTabMenu("Save chapter");

      // The default tab sits on AAB GEN 1, and the id carries no verse.
      expect(openModal).toHaveBeenCalledTimes(1);
      expect(openModal.mock.calls[0]![0].id).toBe(
        "save-category-AAB-GEN-1-chapter"
      );
      expect(openModal.mock.calls[0]![0].mobileSheet).toBe(true);
    });

    it("offers Edit save instead once the chapter is saved, and edits that save", async () => {
      // Add mode would be a dead end here: addSave ignores a location it
      // already holds, so changing folders and hitting Save silently did
      // nothing. It also never removes the save — that is the panel's job.
      await act(async () => {
        await state.saves.addSave("AAB", "GEN", 1);
      });
      const saveId = state.saves.saves.value[0]!.id;
      const openModal = vi.spyOn(state.modals, "openModal");
      await openTabsList();

      await chooseFromSelectedTabMenu("Edit save");

      expect(openModal).toHaveBeenCalledTimes(1);
      expect(openModal.mock.calls[0]![0].id).toBe(`save-edit-${saveId}`);
      expect(state.saves.saves.value).toHaveLength(1);
    });

    it("refiles the existing save rather than dropping the change", async () => {
      // The whole point of edit mode, driven through the picker the user
      // actually sees: pick a different folder, press Save, and the change
      // lands. On the add path this silently did nothing, because addSave
      // ignores a location it already holds.
      await act(async () => {
        await state.saves.createCategory("Sermon prep");
        await state.saves.addSave("AAB", "GEN", 1);
      });
      const saveId = state.saves.saves.value[0]!.id;
      expect(state.saves.saves.value[0]!.categories).toEqual(["My Saves"]);

      const openModal = vi.spyOn(state.modals, "openModal");
      await openTabsList();

      await chooseFromSelectedTabMenu("Edit save");

      const picker = renderModalContent(openModal.mock.calls[0]![0]);
      const folderButton = (name: string) =>
        Array.from(
          picker.querySelectorAll<HTMLButtonElement>(".sb-save-picker-category")
        ).find(
          (button) =>
            button.querySelector(".sb-save-picker-category-name")
              ?.textContent === name
        );

      await act(async () => {
        folderButton("Sermon prep")!.click();
      });
      await act(async () => {
        folderButton("My Saves")!.click();
      });
      await act(async () => {
        picker
          .querySelector<HTMLButtonElement>(".sb-save-picker-save")!
          .click();
      });

      expect(state.saves.saves.value[0]!.categories).toEqual(["Sermon prep"]);
      expect(state.saves.saves.value).toHaveLength(1);
      expect(state.saves.saves.value[0]!.id).toBe(saveId);
    });

    it("keeps the picker open and says so when the saves can't load", async () => {
      // Offline: the load fails, and so does the retry the Save button makes.
      // Only the saves read fails, so other records read at sign-in don't
      // muddy the test. Signing in again is what makes the load run against
      // this mock; the one in `beforeEach` has already succeeded.
      vi.spyOn(state.os, "getData").mockImplementation(
        async (_recordName: string, address: string) => {
          if (address === "saves") {
            throw new TypeError("Failed to fetch");
          }
          return {
            success: false,
            errorCode: "data_not_found",
            errorMessage: "Data not found",
          };
        }
      );
      await act(async () => {
        const sessionKey = state.os.sessionKey.value;
        state.os.sessionKey.value = null;
        state.os.sessionKey.value = sessionKey;
      });
      const openModal = vi.spyOn(state.modals, "openModal");
      const closeModal = vi.spyOn(state.modals, "closeModal");
      const toast = vi.spyOn(state.app, "toast");
      await openTabsList();

      await chooseFromSelectedTabMenu("Save chapter");
      const picker = renderModalContent(openModal.mock.calls[0]![0]);
      await act(async () => {
        picker
          .querySelector<HTMLButtonElement>(".sb-save-picker-save")!
          .click();
      });
      // The Save button retries the load before giving up.
      await act(async () => {
        await waitFor(() => toast.mock.calls.length > 0);
      });

      expect(toast).toHaveBeenCalledWith("Couldn't save. Please try again.");
      expect(closeModal).not.toHaveBeenCalled();
      expect(state.saves.saves.value).toEqual([]);
      expect(state.os.recordData).not.toHaveBeenCalled();
    });

    it("stars the tab as soon as the chapter is saved from its menu", async () => {
      const openModal = vi.spyOn(state.modals, "openModal");
      await openTabsList();
      expect(savedMarker(selectedRow())).toBeNull();

      await chooseFromSelectedTabMenu("Save chapter");
      const picker = renderModalContent(openModal.mock.calls[0]![0]);
      await act(async () => {
        picker
          .querySelector<HTMLButtonElement>(".sb-save-picker-save")!
          .click();
      });

      // The picker's Save doesn't wait for the write, so the row repaints
      // after the click's act() has already returned.
      await act(async () => {
        await waitFor(() => savedMarker(selectedRow()) !== null);
      });
      expect(state.saves.saves.value).toHaveLength(1);
    });

    it("has no save button on the row, only the menu", async () => {
      await act(async () => {
        await state.saves.addSave("AAB", "GEN", 1);
      });
      await openTabsList();

      const rowButtons = Array.from(
        selectedRow().querySelectorAll<HTMLButtonElement>("button")
      ).filter((button) => !button.classList.contains("sb-tab-button"));
      expect(
        rowButtons.map((button) => button.getAttribute("aria-label"))
      ).toEqual(["Open tab menu"]);
    });

    it("marks a saved chapter with a star that only shows status", async () => {
      await act(async () => {
        await state.saves.addSave("AAB", "GEN", 1);
      });
      await openTabsList();

      const marker = savedMarker(selectedRow());
      expect(marker).not.toBeNull();
      expect(marker!.getAttribute("role")).toBe("img");
      expect(marker!.getAttribute("aria-label")).toBe("Chapter saved");
      expect(marker!.querySelector("svg")!.getAttribute("fill")).toBe(
        "currentColor"
      );
      // It sits inside the tab's own button, so a click on it selects the tab
      // like the rest of the label does, rather than opening the picker.
      expect(marker!.closest("button")!.classList).toContain("sb-tab-button");
    });

    it("leaves the star off while the chapter is unsaved", async () => {
      await openTabsList();

      expect(tabRows().length).toBeGreaterThan(0);
      for (const row of tabRows()) {
        expect(savedMarker(row)).toBeNull();
      }
    });

    it("stars tabs that aren't selected too", async () => {
      const firstTabId = state.tabs.tabs.value[0]!.id;
      await act(async () => {
        await state.saves.addSave("AAB", "GEN", 1);
        const secondTab = state.tabs.addTab();
        state.tabs.selectTab(secondTab.id);
      });
      expect(state.tabs.selectedTabId.value).not.toBe(firstTabId);
      await openTabsList();

      const unselected = tabRows().filter(
        (row) => !row.classList.contains("sb-tab-row-selected")
      );
      expect(unselected).toHaveLength(1);
      expect(savedMarker(unselected[0]!)).not.toBeNull();
    });

    it("leaves the star off when only a verse range is saved", async () => {
      // The menu item files the whole chapter, so the star tracks a
      // chapter-level save rather than anything saved from within the chapter.
      await act(async () => {
        await state.saves.addSave("AAB", "GEN", 1, { verse: [2, 4] });
      });
      await openTabsList();

      expect(savedMarker(selectedRow())).toBeNull();
    });

    it("puts the star before the bookmark marker when the chapter has both", async () => {
      await act(async () => {
        await state.bookmarks.ensureLoaded();
        await state.bookmarks.createBookmark(
          { name: "Reading plan", colorId: "blue" },
          { translationId: "AAB", bookId: "GEN", chapterNumber: 1 }
        );
        await state.saves.addSave("AAB", "GEN", 1);
      });
      await openTabsList();

      const star = savedMarker(selectedRow());
      const bookmark = selectedRow().querySelector(".sb-tab-bookmark-marker");
      expect(star).not.toBeNull();
      expect(bookmark).not.toBeNull();
      expect(star!.nextElementSibling).toBe(bookmark);
    });

    it("never stars a shared-session tab", async () => {
      const tab = state.tabs.tabs.value[0]!;
      tab.sharedSession = {
        id: "session-1",
        connectedUsers: signal([]),
        options: signal({
          hostUserId: "host-user",
          coHostUserIds: null,
          allowedNavigators: null,
          allowedDecorators: null,
          highlightDurationSeconds: null,
          shareTranslation: true,
          endedAt: null,
        }),
      } as unknown as NonNullable<typeof tab.sharedSession>;
      await act(async () => {
        await state.saves.addSave("AAB", "GEN", 1);
      });
      await openTabsList();

      expect(savedMarker(selectedRow())).toBeNull();
    });
  });

  describe("a save's options menu", () => {
    /** Opens the first save's menu and returns its items. */
    async function openSaveMenu() {
      await openSavesScreen();
      const menuButton = container.querySelector<HTMLButtonElement>(
        "[aria-label='Save options']"
      );
      expect(menuButton).not.toBeNull();
      await act(async () => {
        menuButton!.click();
      });
      return Array.from(
        document.querySelectorAll<HTMLElement>(".sb-tab-menu-item")
      );
    }

    /** An item's words, without its icon's ligature name. */
    const label = (item: HTMLElement) =>
      item.querySelector(":scope > span:not(.sb-context-menu-item-icon)")
        ?.textContent;

    it("offers Delete, which deletes a save in only this folder", async () => {
      await act(async () => {
        await state.saves.addSave("AAB", "EXO", 2);
      });

      const items = await openSaveMenu();
      expect(items.map(label)).toEqual(["Edit save", "Delete"]);

      await act(async () => {
        items[1]!.click();
      });

      expect(state.saves.saves.value).toEqual([]);
    });

    it("offers Remove from folder for a save that's in other folders too", async () => {
      await act(async () => {
        await state.saves.addSave("AAB", "EXO", 2, {
          categories: ["My Saves", "Sermon prep"],
        });
      });

      const items = await openSaveMenu();
      expect(items.map(label)).toEqual(["Edit save", "Remove from folder"]);

      await act(async () => {
        items[1]!.click();
      });

      expect(state.saves.saves.value.map((save) => save.categories)).toEqual([
        ["Sermon prep"],
      ]);
    });
  });

  it("gives a folder's options Rename and Delete, each with an icon", async () => {
    await act(async () => {
      await state.saves.addSave("AAB", "EXO", 2, {
        categories: ["Sermon prep"],
      });
    });
    await openSavesScreen();

    const folderMenus = container.querySelectorAll<HTMLButtonElement>(
      "[aria-label='Folder options']"
    );
    // The default folder can't be deleted, so use the one just made.
    const sermonPrep = Array.from(folderMenus).find((button) =>
      button
        .closest(".sb-save-category-header")
        ?.textContent?.includes("Sermon prep")
    );
    expect(sermonPrep).toBeDefined();
    await act(async () => {
      sermonPrep!.click();
    });

    const items = Array.from(
      document.querySelectorAll<HTMLElement>(".sb-tab-menu-item")
    );
    expect(
      items.map((item) => [
        item.querySelector(".sb-context-menu-item-icon")?.textContent,
        item.querySelector(":scope > span:not(.sb-context-menu-item-icon)")
          ?.textContent,
      ])
    ).toEqual([
      ["edit", "Rename"],
      ["delete", "Delete"],
    ]);
  });

  it("renames a folder in a named box that starts with its current name", async () => {
    await act(async () => {
      await state.saves.addSave("AAB", "EXO", 2, {
        categories: ["Sermon prep"],
      });
    });
    await openSavesScreen();

    const menuButton = Array.from(
      container.querySelectorAll<HTMLButtonElement>(
        "[aria-label='Folder options']"
      )
    ).find((button) =>
      button
        .closest(".sb-save-category-header")
        ?.textContent?.includes("Sermon prep")
    );
    await act(async () => {
      menuButton!.click();
    });
    const rename = Array.from(
      document.querySelectorAll<HTMLElement>(".sb-tab-menu-item")
    ).find((item) => item.textContent?.includes("Rename"));
    await act(async () => {
      rename!.click();
    });

    const box = container.querySelector<HTMLInputElement>(
      "input[aria-label='Folder name']"
    );
    expect(box?.value).toBe("Sermon prep");

    await act(async () => {
      box!.value = "Youth group";
      box!.dispatchEvent(new InputEvent("input", { bubbles: true }));
    });
    await act(async () => {
      box!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
      );
    });

    expect(state.saves.categories.value.map((c) => c.name)).toContain(
      "Youth group"
    );
    expect(state.saves.categories.value.map((c) => c.name)).not.toContain(
      "Sermon prep"
    );
  });

  describe("deleting a folder", () => {
    /** Picks Delete from the named folder's menu. */
    async function chooseDeleteFolder(name: string) {
      await openSavesScreen();
      const menuButton = Array.from(
        container.querySelectorAll<HTMLButtonElement>(
          "[aria-label='Folder options']"
        )
      ).find((button) =>
        button.closest(".sb-save-category-header")?.textContent?.includes(name)
      );
      expect(menuButton).toBeDefined();
      await act(async () => {
        menuButton!.click();
      });
      const remove = Array.from(
        document.querySelectorAll<HTMLElement>(".sb-tab-menu-item")
      ).find((item) => item.textContent?.includes("Delete"));
      await act(async () => {
        remove!.click();
      });
    }

    /** Renders the confirmation the way the modal host would. */
    function renderConfirmation() {
      const modal = state.modals.modals.value.at(-1);
      expect(modal).toBeDefined();
      return renderModalContent({
        title: modal!.title,
        content: modal!.content,
      });
    }

    it("asks first, saying which saves go with it and which stay", async () => {
      await act(async () => {
        await state.saves.addSave("AAB", "EXO", 2, {
          categories: ["Sermon prep"],
        });
        await state.saves.addSave("AAB", "EXO", 3, {
          categories: ["My Saves", "Sermon prep"],
        });
      });

      await chooseDeleteFolder("Sermon prep");

      // Nothing is deleted until the user confirms.
      expect(state.saves.categories.value.map((c) => c.name)).toContain(
        "Sermon prep"
      );
      const dialog = renderConfirmation();
      expect(dialog.textContent).toContain(
        'Delete folder "Sermon prep"? ' +
          "The save that's only in this folder will be deleted too. " +
          "The save that's also in another folder will stay there. " +
          "This can't be undone."
      );

      await act(async () => {
        dialog
          .querySelector<HTMLButtonElement>(".sb-session-settings-end")!
          .click();
      });

      expect(state.saves.categories.value.map((c) => c.name)).not.toContain(
        "Sermon prep"
      );
      expect(state.saves.saves.value.map((save) => save.categories)).toEqual([
        ["My Saves"],
      ]);
    });

    it("says only that it can't be undone for an empty folder", async () => {
      await act(async () => {
        await state.saves.createCategory("Empty");
      });

      await chooseDeleteFolder("Empty");

      expect(renderConfirmation().textContent).toContain(
        'Delete folder "Empty"? This can\'t be undone.'
      );
    });
  });

  it("lists a folder's saves in Bible order, not the order they were made", async () => {
    await act(async () => {
      await state.saves.addSave("AAB", "JHN", 3);
      await state.saves.addSave("AAB", "EXO", 2, { verse: 5 });
      await state.saves.addSave("AAB", "GEN", 1);
      await state.saves.addSave("AAB", "EXO", 2);
    });

    await openSavesScreen();

    const titles = Array.from(
      container.querySelectorAll(".sb-save-item-button .sb-tab-main-title")
    ).map((title) => title.textContent);
    // Made in the order John, Exodus 2:5, Genesis, Exodus 2.
    expect(titles).toEqual(["GEN 1", "EXO 2", "EXO 2:5", "JHN 3"]);
  });

  it("opens a save with no matching tab on the first tap and closes the drawer", async () => {
    // The default tab sits on AAB GEN 1, so this save has no open tab and
    // takes the "create a new tab" path.
    await act(async () => {
      await state.saves.addSave("AAB", "EXO", 2);
    });

    await openSavesScreen();

    const saveButton = container.querySelector(
      ".sb-save-item-button"
    ) as HTMLButtonElement | null;
    expect(saveButton).not.toBeNull();

    await act(async () => {
      saveButton!.click();
    });

    const openedTab = state.tabs.tabs.value.find(
      (tab) =>
        tab.readingState.translationId.value === "AAB" &&
        tab.readingState.bookId.value === "EXO" &&
        tab.readingState.chapterNumber.value === 2
    );
    expect(openedTab).toBeDefined();
    expect(state.tabs.selectedTabId.value).toBe(openedTab!.id);
    expect(state.sidebar.isMobileOpen.value).toBe(false);
  });

  it("opens a save that already has a tab on the first tap", async () => {
    await act(async () => {
      await state.saves.addSave("AAB", "GEN", 1);
    });

    const existingTabId = state.tabs.tabs.value[0]!.id;
    const tabCountBefore = state.tabs.tabs.value.length;

    await openSavesScreen();

    const saveButton = container.querySelector(
      ".sb-save-item-button"
    ) as HTMLButtonElement | null;
    expect(saveButton).not.toBeNull();

    await act(async () => {
      saveButton!.click();
    });

    expect(state.tabs.tabs.value).toHaveLength(tabCountBefore);
    expect(state.tabs.selectedTabId.value).toBe(existingTabId);
    expect(state.sidebar.isMobileOpen.value).toBe(false);
  });
});
