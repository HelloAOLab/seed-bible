import { render, type ComponentChildren } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { Sidebar } from "@packages/seed-bible/seed-bible/components/Tabs/Tabs";
import type { ChatSession } from "@packages/seed-bible/seed-bible/managers/ChatsManager";
import {
  createTestSeedBibleState,
  type CreateTestSeedBibleStateOptions,
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

vi.mock("../components/SidebarSearch", () => ({
  SidebarSearch: () => <div>Sidebar Search</div>,
}));

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
    expect(container.textContent).not.toContain("Sidebar Search");
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
