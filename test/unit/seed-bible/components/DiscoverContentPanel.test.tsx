import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { DiscoverContentPanel } from "@packages/seed-bible/seed-bible/components/Discover/DiscoverContentPanel";
import type { ReaderTab } from "@packages/seed-bible/seed-bible/managers/TabsManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import type { Annotation } from "@packages/seed-bible/seed-bible/managers/AnnotationsManager";
import type { PlanMatch } from "@packages/seed-bible/seed-bible/managers/ReadingPlansManager";
import type { Playlist } from "@packages/seed-bible/seed-bible/managers/PlaylistManager";
import type { Friend } from "@packages/seed-bible/seed-bible/managers/FriendsManager";
import {
  createModalManager,
  type ModalManager,
} from "@packages/seed-bible/seed-bible/managers/ModalManager";
import { ME } from "../testUtils/fakeSharedPermissions";
import {
  createDiscoverManager,
  type DiscoverContentTypeDefinition,
} from "@packages/seed-bible/seed-bible/managers/DiscoverManager";
import { createRealFriendContent } from "../testUtils/realFriendContent";
vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager();
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
    chapterData?: {
      book: { id: string; name: string };
      chapter: { number: number };
    };
    translationId?: string;
    selectTranslationAndChapter?: ReturnType<typeof vi.fn>;
    decorateVerses?: ReturnType<typeof vi.fn>;
  } = {}
): ReaderTab {
  return {
    id: "tab-1",
    readingState: {
      bookId: signal("GEN"),
      chapterNumber: signal(1),
      chapterData: signal(overrides.chapterData ?? null),
      translationBooks: signal(null),
      translationId: signal(overrides.translationId ?? "BSB"),
      selectTranslationAndChapter:
        overrides.selectTranslationAndChapter ??
        vi.fn().mockResolvedValue(undefined),
      decorateVerses: overrides.decorateVerses ?? vi.fn(() => "decoration-1"),
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
    /** Friends, each with the playlists they've published. */
    friendPlaylists?: { friend: Friend; playlists: Playlist[] }[];
    /** The open reader tab, which notes read their book names from. */
    tab?: ReaderTab;
    userId?: string | null;
    getUserProfile?: ReturnType<typeof vi.fn>;
    openVerseReference?: ReturnType<typeof vi.fn>;
    modals?: ModalManager;
    hasRecordOverride?: boolean;
    deleteAnnotationAndRefreshImpl?: () => Promise<void>;
  } = {}
): SeedBibleState {
  const friendPlaylists = overrides.friendPlaylists ?? [];
  const readingPlansForChapter = overrides.readingPlansForChapter ?? [];
  const discover = createDiscoverManager();
  for (const definition of overrides.contentTypes ?? []) {
    discover.registerContentType(definition);
  }
  return {
    app: {
      toast: vi.fn(),
      openVerseReference:
        overrides.openVerseReference ?? vi.fn().mockResolvedValue(undefined),
      openDiscover: vi.fn(),
    },
    login: {
      userId: signal(overrides.userId ?? null),
      getUserProfile:
        overrides.getUserProfile ?? vi.fn().mockResolvedValue({ name: "" }),
    },
    tabs: {
      tabs: signal(overrides.tab ? [overrides.tab] : []),
      selectedTabId: signal(overrides.tab?.id ?? null),
    },
    panes: { closeFullscreenPanes: vi.fn() },
    modals: overrides.modals ?? { openModal: vi.fn(), closeModal: vi.fn() },
    discover,
    friends: {
      friends: signal(friendPlaylists.map((entry) => entry.friend)),
      friendIds: signal(friendPlaylists.map((entry) => entry.friend.userId)),
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
      editAnnotation: vi.fn(),
      deleteAnnotationAndRefresh: vi.fn(
        overrides.deleteAnnotationAndRefreshImpl ?? (() => Promise.resolve())
      ),
      hasRecordOverride: overrides.hasRecordOverride ?? false,
      pendingCountForChapter: vi.fn(
        () => overrides.pendingCountForChapter ?? 0
      ),
      sync: {
        pendingCount: signal(0),
        conflicts: signal([]),
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
    playlists: {
      createNewPlaylist: vi.fn().mockResolvedValue(undefined),
      getUserPlaylists: vi.fn((userId: string) =>
        signal(
          friendPlaylists.find((entry) => entry.friend.userId === userId)
            ?.playlists ?? []
        )
      ),
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
        <DiscoverContentPanel
          variant="compact"
          tab={null}
          state={createMockState()}
        />,
        container
      );
    });

    expect(container.innerHTML).toBe("");
  });

  it("sits in the reader's layout wrapper when compact, but fills the side pane when full", () => {
    const tab = createMockTab({ discoveredCrossReferences: RESULTS_FIXTURE });

    act(() => {
      render(
        <DiscoverContentPanel
          variant="compact"
          tab={tab}
          state={createMockState()}
        />,
        container
      );
    });
    expect(
      container.querySelector(
        ".sb-bible-reader-discover-panel > .sb-discover-content-panel"
      )
    ).not.toBeNull();

    act(() => {
      render(
        <DiscoverContentPanel
          variant="full"
          onClose={vi.fn()}
          tab={tab}
          state={createMockState()}
        />,
        container
      );
    });
    expect(
      container.querySelector(".sb-bible-reader-discover-panel")
    ).toBeNull();
    expect(
      container.querySelector(".sb-discover-content-panel--full")
    ).not.toBeNull();
  });

  it("in the full panel, keeps its header and asks for a tab when there is none", () => {
    const onClose = vi.fn();
    act(() => {
      render(
        <DiscoverContentPanel
          variant="full"
          onClose={onClose}
          tab={null}
          state={createMockState()}
        />,
        container
      );
    });

    expect(
      container.querySelector(".sb-discover-panel-header-title")?.textContent
    ).toContain("Discover");
    expect(container.querySelector(".sb-dcp-create-btn")).not.toBeNull();
    expect(container.textContent).toContain(
      "Select a tab to discover related material."
    );

    act(() => {
      container
        .querySelector(".sb-discover-panel-header-close")!
        .dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders the discovered content", () => {
    const tab = createMockTab({ discoveredCrossReferences: RESULTS_FIXTURE });

    act(() => {
      render(
        <DiscoverContentPanel
          variant="compact"
          tab={tab}
          state={createMockState()}
        />,
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
      render(
        <DiscoverContentPanel variant="compact" tab={tab} state={state} />,
        container
      );
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
      render(
        <DiscoverContentPanel variant="compact" tab={tab} state={state} />,
        container
      );
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
      render(
        <DiscoverContentPanel variant="compact" tab={tab} state={state} />,
        container
      );
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
      render(
        <DiscoverContentPanel variant="compact" tab={tab} state={state} />,
        container
      );
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
      render(
        <DiscoverContentPanel variant="compact" tab={tab} state={state} />,
        container
      );
    });

    expect(container.innerHTML).toBe("");
  });

  it("in the full panel, leaves out the empty notes section when the chapter has other content", () => {
    const tab = createMockTab({ discoveredCrossReferences: RESULTS_FIXTURE });

    act(() => {
      render(
        <DiscoverContentPanel
          variant="full"
          onClose={vi.fn()}
          tab={tab}
          state={createMockState({ annotationsForChapter: [] })}
        />,
        container
      );
    });

    expect(container.textContent).toContain("Exodus 5:3");
    expect(container.textContent).not.toContain(
      "You don't have any notes for this chapter."
    );
    const chipLabels = Array.from(
      container.querySelectorAll(".sb-dcp-chip")
    ).map((el) => el.textContent);
    expect(chipLabels).not.toContain("Notes");
  });

  it("in the full panel, offers to create a note when the chapter has nothing to show", () => {
    const tab = createMockTab();
    const state = createMockState({ annotationsForChapter: [] });

    act(() => {
      render(
        <DiscoverContentPanel
          variant="full"
          onClose={vi.fn()}
          tab={tab}
          state={state}
        />,
        container
      );
    });

    expect(
      container.querySelector(".sb-discover-panel-header-title")?.textContent
    ).toContain("Discover GEN");
    expect(
      container.querySelector(".sb-discover-panel-header-close")
    ).not.toBeNull();
    expect(container.textContent).toContain(
      "You don't have any notes for this chapter."
    );
    expect(container.textContent).not.toContain(
      "Pick a filter above to see more from this chapter."
    );

    act(() => {
      (
        container.querySelector(
          ".sb-discover-empty-action"
        ) as HTMLButtonElement
      ).dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(state.annotations.createNewAnnotation).toHaveBeenCalledTimes(1);
  });

  it("renders the reading-plans section when a followed plan covers the chapter and nothing else exists", () => {
    const tab = createMockTab();
    const state = createMockState({
      annotationsForChapter: [],
      readingPlansForChapter: [createPlanMatch()],
    });

    act(() => {
      render(
        <DiscoverContentPanel variant="compact" tab={tab} state={state} />,
        container
      );
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
      render(
        <DiscoverContentPanel variant="compact" tab={tab} state={state} />,
        container
      );
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
      render(
        <DiscoverContentPanel variant="compact" tab={tab} state={state} />,
        container
      );
    });

    expect(container.querySelector(".sb-dcp-filters")).toBeNull();
  });

  it("clicking a filter chip narrows the panel to only that content type", () => {
    const tab = createMockTab({ discoveredCrossReferences: RESULTS_FIXTURE });
    const state = createMockState({
      annotationsForChapter: [createAnnotation()],
    });

    act(() => {
      render(
        <DiscoverContentPanel variant="compact" tab={tab} state={state} />,
        container
      );
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
      render(
        <DiscoverContentPanel variant="compact" tab={tab} state={state} />,
        container
      );
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
        <DiscoverContentPanel
          variant="compact"
          tab={tabWithoutCrossReferences}
          state={state}
        />,
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
      render(
        <DiscoverContentPanel variant="compact" tab={tab} state={state} />,
        container
      );
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
      render(
        <DiscoverContentPanel variant="compact" tab={tab} state={state} />,
        container
      );
    });

    expect(getChip("All")!.getAttribute("aria-selected")).toBe("true");
    expect(getChip("Notes")).toBeUndefined();
    expect(container.textContent).toContain("Exodus 5:3");
    expect(container.textContent).toContain("A related article");
  });

  describe("notes in the full panel", () => {
    const genesis1 = {
      book: { id: "GEN", name: "Genesis" },
      chapter: { number: 1 },
    };

    function renderFull(tab: ReaderTab, state: SeedBibleState) {
      act(() => {
        render(
          <DiscoverContentPanel
            variant="full"
            onClose={vi.fn()}
            tab={tab}
            state={state}
          />,
          container
        );
      });
    }

    /** Opens the first note's menu, which is portaled to <body>. */
    function openNoteMenu(): HTMLButtonElement[] {
      act(() => {
        container
          .querySelector<HTMLButtonElement>(".sb-annotation-item-menu")!
          .dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      return Array.from(
        document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')
      );
    }

    const groupTitles = () =>
      Array.from(
        container.querySelectorAll(".sb-annotation-group-header-title")
      ).map((el) => el.textContent);

    it("doesn't list the user's own playlists or their playlist history", () => {
      const tab = createMockTab();
      const state = createMockState({ tab });
      renderFull(tab, {
        ...state,
        playlists: {
          ...state.playlists,
          userPlaylists: signal([
            { id: "p1", title: "Evening Reading", items: [] },
          ]),
          userPlaylistHistory: signal([
            { id: "hist-1", playlistTitle: "Shared Study" },
          ]),
        },
      } as unknown as SeedBibleState);

      expect(container.textContent).not.toContain("Evening Reading");
      expect(container.textContent).not.toContain("Shared Study");
      expect(container.textContent).not.toContain("Playlist history");
    });

    it("drops a friend's note once you unfriend them", async () => {
      const tab = createMockTab();
      const mockState = createMockState({ tab });
      const { login, friends, annotations } = await createRealFriendContent({
        friendIds: ["ada"],
        names: { ada: "Ada" },
        notes: {
          ada: [
            createAnnotation({
              id: "a1",
              data: {
                type: "comment",
                html: "<p>Ada's note</p>",
                userId: "ada",
              },
            } as Partial<Annotation>),
          ],
        },
        discover: mockState.discover,
      });
      renderFull(tab, {
        ...mockState,
        login,
        friends,
        annotations,
      } as unknown as SeedBibleState);
      await vi.waitFor(() =>
        expect(container.textContent).toContain("Ada's note")
      );

      await act(() => friends.unfriend("ada"));

      expect(container.textContent).not.toContain("Ada's note");
    });

    it("hides the record-override banner when notes aren't routed through an override", () => {
      const tab = createMockTab();
      renderFull(tab, createMockState({ tab, hasRecordOverride: false }));

      expect(
        container.querySelector(".sb-annotation-override-banner")
      ).toBeNull();
    });

    it("shows the record-override banner when notes are routed through a team record, with a button that reloads the URL without the query param", async () => {
      const tab = createMockTab();
      const state = createMockState({ tab, hasRecordOverride: true });
      const originalLocation = window.location;
      Object.defineProperty(window, "location", {
        value: new URL(
          "https://example.com/read?book=GEN&annotationRecordKey=team-record"
        ),
        writable: true,
        configurable: true,
      });

      try {
        renderFull(tab, state);

        // The banner is lazily loaded, so it only mounts once the dynamic
        // import resolves - which (being a real, unmocked import rather than
        // a pre-resolved one) can take more than a single tick.
        await vi.waitFor(() => {
          expect(
            container.querySelector(".sb-annotation-override-banner")
          ).not.toBeNull();
        });

        const banner = container.querySelector(
          ".sb-annotation-override-banner"
        );
        expect(banner?.textContent).toContain(
          "Notes are being saved and loaded from your team's account."
        );

        const button = container.querySelector(
          ".sb-annotation-override-banner-button"
        ) as HTMLButtonElement;
        expect(button?.textContent).toBe("Save to my account");

        act(() => {
          button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        });

        expect(window.location.href).toBe("https://example.com/read?book=GEN");
      } finally {
        Object.defineProperty(window, "location", {
          value: originalLocation,
          writable: true,
          configurable: true,
        });
      }
    });

    it("says how many changes are waiting to sync, and stays quiet when none are", () => {
      function renderWith(pendingCountForChapter: number): string | null {
        const tab = createMockTab();
        renderFull(tab, createMockState({ tab, pendingCountForChapter }));
        const text =
          container.querySelector(".sb-annotations-pending-sync")
            ?.textContent ?? null;
        render(null, container);
        return text;
      }

      expect(renderWith(0)).toBeNull();
      expect(renderWith(1)).toBe("1 change waiting to sync");
      expect(renderWith(3)).toBe("3 changes waiting to sync");
    });

    it("lists notes with a book/chapter/verse location label and a sanitized preview", () => {
      const tab = createMockTab({ chapterData: genesis1 });
      renderFull(
        tab,
        createMockState({
          tab,
          annotationsForChapter: [
            createAnnotation({
              id: "a1",
              verseNumber: 3,
              data: { type: "comment", html: "<p>Great verse</p>" },
            } as Partial<Annotation>),
          ],
        })
      );

      const items = container.querySelectorAll(".sb-annotation-item");
      expect(items).toHaveLength(1);
      expect(groupTitles()).toEqual(["Genesis 1:3"]);
      expect(
        items[0]?.querySelector(".sb-annotation-item-preview")?.textContent
      ).toBe("Great verse");
    });

    it("clicking a verse-reference link inside a note's preview navigates to that reference, without also navigating to the note's own verse", async () => {
      const selectTranslationAndChapter = vi.fn().mockResolvedValue(undefined);
      const openVerseReference = vi.fn().mockResolvedValue(undefined);
      const tab = createMockTab({
        chapterData: genesis1,
        selectTranslationAndChapter,
      });
      renderFull(
        tab,
        createMockState({
          tab,
          openVerseReference,
          annotationsForChapter: [
            createAnnotation({
              id: "a1",
              verseNumber: 3,
              data: {
                type: "comment",
                html: '<p>See <a class="sb-verse-reference-link" href="/read?book=JHN&chapter=3">John 3:16</a></p>',
              },
            } as Partial<Annotation>),
          ],
        })
      );

      const link = container.querySelector(
        ".sb-annotation-item-preview a.sb-verse-reference-link"
      ) as HTMLAnchorElement;
      expect(link).not.toBeNull();

      await act(async () => {
        link.dispatchEvent(
          new MouseEvent("click", { bubbles: true, cancelable: true })
        );
        await Promise.resolve();
      });

      expect(openVerseReference).toHaveBeenCalledWith(
        expect.objectContaining({ book: "JHN", chapter: 3, verse: 16 })
      );
      // The row's own navigate-on-click (to GEN 1:3) must not also fire.
      expect(selectTranslationAndChapter).not.toHaveBeenCalled();
    });

    it("clicking a note navigates to its verse and emphasizes it, without opening it for editing", async () => {
      const selectTranslationAndChapter = vi.fn().mockResolvedValue(undefined);
      const decorateVerses = vi.fn(() => "decoration-1");
      const tab = createMockTab({
        translationId: "BSB",
        chapterData: genesis1,
        selectTranslationAndChapter,
        decorateVerses,
      });
      const state = createMockState({
        tab,
        annotationsForChapter: [
          createAnnotation({
            id: "a1",
            verseNumber: 3,
            endVerseNumber: 5,
          } as Partial<Annotation>),
        ],
      });
      renderFull(tab, state);

      await act(async () => {
        container
          .querySelector(".sb-annotation-item")!
          .dispatchEvent(new MouseEvent("click", { bubbles: true }));
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(selectTranslationAndChapter).toHaveBeenCalledWith(
        "BSB",
        "GEN",
        1,
        { scrollToVerse: 3 }
      );
      expect(decorateVerses).toHaveBeenCalledWith(
        "GEN",
        1,
        [3, 4, 5],
        expect.objectContaining({
          className: "sb-verse-decoration-diminish",
          containerClassName: "sb-chapter-decoration-diminish",
          removeAfterMs: 3000,
        })
      );
      expect(state.annotations.editAnnotation).not.toHaveBeenCalled();
    });

    it("clicking a note with a gapped verse selection only emphasizes its actual verses", async () => {
      const decorateVerses = vi.fn(() => "decoration-1");
      const tab = createMockTab({ chapterData: genesis1, decorateVerses });
      renderFull(
        tab,
        createMockState({
          tab,
          annotationsForChapter: [
            createAnnotation({
              id: "a1",
              verseNumber: 3,
              endVerseNumber: 7,
              verseNumbers: [3, 4, 5, 7],
            } as Partial<Annotation>),
          ],
        })
      );

      await act(async () => {
        container
          .querySelector(".sb-annotation-item")!
          .dispatchEvent(new MouseEvent("click", { bubbles: true }));
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(decorateVerses).toHaveBeenCalledWith(
        "GEN",
        1,
        [3, 4, 5, 7],
        expect.objectContaining({
          className: "sb-verse-decoration-diminish",
          containerClassName: "sb-chapter-decoration-diminish",
          removeAfterMs: 3000,
        })
      );
    });

    it("clicking a note with no verse targeting doesn't navigate or emphasize anything", async () => {
      const selectTranslationAndChapter = vi.fn().mockResolvedValue(undefined);
      const decorateVerses = vi.fn(() => "decoration-1");
      const tab = createMockTab({
        chapterData: genesis1,
        selectTranslationAndChapter,
        decorateVerses,
      });
      renderFull(
        tab,
        createMockState({
          tab,
          annotationsForChapter: [
            createAnnotation({
              id: "a1",
              verseNumber: null,
            } as Partial<Annotation>),
          ],
        })
      );

      await act(async () => {
        container
          .querySelector(".sb-annotation-item")!
          .dispatchEvent(new MouseEvent("click", { bubbles: true }));
        await Promise.resolve();
      });

      expect(selectTranslationAndChapter).not.toHaveBeenCalled();
      expect(decorateVerses).not.toHaveBeenCalled();
    });

    it("labels notes by book/chapter, verse range, and gapped selection", () => {
      const tab = createMockTab({ chapterData: genesis1 });
      renderFull(
        tab,
        createMockState({
          tab,
          annotationsForChapter: [
            createAnnotation({
              id: "whole",
              verseNumber: null,
            } as Partial<Annotation>),
            createAnnotation({
              id: "range",
              verseNumber: 3,
              endVerseNumber: 5,
            } as Partial<Annotation>),
            createAnnotation({
              id: "gapped",
              verseNumber: 8,
              endVerseNumber: 12,
              verseNumbers: [8, 9, 10, 12],
            } as Partial<Annotation>),
          ],
        })
      );

      expect(groupTitles()).toEqual([
        "Genesis 1",
        "Genesis 1:3-5",
        "Genesis 1:8-10,12",
      ]);
    });

    it("groups notes with the same verse range together and gives each distinct range its own group, ordered by verse", () => {
      const tab = createMockTab({ chapterData: genesis1 });
      renderFull(
        tab,
        createMockState({
          tab,
          annotationsForChapter: [
            createAnnotation({
              id: "verse-7",
              verseNumber: 7,
            } as Partial<Annotation>),
            createAnnotation({
              id: "verse-3-a",
              verseNumber: 3,
            } as Partial<Annotation>),
            createAnnotation({
              id: "chapter-note",
              verseNumber: null,
            } as Partial<Annotation>),
            createAnnotation({
              id: "verse-3-b",
              verseNumber: 3,
            } as Partial<Annotation>),
          ],
        })
      );

      expect(groupTitles()).toEqual([
        "Genesis 1",
        "Genesis 1:3",
        "Genesis 1:7",
      ]);
      const groups = container.querySelectorAll(".sb-annotation-group");
      expect(groups[1]?.querySelectorAll(".sb-annotation-item")).toHaveLength(
        2
      );
    });

    it("collapses and re-expands a group's notes when its header is clicked", () => {
      const tab = createMockTab();
      renderFull(
        tab,
        createMockState({
          tab,
          annotationsForChapter: [
            createAnnotation({
              id: "a1",
              verseNumber: 3,
            } as Partial<Annotation>),
          ],
        })
      );

      const header = container.querySelector(
        ".sb-annotation-group-header"
      ) as HTMLButtonElement;
      expect(header.getAttribute("aria-expanded")).toBe("true");
      expect(container.querySelectorAll(".sb-annotation-item")).toHaveLength(1);

      act(() => {
        header.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      expect(header.getAttribute("aria-expanded")).toBe("false");
      expect(container.querySelectorAll(".sb-annotation-item")).toHaveLength(0);

      act(() => {
        header.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      expect(header.getAttribute("aria-expanded")).toBe("true");
      expect(container.querySelectorAll(".sb-annotation-item")).toHaveLength(1);
    });

    it("scrolls to and briefly highlights the group targeted by discover.scrollToVerse, then clears it", () => {
      const tab = createMockTab({ chapterData: genesis1 });
      const state = createMockState({
        tab,
        annotationsForChapter: [
          createAnnotation({
            id: "verse-3",
            verseNumber: 3,
          } as Partial<Annotation>),
          createAnnotation({
            id: "verse-7",
            verseNumber: 7,
          } as Partial<Annotation>),
        ],
      });
      scrollIntoView.mockClear();
      const rafSpy = vi
        .spyOn(window, "requestAnimationFrame")
        .mockImplementation((callback) => {
          callback(0);
          return 0;
        });
      vi.useFakeTimers();

      try {
        renderFull(tab, state);

        act(() => {
          state.discover.scrollToVerse.value = {
            bookId: "GEN",
            chapterNumber: 1,
            verseNumber: 7,
          };
        });

        // Consumed once, immediately.
        expect(state.discover.scrollToVerse.value).toBeNull();
        expect(scrollIntoView).toHaveBeenCalledWith({ block: "center" });

        const groups = container.querySelectorAll(".sb-annotation-group");
        expect(
          groups[0]?.classList.contains("sb-annotation-group--highlighted")
        ).toBe(false);
        expect(
          groups[1]?.classList.contains("sb-annotation-group--highlighted")
        ).toBe(true);

        act(() => {
          vi.advanceTimersByTime(2000);
        });

        expect(
          groups[1]?.classList.contains("sb-annotation-group--highlighted")
        ).toBe(false);
      } finally {
        vi.useRealTimers();
        rafSpy.mockRestore();
      }
    });

    it("switches from another filter to Notes and highlights the note targeted by discover.scrollToVerse", () => {
      const tab = createMockTab({
        chapterData: genesis1,
        discoveredCrossReferences: RESULTS_FIXTURE,
      });
      const state = createMockState({
        tab,
        annotationsForChapter: [
          createAnnotation({
            id: "verse-3",
            verseNumber: 3,
          } as Partial<Annotation>),
          createAnnotation({
            id: "verse-7",
            verseNumber: 7,
          } as Partial<Annotation>),
        ],
      });
      scrollIntoView.mockClear();
      const rafSpy = vi
        .spyOn(window, "requestAnimationFrame")
        .mockImplementation((callback) => {
          callback(0);
          return 0;
        });

      try {
        renderFull(tab, state);

        const getChip = (label: string) =>
          Array.from(container.querySelectorAll(".sb-dcp-chip")).find(
            (el) => el.textContent === label
          ) as HTMLButtonElement;

        act(() => {
          getChip("Cross Refs").dispatchEvent(
            new MouseEvent("click", { bubbles: true })
          );
        });
        expect(container.querySelector(".sb-annotation-group")).toBeNull();

        act(() => {
          state.discover.scrollToVerse.value = {
            bookId: "GEN",
            chapterNumber: 1,
            verseNumber: 7,
          };
        });

        expect(getChip("Notes").getAttribute("aria-selected")).toBe("true");
        expect(container.textContent).not.toContain("Exodus 5:3");
        expect(state.discover.scrollToVerse.value).toBeNull();
        expect(scrollIntoView).toHaveBeenCalledWith({ block: "center" });

        const groups = container.querySelectorAll(".sb-annotation-group");
        expect(
          groups[0]?.classList.contains("sb-annotation-group--highlighted")
        ).toBe(false);
        expect(
          groups[1]?.classList.contains("sb-annotation-group--highlighted")
        ).toBe(true);
      } finally {
        rafSpy.mockRestore();
      }
    });

    it("shows a note's author name resolved from their profile and a formatted updated time", async () => {
      const getUserProfile = vi
        .fn()
        .mockResolvedValue({ name: "Jordan Rivera" });
      const tab = createMockTab();
      renderFull(
        tab,
        createMockState({
          tab,
          getUserProfile,
          annotationsForChapter: [
            createAnnotation({
              id: "a1",
              verseNumber: 3,
              data: {
                type: "comment",
                html: "<p>Hi</p>",
                userId: "user-42",
                userName: "Loading Placeholder",
                updatedAtMs: Date.UTC(2026, 0, 5, 10, 30),
              },
            } as Partial<Annotation>),
          ],
        })
      );

      expect(getUserProfile).toHaveBeenCalledWith("user-42");
      await vi.waitFor(() => {
        expect(
          container.querySelector(".sb-annotation-comment-author-name")
            ?.textContent
        ).toBe("Jordan Rivera");
      });
      const expectedUpdated = new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(Date.UTC(2026, 0, 5, 10, 30)));
      expect(
        container.querySelector(".sb-annotation-comment-updated")?.textContent
      ).toBe(`| ${expectedUpdated}`);
    });

    it("shows a note's author avatar from their profile picture, before the name", async () => {
      const getUserProfile = vi.fn().mockResolvedValue({
        name: "Jordan Rivera",
        pictureUrl: "https://example.com/jordan.png",
      });
      const tab = createMockTab();
      renderFull(
        tab,
        createMockState({
          tab,
          getUserProfile,
          annotationsForChapter: [
            createAnnotation({
              id: "a1",
              verseNumber: 3,
              data: { type: "comment", html: "<p>Hi</p>", userId: "user-99" },
            } as Partial<Annotation>),
          ],
        })
      );

      await vi.waitFor(() => {
        expect(
          container
            .querySelector(".sb-tab-user-icon-has-image img")
            ?.getAttribute("src")
        ).toBe("https://example.com/jordan.png");
      });

      const author = container.querySelector(".sb-annotation-comment-author")!;
      const children = Array.from(author.children);
      const avatarIndex = children.findIndex((el) =>
        el.classList.contains("sb-tab-user-icon")
      );
      const nameIndex = children.findIndex((el) =>
        el.classList.contains("sb-annotation-comment-author-name")
      );
      expect(avatarIndex).toBeGreaterThanOrEqual(0);
      expect(avatarIndex).toBeLessThan(nameIndex);
    });

    it("shows a generic account icon on your own notes when nobody else has annotated", () => {
      const tab = createMockTab();
      renderFull(
        tab,
        createMockState({
          tab,
          userId: "user-self",
          annotationsForChapter: [
            createAnnotation({
              id: "a1",
              verseNumber: 3,
              data: { type: "comment", html: "<p>Hi</p>", userId: "user-self" },
            } as Partial<Annotation>),
          ],
        })
      );

      expect(
        container.querySelector(".sb-tab-user-icon-generic")?.textContent
      ).toContain("account_circle");
      expect(container.querySelector(".sb-tab-user-icon-animal")).toBeNull();
    });

    it("shows your profile picture on your own notes even when nobody else has annotated", async () => {
      const getUserProfile = vi.fn().mockResolvedValue({
        name: "Ada",
        pictureUrl: "https://example.com/ada.png",
      });
      const tab = createMockTab();
      renderFull(
        tab,
        createMockState({
          tab,
          userId: "user-self-with-picture",
          getUserProfile,
          annotationsForChapter: [
            createAnnotation({
              id: "a1",
              verseNumber: 3,
              data: {
                type: "comment",
                html: "<p>Hi</p>",
                userId: "user-self-with-picture",
              },
            } as Partial<Annotation>),
          ],
        })
      );

      await vi.waitFor(() => {
        expect(
          container
            .querySelector(".sb-tab-user-icon-has-image img")
            ?.getAttribute("src")
        ).toBe("https://example.com/ada.png");
      });
      expect(container.querySelector(".sb-tab-user-icon-generic")).toBeNull();
      expect(container.querySelector(".sb-tab-user-icon-animal")).toBeNull();
    });

    it("shows the animal fallback on your own notes when other people have also annotated", () => {
      const tab = createMockTab();
      renderFull(
        tab,
        createMockState({
          tab,
          userId: "user-self",
          annotationsForChapter: [
            createAnnotation({
              id: "a1",
              verseNumber: 3,
              data: {
                type: "comment",
                html: "<p>Mine</p>",
                userId: "user-self",
              },
            } as Partial<Annotation>),
            createAnnotation({
              id: "a2",
              verseNumber: 4,
              data: {
                type: "comment",
                html: "<p>Theirs</p>",
                userId: "user-other",
              },
            } as Partial<Annotation>),
          ],
        })
      );

      expect(
        container.querySelectorAll(".sb-tab-user-icon-animal")
      ).toHaveLength(2);
      expect(container.querySelector(".sb-tab-user-icon-generic")).toBeNull();
    });

    it("shows a fallback avatar derived from the user id when another author has no profile picture", () => {
      const tab = createMockTab();
      renderFull(
        tab,
        createMockState({
          tab,
          annotationsForChapter: [
            createAnnotation({
              id: "a1",
              verseNumber: 3,
              data: {
                type: "comment",
                html: "<p>Hi</p>",
                userId: "user-no-picture",
                userName: "No Picture",
              },
            } as Partial<Annotation>),
          ],
        })
      );

      expect(
        container.querySelector(".sb-tab-user-icon-animal")
      ).not.toBeNull();
      expect(container.querySelector(".sb-tab-user-icon-has-image")).toBeNull();
    });

    it("edits your note from its menu", () => {
      const annotation = createAnnotation({
        id: "a1",
        data: { type: "comment", html: "<p>Hello</p>", userId: "user-1" },
      } as Partial<Annotation>);
      const tab = createMockTab();
      const state = createMockState({
        tab,
        userId: "user-1",
        annotationsForChapter: [annotation],
      });
      renderFull(tab, state);

      const editItem = openNoteMenu().find((el) =>
        el.textContent?.includes("Edit")
      );
      expect(editItem).not.toBeUndefined();
      act(() => {
        editItem!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });

      expect(state.annotations.editAnnotation).toHaveBeenCalledWith(annotation);
    });

    // Notes written while signed out are saved with no author, and keep none
    // once they move to the account on sign-in.
    it("keeps the menu on your own note that has no author", () => {
      const tab = createMockTab();
      renderFull(
        tab,
        createMockState({
          tab,
          userId: "user-1",
          annotationsForChapter: [
            createAnnotation({
              id: "a1",
              data: { type: "comment", html: "<p>Hello</p>", userId: null },
            } as Partial<Annotation>),
          ],
        })
      );

      const labels = openNoteMenu().map((el) => el.textContent);
      expect(labels).toEqual([
        expect.stringContaining("Edit"),
        expect.stringContaining("Delete"),
      ]);
    });

    it("shows no menu on a friend's note, even one naming you as its author", async () => {
      const tab = createMockTab();
      const mockState = createMockState({ tab });
      // The real managers, so the note arrives the way a friend's note does.
      const { login, friends, annotations } = await createRealFriendContent({
        friendIds: ["ada"],
        notes: {
          ada: [
            createAnnotation({
              id: "a1",
              data: { type: "comment", html: "<p>Hello</p>", userId: ME },
            } as Partial<Annotation>),
          ],
        },
        discover: mockState.discover,
      });
      renderFull(tab, {
        ...mockState,
        login,
        friends,
        annotations,
      } as unknown as SeedBibleState);

      await vi.waitFor(() =>
        expect(container.querySelector(".sb-annotation-item")).not.toBeNull()
      );
      expect(container.querySelector(".sb-annotation-item-menu")).toBeNull();
    });

    it("deleting a note from its menu asks first; confirming deletes it and closes the dialog", async () => {
      const annotation = createAnnotation({
        id: "a1",
        data: { type: "comment", html: "<p>Hello</p>", userId: "user-1" },
      } as Partial<Annotation>);
      const modals = createModalManager();
      const tab = createMockTab();
      const state = createMockState({
        tab,
        userId: "user-1",
        modals,
        annotationsForChapter: [annotation],
      });
      renderFull(tab, state);

      const deleteItem = openNoteMenu().find((el) =>
        el.textContent?.includes("Delete")
      )!;
      act(() => {
        deleteItem.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });

      const modal = modals.modals.value.find(
        (m) => m.id === "delete-annotation-confirm-a1"
      );
      expect(modal).not.toBeUndefined();

      const modalContainer = document.createElement("div");
      document.body.appendChild(modalContainer);
      act(() => {
        render(
          modal!.content({
            t: (key, options) => (options?.defaultValue as string) ?? key,
          }),
          modalContainer
        );
      });
      expect(modalContainer.textContent).toContain(
        "Delete this annotation? This can't be undone."
      );

      await act(async () => {
        modalContainer
          .querySelector(".sb-session-settings-end")!
          .dispatchEvent(new MouseEvent("click", { bubbles: true }));
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(state.annotations.deleteAnnotationAndRefresh).toHaveBeenCalledWith(
        annotation
      );
      expect(
        modals.modals.value.some((m) => m.id === "delete-annotation-confirm-a1")
      ).toBe(false);

      render(null, modalContainer);
      modalContainer.remove();
    });

    it("says so, but still closes the dialog, when deleting a note fails", async () => {
      const modals = createModalManager();
      const tab = createMockTab();
      const state = createMockState({
        tab,
        userId: "user-1",
        modals,
        deleteAnnotationAndRefreshImpl: () => Promise.reject(new Error("nope")),
        annotationsForChapter: [
          createAnnotation({
            id: "a1",
            data: { type: "comment", html: "<p>Hello</p>", userId: "user-1" },
          } as Partial<Annotation>),
        ],
      });
      renderFull(tab, state);

      const deleteItem = openNoteMenu().find((el) =>
        el.textContent?.includes("Delete")
      )!;
      act(() => {
        deleteItem.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });

      const modal = modals.modals.value.find(
        (m) => m.id === "delete-annotation-confirm-a1"
      )!;
      const modalContainer = document.createElement("div");
      document.body.appendChild(modalContainer);
      act(() => {
        render(modal.content({ t: (key) => key }), modalContainer);
      });

      await act(async () => {
        modalContainer
          .querySelector(".sb-session-settings-end")!
          .dispatchEvent(new MouseEvent("click", { bubbles: true }));
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(state.app.toast).toHaveBeenCalledWith(
        "Couldn't delete the annotation."
      );
      expect(
        modals.modals.value.some((m) => m.id === "delete-annotation-confirm-a1")
      ).toBe(false);

      render(null, modalContainer);
      modalContainer.remove();
    });
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
        render(
          <DiscoverContentPanel variant="compact" tab={tab} state={state} />,
          container
        );
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
        render(
          <DiscoverContentPanel
            variant="compact"
            tab={nextTab}
            state={state}
          />,
          container
        );
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
        render(
          <DiscoverContentPanel variant="compact" tab={tab} state={state} />,
          parent
        );
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
    it("keeps the active chip visible when the arrows first appear", () => {
      renderPanel();

      const row = getRow();
      const activeChip = Array.from(
        row.querySelectorAll<HTMLButtonElement>(".sb-dcp-chip")
      ).find((chip) => chip.textContent === "Cross Refs");

      expect(activeChip).toBeDefined();

      act(() => {
        activeChip!.click();
      });

      expect(getArrow(END_LABEL)).toBeNull();

      setRect(row, 0, 100);
      setRect(activeChip!, 120, 170);
      configureOverflow(row);

      act(() => {
        window.dispatchEvent(new Event("resize"));
      });

      expect(getArrow(END_LABEL)).not.toBeNull();

      const updatedActiveChip = getRow().querySelector<HTMLElement>(
        ".sb-dcp-chip--active"
      );

      expect(updatedActiveChip).not.toBeNull();
      expect(updatedActiveChip!.getAttribute("aria-selected")).toBe("true");
      expect(row.scrollLeft).toBeGreaterThan(0);
    });
    it("does not scroll when a faded arrow is clicked at the scroll boundary", () => {
      renderPanel();

      const row = getRow();
      configureOverflow(row);

      const chips = Array.from(
        row.querySelectorAll<HTMLButtonElement>(".sb-dcp-chip")
      );

      setRect(row, 0, 100);

      // Make a chip genuinely visible outside the row's left boundary.
      chips.forEach((chip, index) => {
        setRect(chip, -80 + index * 50, -40 + index * 50);
      });

      const scrollBy = vi.fn();
      row.scrollBy = scrollBy;

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
    it("updates arrow state when the parent direction changes from LTR to RTL", () => {
      const parent = document.createElement("div");
      parent.dir = "ltr";
      container.appendChild(parent);

      const tab = createMockTab({
        discoveredCrossReferences: RESULTS_FIXTURE,
      });
      const state = createMockState({
        annotationsForChapter: [createAnnotation()],
      });

      const renderInParent = () => {
        act(() => {
          render(
            <DiscoverContentPanel variant="compact" tab={tab} state={state} />,
            parent
          );
        });
      };

      renderInParent();

      const row = parent.querySelector<HTMLElement>(".sb-dcp-filters")!;
      const wrapper = row.parentElement!;

      setDimension(row, "scrollWidth", 240);
      setDimension(row, "clientWidth", 100);
      setDimension(wrapper, "clientWidth", 100);

      parent.dir = "rtl";
      row.style.direction = "rtl";

      setDimension(row, "scrollLeft", -140);

      renderInParent();

      act(() => {
        row.dispatchEvent(new Event("scroll"));
      });

      const startArrow = parent.querySelector<HTMLButtonElement>(
        `button[aria-label="${START_LABEL}"]`
      );

      expect(startArrow).not.toBeNull();
      expect(startArrow!.getAttribute("aria-disabled")).not.toBe("true");
    });
    it("adjusts scroll position to reveal the active chip when filters change", () => {
      const state = createMockState({
        annotationsForChapter: [createAnnotation()],
      });

      const firstTab = createMockTab({
        discoveredCrossReferences: RESULTS_FIXTURE,
      });

      renderPanel(firstTab, state);

      const row = getRow();
      const activeChip = row.querySelector<HTMLElement>(".sb-dcp-chip--active");

      expect(activeChip).not.toBeNull();

      setDimension(row, "scrollLeft", 0);
      setRect(row, 0, 100);
      setRect(activeChip!, 120, 160);

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

      act(() => {
        render(
          <DiscoverContentPanel
            variant="compact"
            tab={nextTab}
            state={state}
          />,
          container
        );
      });

      expect(row.scrollLeft).toBeGreaterThan(0);
    });
    it("scrolls toward the end when the end arrow is clicked in LTR", () => {
      renderPanel();
      const row = getRow();
      configureOverflow(row);
      setRect(row, 0, 100);
      const chips = Array.from(
        row.querySelectorAll<HTMLButtonElement>(".sb-dcp-chip")
      );
      // Place chips beyond the row's right edge.
      chips.forEach((chip, index) => {
        setRect(chip, index * 60, index * 60 + 50);
      });
      const scrollBy = vi.fn();
      row.scrollBy = scrollBy;
      const endArrow = getArrow(END_LABEL);
      expect(endArrow).not.toBeNull();
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
        render(
          <DiscoverContentPanel variant="compact" tab={tab} state={state} />,
          parent
        );
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
        render(
          <DiscoverContentPanel variant="compact" tab={tab} state={state} />,
          parent
        );
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
        render(
          <DiscoverContentPanel variant="compact" tab={tab} state={state} />,
          parent
        );
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
        render(
          <DiscoverContentPanel variant="compact" tab={tab} state={state} />,
          container
        );
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
        render(
          <DiscoverContentPanel variant="compact" tab={tab} state={state} />,
          container
        );
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

    it("in the full panel, points to the filters rather than the empty notes prompt when everything is behind a chip", () => {
      const tab = createMockTab({ discoveredContent: THEOGRAPHIC_FIXTURE });
      const state = createMockState({
        annotationsForChapter: [],
        contentTypes: HIDDEN_TYPES,
      });

      act(() => {
        render(
          <DiscoverContentPanel
            variant="full"
            onClose={vi.fn()}
            tab={tab}
            state={state}
          />,
          container
        );
      });

      expect(container.textContent).toContain("Pick a filter above");
      expect(container.textContent).not.toContain(
        "You don't have any notes for this chapter."
      );
    });

    it("explains where the content went when it is all there is", () => {
      const tab = createMockTab({ discoveredContent: THEOGRAPHIC_FIXTURE });
      const state = createMockState({
        annotationsForChapter: [],
        contentTypes: HIDDEN_TYPES,
      });

      act(() => {
        render(
          <DiscoverContentPanel variant="compact" tab={tab} state={state} />,
          container
        );
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

  describe("friends' playlists", () => {
    const ada: Friend = { userId: "ada", name: "Ada", pictureUrl: null };
    const psalms: Playlist = {
      id: "p1",
      recordName: "ada",
      authorUserId: "ada",
      title: "Psalms of Ascent",
      description: null,
      items: [],
      createdAtMs: 1,
      updatedAtMs: 1,
    };

    const chipLabels = () =>
      Array.from(container.querySelectorAll(".sb-dcp-chip")).map(
        (el) => el.textContent
      );
    const sectionTitles = () =>
      Array.from(container.querySelectorAll(".sb-discover-section-title")).map(
        (el) => el.textContent
      );

    function renderFull(tab: ReaderTab, state: SeedBibleState) {
      act(() => {
        render(
          <DiscoverContentPanel
            variant="full"
            onClose={vi.fn()}
            tab={tab}
            state={state}
          />,
          container
        );
      });
    }

    it("in the full panel, lists them under All with a chip of their own, after Notes", () => {
      const tab = createMockTab({ discoveredCrossReferences: RESULTS_FIXTURE });
      renderFull(
        tab,
        createMockState({
          annotationsForChapter: [createAnnotation()],
          friendPlaylists: [{ friend: ada, playlists: [psalms] }],
        })
      );

      expect(chipLabels()).toEqual([
        "All",
        "Notes",
        "Friends' playlists",
        "Cross Refs",
      ]);
      expect(sectionTitles()).toContain("Playlists from your friends");
      expect(
        container.querySelector(".sb-friend-playlists-group-name")?.textContent
      ).toBe("Ada");
      expect(container.textContent).toContain("Psalms of Ascent");
    });

    it("shows only them once their chip is picked", () => {
      const tab = createMockTab({ discoveredCrossReferences: RESULTS_FIXTURE });
      renderFull(
        tab,
        createMockState({
          annotationsForChapter: [createAnnotation()],
          friendPlaylists: [{ friend: ada, playlists: [psalms] }],
        })
      );

      const chip = Array.from(container.querySelectorAll(".sb-dcp-chip")).find(
        (el) => el.textContent === "Friends' playlists"
      ) as HTMLButtonElement;
      act(() => {
        chip.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });

      expect(chip.getAttribute("aria-selected")).toBe("true");
      expect(sectionTitles()).toEqual(["Playlists from your friends"]);
      expect(container.textContent).toContain("Psalms of Ascent");
      expect(container.textContent).not.toContain("Exodus 5:3");
    });

    it("in the full panel, still shows them when the chapter has nothing else", () => {
      renderFull(
        createMockTab(),
        createMockState({
          friendPlaylists: [{ friend: ada, playlists: [psalms] }],
        })
      );

      expect(sectionTitles()).toContain("Playlists from your friends");
      expect(container.textContent).toContain("Psalms of Ascent");
    });

    it("offers no chip when no friend has a playlist", () => {
      renderFull(
        createMockTab({ discoveredCrossReferences: RESULTS_FIXTURE }),
        createMockState({
          annotationsForChapter: [createAnnotation()],
          friendPlaylists: [{ friend: ada, playlists: [] }],
        })
      );

      expect(chipLabels()).not.toContain("Friends' playlists");
      expect(sectionTitles()).not.toContain("Playlists from your friends");
    });

    it("leaves them out of the compact panel", () => {
      act(() => {
        render(
          <DiscoverContentPanel
            variant="compact"
            tab={createMockTab({ discoveredCrossReferences: RESULTS_FIXTURE })}
            state={createMockState({
              annotationsForChapter: [createAnnotation()],
              friendPlaylists: [{ friend: ada, playlists: [psalms] }],
            })}
          />,
          container
        );
      });

      expect(chipLabels()).not.toContain("Friends' playlists");
      expect(sectionTitles()).not.toContain("Playlists from your friends");
      expect(container.textContent).not.toContain("Psalms of Ascent");
    });
  });

  it("in the compact panel, '+ Create' creates an annotation straight away", () => {
    const tab = createMockTab();
    const state = createMockState({
      annotationsForChapter: [createAnnotation()],
    });

    act(() => {
      render(
        <DiscoverContentPanel variant="compact" tab={tab} state={state} />,
        container
      );
    });

    const createButton = container.querySelector(
      ".sb-dcp-create-btn"
    ) as HTMLButtonElement;
    expect(createButton).toBeTruthy();
    expect(createButton.getAttribute("aria-haspopup")).toBeNull();

    act(() => {
      createButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(state.annotations.createNewAnnotation).toHaveBeenCalledTimes(1);
    expect(document.querySelector('[role="menu"]')).toBeNull();
  });

  it("in the full panel, '+ Create' offers an annotation or a playlist", () => {
    const tab = createMockTab();
    const state = createMockState({
      annotationsForChapter: [createAnnotation()],
    });

    act(() => {
      render(
        <DiscoverContentPanel
          variant="full"
          onClose={vi.fn()}
          tab={tab}
          state={state}
        />,
        container
      );
    });

    const openMenu = () => {
      act(() => {
        container
          .querySelector(".sb-dcp-create-btn")!
          .dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      // The menu is portaled to <body>, outside the render container.
      return Array.from(
        document.querySelectorAll('[role="menuitem"]')
      ) as HTMLButtonElement[];
    };

    let items = openMenu();
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining("Annotation"),
      expect.stringContaining("Playlist"),
    ]);
    // Opening the menu doesn't create anything by itself.
    expect(state.annotations.createNewAnnotation).not.toHaveBeenCalled();
    expect(state.playlists.createNewPlaylist).not.toHaveBeenCalled();

    act(() => {
      items[0]!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(state.annotations.createNewAnnotation).toHaveBeenCalledTimes(1);

    items = openMenu();
    act(() => {
      items[1]!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(state.playlists.createNewPlaylist).toHaveBeenCalledTimes(1);
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
            variant="compact"
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
