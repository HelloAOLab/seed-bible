import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { DiscoverContentPanel } from "@packages/seed-bible/seed-bible/components/DiscoverContentPanel/DiscoverContentPanel";
import type { ReaderTab } from "@packages/seed-bible/seed-bible/managers/TabsManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import type { Annotation } from "@packages/seed-bible/seed-bible/managers/AnnotationsManager";
import {
  createDiscoverManager,
  type DiscoverContentTypeDefinition,
} from "@packages/seed-bible/seed-bible/managers/DiscoverManager";

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
    contentTypes?: DiscoverContentTypeDefinition[];
  } = {}
): SeedBibleState {
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
});
