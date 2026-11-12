import {
  canFollowParticipant,
  followAfterUserScroll,
  followAnchorForLeader,
  leaderVerseSpan,
  parseFollowMode,
  verseSpansOverlap,
} from "@packages/seed-bible/seed-bible/managers/followReading";

describe("follow reading", () => {
  it("treats a missing or unknown follow mode as everyone", () => {
    expect(parseFollowMode(undefined)).toBe("everyone");
    expect(parseFollowMode(null)).toBe("everyone");
    expect(parseFollowMode("nope")).toBe("everyone");
    expect(parseFollowMode("auto-host")).toBe("auto-host");
  });

  it("decides who can be followed from the session mode", () => {
    expect(
      canFollowParticipant({
        mode: "everyone",
        isSelf: false,
        targetIsHost: false,
      })
    ).toBe(true);
    expect(
      canFollowParticipant({
        mode: "everyone",
        isSelf: true,
        targetIsHost: true,
      })
    ).toBe(false);
    expect(
      canFollowParticipant({
        mode: "hosts-only",
        isSelf: false,
        targetIsHost: false,
      })
    ).toBe(false);
    expect(
      canFollowParticipant({
        mode: "hosts-only",
        isSelf: false,
        targetIsHost: true,
      })
    ).toBe(true);
    expect(
      canFollowParticipant({
        mode: "auto-host",
        isSelf: false,
        targetIsHost: false,
      })
    ).toBe(true);
    expect(
      canFollowParticipant({ mode: "off", isSelf: false, targetIsHost: true })
    ).toBe(false);
  });

  it("keeps an anchor inside the leader's verse span and resets it outside", () => {
    const span = { first: 10, last: 20 };
    expect(followAnchorForLeader(span, null, false)).toBe(10);
    expect(followAnchorForLeader(span, 13, false)).toBe(13);
    expect(followAnchorForLeader(span, 9, false)).toBe(10);
    expect(followAnchorForLeader(span, 13, true)).toBe(10);
    expect(followAnchorForLeader(null, 13, false)).toBe(13);
    expect(followAnchorForLeader(null, 13, true)).toBeNull();
  });

  it("ignores a verse range that is missing or backwards", () => {
    expect(
      leaderVerseSpan({ bookId: "GEN", chapterNumber: 1, firstVerse: 4 })
    ).toBeNull();
    expect(
      leaderVerseSpan({
        bookId: "GEN",
        chapterNumber: 1,
        firstVerse: 8,
        lastVerse: 3,
      })
    ).toBeNull();
    expect(
      leaderVerseSpan({
        bookId: "GEN",
        chapterNumber: 1,
        firstVerse: 4,
        lastVerse: 9,
      })
    ).toEqual({ first: 4, last: 9 });
  });

  it("treats overlapping verse spans as still in view", () => {
    expect(
      verseSpansOverlap({ first: 10, last: 15 }, { first: 10, last: 20 })
    ).toBe(true);
    expect(
      verseSpansOverlap({ first: 18, last: 25 }, { first: 10, last: 20 })
    ).toBe(true);
    expect(
      verseSpansOverlap({ first: 21, last: 28 }, { first: 10, last: 20 })
    ).toBe(false);
  });

  it("moves the anchor when a hand scroll stays inside the leader's verses", () => {
    const leader = {
      bookId: "GEN",
      chapterNumber: 1,
      firstVerse: 10,
      lastVerse: 20,
    };
    expect(
      followAfterUserScroll({
        anchorVerse: 10,
        leader,
        localBookId: "GEN",
        localChapter: 1,
        localRange: { first: 13, last: 18 },
      })
    ).toEqual({ action: "keep", anchorVerse: 13 });
  });

  it("keeps the leader's first verse when the follower can see above it too", () => {
    expect(
      followAfterUserScroll({
        anchorVerse: 10,
        leader: {
          bookId: "GEN",
          chapterNumber: 1,
          firstVerse: 10,
          lastVerse: 20,
        },
        localBookId: "GEN",
        localChapter: 1,
        localRange: { first: 8, last: 16 },
      })
    ).toEqual({ action: "keep", anchorVerse: 10 });
  });

  it("pauses when the hand scroll leaves the leader's verses or chapter", () => {
    const leader = {
      bookId: "GEN",
      chapterNumber: 1,
      firstVerse: 10,
      lastVerse: 20,
    };
    expect(
      followAfterUserScroll({
        anchorVerse: 10,
        leader,
        localBookId: "GEN",
        localChapter: 1,
        localRange: { first: 21, last: 28 },
      }).action
    ).toBe("pause");
    expect(
      followAfterUserScroll({
        anchorVerse: 10,
        leader,
        localBookId: "EXO",
        localChapter: 2,
        localRange: { first: 1, last: 5 },
      }).action
    ).toBe("pause");
  });

  it("does not pause while the local verse range has not been measured", () => {
    expect(
      followAfterUserScroll({
        anchorVerse: 10,
        leader: {
          bookId: "GEN",
          chapterNumber: 1,
          firstVerse: 10,
          lastVerse: 20,
        },
        localBookId: "GEN",
        localChapter: 1,
        localRange: null,
      })
    ).toEqual({ action: "keep", anchorVerse: 10 });
  });
});
