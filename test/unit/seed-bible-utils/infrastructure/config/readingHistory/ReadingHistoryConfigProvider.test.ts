import { ReadingHistoryConfigProvider } from "../../../../../../packages/seed-bible-utils/infrastructure/config/readingHistory/ReadingHistoryConfigProvider";

const makeProvider = () => new ReadingHistoryConfigProvider();

// ─── getRecencyThresholdTimeSeconds ──────────────────────────────────────────

describe("getRecencyThresholdTimeSeconds", () => {
  it("returns 1", () => {
    expect(makeProvider().getRecencyThresholdTimeSeconds()).toBe(1);
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
