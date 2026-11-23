import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import {
  openSessionSettingsModal,
  openShareSessionModal,
  Sidebar,
} from "@packages/seed-bible/seed-bible/components/Tabs/Tabs";
import type { ChatSession } from "@packages/seed-bible/seed-bible/managers/ChatsManager";
import type { BibleReadingSession } from "@packages/seed-bible/seed-bible/managers/SessionsManager";
import {
  createTestSeedBibleState,
  type CreateTestSeedBibleStateOptions,
} from "../testUtils/createTestSeedBibleState";
import { TestHost } from "./TestHost";
import {
  aabBooks,
  createResponse,
  makeChapter,
  makeUrl,
  translations,
} from "../managers/testUtils/mockBibleApiData";

// The app defaults to the private API endpoint, so book data has to be mocked
// there for a tab to resolve its book name.
const PRIVATE_API_ENDPOINT = "https://vmfnri.helloao.org";

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
    expect(container.querySelector(".sb-sidebar-tabs-header")).toBeNull();
  });

  it("shows the full book name in a tooltip when hovering a collapsed tile", async () => {
    const state = await createState({
      responses: {
        [makeUrl("/api/available_translations.json", PRIVATE_API_ENDPOINT)]:
          createResponse(translations),
        [makeUrl("/api/AAB/books.json", PRIVATE_API_ENDPOINT)]:
          createResponse(aabBooks),
        [makeUrl("/api/AAB/GEN/1.json", PRIVATE_API_ENDPOINT)]: createResponse(
          makeChapter(aabBooks, "GEN", 1)
        ),
      },
    });
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

    const collapsedTile = container.querySelector(".sb-collapsed-tab-tile");
    expect(collapsedTile?.textContent).toContain("GEN 1");
    expect(collapsedTile?.getAttribute("aria-label")).toBe("Genesis 1");
    // The styled tooltip replaces the browser's own hover label, which would
    // otherwise appear on top of it.
    expect(collapsedTile?.hasAttribute("title")).toBe(false);

    vi.useFakeTimers({ now: Date.now() + 3_600_000 });
    try {
      act(() => {
        collapsedTile!.dispatchEvent(
          new PointerEvent("pointerenter", { pointerType: "mouse" })
        );
      });
      expect(document.body.querySelector(".sb-tooltip")).toBeNull();
      act(() => void vi.advanceTimersByTime(600));
      expect(document.body.querySelector(".sb-tooltip")?.textContent).toBe(
        "Genesis 1"
      );
    } finally {
      act(() => {
        collapsedTile!.dispatchEvent(
          new PointerEvent("pointerleave", { pointerType: "mouse" })
        );
      });
      vi.useRealTimers();
    }
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

function findShareSheet(
  state: Awaited<ReturnType<typeof createTestSeedBibleState>>
) {
  return state.modals.modals.value.find(
    (modal) =>
      typeof modal.title === "object" && modal.title.key === "share-sheet-title"
  );
}

function isShareSheetOpen(
  state: Awaited<ReturnType<typeof createTestSeedBibleState>>
) {
  return findShareSheet(state) !== undefined;
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
    expect(findShareSheet(state)?.mobileSheet).toBe(true);
  });

  it("opens a shared session's share sheet as a bottom sheet on phones", async () => {
    const state = await createState();
    const session = { id: "session-1" } as BibleReadingSession;

    act(() => openShareSessionModal(state, session));

    expect(findShareSheet(state)?.mobileSheet).toBe(true);
  });

  it("opens a shared session's settings as a bottom sheet on phones", async () => {
    const state = await createState();
    const session = { id: "session-1" } as BibleReadingSession;

    act(() => openSessionSettingsModal(state, session));

    const settings = state.modals.modals.value.find(
      (modal) =>
        typeof modal.title === "object" &&
        modal.title.key === "session-settings"
    );
    expect(settings?.mobileSheet).toBe(true);
  });

  it("starts a new tab from the mobile tabs header's + button", async () => {
    window.innerWidth = 400;
    const state = await createState();
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });
    expect(state.app.isMobile.value).toBe(true);
    state.sidebar.isMobileOpen.value = true;

    act(() => {
      render(
        <TestHost state={state}>
          <Sidebar state={state} />
        </TestHost>,
        container
      );
    });

    const addButton = container.querySelector<HTMLButtonElement>(
      ".sb-mobile-screen-header [aria-label='Create new tab']"
    );
    expect(addButton).not.toBeNull();

    act(() => {
      addButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    // The tab itself is created once a book is picked; the + closes the
    // drawer and opens the book selector aimed at a new tab.
    expect(state.sidebar.isMobileOpen.value).toBe(false);
    expect(state.selector.forceNewTab.value).toBe(true);
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

  // The desktop entry point for the Profile screen (#1554). It used to open
  // account settings directly; account settings now hangs off Profile.
  it("opens the Profile screen when clicked", async () => {
    const state = await createTestSeedBibleState();
    state.settings.setDisablePanels(false);
    expect(state.isProfileOpen.value).toBe(false);

    act(() => {
      render(
        <TestHost state={state}>
          <Sidebar state={state} />
        </TestHost>,
        container
      );
    });

    act(() => {
      (
        container.querySelector(".sb-sidebar-self-avatar") as HTMLButtonElement
      ).click();
    });

    expect(state.isProfileOpen.value).toBe(true);
    expect(state.sidebar.isSettingsOpen.value).toBe(false);
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
    expect(image?.querySelector("img")?.getAttribute("src")).toBe(
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
    expect(image?.querySelector("img")?.getAttribute("src")).toBe(
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

describe("tab options menu", () => {
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

  /** Renders the sidebar at `width` and returns the first tab's menu labels. */
  async function tabMenuLabels(width: number) {
    window.innerWidth = width;
    const state = await createTestSeedBibleState();
    state.settings.setDisablePanels(false);
    // `viewportWidth` seeds from the server's guess, not `window.innerWidth`,
    // so it's corrected the way the real post-mount effect does.
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });
    state.sidebar.isSidebarCollapsed.value = false;
    state.sidebar.isMobileOpen.value = width <= 480;

    act(() => {
      render(
        <TestHost state={state}>
          <Sidebar state={state} />
        </TestHost>,
        container
      );
    });

    const menuButton = container.querySelector<HTMLButtonElement>(
      ".sb-tab-row [aria-label='Open tab menu']"
    );
    expect(menuButton).not.toBeNull();
    act(() => {
      menuButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    return Array.from(document.querySelectorAll(".sb-tab-menu-item")).map(
      (item) => item.textContent ?? ""
    );
  }

  // Mobile shows one reader at a time, so there's no other panel to open in.
  it("doesn't offer Open in new panel on mobile", async () => {
    const labels = await tabMenuLabels(400);

    expect(labels.length).toBeGreaterThan(0);
    expect(labels.some((label) => label.includes("Open in new panel"))).toBe(
      false
    );
  });

  it("offers Open in new panel on desktop", async () => {
    const labels = await tabMenuLabels(1280);

    expect(labels.some((label) => label.includes("Open in new panel"))).toBe(
      true
    );
  });
});

describe("Sidebar pane layout picker", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    vi.useRealTimers();
  });

  async function openPicker() {
    const state = await createTestSeedBibleState();
    state.settings.setDisablePanels(false);
    state.sidebar.isSidebarCollapsed.value = false;
    // The first open starts a tour step that keeps the menu open on purpose.
    vi.spyOn(state.tutorial, "startContextual").mockImplementation(() => {});
    act(() => {
      render(
        <TestHost state={state}>
          <Sidebar state={state} />
        </TestHost>,
        container
      );
    });
    const trigger = container.querySelector<HTMLButtonElement>(
      ".sb-pane-layout-anchor button"
    )!;
    act(() => trigger.click());
    return { state, trigger };
  }

  const menu = () =>
    document.body.querySelector<HTMLElement>(".sb-pane-layout-menu");

  it("opens as a named dialog that the trigger says it controls", async () => {
    const { trigger } = await openPicker();

    expect(menu()).not.toBeNull();
    expect(menu()!.getAttribute("role")).toBe("dialog");
    expect(menu()!.getAttribute("aria-label")).toBe("Panels");
    expect(trigger.getAttribute("aria-haspopup")).toBe("dialog");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(menu()!.id).not.toBe("");
    expect(trigger.getAttribute("aria-controls")).toBe(menu()!.id);
  });

  it("points at nothing while closed", async () => {
    const { trigger } = await openPicker();

    act(() => trigger.click());

    expect(trigger.hasAttribute("aria-controls")).toBe(false);
  });

  it("moves focus to the layout in use, and says which one that is", async () => {
    await openPicker();

    const options = [
      ...menu()!.querySelectorAll<HTMLElement>('[role="radio"]'),
    ];
    const chosen = options.filter(
      (option) => option.getAttribute("aria-checked") === "true"
    );
    expect(options.length).toBeGreaterThan(1);
    expect(chosen).toHaveLength(1);
    expect(document.activeElement).toBe(chosen[0]);
  });

  it("closes on Escape and puts focus back on its button", async () => {
    const { trigger } = await openPicker();

    act(() => {
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Escape",
          bubbles: true,
          cancelable: true,
        })
      );
    });

    expect(menu()).toBeNull();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
  });

  it("closes on a press outside it", async () => {
    await openPicker();

    act(() => {
      document.body.dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true })
      );
    });

    expect(menu()).toBeNull();
  });

  it("leaves the keyboard to the tour tip while the tour holds it open", async () => {
    const state = await createTestSeedBibleState();
    state.settings.setDisablePanels(false);
    state.sidebar.isSidebarCollapsed.value = false;
    act(() => {
      render(
        <TestHost state={state}>
          <Sidebar state={state} />
        </TestHost>,
        container
      );
    });
    const trigger = container.querySelector<HTMLButtonElement>(
      ".sb-pane-layout-anchor button"
    )!;
    act(() => trigger.click());
    // The first open starts the tour step that points at the picker, which
    // keeps it open. If the tour can't start here there is nothing to check.
    expect(state.tutorial.running.value).toBe(true);
    expect(menu()).not.toBeNull();
    // Opening didn't pull focus into the picker, away from the tip.
    expect(menu()!.contains(document.activeElement)).toBe(false);
    const tipButton = document.createElement("button");
    document.body.appendChild(tipButton);
    act(() => tipButton.focus());

    act(() => {
      tipButton.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Escape",
          bubbles: true,
          cancelable: true,
        })
      );
    });
    tipButton.remove();

    // Focus stayed on the tip, not moved to the button under its overlay, and
    // the picker is still open for the step.
    expect(document.activeElement).not.toBe(trigger);
    expect(menu()).not.toBeNull();
    expect(menu()!.contains(document.activeElement)).toBe(false);
  });

  it("closes when its own button is pressed again", async () => {
    const { trigger } = await openPicker();

    act(() => trigger.click());

    expect(menu()).toBeNull();
  });
});
