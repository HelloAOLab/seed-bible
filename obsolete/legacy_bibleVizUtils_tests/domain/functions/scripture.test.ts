import { FindPreviousValidGroupBookData } from "bibleVizUtils.domain.functions.scripture";

// ─── factories ───────────────────────────────────────────────────────────────

const makePiece = (id = "p1") => ({ id, type: "StackBook" as const });

const makeItem = (overrides: { isActive?: boolean; piece?: any } = {}) => ({
  isActive: false,
  piece: undefined as any,
  ...overrides,
});

// ─── tests ───────────────────────────────────────────────────────────────────

describe("FindPreviousValidGroupBookData", () => {
  it("returns null when currentIndex is 0 — no previous elements to search", () => {
    const arr = [makeItem({ isActive: true, piece: makePiece() })];
    expect(FindPreviousValidGroupBookData({ arr, currentIndex: 0 })).toBeNull();
  });

  it("returns null when the array is empty", () => {
    expect(
      FindPreviousValidGroupBookData({ arr: [], currentIndex: 0 })
    ).toBeNull();
  });

  it("returns the immediately preceding element when it is active and has a piece", () => {
    const item = makeItem({ isActive: true, piece: makePiece() });
    const arr = [item, makeItem()];
    expect(FindPreviousValidGroupBookData({ arr, currentIndex: 1 })).toBe(item);
  });

  it("skips inactive elements and returns the first valid one going backwards", () => {
    const valid = makeItem({ isActive: true, piece: makePiece("p1") });
    const inactive = makeItem({ isActive: false, piece: makePiece("p2") });
    const arr = [valid, inactive, makeItem()];
    expect(FindPreviousValidGroupBookData({ arr, currentIndex: 2 })).toBe(
      valid
    );
  });

  it("skips elements that have no piece even when isActive is true", () => {
    const noPiece = makeItem({ isActive: true, piece: undefined });
    const arr = [noPiece, makeItem()];
    expect(FindPreviousValidGroupBookData({ arr, currentIndex: 1 })).toBeNull();
  });

  it("skips elements that have a piece but isActive is false", () => {
    const notActive = makeItem({ isActive: false, piece: makePiece() });
    const arr = [notActive, makeItem()];
    expect(FindPreviousValidGroupBookData({ arr, currentIndex: 1 })).toBeNull();
  });

  it("returns the nearest valid predecessor — not the first one in the array", () => {
    const far = makeItem({ isActive: true, piece: makePiece("far") });
    const near = makeItem({ isActive: true, piece: makePiece("near") });
    const arr = [far, near, makeItem()];
    expect(FindPreviousValidGroupBookData({ arr, currentIndex: 2 })).toBe(near);
  });

  it("returns null when all previous elements fail both conditions", () => {
    const arr = [
      makeItem({ isActive: false, piece: undefined }),
      makeItem({ isActive: false, piece: undefined }),
      makeItem(),
    ];
    expect(FindPreviousValidGroupBookData({ arr, currentIndex: 2 })).toBeNull();
  });

  it("searches up to and including index 0", () => {
    const item = makeItem({ isActive: true, piece: makePiece() });
    const arr = [item, makeItem(), makeItem()];
    expect(FindPreviousValidGroupBookData({ arr, currentIndex: 2 })).toBe(item);
  });

  it("does not examine the element at currentIndex itself", () => {
    const self = makeItem({ isActive: true, piece: makePiece("self") });
    const arr = [makeItem(), self];
    // currentIndex=1 points to self, but the loop starts at i=0 which is inactive
    expect(FindPreviousValidGroupBookData({ arr, currentIndex: 1 })).toBeNull();
  });

  it("works when currentIndex is beyond the array bounds — searches from arr.length-1 backwards", () => {
    const item = makeItem({ isActive: true, piece: makePiece() });
    const arr = [item, makeItem()];
    expect(FindPreviousValidGroupBookData({ arr, currentIndex: 99 })).toBe(
      item
    );
  });
});
