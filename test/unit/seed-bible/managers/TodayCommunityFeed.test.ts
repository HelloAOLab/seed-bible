import {
  buildCommunityFeed,
  groupCrossedPaths,
  groupDailyReading,
  noteFeedItems,
  startOfLocalDay,
  withoutCrossedPathsChapters,
  type CrossedPathsFeedItem,
  type ReadingFeedItem,
} from "@packages/seed-bible/seed-bible/managers/TodayCommunityFeed";
import type { ReadingEvent } from "@packages/seed-bible/seed-bible/managers/ReadingHistoryManager";
import type { Annotation } from "@packages/seed-bible/seed-bible/managers/AnnotationsManager";

/** Noon local time on a fixed day, so no event straddles midnight by accident. */
const DAY = startOfLocalDay(
  Math.floor(new Date(2026, 4, 17, 12).getTime() / 1000)
);
const HOUR = 60 * 60;
const MINUTE = 60;

/** Local day `offset` days after the fixed day, in unix seconds. */
function dayAt(offset: number): number {
  const date = new Date(DAY * 1000);
  date.setDate(date.getDate() + offset);
  return Math.floor(date.getTime() / 1000);
}

function event(
  userId: string,
  bookId: string,
  chapter: number,
  start: number,
  durationSeconds: number
): ReadingEvent {
  return { userId, bookId, chapter, start, end: start + durationSeconds };
}

function note(
  id: string,
  overrides: Partial<Annotation> & {
    createdAtMs?: number | null;
    replyTo?: string | null;
    html?: string;
  } = {}
): Annotation {
  const { createdAtMs, replyTo, html, ...rest } = overrides;
  return {
    id,
    bookId: "COL",
    chapterNumber: 3,
    verseNumber: 12,
    data: {
      type: "comment",
      html: html ?? "<p>Compassion is listed first.</p>",
      createdAtMs: createdAtMs === undefined ? dayAt(0) * 1000 : createdAtMs,
      replyTo,
    },
    ...rest,
  };
}

const WIDE_SPAN = { from: dayAt(-30), to: dayAt(1) };

describe("groupCrossedPaths", () => {
  it("returns nothing when nobody shares a chapter", () => {
    const items = groupCrossedPaths(
      new Map([
        ["a", [event("a", "JHN", 2, dayAt(0) + 8 * HOUR, 10 * MINUTE)]],
        ["b", [event("b", "JHN", 3, dayAt(0) + 9 * HOUR, 10 * MINUTE)]],
      ])
    );
    expect(items).toEqual([]);
  });

  it("joins two readers who read the same chapter", () => {
    const items = groupCrossedPaths(
      new Map([
        ["a", [event("a", "JHN", 2, dayAt(0) + 8 * HOUR, 10 * MINUTE)]],
        ["b", [event("b", "JHN", 2, dayAt(0) + 9 * HOUR, 10 * MINUTE)]],
      ])
    );
    expect(items).toEqual([
      expect.objectContaining({
        type: "crossed-paths",
        bookId: "JHN",
        chapters: [2],
        userIds: ["a", "b"],
      }),
    ]);
  });

  it("places the item at the most recent of the shared readings", () => {
    const later = dayAt(0) + 9 * HOUR;
    const [item] = groupCrossedPaths(
      new Map([
        ["a", [event("a", "JHN", 2, dayAt(0) + 8 * HOUR, 10 * MINUTE)]],
        ["b", [event("b", "JHN", 2, later, 10 * MINUTE)]],
      ])
    );
    expect(item?.time).toBe(later + 10 * MINUTE);
  });

  it("folds chapters of one book read by the same readers into one item", () => {
    const items = groupCrossedPaths(
      new Map([
        [
          "a",
          [
            event("a", "COL", 3, dayAt(0), 10 * MINUTE),
            event("a", "COL", 4, dayAt(0) + HOUR, 10 * MINUTE),
          ],
        ],
        [
          "b",
          [
            event("b", "COL", 4, dayAt(0) + 2 * HOUR, 10 * MINUTE),
            event("b", "COL", 3, dayAt(0) + 3 * HOUR, 10 * MINUTE),
          ],
        ],
      ])
    );
    expect(items).toHaveLength(1);
    expect(items[0]?.chapters).toEqual([3, 4]);
  });

  it("keeps chapters shared by different reader sets apart", () => {
    const items = groupCrossedPaths(
      new Map([
        [
          "a",
          [
            event("a", "COL", 3, dayAt(0), 10 * MINUTE),
            event("a", "COL", 4, dayAt(0), 10 * MINUTE),
          ],
        ],
        ["b", [event("b", "COL", 3, dayAt(0) + HOUR, 10 * MINUTE)]],
        ["c", [event("c", "COL", 4, dayAt(0) + 2 * HOUR, 10 * MINUTE)]],
      ])
    );
    expect(items.map((item) => [item.userIds, item.chapters])).toEqual(
      expect.arrayContaining([
        [["a", "b"], [3]],
        [["a", "c"], [4]],
      ])
    );
    expect(items).toHaveLength(2);
  });

  it("lists readers in the order the caller gave them", () => {
    const [item] = groupCrossedPaths(
      new Map([
        ["me", [event("me", "JHN", 2, dayAt(0) + 2 * HOUR, 10 * MINUTE)]],
        ["b", [event("b", "JHN", 2, dayAt(0), 10 * MINUTE)]],
      ])
    );
    expect(item?.userIds).toEqual(["me", "b"]);
  });

  it("sorts newest first", () => {
    const items = groupCrossedPaths(
      new Map([
        [
          "a",
          [
            event("a", "JHN", 2, dayAt(-1), 10 * MINUTE),
            event("a", "GEN", 6, dayAt(0), 10 * MINUTE),
          ],
        ],
        [
          "b",
          [
            event("b", "JHN", 2, dayAt(-1), 10 * MINUTE),
            event("b", "GEN", 6, dayAt(0), 10 * MINUTE),
          ],
        ],
      ])
    );
    expect(items.map((item) => item.bookId)).toEqual(["GEN", "JHN"]);
  });
});

