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
import type { Friend } from "@packages/seed-bible/seed-bible/managers/FriendsManager";
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

const localMidnight = (year: number, month: number, day: number) =>
  Math.floor(new Date(year, month, day).getTime() / 1000);
/** Where the recent rows start: local midnight two days before `NOW`. */
const RECENT_FROM = localMidnight(2026, 4, 15);
/** Where each older year "See more" reaches into starts. */
const YEAR_1_FROM = localMidnight(2025, 4, 15);
const YEAR_2_FROM = localMidnight(2024, 4, 15);
const YEAR_3_FROM = localMidnight(2023, 4, 15);

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

function friend(overrides: Partial<Friend> = {}): Friend {
  return {
    userId: JONAH,
    name: "Jonah",
    pictureUrl: null,
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
  let friendReaders: Signal<Friend[]>;
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
    friendReaders = signal([friend(), friend({ userId: RUTH, name: "Ruth" })]);
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
      friendReaders,
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
  const historyButton = () =>
    q<HTMLButtonElement>(".sb-today-feed-history-button")!;
  const seeMoreLink = () => q<HTMLButtonElement>(".sb-today-feed-see-more");
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

  async function toggleHistory() {
    act(() => historyButton().click());
    await flush();
  }

  async function seeMore() {
    act(() => seeMoreLink()!.click());
    await flush();
  }

  async function pickDay() {
    act(() => q<HTMLButtonElement>("[data-testid='pick-day']")!.click());
    await flush();
  }

  async function flush() {
    await act(async () => {
      for (let i = 0; i < 10; i++) {
        await Promise.resolve();
      }
    });
  }

  /** Answers the recent window and each older year from the given rows. */
  function feedBySpan(feeds: {
    recent?: CommunityFeedItem[];
    years?: CommunityFeedItem[][];
  }) {
    const years = [YEAR_1_FROM, YEAR_2_FROM, YEAR_3_FROM];
    getCommunityFeed.mockImplementation(async (span) => {
      if (span.from === RECENT_FROM) return feeds.recent ?? [];
      const index = years.indexOf(span.from);
      return index >= 0 ? (feeds.years?.[index] ?? []) : [];
    });
  }

  /** `count` reading rows from an older year, newest first. */
  function olderRows(prefix: string, count: number, time: number) {
    return Array.from({ length: count }, (_, i) =>
      readingItem({ id: `${prefix}:${i}`, time: time - i * HOUR })
    );
  }

  const recentCalls = () =>
    getCommunityFeed.mock.calls.filter(([span]) => span.from === RECENT_FROM);

  // ─── the section itself ────────────────────────────────────────────────────

  describe("the section", () => {
    it("renders the community heading and a closed history button", () => {
      setup();
      expect(heading()).toBe("COMMUNITY");
      expect(historyButton().getAttribute("aria-label")).toBe("History");
      expect(historyButton().getAttribute("aria-pressed")).toBe("false");
    });

    it("has no 'see all' link or time-frame dropdown", () => {
      setup();
      expect(q(".sb-today-titled-section-header > button")).toBeNull();
      expect(q(".sb-today-feed-timeframe-button")).toBeNull();
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
      const callsBefore = getCommunityFeed.mock.calls.length;

      selectKind("Notes");
      selectKind("Reading");

      expect(getCommunityFeed).toHaveBeenCalledTimes(callsBefore);
    });
  });

  // ─── recent activity ───────────────────────────────────────────────────────

  describe("recent activity", () => {
    it("asks for everything since midnight two days back, grouping crossed paths", () => {
      setup();
      expect(getCommunityFeed).toHaveBeenCalledWith(
        { from: RECENT_FROM, to: NOW_SECONDS },
        { crossedPaths: true }
      );
    });

    it("shows only the recent rows until asked for more", async () => {
      feedBySpan({
        recent: [readingItem({ id: "recent" })],
        years: [olderRows("older", 3, YEAR_1_FROM + DAY)],
      });
      setup();
      await flush();

      expect(rows()).toHaveLength(1);
    });

    it("refetches when the member list changes", async () => {
      setup();
      await flush();

      act(() => {
        communityMembers.value = [ME, JONAH];
      });
      await flush();

      expect(recentCalls()).toHaveLength(2);
    });

    it("shows the empty state once the recent rows come back empty", async () => {
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

  // ─── see more ──────────────────────────────────────────────────────────────

  describe("'See more'", () => {
    it("is hidden when there is no older activity", async () => {
      feedBySpan({ recent: [readingItem()] });
      setup();
      await flush();

      expect(seeMoreLink()).toBeNull();
    });

    it("reveals eight older rows per click until there are no more", async () => {
      feedBySpan({
        recent: [readingItem({ id: "recent" })],
        years: [olderRows("older", 12, YEAR_1_FROM + 100 * DAY)],
      });
      setup();
      await flush();
      expect(seeMoreLink()!.textContent).toBe("See more");

      await seeMore();
      expect(rows()).toHaveLength(1 + 8);
      expect(seeMoreLink()).not.toBeNull();

      await seeMore();
      expect(rows()).toHaveLength(1 + 12);
      expect(seeMoreLink()).toBeNull();
    });

    it("keeps reaching further back as long as there is more activity", async () => {
      feedBySpan({
        recent: [readingItem({ id: "recent" })],
        years: [
          olderRows("year1", 3, YEAR_1_FROM + 100 * DAY),
          olderRows("year2", 8, YEAR_2_FROM + 100 * DAY),
        ],
      });
      setup();
      await flush();

      await seeMore();
      expect(rows()).toHaveLength(1 + 8);

      await seeMore();
      expect(rows()).toHaveLength(1 + 11);
      expect(seeMoreLink()).toBeNull();
      expect(getCommunityFeed).toHaveBeenCalledWith(
        expect.objectContaining({ from: YEAR_3_FROM }),
        { crossedPaths: false }
      );
    });

    it("can bring older rows into an empty recent view", async () => {
      feedBySpan({ years: [olderRows("older", 2, YEAR_1_FROM + DAY)] });
      setup();
      await flush();
      expect(emptyText()).toBe("No activity in this time frame yet.");

      await seeMore();

      expect(rows()).toHaveLength(2);
      expect(emptyText()).toBeNull();
    });

    it("counts the rows of the selected kind", async () => {
      feedBySpan({
        recent: [noteItem({ id: "note:recent" })],
        years: [
          [
            ...olderRows("older", 10, YEAR_1_FROM + 100 * DAY),
            noteItem({ id: "note:older", time: YEAR_1_FROM + DAY }),
          ],
        ],
      });
      setup();
      await flush();
      selectKind("Notes");

      await seeMore();

      expect(rows()).toHaveLength(2);
      expect(qa(".sb-today-feed-row-note")).toHaveLength(2);
      expect(seeMoreLink()).toBeNull();
    });

    it("starts over from the recent rows when the kind changes", async () => {
      feedBySpan({
        recent: [readingItem({ id: "recent" })],
        years: [olderRows("older", 12, YEAR_1_FROM + 100 * DAY)],
      });
      setup();
      await flush();
      await seeMore();

      selectKind("Reading");

      expect(rows()).toHaveLength(1);
    });
  });

  // ─── history ───────────────────────────────────────────────────────────────

  describe("history", () => {
    const yearSpan = () => {
      const yearStart = new Date(NOW);
      yearStart.setFullYear(NOW.getFullYear() - 1);
      yearStart.setHours(0, 0, 0, 0);
      const yearEnd = new Date(NOW);
      yearEnd.setHours(23, 59, 59, 999);
      return {
        from: Math.floor(yearStart.getTime() / 1000),
        to: Math.floor(yearEnd.getTime() / 1000),
      };
    };

    it("is closed to begin with, with no activity grid", () => {
      setup();
      expect(q("[data-testid='timeline']")).toBeNull();
      expect(q(".sb-today-date-label")).toBeNull();
    });

    it("opens the activity grid on the whole timeline year, without crossed paths", async () => {
      setup();
      await toggleHistory();

      expect(historyButton().getAttribute("aria-pressed")).toBe("true");
      expect(q("[data-testid='timeline']")).not.toBeNull();
      expect(q(".sb-today-date-label")).toBeNull();
      expect(getCommunityFeed).toHaveBeenLastCalledWith(yearSpan(), {
        crossedPaths: false,
      });
    });

    it("has no 'See more' link", async () => {
      feedBySpan({
        recent: [readingItem()],
        years: [olderRows("older", 3, YEAR_1_FROM + DAY)],
      });
      setup();
      await flush();
      expect(seeMoreLink()).not.toBeNull();

      await toggleHistory();

      expect(seeMoreLink()).toBeNull();
    });

    it("narrows the feed to a picked day and labels it", async () => {
      setup();
      await toggleHistory();

      await pickDay();

      expect(getCommunityFeed).toHaveBeenLastCalledWith(SELECTED_DAY, {
        crossedPaths: false,
      });
      expect(q(".sb-today-date-label")!.textContent).toBe("May 16, 2026");
    });

    it("widens back to the year when the day is cleared", async () => {
      setup();
      await toggleHistory();
      await pickDay();

      act(() => q<HTMLButtonElement>("[data-testid='clear-day']")!.click());
      await flush();

      expect(getCommunityFeed).toHaveBeenLastCalledWith(yearSpan(), {
        crossedPaths: false,
      });
      expect(q(".sb-today-date-label")).toBeNull();
    });

    it("formats the day label in the active language", async () => {
      mockI18nState.language = "fr";
      setup();
      await toggleHistory();

      await pickDay();

      expect(q(".sb-today-date-label")!.textContent).toBe("16 mai 2026");
    });

    it("keeps the current rows up while the next day loads", async () => {
      setup();
      await flush();
      getCommunityFeed.mockResolvedValueOnce([readingItem()]);
      await toggleHistory();
      getCommunityFeed.mockImplementationOnce(() => new Promise(() => {}));

      await pickDay();

      expect(rows()).toHaveLength(1);
      expect(emptyText()).toBeNull();
    });

    it("ignores a stale result after the day changes", async () => {
      setup();
      await flush();
      let resolveYear!: (items: CommunityFeedItem[]) => void;
      getCommunityFeed.mockImplementationOnce(
        () =>
          new Promise<CommunityFeedItem[]>((resolve) => {
            resolveYear = resolve;
          })
      );
      getCommunityFeed.mockResolvedValue([readingItem()]);
      await toggleHistory();

      await pickDay();
      await act(async () => {
        resolveYear([noteItem(), noteItem({ id: "note:2" })]);
        await Promise.resolve();
      });

      expect(rows()).toHaveLength(1);
      expect(q(".sb-today-feed-row-reading")).not.toBeNull();
    });

    it("returns to recent activity when closed, and reopens on the whole year", async () => {
      setup();
      await toggleHistory();
      await pickDay();

      await toggleHistory();
      expect(historyButton().getAttribute("aria-pressed")).toBe("false");
      expect(q("[data-testid='timeline']")).toBeNull();
      expect(recentCalls()).toHaveLength(2);

      await toggleHistory();
      expect(getCommunityFeed).toHaveBeenLastCalledWith(yearSpan(), {
        crossedPaths: false,
      });
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

    it("name a friend by their profile name, not 'You'", async () => {
      communityMembers.value = [ME, JONAH];
      getCommunityFeed.mockResolvedValue([noteItem({ userId: JONAH })]);
      setup();
      await flush();

      expect(sentences()).toEqual(["Jonah noted on Colossians 3:12"]);
    });

    it("name a friend with no profile name by a short id", async () => {
      const unnamed = "abcdef123456";
      communityMembers.value = [ME, unnamed];
      friendReaders.value = [friend({ userId: unnamed, name: null })];
      getCommunityFeed.mockResolvedValue([noteItem({ userId: unnamed })]);
      setup();
      await flush();

      expect(sentences()).toEqual(["User abcdef12 noted on Colossians 3:12"]);
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

    it("put the time at the end of the row, like the other rows", async () => {
      getCommunityFeed.mockResolvedValue([noteItem(), readingItem()]);
      setup();
      await flush();

      const timeParent = (row: string) =>
        q(`${row} .sb-today-feed-time`)!.parentElement;
      expect(timeParent(".sb-today-feed-row-note")).toBe(
        q(".sb-today-feed-row-note")
      );
      expect(timeParent(".sb-today-feed-row-reading")).toBe(
        q(".sb-today-feed-row-reading")
      );
    });
  });

  describe("crossed-paths rows", () => {
    it("put 'You' first and say 'both read'", async () => {
      communityMembers.value = [ME, JONAH];
      getCommunityFeed.mockResolvedValue([crossedPathsItem()]);
      setup();
      await flush();

      expect(sentences()).toEqual(["You and Jonah both read Colossians 3"]);
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
        "You, Jonah, and Ruth all read Colossians 3",
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

      expect(sentences()).toEqual(["Jonah read Exodus 14-16"]);
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
