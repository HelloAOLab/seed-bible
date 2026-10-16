import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { DiscoverContentPanel } from "@packages/seed-bible/seed-bible/components/DiscoverContentPanel/DiscoverContentPanel";
import type { ReaderTab } from "@packages/seed-bible/seed-bible/managers/TabsManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import type { Annotation } from "@packages/seed-bible/seed-bible/managers/AnnotationsManager";
import type { PlanMatch } from "@packages/seed-bible/seed-bible/managers/ReadingPlansManager";
import {
  createDiscoverManager,
  type DiscoverContentTypeDefinition,
} from "@packages/seed-bible/seed-bible/managers/DiscoverManager";
import { createRealFriendContent } from "../testUtils/realFriendContent";
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

function createPlanMatch(overrides: Partial<PlanMatch> = {}): PlanMatch {
  return {
    planKey: "plan-1",
    planTitle: "Through the Bible in a Year",
    progress: { id: "progress-1" },
    sessions: [],
    allComplete: false,
    ...overrides,
  } as PlanMatch;
}

/** One Theographic result as the provider builds it. */
function theographicResult(
  contentType: "person_profile" | "place_profile" | "event",
  title: string,
  verses: number[]
) {
  return {
    type: "content",
    contentType,
    verses,
    title,
    description: "",
    reference: {
      book: "GEN",
      chapter: 1,
      verse: verses[0],
      endVerse: verses[verses.length - 1],
      bookData: { commonName: "Genesis", name: "Genesis" },
    },
    content: <span>{title} card</span>,
  };
}

/** A typed result with a readable card, for tests that only need one. */
function typedResultOf(contentType: string, title: string) {
  return {
    type: "content",
    contentType,
    title,
    description: "",
    reference: { book: "GEN", chapter: 1 },
    content: <span>{title} card</span>,
  };
}

function createMockTab(
  overrides: {
    discoveredCrossReferences?: unknown[];
    discoveredContent?: unknown[];
    selectedVerses?: number[];
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
      discoveredContent: signal(overrides.discoveredContent ?? []),
      selectedVerses: signal(
        (overrides.selectedVerses ?? []).map((verse) => ({
          verse: { number: verse },
        }))
      ),
    },
  } as unknown as ReaderTab;
}

function createMockState(
  overrides: {
    annotationsForChapter?: Annotation[];
    pendingCountForChapter?: number;
    contentTypes?: DiscoverContentTypeDefinition[];
    readingPlansForChapter?: PlanMatch[];
  } = {}
): SeedBibleState {
  const readingPlansForChapter = overrides.readingPlansForChapter ?? [];
  const discover = createDiscoverManager();
  for (const definition of overrides.contentTypes ?? []) {
    discover.registerContentType(definition);
  }
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
    discover,
    friends: {
      friends: signal([]),
      friendIds: signal([]),
    },
    annotations: {
      getAnnotationsForChapter: vi.fn(() =>
        signal(overrides.annotationsForChapter ?? [])
      ),
      getUserAnnotationsForChapter: vi.fn(() => signal([])),
      visibleAnnotationsForChapter: vi.fn(
        () => overrides.annotationsForChapter ?? []
      ),
      createNewAnnotation: vi.fn().mockResolvedValue(undefined),
      hasRecordOverride: false,
      pendingCountForChapter: vi.fn(
        () => overrides.pendingCountForChapter ?? 0
      ),
      sync: {
        pendingCount: signal(0),
      },
    },
    // The real manager only returns plans while the reading-plans feature is
    // on, so the flag follows whether any plans were given.
    features: {
      isFeatureEnabled: vi.fn(() => signal(readingPlansForChapter.length > 0)),
    },
    readingPlans: {
      getReadingPlansForChapter: vi.fn(() => readingPlansForChapter),
    },
  } as unknown as SeedBibleState;
}

