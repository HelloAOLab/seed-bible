import {
  TODAY_PANE_ID,
  todayWillAutoOpenForUrl,
} from "@packages/seed-bible/seed-bible/managers/TodayManager";
import {
  createTestSeedBibleState,
  waitFor,
} from "../testUtils/createTestSeedBibleState";

describe("todayWillAutoOpenForUrl", () => {
  describe("with no explicit ?today param", () => {
    it("opens on a bare URL, which is a visitor with nowhere else to be", () => {
      expect(
        todayWillAutoOpenForUrl(new URL("http://localhost:3000/"), "/")
      ).toBe(true);
    });

    it("stays closed for a canonical reading path", () => {
      expect(
        todayWillAutoOpenForUrl(
          new URL("http://localhost:3000/en/BSB/genesis/1"),
          "/"
        )
      ).toBe(false);
    });

    it("stays closed for a shared-session invite", () => {
      expect(
        todayWillAutoOpenForUrl(
          new URL("http://localhost:3000/?sessionId=abc"),
          "/"
        )
      ).toBe(false);
    });
  });

  describe("with an explicit ?today param", () => {
    it("opens on ?today=open even over a reading path", () => {
      expect(
        todayWillAutoOpenForUrl(
          new URL("http://localhost:3000/en/BSB/genesis/1?today=open"),
          "/"
        )
      ).toBe(true);
    });

    it("stays closed on ?today=closed even on a bare URL", () => {
      expect(
        todayWillAutoOpenForUrl(
          new URL("http://localhost:3000/?today=closed"),
          "/"
        )
      ).toBe(false);
    });

    it("treats any other value as closed rather than guessing", () => {
      expect(
        todayWillAutoOpenForUrl(
          new URL("http://localhost:3000/?today=maybe"),
          "/"
        )
      ).toBe(false);
    });
  });
});

describe("Today pane wiring", () => {
  const paneIsOpen = (
    state: Awaited<ReturnType<typeof createTestSeedBibleState>>
  ) => state.panes.panes.value.some((pane) => pane.id === TODAY_PANE_ID);

  it("starts closed when the fixture pins it closed", async () => {
    const state = await createTestSeedBibleState();
    expect(state.today.isOpen.value).toBe(false);
    expect(paneIsOpen(state)).toBe(false);
  });

  it("opens the fullscreen pane when the screen is opened", async () => {
    const state = await createTestSeedBibleState();

    state.today.open();
    await waitFor(() => paneIsOpen(state));

    const pane = state.panes.panes.value.find(
      (candidate) => candidate.id === TODAY_PANE_ID
    );
    expect(pane?.placement).toBe("fullscreen");
  });

  it("closes the pane again when the screen is closed", async () => {
    const state = await createTestSeedBibleState();

    state.today.open();
    await waitFor(() => paneIsOpen(state));

    state.today.close();
    await waitFor(() => !paneIsOpen(state));
    expect(state.today.isOpen.value).toBe(false);
  });

  // The pane header's close button removes the pane directly, so the open state
  // has to follow it or the toolbar toggle would need two clicks to reopen.
  it("clears the open state when the pane is closed from its header", async () => {
    const state = await createTestSeedBibleState();

    state.today.open();
    await waitFor(() => paneIsOpen(state));

    state.panes.closePane(TODAY_PANE_ID);
    await waitFor(() => state.today.isOpen.value === false);
    expect(paneIsOpen(state)).toBe(false);
  });

  it("auto-opens over the reader when the boot URL has no reading position", async () => {
    const state = await createTestSeedBibleState({ todayOpen: true });

    await waitFor(() => paneIsOpen(state));
    expect(state.today.isOpen.value).toBe(true);
  });

  // Reopening must reuse the same component thunk: a fresh one would remount
  // the whole Today tree and throw away its loaded reading history.
  it("keeps a stable component identity across reopens", async () => {
    const state = await createTestSeedBibleState();

    state.today.open();
    await waitFor(() => paneIsOpen(state));
    const first = state.panes.panes.value.find(
      (pane) => pane.id === TODAY_PANE_ID
    )?.component;

    state.today.close();
    await waitFor(() => !paneIsOpen(state));
    state.today.open();
    await waitFor(() => paneIsOpen(state));
    const second = state.panes.panes.value.find(
      (pane) => pane.id === TODAY_PANE_ID
    )?.component;

    expect(second).toBe(first);
  });
});