describe("groupDailyReading", () => {
  it("returns nothing for a reader with no events", () => {
    expect(groupDailyReading("a", [])).toEqual([]);
  });

  it("shows only the book the reader spent the most time in that day", () => {
    const items = groupDailyReading("a", [
      event("a", "JHN", 2, dayAt(0) + 8 * HOUR, 10 * MINUTE),
      event("a", "JHN", 3, dayAt(0) + 8 * HOUR + 10 * MINUTE, 10 * MINUTE),
      event("a", "JHN", 4, dayAt(0) + 8 * HOUR + 20 * MINUTE, 5 * MINUTE),
      event("a", "JHN", 5, dayAt(0) + 8 * HOUR + 25 * MINUTE, 5 * MINUTE),
      event("a", "ROM", 3, dayAt(0) + 10 * HOUR, 5 * MINUTE),
    ]);
    expect(items).toEqual([
      expect.objectContaining({
        type: "reading",
        userId: "a",
        bookId: "JHN",
        chapters: [2, 3, 4, 5],
      }),
    ]);
  });

  it("sums a book's time across its chapters, not per chapter", () => {
    // Romans has the single longest sitting; John has more time in total.
    const items = groupDailyReading("a", [
      event("a", "JHN", 2, dayAt(0) + 8 * HOUR, 8 * MINUTE),
      event("a", "JHN", 3, dayAt(0) + 9 * HOUR, 8 * MINUTE),
      event("a", "ROM", 3, dayAt(0) + 10 * HOUR, 12 * MINUTE),
    ]);
    expect(items.map((item) => item.bookId)).toEqual(["JHN"]);
  });

  it("makes one item per local day", () => {
    const items = groupDailyReading("a", [
      event("a", "JHN", 2, dayAt(0) + 8 * HOUR, 10 * MINUTE),
      event("a", "EXO", 14, dayAt(-1) + 8 * HOUR, 10 * MINUTE),
    ]);
    expect(items.map((item) => item.bookId)).toEqual(["JHN", "EXO"]);
  });

  it("dates the item by the reader's last reading in that book that day", () => {
    const last = dayAt(0) + 10 * HOUR;
    const [item] = groupDailyReading("a", [
      event("a", "JHN", 2, dayAt(0) + 8 * HOUR, 10 * MINUTE),
      event("a", "JHN", 3, last, 10 * MINUTE),
    ]);
    expect(item?.time).toBe(last + 10 * MINUTE);
  });

  it("dedupes a chapter read in several sittings", () => {
    const [item] = groupDailyReading("a", [
      event("a", "JHN", 2, dayAt(0) + 8 * HOUR, 10 * MINUTE),
      event("a", "JHN", 2, dayAt(0) + 12 * HOUR, 10 * MINUTE),
    ]);
    expect(item?.chapters).toEqual([2]);
  });

  it("keeps a sitting that runs past midnight on the day it started", () => {
    const items = groupDailyReading("a", [
      event("a", "JHN", 2, dayAt(1) - 5 * MINUTE, 10 * MINUTE),
    ]);
    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe(`reading:a:${dayAt(0)}`);
  });

  it("breaks a tie on time toward the book read most recently", () => {
    const items = groupDailyReading("a", [
      event("a", "JHN", 2, dayAt(0) + 8 * HOUR, 10 * MINUTE),
      event("a", "ROM", 3, dayAt(0) + 9 * HOUR, 10 * MINUTE),
    ]);
    expect(items.map((item) => item.bookId)).toEqual(["ROM"]);
  });
});

