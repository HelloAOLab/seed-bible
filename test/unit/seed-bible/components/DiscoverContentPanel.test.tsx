import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { DiscoverContentPanel } from "@packages/seed-bible/seed-bible/components/DiscoverContentPanel/DiscoverContentPanel";
import type { ReaderTab } from "@packages/seed-bible/seed-bible/managers/TabsManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import type { Annotation } from "@packages/seed-bible/seed-bible/managers/AnnotationsManager";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const actual = await vi.importActual<
    typeof import("@packages/seed-bible/seed-bible/i18n/I18nManager")
  >("@packages/seed-bible/seed-bible/i18n/I18nManager");
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string, options?: Record<string, unknown>) =>
        (options?.defaultValue as string | undefined) ?? key,
      language: "en",
    }),
  };
});

vi.mock("@packages/seed-bible/seed-bible/managers/Sanitization", () => ({
  setSafeHtml: vi.fn(async (html: string, element: HTMLElement) => {
    element.innerHTML = html;
  }),
}));

const RESULTS_FIXTURE = [
  {
    providerId: "p1",
    results: [
      {
        type: "cross-reference",
        reference: { chapter: 1, bookData: { name: "Genesis" } },
        crossReference: {
          chapter: 5,
          verse: 3,
          bookData: { commonName: "Exodus", name: "Exodus" },
        },
      },
    ],
  },
];

function createAnnotation(overrides: Partial<Annotation> = {}): Annotation {
  return {
    id: "ann-1",
    bookId: "GEN",
    chapterNumber: 1,
    data: { type: "comment", html: "<p>A helpful note.</p>" },
    ...overrides,
  } as Annotation;
}

function createMockTab(
  overrides: {
    discoveredCrossReferences?: unknown[];
  } = {}
): ReaderTab {
  return {
    id: "tab-1",
    readingState: {
      bookId: signal("GEN"),
      chapterNumber: signal(1),
      chapterData: signal(null),
      discoverContentPanelInline: signal(true),
      discoveredCrossReferences: signal(
        overrides.discoveredCrossReferences ?? []
      ),
      discoveredStudyNotes: signal([]),
      discoveredContent: signal([]),
    },
  } as unknown as ReaderTab;
}

function createMockState(
  overrides: { annotationsForChapter?: Annotation[] } = {}
): SeedBibleState {
  return {
    app: {
      toast: vi.fn(),
      openVerseReference: vi.fn().mockResolvedValue(undefined),
      openDiscover: vi.fn(),
    },
    login: {
      userId: signal(null),
      getUserProfile: vi.fn().mockResolvedValue({ name: "" }),
    },
    tabs: { tabs: signal([]), selectedTabId: signal(null) },
    panes: { closeFullscreenPanes: vi.fn() },
    modals: { openModal: vi.fn(), closeModal: vi.fn() },
    discover: { scrollToVerse: signal(null) },
    annotations: {
      getAnnotationsForChapter: vi.fn(() =>
        signal(overrides.annotationsForChapter ?? [])
      ),
      createNewAnnotation: vi.fn().mockResolvedValue(undefined),
      hasRecordOverride: false,
      pendingCountForChapter: vi.fn(() => 0),
      sync: {
        pendingCount: signal(0),
      },
    },
    features: { isFeatureEnabled: vi.fn().mockReturnValue(false) },
  } as unknown as SeedBibleState;
}

