import { render, type ComponentChildren } from "preact";
import { act } from "preact/test-utils";
import { Sidebar } from "@packages/seed-bible/seed-bible/components/Tabs";
import {
  createTestSeedBibleState,
  type CreateTestSeedBibleStateOptions,
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
});