describe("withoutCrossedPathsChapters", () => {
  const reading = (
    userId: string,
    bookId: string,
    chapters: number[]
  ): ReadingFeedItem => ({
    type: "reading",
    id: `reading:${userId}`,
    userId,
    bookId,
    chapters,
    time: dayAt(0),
  });
  const crossed = (
    bookId: string,
    chapters: number[],
    userIds: string[]
  ): CrossedPathsFeedItem => ({
    type: "crossed-paths",
    id: `crossed:${bookId}`,
    bookId,
    chapters,
    userIds,
    time: dayAt(0),
  });

  it("leaves the items alone when there are no crossed paths", () => {
    const items = [reading("a", "COL", [3, 4])];
    expect(withoutCrossedPathsChapters(items, [])).toEqual(items);
  });

  it("drops the chapters a crossed-paths item already shows for that reader", () => {
    const result = withoutCrossedPathsChapters(
      [reading("a", "COL", [3, 4])],
      [crossed("COL", [3], ["a", "b"])]
    );
    expect(result).toEqual([expect.objectContaining({ chapters: [4] })]);
  });

  it("removes an item left with nothing to say", () => {
    expect(
      withoutCrossedPathsChapters(
        [reading("a", "COL", [3])],
        [crossed("COL", [3], ["a", "b"])]
      )
    ).toEqual([]);
  });

  it("does not touch a reader who is not part of the crossed paths", () => {
    const items = [reading("c", "COL", [3])];
    expect(
      withoutCrossedPathsChapters(items, [crossed("COL", [3], ["a", "b"])])
    ).toEqual(items);
  });

  it("does not touch another book", () => {
    const items = [reading("a", "JHN", [3])];
    expect(
      withoutCrossedPathsChapters(items, [crossed("COL", [3], ["a", "b"])])
    ).toEqual(items);
  });
});

describe("noteFeedItems", () => {
  it("turns a note into a feed item with its verses and time", () => {
    const items = noteFeedItems(new Map([["a", [note("n1")]]]), WIDE_SPAN);
    expect(items).toEqual([
      {
        type: "note",
        id: "note:a:n1",
        userId: "a",
        bookId: "COL",
        chapter: 3,
        verses: [12],
        html: "<p>Compassion is listed first.</p>",
        isReply: false,
        time: dayAt(0),
      },
    ]);
  });

  it("marks a reply", () => {
    const [item] = noteFeedItems(
      new Map([["a", [note("n1", { replyTo: "n0" })]]]),
      WIDE_SPAN
    );
    expect(item?.isReply).toBe(true);
  });

  it("expands a verse range into sorted verses", () => {
    const [item] = noteFeedItems(
      new Map([
        ["a", [note("n1", { verseNumber: null, verseNumbers: [7, 3, 4] })]],
      ]),
      WIDE_SPAN
    );
    expect(item?.verses).toEqual([3, 4, 7]);
  });

  it("leaves out a note with no timestamp", () => {
    expect(
      noteFeedItems(
        new Map([["a", [note("n1", { createdAtMs: null })]]]),
        WIDE_SPAN
      )
    ).toEqual([]);
  });

  it("leaves out a note written outside the window", () => {
    expect(
      noteFeedItems(
        new Map([["a", [note("n1", { createdAtMs: dayAt(-40) * 1000 })]]]),
        WIDE_SPAN
      )
    ).toEqual([]);
  });

  it("sorts newest first across users", () => {
    const items = noteFeedItems(
      new Map([
        ["a", [note("old", { createdAtMs: dayAt(-2) * 1000 })]],
        ["b", [note("new", { createdAtMs: dayAt(0) * 1000 })]],
      ]),
      WIDE_SPAN
    );
    expect(items.map((item) => item.id)).toEqual(["note:b:new", "note:a:old"]);
  });
});

