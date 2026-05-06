import { render, type ComponentChildren } from "preact";
import { act } from "preact/test-utils";
import { Sidebar } from "@packages/seed-bible/seed-bible/components/Tabs";
import {
  createTestSeedBibleState,
  type CreateTestSeedBibleStateOptions,
  waitFor,
} from "../testUtils/createTestSeedBibleState";

jest.mock("seed-bible.i18n.I18nManager", () => ({
  useI18n: () => ({
    t: (key: string, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}));

jest.mock("seed-bible.components.ContextMenu", () => ({
  closeContextMenus: jest.fn(),
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

jest.mock("seed-bible.components.SettingsPage", () => ({
  SettingsPage: () => <div>Settings Page</div>,
}));

jest.mock("seed-bible.components.SidebarSearch", () => ({
  SidebarSearch: () => <div>Sidebar Search</div>,
}));

describe("Sidebar collapsed layout", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    jest.useFakeTimers();
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    jest.useRealTimers();
  });

  async function createState(options?: CreateTestSeedBibleStateOptions) {
    const state = await createTestSeedBibleState(options);
    state.config.setDisablePanels(false);
    return state;
  }

  it("hides pane layout button when sidebar is collapsed", async () => {
    const state = await createState();
    state.sidebar.isSidebarCollapsed.value = true;
    state.sidebar.isMobileOpen.value = false;

    act(() => {
      render(<Sidebar state={state} />, container);
    });

    expect(container.querySelector(".sb-pane-layout-anchor")).toBeNull();
  });

  it("shows compact tab tiles with only book ID and chapter when collapsed", async () => {
    const state = await createState();
    state.sidebar.isSidebarCollapsed.value = true;
    state.sidebar.isMobileOpen.value = false;

    act(() => {
      render(<Sidebar state={state} />, container);
    });

    const collapsedTile = container.querySelector(
      ".sb-collapsed-tab-tile"
    ) as HTMLButtonElement | null;
    expect(collapsedTile).not.toBeNull();
    expect(collapsedTile?.textContent).toContain("GEN");
    expect(collapsedTile?.textContent).toContain("1");
    expect(container.textContent).not.toContain("Sidebar Search");
    expect(container.querySelector(".sb-sidebar-tabs-header")).toBeNull();
  });

  it("hides session options when sidebar is collapsed", async () => {
    const state = await createState();
    state.sidebar.isSidebarCollapsed.value = true;
    state.sidebar.isMobileOpen.value = false;

    act(() => {
      render(<Sidebar state={state} />, container);
    });

    expect(container.textContent).not.toContain("New shared session");
    expect(container.textContent).not.toContain("Join shared session");
  });

  it("shows pane layout button when sidebar is expanded", async () => {
    const state = await createState();
    state.sidebar.isSidebarCollapsed.value = false;

    act(() => {
      render(<Sidebar state={state} />, container);
    });

    expect(container.querySelector(".sb-pane-layout-anchor")).not.toBeNull();
  });

  it("marks bottom actions as collapsed for vertical stacking", async () => {
    const state = await createState();
    state.sidebar.isSidebarCollapsed.value = true;
    state.sidebar.isMobileOpen.value = false;

    act(() => {
      render(<Sidebar state={state} />, container);
    });

    const bottomActions = container.querySelector(".sb-sidebar-bottom-actions");
    expect(bottomActions).not.toBeNull();
    expect(
      bottomActions?.classList.contains("sb-sidebar-bottom-actions-collapsed")
    ).toBe(true);
  });

  it("does not use collapsed layout when settings are open", async () => {
    const state = await createState();
    state.sidebar.isSidebarCollapsed.value = true;
    state.sidebar.openSettings();
    state.sidebar.isMobileOpen.value = false;

    act(() => {
      render(<Sidebar state={state} />, container);
    });

    const sidebar = container.querySelector(".sb-tabs-sidebar");
    expect(sidebar).not.toBeNull();
    expect(sidebar?.classList.contains("sb-tabs-sidebar-collapsed")).toBe(
      false
    );

    const bottomActions = container.querySelector(".sb-sidebar-bottom-actions");
    expect(
      bottomActions?.classList.contains("sb-sidebar-bottom-actions-collapsed")
    ).toBe(false);
    expect(container.textContent).toContain("Settings Page");
  });

  it("renders bookmarks below tabs", async () => {
    const state = await createState();
    state.sidebar.closeSettings();
    state.bookmarks.bookmarks.value = [
      {
        id: "bookmark-1",
        translationId: "AAB",
        bookId: "JHN",
        chapterNumber: 3,
        createdAtMs: 1,
        color: "blue",
      },
    ];

    act(() => {
      render(<Sidebar state={state} />, container);
    });

    expect(container.textContent).toContain("Bookmarks");
    const bookmarkButton = container.querySelector(
      ".sb-sidebar-bookmark-button"
    ) as HTMLButtonElement | null;
    expect(bookmarkButton).not.toBeNull();
    expect(bookmarkButton?.textContent).toContain("JHN 3");
  });

  it("clicking a bookmark opens it in the current tab", async () => {
    const state = await createState();
    state.sidebar.closeSettings();
    state.bookmarks.bookmarks.value = [
      {
        id: "bookmark-1",
        translationId: "AAB",
        bookId: "JHN",
        chapterNumber: 3,
        createdAtMs: 1,
        color: "blue",
      },
    ];

    const selectedTab = state.app.selectedTab.value;
    expect(selectedTab).not.toBeNull();
    const selectChapterSpy = jest
      .spyOn(selectedTab!.readingState, "selectChapter")
      .mockResolvedValue(undefined);

    act(() => {
      render(<Sidebar state={state} />, container);
    });

    const bookmarkButton = container.querySelector(
      ".sb-sidebar-bookmark-button"
    ) as HTMLButtonElement;
    act(() => {
      bookmarkButton.click();
    });

    expect(selectChapterSpy).toHaveBeenCalledWith("JHN", 3);
  });
});
