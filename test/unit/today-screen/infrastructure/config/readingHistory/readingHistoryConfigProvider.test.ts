import { ReadingHistoryConfigProvider } from "@packages/today-screen/todayScreen/infrastructure/config/readingHistory/readingHistoryConfigProvider";

const DAY = 24 * 60 * 60;

describe("ReadingHistoryConfigProvider", () => {
  describe("buildTimespanOptionsMap", () => {
    const FIXED = new Date("2026-06-15T12:34:56.000Z");

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(FIXED);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    // Derive the expectations the same way the implementation does, so the
    // assertions are timezone-independent.
    const now = () => new Date();
    const nowSeconds = () => Math.floor(now().getTime() / 1000);
    const currentYear = () => now().getFullYear();

    it("computes the two-days window relative to now", () => {
      const map = new ReadingHistoryConfigProvider().buildTimespanOptionsMap();
      expect(map.twoDays).toEqual({
        year: currentYear(),
        timespan: { from: nowSeconds() - 2 * DAY, to: nowSeconds() },
      });
    });

    it("computes the week window relative to now", () => {
      const map = new ReadingHistoryConfigProvider().buildTimespanOptionsMap();
      expect(map.week).toEqual({
        year: currentYear(),
        timespan: { from: nowSeconds() - 7 * DAY, to: nowSeconds() },
      });
    });

    it("computes the month window relative to now", () => {
      const map = new ReadingHistoryConfigProvider().buildTimespanOptionsMap();
      expect(map.month).toEqual({
        year: currentYear(),
        timespan: { from: nowSeconds() - 30 * DAY, to: nowSeconds() },
      });
    });

    it("leaves the 'all' option without a timespan window", () => {
      const map = new ReadingHistoryConfigProvider().buildTimespanOptionsMap();
      expect(map.all).toEqual({ year: currentYear(), timespan: undefined });
    });

    it("exposes exactly the four timespan option ids", () => {
      const map = new ReadingHistoryConfigProvider().buildTimespanOptionsMap();
      expect(Object.keys(map).sort()).toEqual(
        ["all", "month", "twoDays", "week"].sort()
      );
    });

    it("returns a freshly computed object on each call", () => {
      const provider = new ReadingHistoryConfigProvider();
      const first = provider.buildTimespanOptionsMap();
      const second = provider.buildTimespanOptionsMap();
      expect(first).not.toBe(second);
      expect(first).toEqual(second);
    });

    it("recomputes the window when time advances", () => {
      const provider = new ReadingHistoryConfigProvider();
      const before = provider.buildTimespanOptionsMap().twoDays.timespan!.to;

      jest.setSystemTime(new Date(FIXED.getTime() + 5000));
      const after = provider.buildTimespanOptionsMap().twoDays.timespan!.to;

      expect(after).toBe(before + 5);
    });
  });

  describe("getTimespanOptionLabelMap", () => {
    it("maps every timespan option id to its translation key", () => {
      const provider = new ReadingHistoryConfigProvider();
      expect(provider.getTimespanOptionLabelMap()).toEqual({
        all: "All",
        month: "this-month",
        week: "this-week",
        twoDays: "last-48-hours",
      });
    });

    it("returns the same shared label map across calls and instances", () => {
      const a = new ReadingHistoryConfigProvider();
      const b = new ReadingHistoryConfigProvider();
      expect(a.getTimespanOptionLabelMap()).toBe(a.getTimespanOptionLabelMap());
      expect(a.getTimespanOptionLabelMap()).toBe(b.getTimespanOptionLabelMap());
    });
  });
});
