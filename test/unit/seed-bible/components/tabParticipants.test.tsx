import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { Sidebar } from "@packages/seed-bible/seed-bible/components/Tabs/Tabs";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import type {
  BibleReadingSession,
  ConnectedSessionUser,
} from "@packages/seed-bible/seed-bible/managers/SessionsManager";
import { createTestSeedBibleState } from "../testUtils/createTestSeedBibleState";
import { TestHost } from "./TestHost";

const SESSION_ID = "session-1";
const DESKTOP_VIEWPORT_WIDTH = 1200;
const MOBILE_VIEWPORT_WIDTH = 400;

function makeUser(
  connectionId: string,
  name: string,
  userId: string | null = null
): ConnectedSessionUser {
  return {
    connectionId,
    userId,
    isSelf: false,
    profile: { name, pictureUrl: null } as ConnectedSessionUser["profile"],
    visual: { defaultIcon: "pets", color: "#336699", colorName: "Blue" },
    isActive: true,
    joinedAtMs: null,
  };
}

describe("sidebar tabs — session participants", () => {
  let container: HTMLDivElement;
  let state: SeedBibleState;

  /** The tabs the sidebar lists, in its order. */
  const visibleTabs = () =>
    state.tabs.tabs.value.filter((tab) => !tab.slotOnly);
  const firstTab = () => visibleTabs()[0]!;
  const secondTab = () => visibleTabs()[1]!;
  const tabRows = () =>
    [...container.querySelectorAll(".sb-tab-row")].filter((row) =>
      row.querySelector(".sb-tab-main-title")
    );
  const modalIds = () => state.modals.modals.value.map((m) => m.id);
  const avatarsButton = () =>
    tabRows()[1]!.querySelector(
      "button.sb-tab-users-list"
    ) as HTMLButtonElement;

  /**
   * Builds the app at the given viewport width, with a second tab that is a
   * shared session (Hannah hosting, Ben and Cara joined), the first tab
   * selected, and the sidebar rendered.
   */
  async function renderSidebar(viewportWidth: number) {
    window.innerWidth = viewportWidth;
    state = await createTestSeedBibleState();
    await act(async () => {
      window.dispatchEvent(new Event("resize"));
    });
    state.settings.setDisablePanels(false);
    while (visibleTabs().length < 2) state.tabs.addTab();
    state.app.selectTab(firstTab().id);

    secondTab().sharedSession = {
      id: SESSION_ID,
      connectedUsers: signal([
        makeUser("c1", "Ben"),
        makeUser("c0", "Hannah", "host-user"),
        makeUser("c2", "Cara"),
      ]),
      options: signal({
        hostUserId: "host-user",
        coHostUserIds: [],
        allowedNavigators: null,
        allowedDecorators: null,
        highlightDurationSeconds: null,
        shareTranslation: false,
        endedAt: null,
        verseSelectionEffectVisibility: "everyone",
      }),
    } as unknown as BibleReadingSession;

    state.sidebar.isSidebarCollapsed.value = false;
    state.sidebar.isMobileOpen.value = viewportWidth === MOBILE_VIEWPORT_WIDTH;
    await act(() => {
      render(
        <TestHost state={state}>
          <Sidebar state={state} />
        </TestHost>,
        container
      );
    });
  }

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    localStorage.clear();
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    window.innerWidth = DESKTOP_VIEWPORT_WIDTH;
  });

  describe("on desktop", () => {
    beforeEach(() => renderSidebar(DESKTOP_VIEWPORT_WIDTH));

    it("names the avatars button after the tab it belongs to", () => {
      const title = secondTab().readingState.title.value;

      expect(avatarsButton().getAttribute("aria-label")).toBe(
        `Participants in ${title}`
      );
    });

    // The label hides the avatars' own text from screen readers, so who's
    // there has to come through the description instead.
    it("describes who is in the session, host first, to screen readers", () => {
      const descriptionId = avatarsButton().getAttribute("aria-describedby");
      const description = descriptionId
        ? document.getElementById(descriptionId)
        : null;

      expect(description?.textContent).toBe("Hannah (Host), Ben, and Cara");
    });

    it("switches to the tab and opens its participants modal when the avatars are clicked", async () => {
      await act(() => avatarsButton().click());

      expect(state.app.selectedTab.value?.id).toBe(secondTab().id);
      expect(modalIds()).toEqual([`session-participants-${SESSION_ID}`]);
    });

    it("only selects the tab when the rest of the row is clicked", async () => {
      const usersStrip = tabRows()[1]!.querySelector(
        ".sb-tab-users-section"
      ) as HTMLElement;

      await act(() => usersStrip.click());
      expect(state.app.selectedTab.value?.id).toBe(secondTab().id);

      state.app.selectTab(firstTab().id);
      await act(() =>
        (tabRows()[1]!.querySelector(".sb-tab-button") as HTMLElement).click()
      );
      expect(state.app.selectedTab.value?.id).toBe(secondTab().id);

      expect(modalIds()).toEqual([]);
    });
  });

  describe("on mobile", () => {
    beforeEach(() => renderSidebar(MOBILE_VIEWPORT_WIDTH));

    const sheet = () =>
      document.body.querySelector(
        '.sb-session-participants-sheet[role="dialog"]'
      );

    it("opens the participants bottom sheet, not the modal, when the avatars are tapped", async () => {
      await act(() => avatarsButton().click());

      expect(state.app.selectedTab.value?.id).toBe(secondTab().id);
      expect(modalIds()).toEqual([]);
      const names = Array.from(
        sheet()?.querySelectorAll(".sb-session-participants-list-name") ?? []
      ).map((el) => el.textContent);
      expect(names).toEqual(["Hannah", "Ben", "Cara"]);
    });

    it("closes the sheet from its close button", async () => {
      await act(() => avatarsButton().click());

      await act(() =>
        (
          sheet()!.querySelector(
            ".sb-mobile-settings-sheet-close"
          ) as HTMLButtonElement
        ).click()
      );

      expect(sheet()).toBeNull();
    });
  });
});
