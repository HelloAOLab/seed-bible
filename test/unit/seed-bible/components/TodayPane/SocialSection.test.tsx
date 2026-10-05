import type { Mock } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import { signal, type Signal } from "@preact/signals";
import { SocialSection } from "@packages/seed-bible/seed-bible/components/TodayPane/SocialSection";
import type { BibleTheme } from "@packages/seed-bible/seed-bible/managers/ThemeManager";
import type { UserProfile } from "@packages/seed-bible/seed-bible/managers/LoginManager";
import type { FilteredReading } from "@packages/seed-bible/seed-bible/managers/TodayReadingHistory";
import { todayStub, loginStub } from "../../testUtils/todayStubs";
import { mockI18nState } from "../../testUtils/mockI18n";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../../testUtils/mockI18n");
  return mockI18nManager();
});

// The timeline hook reads TimeContext and fetches a year of history, so it is
// stood in for — the timeline has its own suite. Its component is stubbed too so
// these tests can assert only whether the section renders it.
vi.mock(
  "@packages/seed-bible/seed-bible/components/TodayPane/useReadingHistoryTimeline",
  () => ({
    useReadingHistoryTimeline: vi.fn(() => ({
      itemsData: [],
      timelineRef: { current: null },
      footer: {},
    })),
  })
);

/** The day a timeline click selects. Noon UTC, so no timezone lands it on a
 *  different date than the one the assertion formats. */
const SELECTED_DAY = vi.hoisted(() => {
  const to = Math.floor(Date.UTC(2026, 6, 21, 12) / 1000);
  return { from: to - 86399, to };
});

// Clicking a day inside the timeline is the *only* thing that sets a window
// while "all" is selected, so the stub exposes that one interaction rather than
// rendering an inert element. Its second button stands in for a click that
// clears the selection, which the real timeline does on `handleItemClick(null)`.
// Everything else about the timeline belongs to its own suite.
vi.mock(
  "@packages/seed-bible/seed-bible/components/ReadingHistoryTimeline/ReadingHistoryTimeline",
  async () => {
    const { useSocialSectionContext } =
      await import("@packages/seed-bible/seed-bible/components/TodayPane/SocialSectionContext");
    return {
      ReadingHistoryTimeline: () => {
        const { selectDay } = useSocialSectionContext();
        return (
          <div data-testid="timeline">
            <button
              data-testid="pick-day"
              onClick={() => selectDay(SELECTED_DAY)}
            />
            <button
              data-testid="clear-day"
              onClick={() => selectDay(undefined)}
            />
          </div>
        );
      },
    };
  }
);

const { useHorizontalScroll } = vi.hoisted(() => ({
  useHorizontalScroll: vi.fn(),
}));

vi.mock(
  "@packages/seed-bible/seed-bible/components/useHorizontalScroll",
  async (importOriginal) => ({
    ...(await importOriginal<object>()),
    useHorizontalScroll,
  })
);

const CURRENT_USER_ID = "user-1";

