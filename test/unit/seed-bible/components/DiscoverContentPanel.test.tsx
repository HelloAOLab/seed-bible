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
      sync: {
        pendingCount: signal(0),
        pendingCountForChapter: vi.fn(() => 0),
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
});
