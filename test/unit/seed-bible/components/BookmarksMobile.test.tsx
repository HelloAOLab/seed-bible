import { render, type ComponentChildren } from "preact";
import { act } from "preact/test-utils";
import { formatV1SessionKey } from "@casual-simulation/aux-common";
import { Sidebar } from "@packages/seed-bible/seed-bible/components/Tabs/Tabs";
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

/** The width `app.isMobile` needs to see for the mobile bookmarks screen. */
const MOBILE_VIEWPORT_WIDTH = 400;

const USER_ID = "user-1";

describe("mobile bookmarks screen", () => {
  let container: HTMLDivElement;
  let state: SeedBibleState;
  let originalInnerWidth: number;

  beforeEach(async () => {
    originalInnerWidth = window.innerWidth;
    // `viewportWidth` is seeded from `window.innerWidth` when the state is
    // created, so this has to be set before `createTestSeedBibleState`.
    window.innerWidth = MOBILE_VIEWPORT_WIDTH;

    container = document.createElement("div");
    document.body.appendChild(container);

    state = await createTestSeedBibleState();

    // Bookmarks only load and save for a signed-in user, and the records
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
    render(null, container);
    container.remove();
    window.innerWidth = originalInnerWidth;
    // Sign the state back out before the record mocks come off, otherwise its
    // still-live login effects reload bookmarks against the unmocked client —
    // and the persisted key would sign the *next* test's state in mid-setup.
    state.os.sessionKey.value = null;
    localStorage.removeItem("sessionKey");
    vi.restoreAllMocks();
  });

  async function openBookmarksScreen() {
    await act(async () => {
      state.sidebar.openSidebar();
      state.bookmarks.openedFromToolbar.value = true;
      state.bookmarks.isFilterActive.value = true;
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

  it("opens a bookmark with no matching tab on the first tap and closes the drawer", async () => {
    // The default tab sits on AAB GEN 1, so this bookmark has no open tab and
    // takes the "create a new tab" path.
    await act(async () => {
      await state.bookmarks.addBookmark("AAB", "EXO", 2);
    });

    await openBookmarksScreen();

    const bookmarkButton = container.querySelector(
      ".sb-bookmark-item-button"
    ) as HTMLButtonElement | null;
    expect(bookmarkButton).not.toBeNull();

    await act(async () => {
      bookmarkButton!.click();
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

  it("opens a bookmark that already has a tab on the first tap", async () => {
    await act(async () => {
      await state.bookmarks.addBookmark("AAB", "GEN", 1);
    });

    const existingTabId = state.tabs.tabs.value[0]!.id;
    const tabCountBefore = state.tabs.tabs.value.length;

    await openBookmarksScreen();

    const bookmarkButton = container.querySelector(
      ".sb-bookmark-item-button"
    ) as HTMLButtonElement | null;
    expect(bookmarkButton).not.toBeNull();

    await act(async () => {
      bookmarkButton!.click();
    });

    expect(state.tabs.tabs.value).toHaveLength(tabCountBefore);
    expect(state.tabs.selectedTabId.value).toBe(existingTabId);
    expect(state.sidebar.isMobileOpen.value).toBe(false);
  });
});