describe("SocialSection", () => {
  let container: HTMLDivElement;
  let getCommunityReading: Mock;
  let onOpenPassage: Mock;
  let bookNames: Signal<Map<string, string>>;
  let translationBooksMap: Signal<Map<string, { numberOfChapters: number }>>;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    mockI18nState.language = "en";
    getCommunityReading = vi.fn(async () => ({}) as FilteredReading);
    onOpenPassage = vi.fn();
    bookNames = signal(new Map([["GEN", "Genesis"]]));
    translationBooksMap = signal(new Map([["GEN", { numberOfChapters: 3 }]]));
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    vi.clearAllMocks();
  });

  function setup(
    options: {
      signedIn?: boolean;
      pictureUrl?: string;
      profileName?: string;
    } = {}
  ) {
    const signedIn = options.signedIn ?? true;
    const today = todayStub({
      getCommunityReading,
      bookNames,
      translationBooksMap: translationBooksMap as never,
    });
    const login = loginStub({
      userId: signal(signedIn ? CURRENT_USER_ID : null),
      profile: signal(
        signedIn
          ? ({
              name: options.profileName ?? "Me",
              pictureUrl: options.pictureUrl,
            } as UserProfile)
          : null
      ),
    });
    act(() =>
      render(
        <SocialSection
          today={today}
          login={login}
          theme={signal({ variables: {} } as unknown as BibleTheme)}
          onOpenPassage={onOpenPassage}
        />,
        container
      )
    );
  }

  const q = <T extends Element = Element>(sel: string) =>
    container.querySelector<T>(sel);
  const qa = (sel: string) => Array.from(container.querySelectorAll(sel));
  const heading = () => q(".sb-today-titled-section-header > h5")!.textContent;
  const filterLabel = () => q(".sb-today-user-filter-label")!.textContent;
  const filterChevron = () =>
    q(".sb-today-user-filter-container > .material-symbols-outlined")!
      .textContent;
  const filterContainer = () =>
    q<HTMLDivElement>(".sb-today-user-filter-container")!;
  const filterOptions = () => qa(".sb-today-user-filter-option");
  const timespanButtons = () =>
    qa(".sb-today-timespan-filter-option") as HTMLButtonElement[];
  const selectedTimespan = () =>
    q(".sb-today-timespan-filter-option-selected")!.textContent;
  const bookRows = () => qa(".sb-today-filtered-reading-book");
  const chapterCells = () => qa(".sb-today-filtered-reading-chapter");

  /** Opens the reader-filter dropdown. */
  function openUserFilter() {
    act(() => filterContainer().click());
  }

  /** Picks a timespan filter by its visible label. */
  function selectTimespanByLabel(label: string) {
    const button = timespanButtons().find((b) => b.textContent === label)!;
    act(() => button.click());
  }

  async function flush() {
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  // ─── the section itself ────────────────────────────────────────────────────

  describe("the section", () => {
    it("renders the community heading around the history card", () => {
      setup();
      expect(heading()).toBe("COMMUNITY");
      expect(
        q(".sb-today-titled-section .sb-today-history-card")
      ).not.toBeNull();
    });
  });

  // ─── reader filters ───────────────────────────────────────────────────────

  describe("reader filters", () => {
    it("starts closed, with a down chevron", () => {
      setup();
      expect(filterOptions()).toHaveLength(0);
      expect(filterChevron()).toBe("keyboard_arrow_down");
    });

    it("opens on click, showing an up chevron", () => {
      setup();
      openUserFilter();
      expect(filterChevron()).toBe("keyboard_arrow_up");
      expect(filterOptions().length).toBeGreaterThan(0);
    });

    it("closes when a click lands outside the filter", () => {
      setup();
      openUserFilter();

      const outside = document.createElement("div");
      document.body.appendChild(outside);
      act(() => {
        outside.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      });

      expect(filterOptions()).toHaveLength(0);
      outside.remove();
    });

    it("does not close when the options list itself is clicked", () => {
      setup();
      openUserFilter();

      act(() => q<HTMLDivElement>(".sb-today-user-filter-options")!.click());

      expect(filterOptions().length).toBeGreaterThan(0);
    });

    it("lists the signed-in reader alone, selected, with their colour", () => {
      // Nobody subscribes to anyone yet, so "community" is a party of one.
      setup();
      openUserFilter();

      const options = filterOptions();
      expect(options).toHaveLength(1);
      expect(options[0]!.textContent).toBe("Me");
      expect(options[0]!.className).toContain(
        "sb-today-user-filter-option-selected"
      );
    });

    // A profile can carry an empty name. `??` let it through, leaving a reader
    // row with a colour swatch and no label at all.
    it("labels a reader with an empty profile name as anonymous", () => {
      setup({ profileName: "" });
      openUserFilter();

      const options = filterOptions();
      expect(options).toHaveLength(1);
      expect(options[0]!.textContent).toBe("Anonymous");
    });

    it("labels a reader with a whitespace-only profile name as anonymous", () => {
      setup({ profileName: "   " });
      openUserFilter();

      expect(filterOptions()[0]!.textContent).toBe("Anonymous");
    });

    it("lists nobody when signed out", () => {
      setup({ signedIn: false });
      openUserFilter();
      expect(filterOptions()).toHaveLength(0);
    });

    it("reads 'everyone' when every reader is selected", () => {
      setup();
      expect(filterLabel()).toBe("Everyone");
    });

    it("reads 'none' once the only reader is deselected", () => {
      setup();
      openUserFilter();

      act(() => (filterOptions()[0] as HTMLButtonElement).click());

      expect(filterLabel()).toBe("None");
      expect(filterOptions()[0]!.className).not.toContain(
        "sb-today-user-filter-option-selected"
      );
    });

    it("toggles a reader back on", () => {
      setup();
      openUserFilter();

      act(() => (filterOptions()[0] as HTMLButtonElement).click());
      act(() => (filterOptions()[0] as HTMLButtonElement).click());

      expect(filterLabel()).toBe("Everyone");
    });
  });

  // ─── timespan filters ─────────────────────────────────────────────────────

  describe("timespan filters", () => {
    it("renders the four windows in order, with 'last 48 hours' selected", () => {
      setup();
      expect(timespanButtons().map((b) => b.textContent)).toEqual([
        "Last 48 hours",
        "This week",
        "This month",
        "All",
      ]);
      expect(selectedTimespan()).toBe("Last 48 hours");
    });

    it("moves the selection when another window is picked", () => {
      setup();
      selectTimespanByLabel("This week");
      expect(selectedTimespan()).toBe("This week");
    });

    it("scrolls the window row horizontally with the wheel", () => {
      setup();
      expect(useHorizontalScroll).toHaveBeenCalled();
    });
  });

  // ─── community reading ────────────────────────────────────────────────────

  describe("community reading", () => {
    it("fetches the initial two-day window on mount", () => {
      setup();
      expect(getCommunityReading).toHaveBeenCalledTimes(1);
      const span = getCommunityReading.mock.calls[0]![0];
      expect(span.to - span.from).toBe(2 * 24 * 60 * 60);
    });

    it("refetches for a newly selected window", () => {
      setup();
      getCommunityReading.mockClear();

      selectTimespanByLabel("This month");

      expect(getCommunityReading).toHaveBeenCalledTimes(1);
      const span = getCommunityReading.mock.calls[0]![0];
      expect(span.to - span.from).toBe(30 * 24 * 60 * 60);
    });

    it("clears the reading without fetching when 'all' is selected", async () => {
      getCommunityReading.mockResolvedValue({
        GEN: { 1: [CURRENT_USER_ID] },
      } as FilteredReading);
      setup();
      await flush();
      expect(bookRows()).toHaveLength(1);

      getCommunityReading.mockClear();
      selectTimespanByLabel("All");
      await flush();

      // "all" means the whole year, which the timeline renders instead.
      expect(getCommunityReading).not.toHaveBeenCalled();
      expect(bookRows()).toHaveLength(0);
    });

    it("ignores a stale fetch result after the window changes", async () => {
      let resolveStale!: (value: FilteredReading) => void;
      getCommunityReading
        .mockReturnValueOnce(
          new Promise<FilteredReading>((r) => {
            resolveStale = r;
          })
        )
        .mockResolvedValueOnce({
          EXO: { 1: [CURRENT_USER_ID] },
        } as FilteredReading);
      bookNames.value = new Map([
        ["GEN", "Genesis"],
        ["EXO", "Exodus"],
      ]);
      setup();

      selectTimespanByLabel("This week");
      await flush();
      // The superseded fetch settles last, which is the case worth pinning:
      // resolving both in one flush would let ordering alone decide the winner,
      // so the guard against a stale response would pass either way.
      resolveStale({ GEN: { 1: [CURRENT_USER_ID] } } as FilteredReading);
      await flush();

      expect(
        bookRows().map((row) => row.querySelector("span")!.textContent)
      ).toEqual(["Exodus"]);
    });
  });

  // ─── the timeline ─────────────────────────────────────────────────────────

  describe("the timeline", () => {
    it("is hidden for a windowed selection", () => {
      setup();
      expect(q("[data-testid='timeline']")).toBeNull();
      expect(q(".sb-today-date-label")).toBeNull();
    });

    it("appears when 'all' is selected, without a date label", () => {
      setup();
      selectTimespanByLabel("All");

      expect(q("[data-testid='timeline']")).not.toBeNull();
      // Picking "all" clears the window, and the date label only renders while
      // one is set — so it stays absent until a day is picked in the timeline.
      expect(q(".sb-today-date-label")).toBeNull();
    });
  });

  // ─── the selected-day label ───────────────────────────────────────────────

  /** Selects "all", then clicks a day inside the timeline. */
  function pickTimelineDay() {
    selectTimespanByLabel("All");
    act(() => q<HTMLButtonElement>("[data-testid='pick-day']")!.click());
  }

  const dateLabel = () => q(".sb-today-date-label")?.textContent ?? null;

  const formatSelectedDay = (lang: string) =>
    new Intl.DateTimeFormat(lang, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(SELECTED_DAY.to * 1000));

  describe("the selected-day label", () => {
    it("names the day picked in the timeline", () => {
      setup();
      pickTimelineDay();
      expect(dateLabel()).toBe(formatSelectedDay("en"));
    });

    it("goes away when the day selection is cleared", () => {
      setup();
      pickTimelineDay();
      expect(dateLabel()).not.toBeNull();

      act(() => q<HTMLButtonElement>("[data-testid='clear-day']")!.click());
      expect(dateLabel()).toBeNull();
    });

    it("is scoped to the timeline view, not to having a window at all", () => {
      setup();
      pickTimelineDay();
      expect(dateLabel()).not.toBeNull();

      // "This week" sets a window too, so the label would still have something
      // to show — it is the timeline view it belongs to, not the window.
      selectTimespanByLabel("This week");
      expect(q("[data-testid='timeline']")).toBeNull();
      expect(dateLabel()).toBeNull();
    });

    it("formats the date in the active language", () => {
      mockI18nState.language = "fr";
      setup();
      pickTimelineDay();

      // Guards against a vacuous assertion if the two ever agreed.
      expect(formatSelectedDay("en")).not.toBe(formatSelectedDay("fr"));
      expect(dateLabel()).toBe(formatSelectedDay("fr"));
    });
  });

  // ─── book rows ────────────────────────────────────────────────────────────

  describe("book rows", () => {
    async function setupWithReading(
      reading: FilteredReading,
      options: Parameters<typeof setup>[0] = {}
    ) {
      getCommunityReading.mockResolvedValue(reading);
      setup(options);
      await flush();
    }

    it("renders nothing when nobody has read anything", async () => {
      await setupWithReading({});
      expect(q(".sb-today-filtered-reading-container")).toBeNull();
    });

    it("renders one row per book, named from the translation", async () => {
      bookNames.value = new Map([
        ["GEN", "Genesis"],
        ["EXO", "Exodus"],
      ]);
      await setupWithReading({
        GEN: { 1: [CURRENT_USER_ID] },
        EXO: { 2: [CURRENT_USER_ID] },
      });

      expect(
        bookRows().map((row) => row.querySelector("span")!.textContent)
      ).toEqual(["Genesis", "Exodus"]);
    });

    it("falls back to the bookId when the name is unknown", async () => {
      bookNames.value = new Map();
      await setupWithReading({ GEN: { 1: [CURRENT_USER_ID] } });

      expect(bookRows()[0]!.querySelector("span")!.textContent).toBe("GEN");
    });

    it("omits a book whose only readers are deselected", async () => {
      await setupWithReading({ GEN: { 1: [CURRENT_USER_ID] } });
      expect(bookRows()).toHaveLength(1);

      openUserFilter();
      act(() => (filterOptions()[0] as HTMLButtonElement).click());

      expect(bookRows()).toHaveLength(0);
    });

    it("omits a book whose reader is absent from the filter map", async () => {
      await setupWithReading({ GEN: { 1: ["a-stranger"] } });
      expect(bookRows()).toHaveLength(0);
    });

    it("renders one avatar per reader, deduplicated across chapters", async () => {
      await setupWithReading({
        GEN: { 1: [CURRENT_USER_ID], 2: [CURRENT_USER_ID] },
      });

      expect(
        bookRows()[0]!.querySelectorAll(".sb-today-filtered-reading-book-icon")
      ).toHaveLength(1);
    });

    it("shows no '+N' badge at or below the avatar cap", async () => {
      await setupWithReading({ GEN: { 1: [CURRENT_USER_ID] } });
      expect(q(".sb-today-filtered-reading-book-extra")).toBeNull();
    });

    it("uses the reader's picture as their avatar when they have one", async () => {
      await setupWithReading(
        { GEN: { 1: [CURRENT_USER_ID] } },
        {
          pictureUrl: "https://example.test/me.png",
        }
      );

      const avatar = q<HTMLImageElement>(
        "img.sb-today-filtered-reading-book-icon"
      )!;
      expect(avatar.src).toBe("https://example.test/me.png");
      expect(
        q(".sb-today-filtered-reading-book-icon .material-symbols-outlined")
      ).toBeNull();
    });
  });

  // ─── chapter cells ────────────────────────────────────────────────────────

  describe("chapter cells", () => {
    async function setupExpanded(
      reading: FilteredReading,
      options: Parameters<typeof setup>[0] = {}
    ) {
      getCommunityReading.mockResolvedValue(reading);
      setup(options);
      await flush();
      act(() => (bookRows()[0] as HTMLDivElement).click());
    }

    it("stay hidden until the book row is sb-today-expanded", async () => {
      getCommunityReading.mockResolvedValue({
        GEN: { 1: [CURRENT_USER_ID] },
      } as FilteredReading);
      setup();
      await flush();

      expect(bookRows()[0]!.className).not.toContain("sb-today-expanded");
      expect(chapterCells()).toHaveLength(0);
    });

    it("render one cell per chapter in the translation, once sb-today-expanded", async () => {
      await setupExpanded({ GEN: { 1: [CURRENT_USER_ID] } });

      expect(bookRows()[0]!.className).toContain("sb-today-expanded");
      expect(chapterCells().map((c) => c.textContent![0])).toEqual([
        "1",
        "2",
        "3",
      ]);
    });

    it("render no cells when the book is missing from the books map", async () => {
      translationBooksMap.value = new Map();
      await setupExpanded({ GEN: { 1: [CURRENT_USER_ID] } });

      expect(chapterCells()).toHaveLength(0);
    });

    it("highlight only the chapters that were read", async () => {
      await setupExpanded({ GEN: { 2: [CURRENT_USER_ID] } });

      const highlighted = chapterCells().map((c) =>
        c.className.includes("sb-today-filtered-reading-chapter-highlighted")
      );
      expect(highlighted).toEqual([false, true, false]);
    });

    it("show the reader's animal icon on the chapter they read", async () => {
      await setupExpanded({ GEN: { 2: [CURRENT_USER_ID] } });

      const cell = chapterCells()[1]!;
      expect(cell.querySelector(".material-symbols-outlined")).not.toBeNull();
      expect(cell.querySelector("img")).toBeNull();
    });

    it("show the reader's picture instead, when they have one", async () => {
      await setupExpanded(
        { GEN: { 2: [CURRENT_USER_ID] } },
        {
          pictureUrl: "https://example.test/me.png",
        }
      );

      const cell = chapterCells()[1]!;
      expect(cell.querySelector<HTMLImageElement>("img")!.src).toBe(
        "https://example.test/me.png"
      );
      expect(cell.querySelector(".material-symbols-outlined")).toBeNull();
    });

    it("collapse again on a second click, and ignore clicks inside the grid", async () => {
      await setupExpanded({ GEN: { 1: [CURRENT_USER_ID] } });
      expect(chapterCells()).toHaveLength(3);

      // A click inside the grid must not bubble up and collapse the row.
      act(() => q<HTMLDivElement>(".sb-today-chapters-container")!.click());
      expect(chapterCells()).toHaveLength(3);

      act(() => (bookRows()[0] as HTMLDivElement).click());
      expect(chapterCells()).toHaveLength(0);
    });

    it("opens the clicked chapter, letting the default translation apply", async () => {
      await setupExpanded({ GEN: { 1: [CURRENT_USER_ID] } });

      act(() => (chapterCells()[2] as HTMLDivElement).click());

      expect(onOpenPassage).toHaveBeenCalledWith({
        bookId: "GEN",
        chapter: 3,
      });
    });
  });

  // ─── reactivity that the merge could have broken ──────────────────────────

  describe("reactivity", () => {
    it("relabels a book row when the translation's book names arrive", async () => {
      bookNames.value = new Map();
      getCommunityReading.mockResolvedValue({
        GEN: { 1: [CURRENT_USER_ID] },
      } as FilteredReading);
      setup();
      await flush();
      expect(bookRows()[0]!.querySelector("span")!.textContent).toBe("GEN");

      act(() => {
        bookNames.value = new Map([["GEN", "Genesis"]]);
      });

      expect(bookRows()[0]!.querySelector("span")!.textContent).toBe("Genesis");
    });

    // The memo this replaced depended on the reader list alone, so a late
    // `translationBooksMap` never refilled the chapter grid.
    it("fills the chapter grid when the translation's books arrive late", async () => {
      translationBooksMap.value = new Map();
      getCommunityReading.mockResolvedValue({
        GEN: { 1: [CURRENT_USER_ID] },
      } as FilteredReading);
      setup();
      await flush();
      act(() => (bookRows()[0] as HTMLDivElement).click());
      expect(chapterCells()).toHaveLength(0);

      act(() => {
        translationBooksMap.value = new Map([["GEN", { numberOfChapters: 3 }]]);
      });

      expect(chapterCells()).toHaveLength(3);
    });
  });
});
