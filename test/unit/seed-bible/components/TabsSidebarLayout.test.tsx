import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { Sidebar } from "@packages/seed-bible/seed-bible/components/Tabs/Tabs";
import type { ChatSession } from "@packages/seed-bible/seed-bible/managers/ChatsManager";
import {
  createTestSeedBibleState,
  type CreateTestSeedBibleStateOptions,
} from "../testUtils/createTestSeedBibleState";
import { TestHost } from "./TestHost";

describe("Sidebar collapsed layout", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    vi.useRealTimers();
  });

  async function createState(options?: CreateTestSeedBibleStateOptions) {
    const state = await createTestSeedBibleState(options);
    state.settings.setDisablePanels(false);
    return state;
  }

  it("hides pane layout button when sidebar is collapsed", async () => {
    const state = await createState();
    state.sidebar.isSidebarCollapsed.value = true;
    state.sidebar.isMobileOpen.value = false;

    act(() => {
      render(
        <TestHost state={state}>
          <Sidebar state={state} />
        </TestHost>,
        container
      );
    });

    expect(container.querySelector(".sb-pane-layout-anchor")).toBeNull();
  });

  it("shows compact tab tiles with only book ID and chapter when collapsed", async () => {
    const state = await createState();
    state.sidebar.isSidebarCollapsed.value = true;
    state.sidebar.isMobileOpen.value = false;

    act(() => {
      render(
        <TestHost state={state}>
          <Sidebar state={state} />
        </TestHost>,
        container
      );
    });

    const collapsedTile = container.querySelector(
      ".sb-collapsed-tab-tile"
    ) as HTMLButtonElement | null;
    expect(collapsedTile).not.toBeNull();
    expect(collapsedTile?.textContent).toContain("GEN");
    expect(collapsedTile?.textContent).toContain("1");
    expect(container.querySelector(".sb-sidebar-search-shell")).toBeNull();
    expect(container.querySelector(".sb-sidebar-tabs-header")).toBeNull();
  });

  it("hides session options when sidebar is collapsed", async () => {
    const state = await createState();
    state.sidebar.isSidebarCollapsed.value = true;
    state.sidebar.isMobileOpen.value = false;

    act(() => {
      render(
        <TestHost state={state}>
          <Sidebar state={state} />
        </TestHost>,
        container
      );
    });

    expect(container.textContent).not.toContain("New shared session");
    expect(container.textContent).not.toContain("Join shared session");
    expect(
      container.querySelector(".sb-sidebar-tabs-header-share-button")
    ).toBeNull();
  });

  it("shows pane layout button when sidebar is expanded", async () => {
    const state = await createState();
    state.sidebar.isSidebarCollapsed.value = false;

    act(() => {
      render(
        <TestHost state={state}>
          <Sidebar state={state} />
        </TestHost>,
        container
      );
    });

    expect(container.querySelector(".sb-pane-layout-anchor")).not.toBeNull();
    expect(container.querySelector(".sb-sidebar-search-shell")).not.toBeNull();
  });

  it("opens the Today screen from the sidebar's header button", async () => {
    const state = await createState();
    state.sidebar.isSidebarCollapsed.value = false;
    expect(state.today.isOpen.value).toBe(false);

    act(() => {
      render(
        <TestHost state={state}>
          <Sidebar state={state} />
        </TestHost>,
        container
      );
    });

    const button = container.querySelector<HTMLButtonElement>(
      ".sb-sidebar-tabs-header-tasks-button"
    );
    expect(button).not.toBeNull();

    act(() => {
      button!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(state.today.isOpen.value).toBe(true);
  });

  it("marks bottom actions as collapsed for vertical stacking", async () => {
    const state = await createState();
    state.sidebar.isSidebarCollapsed.value = true;
    state.sidebar.isMobileOpen.value = false;

    act(() => {
      render(
        <TestHost state={state}>
          <Sidebar state={state} />
        </TestHost>,
        container
      );
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
      render(
        <TestHost state={state}>
          <Sidebar state={state} />
        </TestHost>,
        container
      );
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
    expect(container.textContent).toContain("Settings");
  });
});

function isShareSheetOpen(
  state: Awaited<ReturnType<typeof createTestSeedBibleState>>
) {
  return state.modals.modals.value.some(
    (modal) =>
      typeof modal.title === "object" && modal.title.key === "share-sheet-title"
  );
}

describe("tabs Share control", () => {
  let container: HTMLDivElement;
  let originalInnerWidth: number;

  beforeEach(() => {
    originalInnerWidth = window.innerWidth;
    vi.useFakeTimers();
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    window.innerWidth = originalInnerWidth;
    vi.useRealTimers();
  });

  async function createState(options?: CreateTestSeedBibleStateOptions) {
    const state = await createTestSeedBibleState(options);
    state.settings.setDisablePanels(false);
    return state;
  }

  it("opens the share sheet from the sidebar More menu instead of creating a session", async () => {
    const state = await createState();
    const createSharedSession = vi.spyOn(state.app, "createSharedSession");
    state.sidebar.isSidebarCollapsed.value = false;
    state.sidebar.isMobileOpen.value = false;

    act(() => {
      render(
        <TestHost state={state}>
          <Sidebar state={state} />
        </TestHost>,
        container
      );
    });

    const moreButton = container.querySelector(
      '.sb-sidebar-top-actions button[aria-label="More"]'
    ) as HTMLButtonElement | null;
    expect(moreButton).not.toBeNull();

    act(() => {
      moreButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const shareItem = Array.from(
      document.querySelectorAll('.sb-context-menu [role="menuitem"]')
    ).find((item) => item.textContent?.includes("Share"));
    expect(shareItem).toBeDefined();

    act(() => {
      shareItem!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(createSharedSession).not.toHaveBeenCalled();
    expect(isShareSheetOpen(state)).toBe(true);
  });

  it("opens the share sheet from the mobile tabs header instead of creating a session", async () => {
    window.innerWidth = 400;
    const state = await createState();
    // `viewportWidth` seeds from the server's UA-based guess, never
    // `window.innerWidth`, so it has to be corrected the same way the real
    // post-mount effect does — see `SeedBibleStateManager.tsx`.
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });
    expect(state.app.isMobile.value).toBe(true);
    const createSharedSession = vi.spyOn(state.app, "createSharedSession");
    state.sidebar.isMobileOpen.value = true;

    act(() => {
      render(
        <TestHost state={state}>
          <Sidebar state={state} />
        </TestHost>,
        container
      );
    });

    const shareButton = container.querySelector(
      ".sb-sidebar-tabs-header-share-button"
    ) as HTMLButtonElement | null;
    expect(shareButton).not.toBeNull();
    expect(shareButton?.getAttribute("aria-label")).toBe("Share");

    act(() => {
      shareButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(createSharedSession).not.toHaveBeenCalled();
    expect(isShareSheetOpen(state)).toBe(true);
  });
});

describe("Sidebar self avatar", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    vi.useRealTimers();
  });

  it("shows a generic account icon when the user has no profile picture and is not in a shared session", async () => {
    const state = await createTestSeedBibleState();
    state.settings.setDisablePanels(false);

    act(() => {
      render(
        <TestHost state={state}>
          <Sidebar state={state} />
        </TestHost>,
        container
      );
    });

    const avatar = container.querySelector(".sb-sidebar-self-avatar");
    expect(avatar).not.toBeNull();
    expect(avatar?.querySelector(".sb-tab-user-icon-generic")).not.toBeNull();
    expect(avatar?.textContent).toContain("account_circle");
    expect(avatar?.querySelector(".sb-tab-user-icon-animal")).toBeNull();
  });

  it("shows a generic account icon when the profile has a name but no picture and nobody else is around", async () => {
    const state = await createTestSeedBibleState();
    state.settings.setDisablePanels(false);
    state.login.profile.value = { name: "Ada" };

    act(() => {
      render(
        <TestHost state={state}>
          <Sidebar state={state} />
        </TestHost>,
        container
      );
    });

    const avatar = container.querySelector(".sb-sidebar-self-avatar");
    expect(avatar?.querySelector(".sb-tab-user-icon-generic")).not.toBeNull();
    expect(avatar?.querySelector(".sb-tab-user-icon-animal")).toBeNull();
    expect(avatar?.querySelector(".sb-tab-user-icon-has-image")).toBeNull();
  });

  it("shows the animal fallback when the user has no profile picture and is in a shared session", async () => {
    const state = await createTestSeedBibleState();
    state.settings.setDisablePanels(false);
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

    act(() => {
      render(
        <TestHost state={state}>
          <Sidebar state={state} />
        </TestHost>,
        container
      );
    });

    const avatar = container.querySelector(".sb-sidebar-self-avatar");
    expect(avatar).not.toBeNull();
    expect(avatar?.querySelector(".sb-tab-user-icon-animal")).not.toBeNull();
    expect(avatar?.querySelector(".sb-tab-user-icon-generic")).toBeNull();
  });

  it("shows the animal fallback when the user has no profile picture and is in a chat with another person", async () => {
    const state = await createTestSeedBibleState();
    state.settings.setDisablePanels(false);
    (
      state.chats as unknown as { chats: { value: ChatSession[] } }
    ).chats.value = [
      {
        participants: signal([
          { isSelf: true, isAI: false },
          { isSelf: false, isAI: false },
        ]),
        totalParticipants: signal([
          { isSelf: true, isAI: false },
          { isSelf: false, isAI: false },
        ]),
      } as ChatSession,
    ];

    act(() => {
      render(
        <TestHost state={state}>
          <Sidebar state={state} />
        </TestHost>,
        container
      );
    });

    const avatar = container.querySelector(".sb-sidebar-self-avatar");
    expect(avatar?.querySelector(".sb-tab-user-icon-animal")).not.toBeNull();
    expect(avatar?.querySelector(".sb-tab-user-icon-generic")).toBeNull();
  });

  it("shows the animal fallback when the other person in the chat is inactive", async () => {
    const state = await createTestSeedBibleState();
    state.settings.setDisablePanels(false);
    (
      state.chats as unknown as { chats: { value: ChatSession[] } }
    ).chats.value = [
      {
        participants: signal([{ isSelf: true, isAI: false }]),
        totalParticipants: signal([
          { isSelf: true, isAI: false },
          { isSelf: false, isAI: false },
        ]),
      } as ChatSession,
    ];

    act(() => {
      render(
        <TestHost state={state}>
          <Sidebar state={state} />
        </TestHost>,
        container
      );
    });

    const avatar = container.querySelector(".sb-sidebar-self-avatar");
    expect(avatar?.querySelector(".sb-tab-user-icon-animal")).not.toBeNull();
    expect(avatar?.querySelector(".sb-tab-user-icon-generic")).toBeNull();
  });

  it("shows the profile picture when the user has one", async () => {
    const state = await createTestSeedBibleState();
    state.settings.setDisablePanels(false);
    state.login.profile.value = {
      name: "Ada",
      pictureUrl: "https://example.com/ada.png",
    };

    act(() => {
      render(
        <TestHost state={state}>
          <Sidebar state={state} />
        </TestHost>,
        container
      );
    });

    const image = container.querySelector(
      ".sb-sidebar-self-avatar .sb-tab-user-icon-has-image"
    ) as HTMLElement | null;
    expect(image).not.toBeNull();
    expect(image?.style.backgroundImage).toContain(
      "https://example.com/ada.png"
    );
    expect(
      container.querySelector(
        ".sb-sidebar-self-avatar .sb-tab-user-icon-generic"
      )
    ).toBeNull();
  });

  it("still shows the profile picture when the user is in a shared session", async () => {
    const state = await createTestSeedBibleState();
    state.settings.setDisablePanels(false);
    state.login.profile.value = {
      name: "Ada",
      pictureUrl: "https://example.com/ada.png",
    };
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

    act(() => {
      render(
        <TestHost state={state}>
          <Sidebar state={state} />
        </TestHost>,
        container
      );
    });

    const image = container.querySelector(
      ".sb-sidebar-self-avatar .sb-tab-user-icon-has-image"
    ) as HTMLElement | null;
    expect(image?.style.backgroundImage).toContain(
      "https://example.com/ada.png"
    );
    expect(
      container.querySelector(
        ".sb-sidebar-self-avatar .sb-tab-user-icon-animal"
      )
    ).toBeNull();
    expect(
      container.querySelector(
        ".sb-sidebar-self-avatar .sb-tab-user-icon-generic"
      )
    ).toBeNull();
  });
});
