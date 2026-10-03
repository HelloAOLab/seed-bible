import type { Mock } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import { signal, type Signal } from "@preact/signals";
import {
  SocialSection,
  formatFeedTime,
} from "@packages/seed-bible/seed-bible/components/TodayPane/SocialSection";
import { TimeProvider } from "@packages/seed-bible/seed-bible/components/TodayPane/TimeContext";
import type { BibleTheme } from "@packages/seed-bible/seed-bible/managers/ThemeManager";
import type { UserProfile } from "@packages/seed-bible/seed-bible/managers/LoginManager";
import type { CommunityFeedItem } from "@packages/seed-bible/seed-bible/managers/TodayCommunityFeed";
import { todayStub, loginStub } from "../../testUtils/todayStubs";
import { mockI18nState, mockTranslate } from "../../testUtils/mockI18n";

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

/** The clock every test runs at: a Sunday evening, local time. */
const NOW = vi.hoisted(() => new Date(2026, 4, 17, 18, 0, 0));
const NOW_SECONDS = vi.hoisted(() => Math.floor(NOW.getTime() / 1000));
const HOUR = 60 * 60;
const DAY = 24 * HOUR;

/** The day a timeline click selects: the day before `NOW`. */
const SELECTED_DAY = vi.hoisted(() => {
  const day = new Date(NOW);
  day.setDate(day.getDate() - 1);
  day.setHours(0, 0, 0, 0);
  const from = Math.floor(day.getTime() / 1000);
  return { from, to: from + 24 * 60 * 60 - 1 };
});

// Clicking a day inside the timeline is the *only* thing that narrows the
// window while "all" is selected, so the stub exposes that one interaction
// rather than rendering an inert element. Its second button stands in for a
// click that clears the selection, which the real timeline does on
// `handleItemClick(null)`. Everything else about the timeline belongs to its
// own suite.
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

const ME = "user-1";
const JONAH = "user-2";
const RUTH = "user-3";

function noteItem(
  overrides: Partial<Extract<CommunityFeedItem, { type: "note" }>> = {}
): CommunityFeedItem {
  return {
    type: "note",
    id: "note:1",
    userId: ME,
    bookId: "COL",
    chapter: 3,
    verses: [12],
    html: "<p>Compassion is listed first, before patience.</p>",
    isReply: false,
    time: NOW_SECONDS - HOUR,
    ...overrides,
  };
}

function crossedPathsItem(
  overrides: Partial<Extract<CommunityFeedItem, { type: "crossed-paths" }>> = {}
): CommunityFeedItem {
  return {
    type: "crossed-paths",
    id: "crossed:1",
    bookId: "COL",
    chapters: [3],
    userIds: [JONAH, ME],
    time: NOW_SECONDS - 2 * HOUR,
    ...overrides,
  };
}

function readingItem(
  overrides: Partial<Extract<CommunityFeedItem, { type: "reading" }>> = {}
): CommunityFeedItem {
  return {
    type: "reading",
    id: "reading:1",
    userId: JONAH,
    bookId: "EXO",
    chapters: [14, 15, 16],
    time: NOW_SECONDS - DAY,
    ...overrides,
  };
}

