import { ReadingHistoryConfigProvider } from "../../../../../../packages/seed-bible-utils/infrastructure/config/readingHistory/ReadingHistoryConfigProvider";

const makeProvider = () => new ReadingHistoryConfigProvider();

// ─── getRecencyThresholdTimeSeconds ──────────────────────────────────────────

describe("getRecencyThresholdTimeSeconds", () => {
  it("returns the timestamp (in seconds) for midnight ten days ago", () => {
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    tenDaysAgo.setHours(0, 0, 0, 0);
    const expected = Math.floor(tenDaysAgo.getTime() / 1000);
    expect(makeProvider().getRecencyThresholdTimeSeconds()).toBe(expected);
  });

  it("returns a number", () => {
    expect(typeof makeProvider().getRecencyThresholdTimeSeconds()).toBe(
      "number"
    );
  });

  it("returns the same value on successive calls", () => {
    const provider = makeProvider();
    expect(provider.getRecencyThresholdTimeSeconds()).toBe(
      provider.getRecencyThresholdTimeSeconds()
    );
  });

  it("returns the same value across independent provider instances", () => {
    expect(makeProvider().getRecencyThresholdTimeSeconds()).toBe(
      makeProvider().getRecencyThresholdTimeSeconds()
    );
  });
});
