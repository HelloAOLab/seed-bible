import { render, type ComponentChildren } from "preact";
import { act } from "preact/test-utils";
import { formatV1SessionKey } from "@casual-simulation/aux-common";
import { Sidebar } from "@packages/seed-bible/seed-bible/components/Tabs/Tabs";
import type { ModalRegistration } from "@packages/seed-bible/seed-bible/managers/ModalManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import { createTestSeedBibleState } from "../testUtils/createTestSeedBibleState";
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

vi.mock("../components/SidebarSearch", () => ({
  SidebarSearch: () => <div>Sidebar Search</div>,
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

  describe("the selected tab row's save button", () => {
    const rowSaveButton = () =>
      container.querySelector<HTMLButtonElement>(".sb-tab-save-button");

    it("opens the folder picker for the row's whole chapter", async () => {
      const openModal = vi.spyOn(state.modals, "openModal");
      await openTabsList();

      expect(rowSaveButton()).not.toBeNull();
      await act(async () => {
        rowSaveButton()!.click();
      });

      // The default tab sits on AAB GEN 1, and the id carries no verse.
      expect(openModal).toHaveBeenCalledTimes(1);
      expect(openModal.mock.calls[0]![0].id).toBe(
        "save-category-AAB-GEN-1-chapter"
      );
    });

    it("edits the existing save when the chapter is already saved", async () => {
      // Add mode would be a dead end here: addSave ignores a location it
      // already holds, so changing folders and hitting Save silently did
      // nothing. It also never removes the save — that is the panel's job.
      await act(async () => {
        await state.saves.addSave("AAB", "GEN", 1);
      });
      const saveId = state.saves.saves.value[0]!.id;
      const openModal = vi.spyOn(state.modals, "openModal");
      await openTabsList();

      await act(async () => {
        rowSaveButton()!.click();
      });

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

      await act(async () => {
        rowSaveButton()!.click();
      });

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

    /** The star renders as an SVG, so "filled" is its fill, not a font axis. */
    const starFill = () =>
      rowSaveButton()!.querySelector("svg")!.getAttribute("fill");

    it("leaves the star unfilled while the chapter is unsaved", async () => {
      await openTabsList();

      expect(starFill()).toBe("none");
      expect(rowSaveButton()!.className).not.toContain("saved");
    });

    it("fills the star once a chapter-level save exists", async () => {
      await act(async () => {
        await state.saves.addSave("AAB", "GEN", 1);
      });
      await openTabsList();

      expect(starFill()).toBe("currentColor");
      expect(rowSaveButton()!.className).toContain("sb-tab-save-button-saved");
      // Filled is an indicator, not a pressed toggle: pressing a filled star
      // opens the existing save's folders for editing rather than unfiling it,
      // so aria-pressed would announce a toggle the button does not have.
      expect(rowSaveButton()!.getAttribute("aria-pressed")).toBeNull();
    });

    it("leaves the star unfilled when only a verse range is saved", async () => {
      // The button files the whole chapter, so its state tracks a
      // chapter-level save rather than anything saved from within the chapter.
      await act(async () => {
        await state.saves.addSave("AAB", "GEN", 1, { verse: [2, 4] });
      });
      await openTabsList();

      expect(starFill()).toBe("none");
    });
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