describe("buildCommunityFeed", () => {
  it("returns nothing for no members", () => {
    expect(
      buildCommunityFeed({
        eventsByReader: new Map(),
        notesByUser: new Map(),
        span: WIDE_SPAN,
        crossedPaths: true,
      })
    ).toEqual([]);
  });

  it("interleaves notes, crossed paths and reading newest first", () => {
    const items = buildCommunityFeed({
      eventsByReader: new Map([
        [
          "me",
          [
            event("me", "COL", 3, dayAt(0) + 8 * HOUR, 10 * MINUTE),
            event("me", "EXO", 14, dayAt(-1) + 8 * HOUR, 10 * MINUTE),
          ],
        ],
        ["jonah", [event("jonah", "COL", 3, dayAt(0) + 9 * HOUR, 10 * MINUTE)]],
      ]),
      notesByUser: new Map([
        ["me", [note("n1", { createdAtMs: (dayAt(0) + 10 * HOUR) * 1000 })]],
      ]),
      span: WIDE_SPAN,
      crossedPaths: true,
    });
    expect(items.map((item) => item.type)).toEqual([
      "note",
      "crossed-paths",
      "reading",
    ]);
    expect(items[2]).toEqual(
      expect.objectContaining({ userId: "me", bookId: "EXO", chapters: [14] })
    );
  });

  it("shows shared chapters once, as crossed paths, not again per reader", () => {
    const items = buildCommunityFeed({
      eventsByReader: new Map([
        ["me", [event("me", "COL", 3, dayAt(0) + 8 * HOUR, 10 * MINUTE)]],
        ["jonah", [event("jonah", "COL", 3, dayAt(0) + 9 * HOUR, 10 * MINUTE)]],
      ]),
      notesByUser: new Map(),
      span: WIDE_SPAN,
      crossedPaths: true,
    });
    expect(items.map((item) => item.type)).toEqual(["crossed-paths"]);
  });

  it("does not group crossed paths when told not to (the 'all' window)", () => {
    const items = buildCommunityFeed({
      eventsByReader: new Map([
        ["me", [event("me", "COL", 3, dayAt(0) + 8 * HOUR, 10 * MINUTE)]],
        ["jonah", [event("jonah", "COL", 3, dayAt(0) + 9 * HOUR, 10 * MINUTE)]],
      ]),
      notesByUser: new Map(),
      span: WIDE_SPAN,
      crossedPaths: false,
    });
    expect(
      items.map((item) => [item.type, "userId" in item && item.userId])
    ).toEqual([
      ["reading", "jonah"],
      ["reading", "me"],
    ]);
  });

  it("ignores events that end outside the window", () => {
    const items = buildCommunityFeed({
      eventsByReader: new Map([
        ["me", [event("me", "COL", 3, dayAt(-40), 10 * MINUTE)]],
      ]),
      notesByUser: new Map(),
      span: WIDE_SPAN,
      crossedPaths: true,
    });
    expect(items).toEqual([]);
  });

  it("ignores events too short to be reading", () => {
    const items = buildCommunityFeed({
      eventsByReader: new Map([
        [
          "me",
          [
            event("me", "COL", 3, dayAt(0) + 8 * HOUR, 10 * MINUTE),
            // Paged through on the way to chapter 3.
            event("me", "COL", 9, dayAt(0) + 8 * HOUR - 30, 20),
          ],
        ],
      ]),
      notesByUser: new Map(),
      span: WIDE_SPAN,
      crossedPaths: true,
    });
    expect(items).toEqual([expect.objectContaining({ chapters: [3] })]);
  });

  it("honours a custom minimum duration", () => {
    const items = buildCommunityFeed({
      eventsByReader: new Map([
        ["me", [event("me", "COL", 3, dayAt(0) + 8 * HOUR, 20)]],
      ]),
      notesByUser: new Map(),
      span: WIDE_SPAN,
      crossedPaths: true,
      minDurationSeconds: 0,
    });
    expect(items).toHaveLength(1);
  });
});