describe("DiscoverContentPanel", () => {
  let container: HTMLDivElement;
  const scrollIntoView = vi.fn();

  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: scrollIntoView,
  });

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

  it("hides the notes section when the chapter has no notes", () => {
    const tab = createMockTab({ discoveredCrossReferences: RESULTS_FIXTURE });
    const state = createMockState({ annotationsForChapter: [] });

    act(() => {
      render(<DiscoverContentPanel tab={tab} state={state} />, container);
    });

    expect(
      container.querySelector(".sb-discover-content-panel")
    ).not.toBeNull();
    const sectionTitles = Array.from(
      container.querySelectorAll(".sb-discover-section-title")
    ).map((el) => el.textContent);
    expect(sectionTitles).not.toContain("Notes");
    expect(container.textContent).not.toContain(
      "You don't have any notes for this chapter."
    );
    expect(container.textContent).toContain("Exodus 5:3");
  });

  it("keeps the notes section when a deletion is still waiting to sync", () => {
    const tab = createMockTab({ discoveredCrossReferences: RESULTS_FIXTURE });
    const state = createMockState({
      annotationsForChapter: [],
      pendingCountForChapter: 1,
    });

    act(() => {
      render(<DiscoverContentPanel tab={tab} state={state} />, container);
    });

    const sectionTitles = Array.from(
      container.querySelectorAll(".sb-discover-section-title")
    ).map((el) => el.textContent);
    expect(sectionTitles).toContain("Notes");
    expect(
      container.querySelector(".sb-annotations-pending-sync")?.textContent
    ).toContain("waiting to sync");
    const chipLabels = Array.from(
      container.querySelectorAll(".sb-dcp-chip")
    ).map((el) => el.textContent);
    expect(chipLabels).toEqual(["All", "Notes", "Cross Refs"]);
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

  it("shows a friend's notes on a chapter where the user has none of their own", async () => {
    const tab = createMockTab();
    const mockState = createMockState();
    // The real managers, so the friend's note is loaded from the server
    // the way the app loads it.
    const { login, friends, annotations } = await createRealFriendContent({
      friendIds: ["friend-1"],
      notes: {
        "friend-1": [
          createAnnotation({
            id: "friend-note",
            data: {
              type: "comment",
              html: "<p>A friend's note.</p>",
              userId: "friend-1",
            },
          } as Partial<Annotation>),
        ],
      },
      discover: mockState.discover,
    });
    const state = {
      ...mockState,
      login,
      friends,
      annotations,
    } as unknown as SeedBibleState;

    act(() => {
      render(<DiscoverContentPanel tab={tab} state={state} />, container);
    });

    await vi.waitFor(() =>
      expect(container.textContent).toContain("A friend's note.")
    );
    const sectionTitles = Array.from(
      container.querySelectorAll(".sb-discover-section-title")
    ).map((el) => el.textContent);
    expect(sectionTitles).toContain("Notes");
  });

  it("renders nothing when there are discovered results absent but also no annotations", () => {
    const tab = createMockTab();
    const state = createMockState({ annotationsForChapter: [] });

    act(() => {
      render(<DiscoverContentPanel tab={tab} state={state} />, container);
    });

    expect(container.innerHTML).toBe("");
  });

  it("renders the reading-plans section when a followed plan covers the chapter and nothing else exists", () => {
    const tab = createMockTab();
    const state = createMockState({
      annotationsForChapter: [],
      readingPlansForChapter: [createPlanMatch()],
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
    expect(sectionTitles).toEqual(["Reading Plans"]);
    expect(container.textContent).toContain("Through the Bible in a Year");
    expect(container.textContent).not.toContain("Pick a filter above");
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

  it("falls back to the 'all' filter when the last note goes away", () => {
    const tab = createMockTab({
      discoveredCrossReferences: RESULTS_FIXTURE,
      discoveredContent: [
        {
          providerId: "p1",
          results: [{ title: "A related article" }],
        },
      ],
    });
    const annotationsForChapter = signal<Annotation[]>([createAnnotation()]);
    const state = createMockState();
    state.annotations.getAnnotationsForChapter = vi.fn(
      () => annotationsForChapter
    );
    state.annotations.visibleAnnotationsForChapter = vi.fn(
      () => annotationsForChapter.value
    );

    act(() => {
      render(<DiscoverContentPanel tab={tab} state={state} />, container);
    });

    const getChip = (label: string) =>
      Array.from(container.querySelectorAll(".sb-dcp-chip")).find(
        (el) => el.textContent === label
      ) as HTMLButtonElement | undefined;

    act(() => {
      getChip("Notes")!.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      );
    });
    expect(getChip("Notes")!.getAttribute("aria-selected")).toBe("true");

    // A second content type stays so the chip row remains; with only cross
    // references left the row would hide because a single kind of content
    // does not get filter chips.
    act(() => {
      annotationsForChapter.value = [];
      render(<DiscoverContentPanel tab={tab} state={state} />, container);
    });

    expect(getChip("All")!.getAttribute("aria-selected")).toBe("true");
    expect(getChip("Notes")).toBeUndefined();
    expect(container.textContent).toContain("Exodus 5:3");
    expect(container.textContent).toContain("A related article");
  });

  describe("filter scrolling arrows", () => {
    const START_LABEL = "Scroll filters toward start";
    const END_LABEL = "Scroll filters toward end";

    function getRow() {
      const row = container.querySelector<HTMLElement>(".sb-dcp-filters");
      expect(row).not.toBeNull();
      return row!;
    }

    function getArrow(label: string) {
      return container.querySelector<HTMLButtonElement>(
        `button[aria-label="${label}"]`
      );
    }

    function setDimension(
      element: HTMLElement,
      property: "scrollWidth" | "clientWidth" | "scrollLeft",
      value: number
    ) {
      Object.defineProperty(element, property, {
        configurable: true,
        writable: true,
        value,
      });
    }

    function setRect(element: HTMLElement, left: number, right: number) {
      vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
        x: left,
        y: 0,
        left,
        right,
        top: 0,
        bottom: 32,
        width: right - left,
        height: 32,
        toJSON: () => ({}),
      } as DOMRect);
    }

    function configureOverflow(row: HTMLElement) {
      const wrapper = row.parentElement!;
      setDimension(row, "scrollWidth", 240);
      setDimension(row, "clientWidth", 100);
      setDimension(wrapper, "clientWidth", 100);

      act(() => {
        window.dispatchEvent(new Event("resize"));
      });
    }

    function renderPanel(
      tab = createMockTab({
        discoveredCrossReferences: RESULTS_FIXTURE,
      }),
      state = createMockState({
        annotationsForChapter: [createAnnotation()],
      })
    ) {
      act(() => {
        render(<DiscoverContentPanel tab={tab} state={state} />, container);
      });
    }

    it("shows arrows when filters overflow and hides them when they fit", () => {
      renderPanel();

      const row = getRow();
      const wrapper = row.parentElement!;

      setDimension(row, "scrollWidth", 240);
      setDimension(row, "clientWidth", 100);
      setDimension(wrapper, "clientWidth", 100);

      act(() => {
        window.dispatchEvent(new Event("resize"));
      });

      expect(getArrow(START_LABEL)).not.toBeNull();
      expect(getArrow(END_LABEL)).not.toBeNull();

      setDimension(row, "scrollWidth", 100);

      act(() => {
        window.dispatchEvent(new Event("resize"));
      });

      expect(getArrow(START_LABEL)).toBeNull();
      expect(getArrow(END_LABEL)).toBeNull();
    });

    it("marks the arrow as disabled at the current scroll boundary", () => {
      renderPanel();
      const row = getRow();
      configureOverflow(row);
      setDimension(row, "scrollLeft", 0);
      act(() => {
        row.dispatchEvent(new Event("scroll"));
      });
      expect(getArrow(START_LABEL)?.getAttribute("aria-disabled")).toBe("true");
      expect(getArrow(END_LABEL)?.getAttribute("aria-disabled")).toBe("false");
      setDimension(row, "scrollLeft", 140);
      act(() => {
        row.dispatchEvent(new Event("scroll"));
      });
      expect(getArrow(START_LABEL)?.getAttribute("aria-disabled")).toBe(
        "false"
      );
      expect(getArrow(END_LABEL)?.getAttribute("aria-disabled")).toBe("true");
    });

    it("updates arrow visibility when the chapter's filters change but their count stays the same", () => {
      const state = createMockState({
        annotationsForChapter: [createAnnotation()],
      });

      const firstTab = createMockTab({
        discoveredCrossReferences: RESULTS_FIXTURE,
      });

      renderPanel(firstTab, state);

      const row = getRow();
      const wrapper = row.parentElement!;

      expect(
        Array.from(row.querySelectorAll(".sb-dcp-chip")).map(
          (chip) => chip.textContent
        )
      ).toEqual(["All", "Notes", "Cross Refs"]);

      setDimension(row, "scrollWidth", 240);
      setDimension(row, "clientWidth", 100);
      setDimension(wrapper, "clientWidth", 100);

      act(() => {
        window.dispatchEvent(new Event("resize"));
      });

      expect(getArrow(END_LABEL)).not.toBeNull();

      // Replace Cross Refs with Content. The filter count remains three.
      const nextTab = createMockTab({
        discoveredContent: [
          {
            providerId: "p1",
            results: [
              {
                type: "content",
                title: "A related article",
                description: "",
                reference: { book: "GEN", chapter: 1 },
              },
            ],
          },
        ],
      });

      // Set the dimensions on the existing row BEFORE rerendering.
      // Preact should reuse the row because its structure is unchanged.
      setDimension(row, "scrollWidth", 100);
      setDimension(row, "clientWidth", 100);
      setDimension(wrapper, "clientWidth", 100);

      act(() => {
        render(<DiscoverContentPanel tab={nextTab} state={state} />, container);
      });

      const updatedRow = getRow();

      expect(updatedRow).toBe(row);

      expect(
        Array.from(updatedRow.querySelectorAll(".sb-dcp-chip")).map(
          (chip) => chip.textContent
        )
      ).toEqual(["All", "Notes", "Content"]);

      // No resize event here: the effect must detect the filter change.
      expect(getArrow(START_LABEL)).toBeNull();
      expect(getArrow(END_LABEL)).toBeNull();
    });

    it("marks the correct arrows as disabled at RTL scroll boundaries", () => {
      const parent = document.createElement("div");
      parent.dir = "rtl";
      container.appendChild(parent);

      const tab = createMockTab({
        discoveredCrossReferences: RESULTS_FIXTURE,
      });
      const state = createMockState({
        annotationsForChapter: [createAnnotation()],
      });

      act(() => {
        render(<DiscoverContentPanel tab={tab} state={state} />, parent);
      });

      const row = parent.querySelector<HTMLElement>(".sb-dcp-filters");
      expect(row).not.toBeNull();

      const rtlRow = row!;
      rtlRow.style.direction = "rtl";

      const wrapper = rtlRow.parentElement!;
      setDimension(rtlRow, "scrollWidth", 240);
      setDimension(rtlRow, "clientWidth", 100);
      setDimension(wrapper, "clientWidth", 100);

      // RTL start boundary.
      setDimension(rtlRow, "scrollLeft", 0);

      act(() => {
        rtlRow.dispatchEvent(new Event("scroll"));
      });

      expect(
        parent
          .querySelector<HTMLButtonElement>(
            `button[aria-label="${START_LABEL}"]`
          )
          ?.getAttribute("aria-disabled")
      ).toBe("true");

      expect(
        parent
          .querySelector<HTMLButtonElement>(`button[aria-label="${END_LABEL}"]`)
          ?.getAttribute("aria-disabled")
      ).toBe("false");

      // RTL end boundary: browsers can report a negative scrollLeft.
      setDimension(rtlRow, "scrollLeft", -140);

      act(() => {
        rtlRow.dispatchEvent(new Event("scroll"));
      });

      expect(
        parent
          .querySelector<HTMLButtonElement>(
            `button[aria-label="${START_LABEL}"]`
          )
          ?.getAttribute("aria-disabled")
      ).toBe("false");

      expect(
        parent
          .querySelector<HTMLButtonElement>(`button[aria-label="${END_LABEL}"]`)
          ?.getAttribute("aria-disabled")
      ).toBe("true");
    });
    it("does not scroll when a faded arrow is clicked at the scroll boundary", () => {
      renderPanel();
      const row = getRow();
      configureOverflow(row);
      const scrollBy = vi.fn();
      row.scrollBy = scrollBy;
      // At the start boundary, scrolling toward the start is unavailable.
      setDimension(row, "scrollLeft", 0);
      act(() => {
        row.dispatchEvent(new Event("scroll"));
      });
      const startArrow = getArrow(START_LABEL);
      expect(startArrow).not.toBeNull();
      expect(startArrow!.getAttribute("aria-disabled")).toBe("true");
      act(() => {
        startArrow!.click();
      });
      expect(scrollBy).not.toHaveBeenCalled();
    });
    it("scrolls toward the end when the end arrow is clicked in LTR", () => {
      renderPanel();

      const row = getRow();
      configureOverflow(row);

      const pills = Array.from(
        row.querySelectorAll<HTMLButtonElement>(".sb-dcp-chip")
      );

      expect(pills.length).toBeGreaterThan(0);

      setRect(row, 0, 100);
      pills.forEach((pill, index) => {
        setRect(pill, 110 + index * 50, 150 + index * 50);
      });

      const scrollBy = vi.fn();
      row.scrollBy = scrollBy;

      setDimension(row, "scrollLeft", 0);

      act(() => {
        row.dispatchEvent(new Event("scroll"));
      });

      const endArrow = getArrow(END_LABEL);
      expect(endArrow).not.toBeNull();
      expect(endArrow!.getAttribute("aria-disabled")).toBe("false");

      act(() => {
        endArrow!.click();
      });

      expect(scrollBy).toHaveBeenCalledTimes(1);
      expect(scrollBy.mock.calls[0]![0].left).toBeGreaterThan(0);
    });

    it("scrolls toward the start when the start arrow is clicked in LTR", () => {
      renderPanel();

      const row = getRow();
      configureOverflow(row);

      const pills = Array.from(
        row.querySelectorAll<HTMLButtonElement>(".sb-dcp-chip")
      );

      setRect(row, 0, 100);
      pills.forEach((pill, index) => {
        setRect(pill, -50 + index * 50, -10 + index * 50);
      });

      const scrollBy = vi.fn();
      row.scrollBy = scrollBy;

      setDimension(row, "scrollLeft", 100);

      act(() => {
        row.dispatchEvent(new Event("scroll"));
      });

      const startArrow = getArrow(START_LABEL);
      expect(startArrow).not.toBeNull();
      expect(startArrow!.getAttribute("aria-disabled")).toBe("false");

      act(() => {
        startArrow!.click();
      });

      expect(scrollBy).toHaveBeenCalledTimes(1);
      expect(scrollBy.mock.calls[0]![0].left).toBeLessThan(0);
    });

    it("scrolls toward the end when the end arrow is clicked in RTL", () => {
      const parent = document.createElement("div");
      parent.dir = "rtl";
      container.appendChild(parent);

      const tab = createMockTab({
        discoveredCrossReferences: RESULTS_FIXTURE,
      });
      const state = createMockState({
        annotationsForChapter: [createAnnotation()],
      });

      act(() => {
        render(<DiscoverContentPanel tab={tab} state={state} />, parent);
      });

      const row = parent.querySelector<HTMLElement>(".sb-dcp-filters")!;
      const wrapper = row.parentElement!;
      row.style.direction = "rtl";

      setDimension(row, "scrollWidth", 240);
      setDimension(row, "clientWidth", 100);
      setDimension(wrapper, "clientWidth", 100);

      const pills = Array.from(
        row.querySelectorAll<HTMLButtonElement>(".sb-dcp-chip")
      );

      setRect(row, 0, 100);
      pills.forEach((pill, index) => {
        setRect(pill, -50 - index * 50, 10 - index * 50);
      });

      const scrollBy = vi.fn();
      row.scrollBy = scrollBy;

      setDimension(row, "scrollLeft", 0);

      act(() => {
        window.dispatchEvent(new Event("resize"));
        row.dispatchEvent(new Event("scroll"));
      });

      const endArrow = parent.querySelector<HTMLButtonElement>(
        `button[aria-label="${END_LABEL}"]`
      );

      expect(endArrow).not.toBeNull();
      expect(endArrow!.getAttribute("aria-disabled")).toBe("false");

      act(() => {
        endArrow!.click();
      });

      expect(scrollBy).toHaveBeenCalledTimes(1);
      expect(scrollBy.mock.calls[0]![0].left).toBeLessThan(0);
    });

    it("scrolls toward the start when the start arrow is clicked in RTL", () => {
      const parent = document.createElement("div");
      parent.dir = "rtl";
      container.appendChild(parent);

      const tab = createMockTab({
        discoveredCrossReferences: RESULTS_FIXTURE,
      });
      const state = createMockState({
        annotationsForChapter: [createAnnotation()],
      });

      act(() => {
        render(<DiscoverContentPanel tab={tab} state={state} />, parent);
      });

      const row = parent.querySelector<HTMLElement>(".sb-dcp-filters")!;
      const wrapper = row.parentElement!;
      row.style.direction = "rtl";

      setDimension(row, "scrollWidth", 240);
      setDimension(row, "clientWidth", 100);
      setDimension(wrapper, "clientWidth", 100);

      const pills = Array.from(
        row.querySelectorAll<HTMLButtonElement>(".sb-dcp-chip")
      );

      setRect(row, 0, 100);
      pills.forEach((pill, index) => {
        setRect(pill, 110 + index * 50, 150 + index * 50);
      });

      const scrollBy = vi.fn();
      row.scrollBy = scrollBy;

      setDimension(row, "scrollLeft", -100);

      act(() => {
        window.dispatchEvent(new Event("resize"));
        row.dispatchEvent(new Event("scroll"));
      });

      const startArrow = parent.querySelector<HTMLButtonElement>(
        `button[aria-label="${START_LABEL}"]`
      );

      expect(startArrow).not.toBeNull();
      expect(startArrow!.getAttribute("aria-disabled")).toBe("false");

      act(() => {
        startArrow!.click();
      });

      expect(scrollBy).toHaveBeenCalledTimes(1);
      expect(scrollBy.mock.calls[0]![0].left).toBeGreaterThan(0);
    });

    it("scrolls in the correct direction in RTL layout", () => {
      const parent = document.createElement("div");
      parent.dir = "rtl";
      container.appendChild(parent);

      const tab = createMockTab({
        discoveredCrossReferences: RESULTS_FIXTURE,
      });
      const state = createMockState({
        annotationsForChapter: [createAnnotation()],
      });

      act(() => {
        render(<DiscoverContentPanel tab={tab} state={state} />, parent);
      });

      const row = parent.querySelector<HTMLElement>(".sb-dcp-filters");
      expect(row).not.toBeNull();

      const rtlRow = row!;
      rtlRow.style.direction = "rtl";

      const wrapper = rtlRow.parentElement!;
      setDimension(rtlRow, "scrollWidth", 240);
      setDimension(rtlRow, "clientWidth", 100);
      setDimension(wrapper, "clientWidth", 100);

      const chips = Array.from(
        rtlRow.querySelectorAll<HTMLButtonElement>(".sb-dcp-chip")
      );

      expect(chips.length).toBeGreaterThan(0);

      // In RTL, the next chip toward the end is clipped on the left.
      setRect(rtlRow, 0, 100);
      setRect(chips[0]!, -40, 0);

      act(() => {
        window.dispatchEvent(new Event("resize"));
      });

      const scrollBy = vi.fn();
      rtlRow.scrollBy = scrollBy;

      act(() => {
        parent
          .querySelector<HTMLButtonElement>(
            `button[aria-label="${END_LABEL}"]`
          )!
          .dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });

      expect(scrollBy).toHaveBeenCalledWith({ left: -40 });
    });
  });

  describe("registered content types", () => {
    // The three an extension like Theographic registers: hidden from "All",
    // and each result's `content` is the whole card.
    const HIDDEN_TYPES: DiscoverContentTypeDefinition[] = [
      {
        id: "person_profile",
        title: "People",
        hiddenByDefault: true,
        layout: "custom",
      },
      {
        id: "place_profile",
        title: "Places",
        hiddenByDefault: true,
        layout: "custom",
      },
      { id: "event", title: "Events", hiddenByDefault: true, layout: "custom" },
    ];

    const THEOGRAPHIC_FIXTURE = [
      {
        providerId: "theographic",
        results: [
          theographicResult("person_profile", "Aaron", [14, 27]),
          theographicResult("person_profile", "Moses", [1, 14]),
          theographicResult("place_profile", "Egypt", [19]),
        ],
      },
    ];

    const chipLabels = () =>
      Array.from(container.querySelectorAll(".sb-dcp-chip")).map(
        (el) => el.textContent
      );

    const getChip = (label: string) =>
      Array.from(container.querySelectorAll(".sb-dcp-chip")).find(
        (el) => el.textContent === label
      ) as HTMLButtonElement;

    function renderPanel(
      tab: ReaderTab,
      contentTypes: DiscoverContentTypeDefinition[] = HIDDEN_TYPES
    ) {
      const state = createMockState({
        annotationsForChapter: [createAnnotation()],
        contentTypes,
      });
      act(() => {
        render(<DiscoverContentPanel tab={tab} state={state} />, container);
      });
    }

    it("offers a chip per type that has entries, and no Content chip", () => {
      renderPanel(createMockTab({ discoveredContent: THEOGRAPHIC_FIXTURE }));

      // No Events chip: the fixture has none. No Content chip either — these
      // results have their own types.
      expect(chipLabels()).toEqual(["All", "Notes", "People", "Places"]);
    });

    it("keeps people and places out of the 'All' view", () => {
      renderPanel(createMockTab({ discoveredContent: THEOGRAPHIC_FIXTURE }));

      expect(container.textContent).toContain("A helpful note.");
      expect(container.textContent).not.toContain("Aaron card");
      expect(container.textContent).not.toContain("Egypt card");
    });

    it("shows only that type once its chip is picked", () => {
      renderPanel(createMockTab({ discoveredContent: THEOGRAPHIC_FIXTURE }));

      act(() => {
        getChip("People").dispatchEvent(
          new MouseEvent("click", { bubbles: true })
        );
      });

      expect(container.textContent).toContain("Aaron card");
      expect(container.textContent).toContain("Moses card");
      expect(container.textContent).not.toContain("Egypt card");
      expect(container.textContent).not.toContain("A helpful note.");
    });

    it("narrows to the entries named in the selected verse", () => {
      renderPanel(
        createMockTab({
          discoveredContent: THEOGRAPHIC_FIXTURE,
          selectedVerses: [27],
        })
      );

      act(() => {
        getChip("People").dispatchEvent(
          new MouseEvent("click", { bubbles: true })
        );
      });

      // Aaron is in verse 27; Moses (1, 14) is not.
      expect(container.textContent).toContain("Aaron card");
      expect(container.textContent).not.toContain("Moses card");
    });

    it("drops a type's chip when the selected verse has none of it", () => {
      renderPanel(
        createMockTab({
          discoveredContent: THEOGRAPHIC_FIXTURE,
          selectedVerses: [14],
        })
      );

      // Verse 14 has people but no places, so offering a Places chip would
      // open an empty section.
      expect(chipLabels()).toEqual(["All", "Notes", "People"]);
    });

    it("still offers the chip when a hidden type is the only thing there", () => {
      // No notes and one type: "All" plus "People" is only two chips, but
      // "All" hides people, so without the chip they can't be reached.
      const tab = createMockTab({
        discoveredContent: THEOGRAPHIC_FIXTURE,
        selectedVerses: [14],
      });
      const state = createMockState({
        annotationsForChapter: [],
        contentTypes: HIDDEN_TYPES,
      });
      act(() => {
        render(<DiscoverContentPanel tab={tab} state={state} />, container);
      });

      expect(chipLabels()).toEqual(["All", "People"]);

      act(() => {
        getChip("People").dispatchEvent(
          new MouseEvent("click", { bubbles: true })
        );
      });

      expect(container.textContent).toContain("Aaron card");
      expect(container.textContent).toContain("Moses card");
    });

    it("explains where the content went when it is all there is", () => {
      const tab = createMockTab({ discoveredContent: THEOGRAPHIC_FIXTURE });
      const state = createMockState({
        annotationsForChapter: [],
        contentTypes: HIDDEN_TYPES,
      });

      act(() => {
        render(<DiscoverContentPanel tab={tab} state={state} />, container);
      });

      expect(container.textContent).toContain("Pick a filter above");
    });

    it("shows a type that isn't hidden by default under 'All'", () => {
      renderPanel(createMockTab({ discoveredContent: THEOGRAPHIC_FIXTURE }), [
        { id: "person_profile", title: "People", layout: "custom" },
      ]);

      expect(container.textContent).toContain("Aaron card");
    });

    it("shows results as ordinary content when their type isn't registered", () => {
      // No chips for them, but nothing is hidden either.
      renderPanel(
        createMockTab({ discoveredContent: THEOGRAPHIC_FIXTURE }),
        []
      );

      expect(chipLabels()).toEqual(["All", "Notes", "Content"]);
      expect(container.textContent).toContain("Aaron");
    });

    it("keys chips so a type id can't collide with a built-in filter", () => {
      // A type literally named "content" still gets its own chip, separate
      // from the built-in Content chip for untyped results.
      const tab = createMockTab({
        discoveredContent: [
          {
            providerId: "p1",
            results: [
              typedResultOf("content", "Typed"),
              {
                type: "content",
                title: "Untyped",
                description: "",
                reference: { book: "GEN", chapter: 1 },
              },
            ],
          },
        ],
      });
      renderPanel(tab, [{ id: "content", title: "Typed content" }]);

      expect(chipLabels()).toEqual([
        "All",
        "Notes",
        "Content",
        "Typed content",
      ]);
    });
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
