import { render } from "preact";
import { act } from "preact/test-utils";
import { Sidebar } from "@packages/seed-bible/seed-bible/components/Tabs/Tabs";
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
