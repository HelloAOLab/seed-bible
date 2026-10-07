import {
  TODAY_PANE_ID,
  todayWillAutoOpenForUrl,
} from "@packages/seed-bible/seed-bible/managers/TodayManager";
import {
  createTestSeedBibleState,
  waitFor,
} from "../testUtils/createTestSeedBibleState";
import { act } from "preact/test-utils";
import { formatV1SessionKey } from "@casual-simulation/aux-common";
import type { SharedDocument } from "@casual-simulation/aux-common/documents/SharedDocument";
import { fakeSharedPermissions, ME } from "../testUtils/fakeSharedPermissions";

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

    // A static page carries no reading position, so it used to read as
    // "nowhere in particular" and Today opened over it. Today's pane is
    // fullscreen, so it displaced the About pane and sent the reader back to
    // the selected tab's chapter.
    it("stays closed on a static page such as /en/about", () => {
      expect(
        todayWillAutoOpenForUrl(new URL("http://localhost:3000/en/about"), "/")
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

    it("opens on ?today=open even over a static page", () => {
      expect(
        todayWillAutoOpenForUrl(
          new URL("http://localhost:3000/en/about?today=open"),
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

  describe("when the page is a compact embed", () => {
    it("stays closed on a bare URL with ?embed=true", () => {
      expect(
        todayWillAutoOpenForUrl(
          new URL("http://localhost:3000/?embed=true"),
          "/"
        )
      ).toBe(false);
    });

    it("stays closed on ?embed=minimal even without a reading path", () => {
      expect(
        todayWillAutoOpenForUrl(
          new URL("http://localhost:3000/?embed=minimal"),
          "/"
        )
      ).toBe(false);
    });

    it("stays closed even when ?today=open is also set", () => {
      expect(
        todayWillAutoOpenForUrl(
          new URL("http://localhost:3000/?embed=true&today=open"),
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

  // `todayOpen: "fromUrl"` leaves the `?today` param off, which is what lets
  // these two reach the boot heuristic at all: an explicit param short-circuits
  // it before the URL is ever looked at.
  it("auto-opens over the reader when the boot URL has no reading position", async () => {
    window.history.replaceState(null, "", "/");

    const state = await createTestSeedBibleState({ todayOpen: "fromUrl" });

    await waitFor(() => paneIsOpen(state));
    expect(state.today.isOpen.value).toBe(true);
  });

  it("stays out of the way when the boot URL already points at a chapter", async () => {
    window.history.replaceState(null, "", "/en/AAB/exodus/2");

    const state = await createTestSeedBibleState({ todayOpen: "fromUrl" });

    expect(state.today.isOpen.value).toBe(false);
    expect(paneIsOpen(state)).toBe(false);
  });

  // The fix's core invariant: `isOpen` must stay `false` -- matching what SSR
  // always renders -- until `hydrateAutoOpen` runs, even on a boot URL that
  // will end up auto-opening Today. `skipHydrateAutoOpen` holds the fixture
  // in that pre-hydrate window so this can be asserted directly, rather than
  // only observing the already-corrected value every other test sees. Fails
  // on the old construction-time seeding, which computed the real value
  // immediately with no pre-hydrate window to observe.
  it("seeds isOpen closed regardless of the URL, until hydrateAutoOpen runs", async () => {
    window.history.replaceState(null, "", "/");

    const state = await createTestSeedBibleState({
      todayOpen: "fromUrl",
      skipHydrateAutoOpen: true,
    });

    expect(state.today.isOpen.value).toBe(false);
    expect(paneIsOpen(state)).toBe(false);

    state.today.hydrateAutoOpen();

    expect(state.today.isOpen.value).toBe(true);
    await waitFor(() => paneIsOpen(state));
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

  it("does not open Today when the page is a compact embed", async () => {
    const state = await createTestSeedBibleState({ embed: true });

    state.today.open();

    expect(state.today.isOpen.value).toBe(false);
    expect(paneIsOpen(state)).toBe(false);
  });

  it("does not auto-open Today on a bare embed URL", async () => {
    window.history.replaceState(null, "", "/?embed=true");

    const state = await createTestSeedBibleState({
      todayOpen: "fromUrl",
      embed: true,
    });

    expect(state.today.isOpen.value).toBe(false);
    expect(paneIsOpen(state)).toBe(false);
  });
});

describe("Today's Community section", () => {
  const FRIEND = "f00df00d-0000-4000-8000-00000000f00d";
  // People the friends lists know about who aren't friends yet.
  const ASKED_ME = "a5cedace-0000-4000-8000-00000000a5ce";
  const ASKED_BY_ME = "b0b0b0b0-0000-4000-8000-00000000b0b0";

  /** A reading history document holding one finished chapter. */
  const historyDocument = (
    reading: { bookId: string; chapter: number },
    atSeconds: number
  ) => {
    const event = {
      userId: "",
      ...reading,
      start: atSeconds - 60,
      end: atSeconds,
    };
    const events = [{ get: (key: string) => event[key as keyof typeof event] }];
    return {
      getArray: () => ({
        type: { length: events.length, get: (i: number) => events[i] },
      }),
    } as unknown as SharedDocument;
  };

  it("includes friends' reading alongside the user's own, but not people with a request still waiting", async () => {
    const state = await createTestSeedBibleState();
    const nowSeconds = Math.floor(Date.now() / 1000);
    const readings: Record<string, { bookId: string; chapter: number }> = {
      [ME]: { bookId: "JHN", chapter: 3 },
      [FRIEND]: { bookId: "PSA", chapter: 23 },
      [ASKED_ME]: { bookId: "GEN", chapter: 1 },
      [ASKED_BY_ME]: { bookId: "EXO", chapter: 20 },
    };
    const server = fakeSharedPermissions(state.os, () =>
      state.login.userId.peek()
    );
    server.friendsWith(FRIEND);
    server.requestFrom(ASKED_ME);
    server.requestTo(ASKED_BY_ME);
    vi.spyOn(state.os, "getSharedDocument").mockImplementation((async (
      recordName: string
    ) =>
      historyDocument(
        readings[recordName] ?? { bookId: "none", chapter: 0 },
        nowSeconds
      )) as never);
    // Signing in loads saves and settings too; nobody has any here.
    vi.spyOn(state.os, "getData").mockResolvedValue({
      success: false,
      errorCode: "data_not_found",
      errorMessage: "Data not found",
    } as never);
    // Nor any notes, which the feed reads alongside reading history.
    vi.spyOn(state.os, "listAllData").mockResolvedValue({
      success: true,
      items: [],
    });

    await act(async () => {
      state.os.sessionKey.value = formatV1SessionKey(
        ME,
        "session-1",
        "secret-1",
        Date.now() + 1000 * 60 * 60
      );
    });
    try {
      // Waits for the requests too: leaving them out only means something
      // once the app knows about them.
      await waitFor(
        () =>
          state.friends.friendIds.value.includes(FRIEND) &&
          state.friends.incomingRequests.value.some(
            (r) => r.userId === ASKED_ME
          ) &&
          state.friends.outgoingRequests.value.some(
            (r) => r.userId === ASKED_BY_ME
          )
      );

      const feed = await state.today.getCommunityFeed(
        { from: nowSeconds - 3600, to: nowSeconds + 3600 },
        { crossedPaths: true }
      );

      expect(
        feed
          .map((item) =>
            item.type === "reading" ? `${item.userId}:${item.bookId}` : null
          )
          .sort()
      ).toEqual([`${FRIEND}:PSA`, `${ME}:JHN`].sort());
    } finally {
      // Left signed in, the persisted key would sign the next test's state in.
      state.os.sessionKey.value = null;
      localStorage.removeItem("sessionKey");
      vi.restoreAllMocks();
    }
  });
});
