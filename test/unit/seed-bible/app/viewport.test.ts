import {
  isMobileViewport,
  MOBILE_BREAKPOINT,
  readViewport,
} from "@packages/seed-bible/seed-bible/app/viewport";
import {
  restoreViewport,
  SIDEWAYS_PHONE,
  stubViewport,
} from "../testUtils/stubViewport";

describe("isMobileViewport", () => {
  const sidewaysPhone = {
    width: 850,
    coarsePointer: true,
    screenShortSide: 390,
  };

  it("uses the mobile layout on a phone held sideways", () => {
    expect(isMobileViewport(sidewaysPhone)).toBe(true);
  });

  // Touch laptops and all-in-ones report a fine pointer: the trackpad or
  // mouse is the main one.
  it("uses the desktop layout for the same window with a mouse or trackpad", () => {
    expect(isMobileViewport({ ...sidewaysPhone, coarsePointer: false })).toBe(
      false
    );
  });

  // jsdom and some headless browsers report the screen as 0 × 0.
  it("doesn't treat a screen size of 0 as a phone", () => {
    expect(isMobileViewport({ ...sidewaysPhone, screenShortSide: 0 })).toBe(
      false
    );
  });

  it("uses the desktop layout on a tablet held either way", () => {
    expect(
      isMobileViewport({
        width: 1024,
        coarsePointer: true,
        screenShortSide: 768,
      })
    ).toBe(false);
    expect(
      isMobileViewport({
        width: 768,
        coarsePointer: true,
        screenShortSide: 768,
      })
    ).toBe(false);
  });

  it("counts a screen as a phone's up to the breakpoint", () => {
    expect(
      isMobileViewport({
        width: 900,
        coarsePointer: true,
        screenShortSide: MOBILE_BREAKPOINT,
      })
    ).toBe(true);
    expect(
      isMobileViewport({
        width: 900,
        coarsePointer: true,
        screenShortSide: MOBILE_BREAKPOINT + 1,
      })
    ).toBe(false);
  });

  // A narrow desktop window, or a small embed frame on another site.
  it("uses the mobile layout for any window at or below the breakpoint", () => {
    expect(
      isMobileViewport({
        width: MOBILE_BREAKPOINT,
        coarsePointer: false,
        screenShortSide: 1080,
      })
    ).toBe(true);
    expect(
      isMobileViewport({
        width: MOBILE_BREAKPOINT + 1,
        coarsePointer: false,
        screenShortSide: 1080,
      })
    ).toBe(false);
  });
});

describe("readViewport", () => {
  afterEach(() => {
    restoreViewport();
    vi.unstubAllGlobals();
  });

  it("reads the window, the main pointer and the screen's short side", () => {
    stubViewport(SIDEWAYS_PHONE);

    expect(readViewport()).toEqual({
      width: 844,
      height: 390,
      coarsePointer: true,
      screenShortSide: 390,
    });
  });

  it("reads a fine pointer when the browser can't answer media queries", () => {
    // jsdom has no `matchMedia` at all.
    expect(typeof window.matchMedia).toBe("undefined");

    expect(readViewport().coarsePointer).toBe(false);
  });
});
