import { render } from "preact";
import { act } from "preact/test-utils";
import { useScriptureMapProvider } from "../../../../packages/scripture-map/contexts/ScriptureMap/useScriptureMapProvider";

vi.mock("../../../../packages/scripture-map/hooks/useIsMobile", () => ({
  useIsMobile: vi.fn(() => false),
}));

function makeSeedBibleState(overrides: Record<string, unknown> = {}) {
  return {
    theme: {
      currentTheme: {
        value: { variables: {} },
      },
    },
    tabs: {
      tabs: { value: [] },
      selectedTabId: { value: "" },
    },
    login: {
      userId: { value: "user-1" },
      profile: { value: null },
      updateProfile: vi.fn(),
      localConfig: {
        value: {},
      },
    },
    ...overrides,
  };
}

function makeConfig(overrides: Record<string, unknown> = {}) {
  return {
    arrangementService: {
      getCurrentArrangementIndex: vi.fn(() => 0),
      getArrangementByIndex: vi.fn(() => ({
        testaments: [],
        name: "default",
      })),
    },
    seedBibleUtilsEventManager: {
      subscribe: vi.fn(() => vi.fn()),
    },
    userColorStore: {
      listUsers: vi.fn(() => []),
      getUserColor: vi.fn(() => "#000000"),
    },
    userPresenceService: {
      getUserPresence: vi.fn(() => new Map()),
    },
    seedBibleState: makeSeedBibleState(),
    getDayRangeSeconds: vi.fn((time: number) => ({
      start: time / 1000,
      end: time / 1000 + 86400,
    })),
    initialScaleFactor: 1,
    ...overrides,
  } as never;
}

