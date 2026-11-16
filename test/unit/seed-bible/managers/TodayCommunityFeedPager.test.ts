import {
  createCommunityFeedPager,
  type GetCommunityFeed,
} from "@packages/seed-bible/seed-bible/managers/TodayCommunityFeedPager";
import type { CommunityFeedItem } from "@packages/seed-bible/seed-bible/managers/TodayCommunityFeed";
import type { Timespan } from "@packages/seed-bible/seed-bible/managers/TodayReadingHistory";

/** A Sunday evening, local time. */
const NOW = new Date(2026, 4, 17, 18, 0, 0);
const NOW_SECONDS = Math.floor(NOW.getTime() / 1000);

const localMidnight = (year: number, month: number, day: number) =>
  Math.floor(new Date(year, month, day).getTime() / 1000);

/** Local midnight two days before NOW: the start of the recent rows. */
const RECENT_FROM = localMidnight(2026, 4, 15);
const RECENT: Timespan = { from: RECENT_FROM, to: NOW_SECONDS };
/** The older years, newest first, each ending where the next one begins. */
const YEAR_1: Timespan = {
  from: localMidnight(2025, 4, 15),
  to: RECENT_FROM - 1,
};
const YEAR_2: Timespan = {
  from: localMidnight(2024, 4, 15),
  to: YEAR_1.from - 1,
};
const YEAR_3: Timespan = {
  from: localMidnight(2023, 4, 15),
  to: YEAR_2.from - 1,
};

function reading(id: string, time: number): CommunityFeedItem {
  return {
    type: "reading",
    id,
    userId: "me",
    bookId: "JHN",
    chapters: [1],
    time,
  };
}

function note(id: string, time: number): CommunityFeedItem {
  return {
    type: "note",
    id,
    userId: "me",
    bookId: "JHN",
    chapter: 1,
    verses: [1],
    html: "<p>note</p>",
    isReply: false,
    time,
  };
}

function rows(prefix: string, count: number, time: number) {
  return Array.from({ length: count }, (_, i) =>
    reading(`${prefix}:${i}`, time - i)
  );
}

/**
 * Stands in for the manager's feed query: answers each span from `bySpan`,
 * keyed by its start, and nothing for a span it doesn't know.
 */
function feedBySpan(bySpan: Map<number, CommunityFeedItem[]>) {
  return vi.fn<GetCommunityFeed>(async (span) => bySpan.get(span.from) ?? []);
}

const ids = (items: CommunityFeedItem[]) => items.map((item) => item.id);

async function settle(pager: {
  loadingRecent: { value: boolean };
  loadingOlder: { value: boolean };
}) {
  await vi.waitFor(() => {
    expect(pager.loadingRecent.value).toBe(false);
    expect(pager.loadingOlder.value).toBe(false);
  });
}