describe("SocialSection", () => {
  let container: HTMLDivElement;
  let getCommunityFeed: Mock<
    (
      span: { from: number; to: number },
      options: { crossedPaths: boolean }
    ) => Promise<CommunityFeedItem[]>
  >;
  let communityMembers: Signal<string[]>;
  let onOpenPassage: Mock;
  let bookNames: Signal<Map<string, string>>;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    container = document.createElement("div");
    document.body.appendChild(container);
    mockI18nState.language = "en";
    getCommunityFeed = vi.fn(async () => []);
    communityMembers = signal([ME]);
    onOpenPassage = vi.fn();
    bookNames = signal(
      new Map([
        ["COL", "Colossians"],
        ["EXO", "Exodus"],
      ])
    );
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  function setup(
    options: {
      signedIn?: boolean;
      profileName?: string;
    } = {}
  ) {
    const signedIn = options.signedIn ?? true;
    if (!signedIn) {
      communityMembers.value = [];
    }
    const today = todayStub({
      getCommunityFeed,
      communityMembers,
      bookNames,
    });
    const login = loginStub({
      userId: signal(signedIn ? ME : null),
      profile: signal(
        signedIn ? ({ name: options.profileName ?? "Me" } as UserProfile) : null
      ),
    });
    act(() =>
      render(
        <TimeProvider>
          <SocialSection
            today={today}
            login={login}
            theme={signal({ variables: {} } as unknown as BibleTheme)}
            onOpenPassage={onOpenPassage}
          />
        </TimeProvider>,
        container
      )
    );
  }

  const q = <T extends Element = Element>(sel: string) =>
    container.querySelector<T>(sel);
  const qa = (sel: string) => Array.from(container.querySelectorAll(sel));
  const heading = () => q(".sb-today-titled-section-header > h5")!.textContent;
  const timeframeButton = () =>
    q<HTMLButtonElement>(".sb-today-feed-timeframe-button")!;
  const timeframeLabel = () => q(".sb-today-feed-timeframe-label")!.textContent;
  // The menu is portaled to <body>, so it is looked up from the document.
  const timeframeOptions = () =>
    Array.from(
      document.querySelectorAll<HTMLButtonElement>(
        ".sb-today-feed-timeframe-menu .sb-context-menu-item"
      )
    );
  const kindButtons = () =>
    qa(".sb-today-feed-kind-option") as HTMLButtonElement[];
  const selectedKind = () =>
    q(".sb-today-feed-kind-option-selected")!.textContent;
  const rows = () => qa(".sb-today-feed-row");
  const sentences = () =>
    qa(".sb-today-feed-sentence").map((el) => el.textContent);
  const emptyText = () => q(".sb-today-feed-empty")?.textContent ?? null;

  function selectKind(label: string) {
    const button = kindButtons().find((b) => b.textContent === label)!;
    act(() => button.click());
  }

  async function selectTimeframe(label: string) {
    act(() => timeframeButton().click());
    const option = timeframeOptions().find((b) => b.textContent === label)!;
    act(() => option.click());
    await flush();
  }

  async function flush() {
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  // ─── the section itself ────────────────────────────────────────────────────

  describe("the section", () => {
    it("renders the community heading with the time-frame dropdown beside it", () => {
      setup();
      expect(heading()).toBe("COMMUNITY");
      expect(timeframeLabel()).toBe("Last 48 hours");
    });

    it("has no 'see all' link", () => {
      setup();
      expect(q(".sb-today-titled-section-header > button")).toBeNull();
    });
  });

  // ─── kind filter ───────────────────────────────────────────────────────────

  describe("kind filter", () => {
    it("renders All, Notes and Reading, with All selected", () => {
      setup();
      expect(kindButtons().map((b) => b.textContent)).toEqual([
        "All",
        "Notes",
        "Reading",
      ]);
      expect(selectedKind()).toBe("All");
      expect(kindButtons()[0]!.getAttribute("aria-pressed")).toBe("true");
    });

    it("scrolls the pill row horizontally with the wheel", () => {
      setup();
      expect(useHorizontalScroll).toHaveBeenCalled();
    });

    it("shows only notes under Notes", async () => {
      getCommunityFeed.mockResolvedValue([
        noteItem(),
        crossedPathsItem(),
        readingItem(),
      ]);
      setup();
      await flush();

      selectKind("Notes");

      expect(selectedKind()).toBe("Notes");
      expect(rows()).toHaveLength(1);
      expect(q(".sb-today-feed-row-note")).not.toBeNull();
    });

    it("shows crossed paths and reading, but not notes, under Reading", async () => {
      getCommunityFeed.mockResolvedValue([
        noteItem(),
        crossedPathsItem(),
        readingItem(),
      ]);
      setup();
      await flush();

      selectKind("Reading");

      expect(rows()).toHaveLength(2);
      expect(q(".sb-today-feed-row-note")).toBeNull();
    });

    it("filters without asking the manager again", async () => {
      getCommunityFeed.mockResolvedValue([noteItem(), readingItem()]);
      setup();
      await flush();

      selectKind("Notes");
      selectKind("Reading");

      expect(getCommunityFeed).toHaveBeenCalledTimes(1);
    });
  });

  // ─── time-frame dropdown ───────────────────────────────────────────────────

  describe("time-frame dropdown", () => {
    it("lists the four windows in order", () => {
      setup();
      act(() => timeframeButton().click());
      expect(timeframeOptions().map((b) => b.textContent)).toEqual([
        "Last 48 hours",
        "Last week",
        "Last month",
        "All",
      ]);
    });

    it("marks the selected window", () => {
      setup();
      act(() => timeframeButton().click());
      expect(
        timeframeOptions().map((b) => b.getAttribute("aria-checked"))
      ).toEqual(["true", "false", "false", "false"]);
    });

    it("relabels the button with the picked window", async () => {
      setup();
      await selectTimeframe("Last month");
      expect(timeframeLabel()).toBe("Last month");
    });
  });

  // ─── fetching ──────────────────────────────────────────────────────────────

  describe("fetching the feed", () => {
    it("asks for the last 48 hours on mount, grouping crossed paths", () => {
      setup();
      expect(getCommunityFeed).toHaveBeenCalledTimes(1);
      expect(getCommunityFeed).toHaveBeenCalledWith(
        { from: NOW_SECONDS - 2 * DAY, to: NOW_SECONDS },
        { crossedPaths: true }
      );
    });

    it("refetches the week when 'Last week' is picked", async () => {
      setup();
      await selectTimeframe("Last week");
      expect(getCommunityFeed).toHaveBeenLastCalledWith(
        { from: NOW_SECONDS - 7 * DAY, to: NOW_SECONDS },
        { crossedPaths: true }
      );
    });

    it("refetches the month when 'Last month' is picked", async () => {
      setup();
      await selectTimeframe("Last month");
      expect(getCommunityFeed).toHaveBeenLastCalledWith(
        { from: NOW_SECONDS - 30 * DAY, to: NOW_SECONDS },
        { crossedPaths: true }
      );
    });

    it("fetches the whole timeline year, without crossed paths, under 'All'", async () => {
      setup();
      await selectTimeframe("All");

      const yearStart = new Date(NOW);
      yearStart.setFullYear(NOW.getFullYear() - 1);
      yearStart.setHours(0, 0, 0, 0);
      const yearEnd = new Date(NOW);
      yearEnd.setHours(23, 59, 59, 999);
      expect(getCommunityFeed).toHaveBeenLastCalledWith(
        {
          from: Math.floor(yearStart.getTime() / 1000),
          to: Math.floor(yearEnd.getTime() / 1000),
        },
        { crossedPaths: false }
      );
    });

    it("does not refetch when the same window is picked again", async () => {
      setup();
      await selectTimeframe("Last 48 hours");
      expect(getCommunityFeed).toHaveBeenCalledTimes(1);
    });

    it("ignores a stale result after the window changes", async () => {
      let resolveFirst!: (items: CommunityFeedItem[]) => void;
      getCommunityFeed.mockImplementationOnce(
        () =>
          new Promise<CommunityFeedItem[]>((resolve) => {
            resolveFirst = resolve;
          })
      );
      getCommunityFeed.mockResolvedValue([readingItem()]);
      setup();

      await selectTimeframe("Last week");
      await act(async () => {
        resolveFirst([noteItem(), noteItem({ id: "note:2" })]);
        await Promise.resolve();
      });

      expect(rows()).toHaveLength(1);
      expect(q(".sb-today-feed-row-reading")).not.toBeNull();
    });

    it("refetches when the member list changes", async () => {
      setup();
      await flush();

      act(() => {
        communityMembers.value = [ME, JONAH];
      });
      await flush();

      expect(getCommunityFeed).toHaveBeenCalledTimes(2);
    });

    it("shows the empty state once a window comes back empty", async () => {
      setup();
      expect(emptyText()).toBeNull();
      await flush();
      expect(emptyText()).toBe("No activity in this time frame yet.");
    });

    it("words the empty state for the selected kind", async () => {
      setup();
      await flush();
      selectKind("Notes");
      expect(emptyText()).toBe("No notes in this time frame yet.");
      selectKind("Reading");
      expect(emptyText()).toBe("No reading in this time frame yet.");
    });

    it("keeps the current rows up while the next window loads", async () => {
      getCommunityFeed.mockResolvedValueOnce([readingItem()]);
      getCommunityFeed.mockImplementationOnce(() => new Promise(() => {}));
      setup();
      await flush();

      await selectTimeframe("Last week");

      expect(rows()).toHaveLength(1);
      expect(emptyText()).toBeNull();
    });

    it("shows the empty state, not a crash, when the fetch fails", async () => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      getCommunityFeed.mockRejectedValue(new Error("offline"));
      setup();
      await flush();

      expect(emptyText()).toBe("No activity in this time frame yet.");
      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });

  // ─── the timeline ──────────────────────────────────────────────────────────

  describe("the timeline", () => {
    it("is hidden for a relative window", () => {
      setup();
      expect(q("[data-testid='timeline']")).toBeNull();
      expect(q(".sb-today-date-label")).toBeNull();
    });

    it("appears under 'All', without a date label", async () => {
      setup();
      await selectTimeframe("All");
      expect(q("[data-testid='timeline']")).not.toBeNull();
      expect(q(".sb-today-date-label")).toBeNull();
    });

    it("narrows the feed to a picked day and labels it", async () => {
      setup();
      await selectTimeframe("All");

      act(() => q<HTMLButtonElement>("[data-testid='pick-day']")!.click());
      await flush();

      expect(getCommunityFeed).toHaveBeenLastCalledWith(SELECTED_DAY, {
        crossedPaths: false,
      });
      expect(q(".sb-today-date-label")!.textContent).toBe("May 16, 2026");
    });

    it("widens back to the year when the day is cleared", async () => {
      setup();
      await selectTimeframe("All");
      act(() => q<HTMLButtonElement>("[data-testid='pick-day']")!.click());
      await flush();
      const callsBefore = getCommunityFeed.mock.calls.length;

      act(() => q<HTMLButtonElement>("[data-testid='clear-day']")!.click());
      await flush();

      expect(getCommunityFeed.mock.calls.length).toBe(callsBefore + 1);
      expect(getCommunityFeed.mock.lastCall?.[0]).not.toEqual(SELECTED_DAY);
      expect(q(".sb-today-date-label")).toBeNull();
    });

    it("formats the day label in the active language", async () => {
      mockI18nState.language = "fr";
      setup();
      await selectTimeframe("All");

      act(() => q<HTMLButtonElement>("[data-testid='pick-day']")!.click());
      await flush();

      expect(q(".sb-today-date-label")!.textContent).toBe("16 mai 2026");
    });

    it("drops the picked day when a relative window is chosen again", async () => {
      setup();
      await selectTimeframe("All");
      act(() => q<HTMLButtonElement>("[data-testid='pick-day']")!.click());
      await flush();

      await selectTimeframe("Last 48 hours");

      expect(q("[data-testid='timeline']")).toBeNull();
      expect(getCommunityFeed).toHaveBeenLastCalledWith(
        { from: NOW_SECONDS - 2 * DAY, to: NOW_SECONDS },
        { crossedPaths: true }
      );
    });
  });

  // ─── rows ──────────────────────────────────────────────────────────────────

  describe("note rows", () => {
    it("say who noted on which verse, and quote the note", async () => {
      getCommunityFeed.mockResolvedValue([noteItem()]);
      setup();
      await flush();

      expect(sentences()).toEqual(["You noted on Colossians 3:12"]);
      expect(q(".sb-today-feed-name")!.textContent).toBe("You");
      expect(q(".sb-today-feed-reference")!.textContent).toBe(
        "Colossians 3:12"
      );
      expect(q(".sb-today-feed-note-text")!.textContent).toBe(
        "Compassion is listed first, before patience."
      );
    });

    it("name another member, not 'You'", async () => {
      communityMembers.value = [ME, JONAH];
      getCommunityFeed.mockResolvedValue([noteItem({ userId: JONAH })]);
      setup();
      await flush();

      // Other members have no profile until subscriptions bring one (#1846).
      expect(sentences()).toEqual(["Anonymous noted on Colossians 3:12"]);
    });

    it("say 'replied' for a reply", async () => {
      getCommunityFeed.mockResolvedValue([noteItem({ isReply: true })]);
      setup();
      await flush();

      expect(sentences()).toEqual(["You replied on Colossians 3:12"]);
    });

    it("show a verse range and a chapter-only note", async () => {
      getCommunityFeed.mockResolvedValue([
        noteItem({ id: "a", verses: [3, 4, 5, 7] }),
        noteItem({ id: "b", verses: [] }),
      ]);
      setup();
      await flush();

      expect(
        qa(".sb-today-feed-reference").map((el) => el.textContent)
      ).toEqual(["Colossians 3:3-5,7", "Colossians 3"]);
    });

    it("leave out the quote when the note has no text", async () => {
      getCommunityFeed.mockResolvedValue([noteItem({ html: "<p></p>" })]);
      setup();
      await flush();

      expect(q(".sb-today-feed-note-text")).toBeNull();
    });

    it("open the noted verse when the reference is clicked", async () => {
      getCommunityFeed.mockResolvedValue([noteItem()]);
      setup();
      await flush();

      act(() => q<HTMLButtonElement>(".sb-today-feed-reference")!.click());

      expect(onOpenPassage).toHaveBeenCalledWith({
        bookId: "COL",
        chapter: 3,
        verse: 12,
      });
    });

    it("show the clock time for something from today", async () => {
      getCommunityFeed.mockResolvedValue([noteItem()]);
      setup();
      await flush();

      expect(q(".sb-today-feed-time")!.textContent).toBe("5:00 PM");
    });
  });

  describe("crossed-paths rows", () => {
    it("put 'You' first and say 'both read'", async () => {
      communityMembers.value = [ME, JONAH];
      getCommunityFeed.mockResolvedValue([crossedPathsItem()]);
      setup();
      await flush();

      expect(sentences()).toEqual(["You and Anonymous both read Colossians 3"]);
      expect(qa(".sb-today-feed-avatar")).toHaveLength(2);
    });

    it("say 'all read' for three or more", async () => {
      communityMembers.value = [ME, JONAH, RUTH];
      getCommunityFeed.mockResolvedValue([
        crossedPathsItem({ userIds: [JONAH, ME, RUTH] }),
      ]);
      setup();
      await flush();

      expect(sentences()).toEqual([
        "You, Anonymous, and Anonymous all read Colossians 3",
      ]);
    });

    it("show a chapter range", async () => {
      communityMembers.value = [ME, JONAH];
      getCommunityFeed.mockResolvedValue([
        crossedPathsItem({ chapters: [3, 4] }),
      ]);
      setup();
      await flush();

      expect(q(".sb-today-feed-reference")!.textContent).toBe("Colossians 3-4");
    });

    it("open the first shared chapter when the reference is clicked", async () => {
      communityMembers.value = [ME, JONAH];
      getCommunityFeed.mockResolvedValue([
        crossedPathsItem({ chapters: [3, 4] }),
      ]);
      setup();
      await flush();

      act(() => q<HTMLButtonElement>(".sb-today-feed-reference")!.click());

      expect(onOpenPassage).toHaveBeenCalledWith({ bookId: "COL", chapter: 3 });
    });

    it("still draw an avatar for a reader whose profile is unknown", async () => {
      // `communityMembers` is just me, but the feed names a second reader.
      getCommunityFeed.mockResolvedValue([crossedPathsItem()]);
      setup();
      await flush();

      expect(qa(".sb-today-feed-avatar")).toHaveLength(2);
    });
  });

  describe("reading rows", () => {
    it("say who read what", async () => {
      communityMembers.value = [ME, JONAH];
      getCommunityFeed.mockResolvedValue([readingItem()]);
      setup();
      await flush();

      expect(sentences()).toEqual(["Anonymous read Exodus 14-16"]);
    });

    it("fall back to the book id when the name is unknown", async () => {
      getCommunityFeed.mockResolvedValue([
        readingItem({ userId: ME, bookId: "PHM", chapters: [1] }),
      ]);
      setup();
      await flush();

      expect(sentences()).toEqual(["You read PHM 1"]);
    });

    it("relabel when the translation's book names arrive", async () => {
      getCommunityFeed.mockResolvedValue([
        readingItem({ userId: ME, bookId: "PHM", chapters: [1] }),
      ]);
      setup();
      await flush();

      act(() => {
        bookNames.value = new Map([...bookNames.value, ["PHM", "Philemon"]]);
      });

      expect(sentences()).toEqual(["You read Philemon 1"]);
    });

    it("say 'Yesterday' for something from yesterday", async () => {
      getCommunityFeed.mockResolvedValue([readingItem({ userId: ME })]);
      setup();
      await flush();

      expect(q(".sb-today-feed-time")!.textContent).toBe("Yesterday");
    });

    it("open the first chapter when the reference is clicked", async () => {
      getCommunityFeed.mockResolvedValue([readingItem({ userId: ME })]);
      setup();
      await flush();

      act(() => q<HTMLButtonElement>(".sb-today-feed-reference")!.click());

      expect(onOpenPassage).toHaveBeenCalledWith({
        bookId: "EXO",
        chapter: 14,
      });
    });
  });

  describe("row order", () => {
    it("keeps the manager's order", async () => {
      getCommunityFeed.mockResolvedValue([
        noteItem(),
        crossedPathsItem(),
        readingItem(),
      ]);
      setup();
      await flush();

      expect(
        rows().map((row) =>
          row.className.includes("sb-today-feed-row-note")
            ? "note"
            : row.className.includes("sb-today-feed-row-crossed-paths")
              ? "crossed-paths"
              : "reading"
        )
      ).toEqual(["note", "crossed-paths", "reading"]);
    });
  });
});

describe("formatFeedTime", () => {
  const t = mockTranslate;
  const nowMs = NOW.getTime();

  it("gives the clock time for today", () => {
    expect(formatFeedTime(nowMs - 2 * HOUR * 1000, "en", t, nowMs)).toBe(
      "4:00 PM"
    );
  });

  it("says 'Yesterday' for yesterday, however late in the day", () => {
    const lateYesterday = new Date(NOW);
    lateYesterday.setDate(lateYesterday.getDate() - 1);
    lateYesterday.setHours(23, 59);
    expect(formatFeedTime(lateYesterday.getTime(), "en", t, nowMs)).toBe(
      "Yesterday"
    );
  });

  it("gives the date for anything older this year", () => {
    expect(formatFeedTime(nowMs - 10 * DAY * 1000, "en", t, nowMs)).toBe(
      "May 7"
    );
  });

  it("adds the year for another year", () => {
    expect(formatFeedTime(nowMs - 400 * DAY * 1000, "en", t, nowMs)).toBe(
      "Apr 12, 2025"
    );
  });
});