describe("DiscoverContentPanel", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it("renders nothing when there is no tab", () => {
    act(() => {
      render(
        <DiscoverContentPanel tab={null} state={createMockState()} />,
        container
      );
    });

    expect(container.innerHTML).toBe("");
  });

  it("renders the discovered content", () => {
    const tab = createMockTab({ discoveredCrossReferences: RESULTS_FIXTURE });

    act(() => {
      render(
        <DiscoverContentPanel tab={tab} state={createMockState()} />,
        container
      );
    });

    const panel = container.querySelector(".sb-discover-content-panel");
    expect(panel).not.toBeNull();
    expect(container.textContent).toContain("Exodus 5:3");
  });

  it("renders the tab's notes (annotations) even when there are no other discovered results", () => {
    const tab = createMockTab();
    const state = createMockState({
      annotationsForChapter: [createAnnotation()],
    });

    act(() => {
      render(<DiscoverContentPanel tab={tab} state={state} />, container);
    });

    expect(
      container.querySelector(".sb-discover-content-panel")
    ).not.toBeNull();
    const sectionTitles = Array.from(
      container.querySelectorAll(".sb-discover-section-title")
    ).map((el) => el.textContent);
    expect(sectionTitles).toContain("Notes");
    expect(container.textContent).toContain("A helpful note.");
  });

  it("renders nothing when there are discovered results absent but also no annotations", () => {
    const tab = createMockTab();
    const state = createMockState({ annotationsForChapter: [] });

    act(() => {
      render(<DiscoverContentPanel tab={tab} state={state} />, container);
    });

    expect(container.innerHTML).toBe("");
  });

  it("only shows filter chips for content that is actually available", () => {
    const tab = createMockTab({ discoveredCrossReferences: RESULTS_FIXTURE });
    const state = createMockState({
      annotationsForChapter: [createAnnotation()],
    });

    act(() => {
      render(<DiscoverContentPanel tab={tab} state={state} />, container);
    });

    const chipLabels = Array.from(
      container.querySelectorAll(".sb-dcp-chip")
    ).map((el) => el.textContent);
    expect(chipLabels).toEqual(["All", "Notes", "Cross Refs"]);
  });

  it("hides the filter row entirely when there's only one kind of content", () => {
    const tab = createMockTab();
    const state = createMockState({
      annotationsForChapter: [createAnnotation()],
    });

    act(() => {
      render(<DiscoverContentPanel tab={tab} state={state} />, container);
    });

    expect(container.querySelector(".sb-dcp-filters")).toBeNull();
  });

  it("clicking a filter chip narrows the panel to only that content type", () => {
    const tab = createMockTab({ discoveredCrossReferences: RESULTS_FIXTURE });
    const state = createMockState({
      annotationsForChapter: [createAnnotation()],
    });

    act(() => {
      render(<DiscoverContentPanel tab={tab} state={state} />, container);
    });

    const chips = Array.from(container.querySelectorAll(".sb-dcp-chip"));
    const crossRefsChip = chips.find(
      (el) => el.textContent === "Cross Refs"
    ) as HTMLButtonElement;
    expect(crossRefsChip).toBeTruthy();

    act(() => {
      crossRefsChip.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(crossRefsChip.getAttribute("aria-selected")).toBe("true");
    expect(container.textContent).toContain("Exodus 5:3");
    expect(container.textContent).not.toContain("A helpful note.");
    const sectionTitles = Array.from(
      container.querySelectorAll(".sb-discover-section-title")
    ).map((el) => el.textContent);
    expect(sectionTitles).not.toContain("Notes");
  });

  it("falls back to the 'all' filter when the active filter's content type disappears", () => {
    const tab = createMockTab({ discoveredCrossReferences: RESULTS_FIXTURE });
    const state = createMockState({
      annotationsForChapter: [createAnnotation()],
    });

    act(() => {
      render(<DiscoverContentPanel tab={tab} state={state} />, container);
    });

    const getChip = (label: string) =>
      Array.from(container.querySelectorAll(".sb-dcp-chip")).find(
        (el) => el.textContent === label
      ) as HTMLButtonElement;

    act(() => {
      getChip("Cross Refs").dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      );
    });
    expect(getChip("Cross Refs").getAttribute("aria-selected")).toBe("true");

    // Simulate navigating to a chapter with no cross references, still
    // rendering into the same container so the component instance (and its
    // activeFilter signal) is preserved rather than remounted.
    const tabWithoutCrossReferences = createMockTab({
      discoveredCrossReferences: [],
    });

    act(() => {
      render(
        <DiscoverContentPanel tab={tabWithoutCrossReferences} state={state} />,
        container
      );
    });

    expect(container.querySelector(".sb-dcp-filters")).toBeNull();
    expect(container.textContent).toContain("A helpful note.");
  });

  it("clicking '+ Create' calls createNewAnnotation", () => {
    const tab = createMockTab();
    const state = createMockState({
      annotationsForChapter: [createAnnotation()],
    });

    act(() => {
      render(<DiscoverContentPanel tab={tab} state={state} />, container);
    });

    const createButton = container.querySelector(
      ".sb-dcp-create-btn"
    ) as HTMLButtonElement;
    expect(createButton).toBeTruthy();

    act(() => {
      createButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(state.annotations.createNewAnnotation).toHaveBeenCalledTimes(1);
  });

  it("clicking 'Show All' calls openDiscover", () => {
    const tab = createMockTab();
    const state = createMockState({
      annotationsForChapter: [createAnnotation()],
    });

    act(() => {
      render(<DiscoverContentPanel tab={tab} state={state} />, container);
    });

    const showAllButton = container.querySelector(
      ".sb-dcp-show-all"
    ) as HTMLButtonElement;
    expect(showAllButton).toBeTruthy();

    act(() => {
      showAllButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(state.app.openDiscover).toHaveBeenCalledTimes(1);
  });

  describe("side panel max height", () => {
    let observedElements: Map<Element, () => void>;

    class MockResizeObserver {
      constructor(public cb: () => void) {}
      observe(element: Element) {
        observedElements.set(element, this.cb);
      }
      disconnect() {
        for (const [element, cb] of observedElements) {
          if (cb === this.cb) observedElements.delete(element);
        }
      }
    }

    let scroller: HTMLDivElement;
    let paneRect: { top: number; bottom: number };

    beforeEach(() => {
      observedElements = new Map();
      vi.stubGlobal("ResizeObserver", MockResizeObserver);
      vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
        cb(0);
        return 0;
      });
      vi.stubGlobal("cancelAnimationFrame", () => {});
      vi.stubGlobal("innerHeight", 900);

      // Stand-in for `.sb-pane-reader`: the scrolling pane the panel sticks in.
      scroller = document.createElement("div");
      scroller.style.overflowY = "auto";
      paneRect = { top: 60, bottom: 900 };
      scroller.getBoundingClientRect = () =>
        ({ top: paneRect.top, bottom: paneRect.bottom }) as DOMRect;
      container.remove();
      scroller.appendChild(container);
      document.body.appendChild(scroller);
      document.documentElement.style.setProperty(
        "--sb-reader-bottom-inset",
        "100px"
      );
    });

    afterEach(() => {
      scroller.remove();
      document.documentElement.style.removeProperty("--sb-reader-bottom-inset");
      vi.unstubAllGlobals();
    });

    function renderPanel() {
      act(() => {
        render(
          <DiscoverContentPanel
            tab={createMockTab()}
            state={createMockState({
              annotationsForChapter: [createAnnotation()],
            })}
          />,
          container
        );
      });
      return container.querySelector(
        ".sb-discover-content-panel"
      ) as HTMLElement;
    }

    it("caps the panel to the pane area between the tab bar and the bottom toolbar", () => {
      const panel = renderPanel();

      // Pane starts 60px down (tab bar); toolbar covers the bottom 100px.
      expect(panel.style.getPropertyValue("--sb-dcp-side-max-height")).toBe(
        "740px"
      );
    });

    it("caps the panel to a pane that ends above the bottom of the screen", () => {
      paneRect = { top: 60, bottom: 400 };
      const panel = renderPanel();

      expect(panel.style.getPropertyValue("--sb-dcp-side-max-height")).toBe(
        "340px"
      );
    });

    it("re-measures when the bottom toolbar changes height", async () => {
      const panel = renderPanel();

      document.documentElement.style.setProperty(
        "--sb-reader-bottom-inset",
        "300px"
      );
      await act(async () => {
        await Promise.resolve();
      });

      expect(panel.style.getPropertyValue("--sb-dcp-side-max-height")).toBe(
        "540px"
      );
    });

    it("leaves room for the panel's sticky top offset", () => {
      const panel = renderPanel();

      // jsdom doesn't apply the stylesheet's `top: 1rem`, so set it inline and
      // let the pane resize trigger the re-measure.
      panel.style.top = "16px";
      act(() => observedElements.get(scroller)?.());

      // 900 − 100 (toolbar) − 60 (pane top) − 16 (sticky top)
      expect(panel.style.getPropertyValue("--sb-dcp-side-max-height")).toBe(
        "724px"
      );
    });

    it("re-measures when the pane is resized", () => {
      const panel = renderPanel();

      paneRect = { top: 60, bottom: 500 };
      act(() => observedElements.get(scroller)?.());

      expect(panel.style.getPropertyValue("--sb-dcp-side-max-height")).toBe(
        "440px"
      );
    });

    it("re-measures when the window is resized", () => {
      const panel = renderPanel();

      vi.stubGlobal("innerHeight", 700);
      paneRect = { top: 60, bottom: 700 };
      act(() => {
        window.dispatchEvent(new Event("resize"));
      });

      expect(panel.style.getPropertyValue("--sb-dcp-side-max-height")).toBe(
        "540px"
      );
    });

    it("stops measuring once the panel unmounts", () => {
      const panel = renderPanel();

      act(() => render(null, container));

      expect(observedElements.size).toBe(0);
      vi.stubGlobal("innerHeight", 700);
      window.dispatchEvent(new Event("resize"));
      expect(panel.style.getPropertyValue("--sb-dcp-side-max-height")).toBe(
        "740px"
      );
    });

    it("never shrinks the panel below a usable minimum", () => {
      paneRect = { top: 60, bottom: 120 };
      const panel = renderPanel();

      expect(panel.style.getPropertyValue("--sb-dcp-side-max-height")).toBe(
        "192px"
      );
    });
  });
});