describe("createCommunityFeedPager", () => {
  it("loads everything since local midnight two days back, grouping crossed paths", async () => {
    const getFeed = feedBySpan(
      new Map([[RECENT.from, [reading("recent", NOW_SECONDS - 60)]]])
    );

    const pager = createCommunityFeedPager(getFeed, NOW);
    expect(pager.loadingRecent.value).toBe(true);
    await settle(pager);

    expect(getFeed).toHaveBeenCalledWith(RECENT, { crossedPaths: true });
    expect(ids(pager.recent.value)).toEqual(["recent"]);
  });

  it("looks a year further back up front, without crossed paths", async () => {
    const getFeed = feedBySpan(
      new Map([[YEAR_1.from, [reading("older", YEAR_1.to)]]])
    );

    const pager = createCommunityFeedPager(getFeed, NOW);
    await settle(pager);

    expect(getFeed).toHaveBeenCalledWith(YEAR_1, { crossedPaths: false });
    expect(ids(pager.older.value)).toEqual(["older"]);
    expect(pager.mayHaveOlder.value).toBe(true);
  });

  it("says there is nothing older once a whole year comes back empty", async () => {
    const pager = createCommunityFeedPager(feedBySpan(new Map()), NOW);
    await settle(pager);

    expect(pager.older.value).toEqual([]);
    expect(pager.mayHaveOlder.value).toBe(false);
  });

  it("reaches back a year at a time until it has enough rows", async () => {
    const getFeed = feedBySpan(
      new Map([
        [YEAR_1.from, rows("y1", 3, YEAR_1.to)],
        [YEAR_2.from, rows("y2", 3, YEAR_2.to)],
        [YEAR_3.from, rows("y3", 3, YEAR_3.to)],
      ])
    );
    const pager = createCommunityFeedPager(getFeed, NOW);
    await settle(pager);

    await pager.loadOlder(5, () => true);

    expect(ids(pager.older.value)).toEqual([
      ...ids(rows("y1", 3, YEAR_1.to)),
      ...ids(rows("y2", 3, YEAR_2.to)),
    ]);
    expect(getFeed).not.toHaveBeenCalledWith(YEAR_3, expect.anything());
  });

  it("counts only the rows the caller accepts", async () => {
    const getFeed = feedBySpan(
      new Map([
        [YEAR_1.from, rows("y1", 4, YEAR_1.to)],
        [YEAR_2.from, [note("y2-note", YEAR_2.to)]],
      ])
    );
    const pager = createCommunityFeedPager(getFeed, NOW);
    await settle(pager);

    await pager.loadOlder(1, (item) => item.type === "note");

    expect(pager.older.value.filter((item) => item.type === "note")).toEqual([
      note("y2-note", YEAR_2.to),
    ]);
  });

  it("stops at an empty year rather than reaching back forever", async () => {
    const getFeed = feedBySpan(
      new Map([[YEAR_1.from, rows("y1", 2, YEAR_1.to)]])
    );
    const pager = createCommunityFeedPager(getFeed, NOW);
    await settle(pager);

    await pager.loadOlder(10, () => true);

    expect(pager.older.value).toHaveLength(2);
    expect(pager.mayHaveOlder.value).toBe(false);
    expect(getFeed).toHaveBeenCalledTimes(3);
  });

  it("asks for the same year again after a failed fetch", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const getFeed = feedBySpan(
      new Map([[YEAR_1.from, rows("y1", 1, YEAR_1.to)]])
    );
    const pager = createCommunityFeedPager(getFeed, NOW);
    await settle(pager);
    getFeed.mockRejectedValueOnce(new Error("offline"));

    await pager.loadOlder(5, () => true);
    expect(pager.loadingOlder.value).toBe(false);
    expect(pager.mayHaveOlder.value).toBe(true);
    expect(consoleError).toHaveBeenCalled();

    await pager.loadOlder(5, () => true);
    const year2Calls = getFeed.mock.calls.filter(
      ([span]) => span.from === YEAR_2.from
    );
    expect(year2Calls).toHaveLength(2);
    consoleError.mockRestore();
  });

  it("shows no recent rows, not a crash, when the recent fetch fails", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const getFeed = vi.fn<GetCommunityFeed>(async (span) => {
      if (span.from === RECENT.from) throw new Error("offline");
      return [];
    });

    const pager = createCommunityFeedPager(getFeed, NOW);
    await settle(pager);

    expect(pager.recent.value).toEqual([]);
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("drops results that arrive after it is disposed", async () => {
    let resolveRecent!: (items: CommunityFeedItem[]) => void;
    const getFeed = vi.fn<GetCommunityFeed>((span) =>
      span.from === RECENT.from
        ? new Promise((resolve) => {
            resolveRecent = resolve;
          })
        : Promise.resolve([])
    );
    const pager = createCommunityFeedPager(getFeed, NOW);

    pager.dispose();
    resolveRecent([reading("late", NOW_SECONDS)]);
    await Promise.resolve();
    await Promise.resolve();

    expect(pager.recent.value).toEqual([]);
  });
});