describe("useScriptureMapProvider", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    vi.clearAllMocks();
  });

  function setup(config = makeConfig()) {
    let renderCount = 0;
    const result = {
      current: null as unknown as ReturnType<typeof useScriptureMapProvider>,
      // A changing prop is needed because @preact/signals skips re-rendering
      // a component whose props are unchanged.
      rerender: () =>
        act(() =>
          render(<TestComponent renderCount={++renderCount} />, container)
        ),
    };

    function TestComponent(_props: { renderCount: number }) {
      result.current = useScriptureMapProvider(config);
      return null;
    }

    result.rerender();
    return result;
  }

  describe("scaleFactor", () => {
    it("defaults to 1 when no initialScaleFactor is given", () => {
      const result = setup();
      expect(result.current.scaleFactor).toBe(1);
    });

    it("uses initialScaleFactor from config", () => {
      const result = setup(makeConfig({ initialScaleFactor: 0.75 }));
      expect(result.current.scaleFactor).toBe(0.75);
    });

    it("MIN_SCALE_FACTOR is 0.25", () => {
      const result = setup();
      expect(result.current.MIN_SCALE_FACTOR).toBe(0.25);
    });
  });

  describe("handleZoomIn", () => {
    it("increases scaleFactor by 0.05", () => {
      const result = setup(makeConfig({ initialScaleFactor: 1 }));
      act(() => result.current.handleZoomIn());
      expect(result.current.scaleFactor).toBeCloseTo(1.05);
    });

    it("clamps scaleFactor at 1.5", () => {
      const result = setup(makeConfig({ initialScaleFactor: 1.5 }));
      act(() => result.current.handleZoomIn());
      expect(result.current.scaleFactor).toBe(1.5);
    });
  });

  describe("handleZoomOut", () => {
    it("decreases scaleFactor by 0.05", () => {
      const result = setup(makeConfig({ initialScaleFactor: 1 }));
      act(() => result.current.handleZoomOut());
      expect(result.current.scaleFactor).toBeCloseTo(0.95);
    });

    it("clamps scaleFactor at 0.25", () => {
      const result = setup(makeConfig({ initialScaleFactor: 0.25 }));
      act(() => result.current.handleZoomOut());
      expect(result.current.scaleFactor).toBe(0.25);
    });
  });

  describe("scaleFactor persistence", () => {
    function makeLogin({
      userId = "user-1",
      profileConfig = null,
      localConfig = {},
    }: {
      userId?: string | null;
      profileConfig?: Record<string, unknown> | null;
      localConfig?: Record<string, unknown>;
    } = {}) {
      return {
        userId: { value: userId },
        profile: {
          value: profileConfig
            ? ({ name: "", config: profileConfig } as {
                name: string;
                config: Record<string, unknown>;
              } | null)
            : null,
        },
        updateProfile: vi.fn(),
        localConfig: { value: localConfig },
      };
    }

    function setupWithLogin(
      login: ReturnType<typeof makeLogin>,
      initialScaleFactor = 1
    ) {
      return setup(
        makeConfig({
          initialScaleFactor,
          seedBibleState: makeSeedBibleState({ login }),
        })
      );
    }

    let visibilityState: DocumentVisibilityState = "visible";

    beforeEach(() => {
      vi.useFakeTimers();
      visibilityState = "visible";
      // jsdom's own `visibilityState` is read-only, so stand in for it.
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => visibilityState,
      });
    });

    afterEach(() => {
      vi.useRealTimers();
      Reflect.deleteProperty(document, "visibilityState");
    });

    function setVisibility(next: DocumentVisibilityState) {
      visibilityState = next;
      document.dispatchEvent(new Event("visibilitychange"));
    }

    it("reads a saved scale factor from the profile, overriding initialScaleFactor", () => {
      const login = makeLogin({
        profileConfig: { scriptureMapScaleFactor: 1.2 },
      });
      const result = setupWithLogin(login, 0.75);
      expect(result.current.scaleFactor).toBe(1.2);
    });

    it("reads the scale factor from localConfig when signed out", () => {
      const login = makeLogin({
        userId: null,
        localConfig: { scriptureMapScaleFactor: 0.9 },
      });
      const result = setupWithLogin(login, 0.75);
      expect(result.current.scaleFactor).toBe(0.9);
    });

    it.each([["big"], [NaN]])(
      "falls back to initialScaleFactor when the saved value is %s",
      (saved) => {
        const login = makeLogin({
          profileConfig: { scriptureMapScaleFactor: saved },
        });
        const result = setupWithLogin(login, 0.75);
        expect(result.current.scaleFactor).toBe(0.75);
      }
    );

    it("clamps an out-of-range saved value to 1.5", () => {
      const login = makeLogin({
        profileConfig: { scriptureMapScaleFactor: 5 },
      });
      const result = setupWithLogin(login, 0.75);
      expect(result.current.scaleFactor).toBe(1.5);
    });

    it("persists the new scale factor to the profile after zooming", () => {
      const login = makeLogin({ profileConfig: {} });
      const result = setupWithLogin(login, 1);

      act(() => result.current.handleZoomIn());
      vi.advanceTimersByTime(500);

      expect(login.updateProfile).toHaveBeenCalledWith({
        config: expect.objectContaining({ scriptureMapScaleFactor: 1.05 }),
      });
    });

    it("coalesces rapid zooms into a single write with the final value", () => {
      const login = makeLogin({ profileConfig: {} });
      const result = setupWithLogin(login, 1);

      for (let i = 0; i < 5; i++) {
        act(() => result.current.handleZoomIn());
      }
      vi.advanceTimersByTime(499);
      expect(login.updateProfile).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(login.updateProfile).toHaveBeenCalledTimes(1);
      expect(login.updateProfile).toHaveBeenCalledWith({
        config: expect.objectContaining({
          scriptureMapScaleFactor: expect.closeTo(1.25),
        }),
      });
    });

    it("flushes a pending write when the map unmounts", () => {
      const login = makeLogin({ profileConfig: {} });
      const result = setupWithLogin(login, 1);

      act(() => result.current.handleZoomIn());
      act(() => render(null, container));

      expect(login.updateProfile).toHaveBeenCalledWith({
        config: expect.objectContaining({ scriptureMapScaleFactor: 1.05 }),
      });
    });

    it("flushes a pending write when the page is hidden", () => {
      const login = makeLogin({ profileConfig: {} });
      const result = setupWithLogin(login, 1);

      act(() => result.current.handleZoomIn());
      setVisibility("hidden");

      expect(login.updateProfile).toHaveBeenCalledWith({
        config: expect.objectContaining({ scriptureMapScaleFactor: 1.05 }),
      });
    });

    it("keeps waiting out the debounce when the page becomes visible", () => {
      const login = makeLogin({ profileConfig: {} });
      const result = setupWithLogin(login, 1);

      act(() => result.current.handleZoomIn());
      setVisibility("visible");

      expect(login.updateProfile).not.toHaveBeenCalled();
    });

    it("writes the new scale factor to localConfig when signed out", () => {
      const login = makeLogin({ userId: null });
      const result = setupWithLogin(login, 1);

      act(() => result.current.handleZoomIn());
      vi.advanceTimersByTime(500);

      expect(login.localConfig.value.scriptureMapScaleFactor).toBe(1.05);
      expect(login.updateProfile).not.toHaveBeenCalled();
    });

    it("picks up a saved scale factor when the profile loads after mount", () => {
      const login = makeLogin();
      const result = setupWithLogin(login, 0.75);
      expect(result.current.scaleFactor).toBe(0.75);

      login.profile.value = {
        name: "",
        config: { scriptureMapScaleFactor: 1.2 },
      };
      result.rerender();

      expect(result.current.scaleFactor).toBe(1.2);
    });
  });

  describe("dimensions", () => {
    it("bookWidth is scaleFactor × 150", () => {
      const result = setup(makeConfig({ initialScaleFactor: 2 }));
      expect(result.current.bookWidth).toBe(300);
    });

    it("chapterGap is scaleFactor × 3", () => {
      const result = setup(makeConfig({ initialScaleFactor: 2 }));
      expect(result.current.chapterGap).toBe(6);
    });

    it("chapterWidth is scaleFactor × 32", () => {
      const result = setup(makeConfig({ initialScaleFactor: 2 }));
      expect(result.current.chapterWidth).toBe(64);
    });

    it("chapterHeight is scaleFactor × 32", () => {
      const result = setup(makeConfig({ initialScaleFactor: 2 }));
      expect(result.current.chapterHeight).toBe(64);
    });
  });

  describe("showTestamentLabels", () => {
    it("defaults to true", () => {
      const result = setup();
      expect(result.current.showTestamentLabels).toBe(true);
    });

    it("handleTestamentLabelsToggle flips showTestamentLabels", () => {
      const result = setup();
      act(() => result.current.handleTestamentLabelsToggle());
      expect(result.current.showTestamentLabels).toBe(false);
    });

    it("uses initialShowTestamentLabels from config", () => {
      const result = setup(makeConfig({ initialShowTestamentLabels: false }));
      expect(result.current.showTestamentLabels).toBe(false);
    });
  });

  describe("showSectionLabels", () => {
    it("defaults to true", () => {
      const result = setup();
      expect(result.current.showSectionLabels).toBe(true);
    });

    it("handleSectionLabelsToggle flips showSectionLabels", () => {
      const result = setup();
      act(() => result.current.handleSectionLabelsToggle());
      expect(result.current.showSectionLabels).toBe(false);
    });
  });

  describe("showingAllChapters", () => {
    it("defaults to false", () => {
      const result = setup();
      expect(result.current.showingAllChapters).toBe(false);
    });

    it("handleShowAllChaptersToggle flips showingAllChapters", () => {
      const result = setup();
      act(() => result.current.handleShowAllChaptersToggle());
      expect(result.current.showingAllChapters).toBe(true);
    });

    it("uses initialShowingAllChapters from config", () => {
      const result = setup(makeConfig({ initialShowingAllChapters: true }));
      expect(result.current.showingAllChapters).toBe(true);
    });

    function makeLogin(profileConfig: Record<string, unknown> | null = null) {
      return {
        userId: { value: "user-1" },
        profile: {
          value: profileConfig ? { name: "", config: profileConfig } : null,
        },
        updateProfile: vi.fn(),
        localConfig: {
          value: {},
        },
      };
    }

    it("reads a saved showingAllChapters value from the profile, overriding initialShowingAllChapters", () => {
      const login = makeLogin({ scriptureMapShowingAllChapters: true });
      const result = setup(
        makeConfig({
          initialShowingAllChapters: false,
          seedBibleState: makeSeedBibleState({ login }),
        })
      );
      expect(result.current.showingAllChapters).toBe(true);
    });

    it("falls back to initialShowingAllChapters when the saved value is malformed", () => {
      const login = makeLogin({ scriptureMapShowingAllChapters: "yes" });
      const result = setup(
        makeConfig({
          initialShowingAllChapters: true,
          seedBibleState: makeSeedBibleState({ login }),
        })
      );
      expect(result.current.showingAllChapters).toBe(true);
    });

    it("handleShowAllChaptersToggle persists the new showingAllChapters value to the profile", () => {
      const login = makeLogin({});
      const result = setup(
        makeConfig({
          initialShowingAllChapters: false,
          seedBibleState: makeSeedBibleState({ login }),
        })
      );

      act(() => result.current.handleShowAllChaptersToggle());

      expect(result.current.showingAllChapters).toBe(true);
      expect(login.updateProfile).toHaveBeenCalledWith({
        config: expect.objectContaining({
          scriptureMapShowingAllChapters: true,
        }),
      });
    });
  });

  describe("openBookOverrides", () => {
    function makeLogin(profileConfig: Record<string, unknown> | null = null) {
      return {
        userId: { value: "user-1" },
        profile: {
          value: profileConfig ? { name: "", config: profileConfig } : null,
        },
        updateProfile: vi.fn(),
        localConfig: {
          value: {},
        },
      };
    }

    it("defaults to an empty map when the profile has no saved value", () => {
      const result = setup();
      expect(result.current.openBookOverrides).toEqual({});
    });

    it("reads per-book overrides saved on the profile", () => {
      const login = makeLogin({
        scriptureMapOpenBooks: { GEN: true, EXO: false },
      });
      const result = setup(
        makeConfig({ seedBibleState: makeSeedBibleState({ login }) })
      );
      expect(result.current.openBookOverrides).toEqual({
        GEN: true,
        EXO: false,
      });
    });

    it("falls back to an empty map when the saved value is malformed", () => {
      const login = makeLogin({
        scriptureMapOpenBooks: "not-an-object",
        localConfig: {
          value: {},
        },
      });
      const result = setup(
        makeConfig({ seedBibleState: makeSeedBibleState({ login }) })
      );
      expect(result.current.openBookOverrides).toEqual({});
    });

    it("setBookOpen updates the map and persists it to the profile", () => {
      const login = makeLogin({});
      const result = setup(
        makeConfig({ seedBibleState: makeSeedBibleState({ login }) })
      );

      act(() => result.current.setBookOpen("GEN", true));

      expect(result.current.openBookOverrides).toEqual({ GEN: true });
      expect(login.updateProfile).toHaveBeenCalledWith({
        config: { scriptureMapOpenBooks: { GEN: true } },
      });
    });

    it("handleShowAllChaptersToggle clears any per-book overrides and persists the cleared map", () => {
      const login = makeLogin({ scriptureMapOpenBooks: { GEN: true } });
      const result = setup(
        makeConfig({ seedBibleState: makeSeedBibleState({ login }) })
      );
      expect(result.current.openBookOverrides).toEqual({ GEN: true });

      act(() => result.current.handleShowAllChaptersToggle());

      expect(result.current.openBookOverrides).toEqual({});
      expect(login.updateProfile).toHaveBeenCalledWith({
        config: { scriptureMapOpenBooks: {} },
      });
    });
  });

  describe("anyBookOpen", () => {
    function makeLogin(profileConfig: Record<string, unknown> | null = null) {
      return {
        userId: { value: "user-1" },
        profile: {
          value: profileConfig ? { name: "", config: profileConfig } : null,
        },
        updateProfile: vi.fn(),
        localConfig: {
          value: {},
        },
      };
    }

    function makeArrangementService(bookIds: string[] = ["GEN", "EXO"]) {
      return {
        getCurrentArrangementIndex: vi.fn(() => 0),
        getArrangementByIndex: vi.fn(() => ({
          name: "default",
          testaments: [
            {
              sections: [
                {
                  books: bookIds.map((bookId) => ({
                    bookId,
                    type: "complete",
                  })),
                },
              ],
            },
          ],
        })),
      };
    }

    it("is true when showingAllChapters is true and no overrides", () => {
      const result = setup(
        makeConfig({
          initialShowingAllChapters: true,
          arrangementService: makeArrangementService(),
        })
      );
      expect(result.current.anyBookOpen).toBe(true);
    });

    it("is false when showingAllChapters is false and no overrides", () => {
      const result = setup(
        makeConfig({
          initialShowingAllChapters: false,
          arrangementService: makeArrangementService(),
        })
      );
      expect(result.current.anyBookOpen).toBe(false);
    });

    it("is true when showingAllChapters is false but one book is overridden open", () => {
      const login = makeLogin({ scriptureMapOpenBooks: { GEN: true } });
      const result = setup(
        makeConfig({
          initialShowingAllChapters: false,
          arrangementService: makeArrangementService(),
          seedBibleState: makeSeedBibleState({ login }),
        })
      );
      expect(result.current.anyBookOpen).toBe(true);
    });

    it("is false when showingAllChapters is true but every book is overridden closed", () => {
      const login = makeLogin({
        scriptureMapOpenBooks: { GEN: false, EXO: false },
      });
      const result = setup(
        makeConfig({
          initialShowingAllChapters: true,
          arrangementService: makeArrangementService(),
          seedBibleState: makeSeedBibleState({ login }),
        })
      );
      expect(result.current.anyBookOpen).toBe(false);
    });

    it("closing all books then manually opening one, 'Close books' closes it instead of reopening every book", () => {
      const login = makeLogin({});
      const result = setup(
        makeConfig({
          initialShowingAllChapters: true,
          arrangementService: makeArrangementService(),
          seedBibleState: makeSeedBibleState({ login }),
        })
      );

      // Close all books.
      act(() => result.current.handleShowAllChaptersToggle());
      expect(result.current.showingAllChapters).toBe(false);
      expect(result.current.anyBookOpen).toBe(false);

      // Manually reopen Genesis.
      act(() => result.current.setBookOpen("GEN", true));
      expect(result.current.openBookOverrides).toEqual({ GEN: true });
      expect(result.current.anyBookOpen).toBe(true);

      // Clicking "Close books" (now shown because anyBookOpen is true) must
      // close Genesis too, not flip showingAllChapters back to open-all.
      act(() => result.current.handleShowAllChaptersToggle());
      expect(result.current.showingAllChapters).toBe(false);
      expect(result.current.openBookOverrides).toEqual({});
      expect(result.current.anyBookOpen).toBe(false);
    });
  });

  describe("projectFilters", () => {
    it("initial filters all have value true", () => {
      const result = setup();
      const allTrue = Array.from(result.current.projectFilters.values()).every(
        (v) => v
      );
      expect(allTrue).toBe(true);
    });

    it("handleProjectFilterOptionClick('all') resets all filters to true", () => {
      const result = setup();
      // First isolate one key, then reset with 'all'
      act(() =>
        result.current.handleProjectFilterOptionClick("Assigned" as never)
      );
      act(() => result.current.handleProjectFilterOptionClick("all"));
      const allTrue = Array.from(result.current.projectFilters.values()).every(
        (v) => v
      );
      expect(allTrue).toBe(true);
    });

    it("handleProjectFilterOptionClick isolates a key when all are selected", () => {
      const result = setup();
      act(() =>
        result.current.handleProjectFilterOptionClick("InProgress" as never)
      );
      const inProgress = result.current.projectFilters.get(
        "InProgress" as never
      );
      expect(inProgress).toBe(true);
      // Other keys should be false
      const others = Array.from(result.current.projectFilters.entries())
        .filter(([k]) => k !== "InProgress")
        .every(([, v]) => !v);
      expect(others).toBe(true);
    });

    it("handleProjectFilterOptionClick toggles off an isolated key", () => {
      const result = setup();
      // Isolate InProgress first
      act(() =>
        result.current.handleProjectFilterOptionClick("InProgress" as never)
      );
      // Toggle it off
      act(() =>
        result.current.handleProjectFilterOptionClick("InProgress" as never)
      );
      const inProgress = result.current.projectFilters.get(
        "InProgress" as never
      );
      expect(inProgress).toBe(false);
    });
  });
});
