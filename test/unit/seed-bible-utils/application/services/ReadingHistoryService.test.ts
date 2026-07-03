import type { Mock } from "vitest";
import { ReadingHistoryService } from "../../../../../packages/seed-bible-utils/application/services/ReadingHistoryService";

// Mock InterpolateHexColors so we can verify the arguments the service passes to it
// without coupling the tests to the color-interpolation implementation.
vi.mock(
  "../../../../../packages/seed-bible-utils/domain/functions/colors",
  () => ({
    InterpolateHexColors: vi.fn().mockReturnValue("#mocked"),
  })
);

import { InterpolateHexColors } from "../../../../../packages/seed-bible-utils/domain/functions/colors";
const mockInterpolate = InterpolateHexColors as Mock;

afterEach(() => mockInterpolate.mockClear());

// ─── factories ────────────────────────────────────────────────────────────────

const makeService = (threshold = 0) => new ReadingHistoryService(threshold);

// ─── getRecencyThresholdTimeSeconds ──────────────────────────────────────────

describe("getRecencyThresholdTimeSeconds", () => {
  it("returns the value passed to the constructor", () => {
    expect(makeService(12345).getRecencyThresholdTimeSeconds()).toBe(12345);
  });

  it("returns 0 when constructed with 0", () => {
    expect(makeService(0).getRecencyThresholdTimeSeconds()).toBe(0);
  });
});

// ─── setRecencyThresholdTimeSeconds ──────────────────────────────────────────

describe("setRecencyThresholdTimeSeconds", () => {
  it("updates the stored threshold", () => {
    const svc = makeService(100);
    svc.setRecencyThresholdTimeSeconds(9999);
    expect(svc.getRecencyThresholdTimeSeconds()).toBe(9999);
  });

  it("can update the threshold multiple times", () => {
    const svc = makeService(1);
    svc.setRecencyThresholdTimeSeconds(2);
    svc.setRecencyThresholdTimeSeconds(3);
    expect(svc.getRecencyThresholdTimeSeconds()).toBe(3);
  });

  it("setting to 0 is reflected by the getter", () => {
    const svc = makeService(500);
    svc.setRecencyThresholdTimeSeconds(0);
    expect(svc.getRecencyThresholdTimeSeconds()).toBe(0);
  });
});

// ─── getColorByReadingTime — continuous path ──────────────────────────────────

describe("getColorByReadingTime — continuous (no step/stepColors)", () => {
  it("passes baseColor and userColor to InterpolateHexColors", () => {
    const svc = makeService();
    svc.getColorByReadingTime({
      baseColor: "#aabbcc",
      userColor: "#112233",
      readingTimeSeconds: 450,
    });
    expect(mockInterpolate).toHaveBeenCalledWith(
      "#aabbcc",
      "#112233",
      expect.any(Number),
      undefined
    );
  });

  it("computes progress as readingTimeSeconds / fullColorTimeSeconds (default 900)", () => {
    const svc = makeService();
    svc.getColorByReadingTime({
      baseColor: "#000000",
      userColor: "#ffffff",
      readingTimeSeconds: 450,
    });
    const [, , progress] = mockInterpolate.mock.calls[0]!;
    expect(progress).toBeCloseTo(0.5);
  });

  it("uses the provided fullColorTimeSeconds instead of the default 900", () => {
    const svc = makeService();
    svc.getColorByReadingTime({
      baseColor: "#000000",
      userColor: "#ffffff",
      readingTimeSeconds: 300,
      fullColorTimeSeconds: 600,
    });
    const [, , progress] = mockInterpolate.mock.calls[0]!;
    expect(progress).toBeCloseTo(0.5);
  });

  it("clamps progress to 1 when readingTimeSeconds exceeds fullColorTimeSeconds", () => {
    const svc = makeService();
    svc.getColorByReadingTime({
      baseColor: "#000000",
      userColor: "#ffffff",
      readingTimeSeconds: 1800,
    });
    const [, , progress] = mockInterpolate.mock.calls[0]!;
    expect(progress).toBe(1);
  });

  it("progress is 0 when readingTimeSeconds is 0", () => {
    const svc = makeService();
    svc.getColorByReadingTime({
      baseColor: "#000000",
      userColor: "#ffffff",
      readingTimeSeconds: 0,
    });
    const [, , progress] = mockInterpolate.mock.calls[0]!;
    expect(progress).toBe(0);
  });

  it("progress is exactly 1 when readingTimeSeconds equals fullColorTimeSeconds", () => {
    const svc = makeService();
    svc.getColorByReadingTime({
      baseColor: "#000000",
      userColor: "#ffffff",
      readingTimeSeconds: 900,
    });
    const [, , progress] = mockInterpolate.mock.calls[0]!;
    expect(progress).toBe(1);
  });

  it("forwards undefined step to InterpolateHexColors when step is omitted", () => {
    const svc = makeService();
    svc.getColorByReadingTime({
      baseColor: "#000000",
      userColor: "#ffffff",
      readingTimeSeconds: 450,
    });
    const [, , , step] = mockInterpolate.mock.calls[0]!;
    expect(step).toBeUndefined();
  });

  it("returns the value from InterpolateHexColors", () => {
    mockInterpolate.mockReturnValueOnce("#result");
    const svc = makeService();
    const result = svc.getColorByReadingTime({
      baseColor: "#000000",
      userColor: "#ffffff",
      readingTimeSeconds: 450,
    });
    expect(result).toBe("#result");
  });
});

// ─── getColorByReadingTime — step / stepColors path ──────────────────────────

describe("getColorByReadingTime — step / stepColors branch", () => {
  it("does not call InterpolateHexColors when step and stepColors are both provided", () => {
    const svc = makeService();
    svc.getColorByReadingTime({
      baseColor: "#000000",
      userColor: "#ffffff",
      readingTimeSeconds: 450,
      step: 0.5,
      stepColors: ["#aaa", "#bbb", "#ccc"],
    });
    expect(mockInterpolate).not.toHaveBeenCalled();
  });

  it("computes index from steppedProgress and returns the matching stepColor", () => {
    // readingTimeSeconds=450, fullColorTimeSeconds=900 → progress=0.5
    // step=0.25: steppedProgress = round(max(0.5, 0.25)/0.25)*0.25 = round(2)*0.25 = 0.5
    // index = 0.5/0.25 = 2 → stepColors[2] = "#ccc"
    const svc = makeService();
    const result = svc.getColorByReadingTime({
      baseColor: "#000000",
      userColor: "#ffffff",
      readingTimeSeconds: 450,
      fullColorTimeSeconds: 900,
      step: 0.25,
      stepColors: ["#aaa", "#bbb", "#ccc", "#ddd", "#eee"],
    });
    expect(result).toBe("#ccc");
  });

  it("minimum steppedProgress is step (Math.max enforces lower bound)", () => {
    // progress=0, step=0.5: steppedProgress = round(max(0,0.5)/0.5)*0.5 = round(1)*0.5 = 0.5
    // index = 0.5/0.5 = 1 → stepColors[1]
    const svc = makeService();
    const result = svc.getColorByReadingTime({
      baseColor: "#000000",
      userColor: "#ffffff",
      readingTimeSeconds: 0,
      step: 0.5,
      stepColors: ["#first", "#second", "#third"],
    });
    expect(result).toBe("#second");
  });

  it("index reaches last stepColor entry at progress=1", () => {
    // progress=1, step=0.25: steppedProgress = round(max(1,0.25)/0.25)*0.25 = round(4)*0.25 = 1
    // index = 1/0.25 = 4 → stepColors[4]
    const svc = makeService();
    const result = svc.getColorByReadingTime({
      baseColor: "#base",
      userColor: "#ffffff",
      readingTimeSeconds: 900,
      fullColorTimeSeconds: 900,
      step: 0.25,
      stepColors: ["#s0", "#s1", "#s2", "#s3", "#s4"],
    });
    expect(result).toBe("#s4");
  });

  it("returns baseColor when stepColors[index] is undefined (out of bounds)", () => {
    // progress=1 → index=2, but stepColors only has 2 entries (indices 0 and 1)
    const svc = makeService();
    const result = svc.getColorByReadingTime({
      baseColor: "#fallback",
      userColor: "#ffffff",
      readingTimeSeconds: 900,
      fullColorTimeSeconds: 900,
      step: 0.5,
      stepColors: ["#s0", "#s1"],
    });
    expect(result).toBe("#fallback");
  });

  it("uses the clamped progress (not raw) for stepping — overshooting readingTime yields index at step=1 max", () => {
    // readingTimeSeconds=9000 → progress clamped to 1 → same as readingTimeSeconds=900
    const svc = makeService();
    const r1 = svc.getColorByReadingTime({
      baseColor: "#base",
      userColor: "#ffffff",
      readingTimeSeconds: 9000,
      fullColorTimeSeconds: 900,
      step: 0.25,
      stepColors: ["#s0", "#s1", "#s2", "#s3", "#s4"],
    });
    const r2 = svc.getColorByReadingTime({
      baseColor: "#base",
      userColor: "#ffffff",
      readingTimeSeconds: 900,
      fullColorTimeSeconds: 900,
      step: 0.25,
      stepColors: ["#s0", "#s1", "#s2", "#s3", "#s4"],
    });
    expect(r1).toBe(r2);
  });

  it("falls through to InterpolateHexColors when only step is provided (no stepColors)", () => {
    const svc = makeService();
    svc.getColorByReadingTime({
      baseColor: "#000000",
      userColor: "#ffffff",
      readingTimeSeconds: 450,
      step: 0.25,
      // stepColors not provided
    });
    expect(mockInterpolate).toHaveBeenCalled();
  });

  it("falls through to InterpolateHexColors when only stepColors is provided (no step)", () => {
    const svc = makeService();
    svc.getColorByReadingTime({
      baseColor: "#000000",
      userColor: "#ffffff",
      readingTimeSeconds: 450,
      stepColors: ["#aaa", "#bbb"],
      // step not provided
    });
    expect(mockInterpolate).toHaveBeenCalled();
  });
});

// ─── getColorByRecency ────────────────────────────────────────────────────────

describe("getColorByRecency", () => {
  // Fixed reference: Jan 15 2024 00:00:00 UTC
  const now = new Date("2024-01-15T00:00:00.000Z");
  const nowMs = now.getTime();
  const nowSeconds = Math.floor(nowMs / 1000);

  it("passes baseColor and userColor to InterpolateHexColors", () => {
    const svc = makeService(0);
    svc.getColorByRecency({
      recencyTimeSeconds: 0,
      baseColor: "#aabbcc",
      userColor: "#112233",
      step: 0.5,
      now,
    });
    expect(mockInterpolate).toHaveBeenCalledWith(
      "#aabbcc",
      "#112233",
      expect.any(Number),
      expect.any(Number)
    );
  });

  it("elapsedRecencySeconds is 0 when recencyTimeSeconds is below the threshold", () => {
    const threshold = 1_000_000;
    const svc = makeService(threshold);
    svc.getColorByRecency({
      recencyTimeSeconds: threshold - 1,
      baseColor: "#000000",
      userColor: "#ffffff",
      step: 0.5,
      now,
    });
    const [, , progress] = mockInterpolate.mock.calls[0]!;
    expect(progress).toBe(0);
  });

  it("elapsedRecencySeconds is 0 when recencyTimeSeconds equals the threshold", () => {
    const threshold = 1_000_000;
    const svc = makeService(threshold);
    svc.getColorByRecency({
      recencyTimeSeconds: threshold,
      baseColor: "#000000",
      userColor: "#ffffff",
      step: 0.5,
      now,
    });
    const [, , progress] = mockInterpolate.mock.calls[0]!;
    expect(progress).toBe(0);
  });

  it("progress equals 0 when threshold is 0 and recencyTimeSeconds is 0", () => {
    const svc = makeService(0);
    svc.getColorByRecency({
      recencyTimeSeconds: 0,
      baseColor: "#000000",
      userColor: "#ffffff",
      step: 0.5,
      now,
    });
    const [, , progress] = mockInterpolate.mock.calls[0]!;
    expect(progress).toBe(0);
  });

  it("progress is clamped to 1 when recencyTimeSeconds is far beyond nowSeconds", () => {
    const svc = makeService(0);
    svc.getColorByRecency({
      recencyTimeSeconds: nowSeconds * 2,
      baseColor: "#000000",
      userColor: "#ffffff",
      step: 0.5,
      now,
    });
    const [, , progress] = mockInterpolate.mock.calls[0]!;
    expect(progress).toBe(1);
  });

  it("computes progress correctly for a midpoint recencyTime with threshold=0", () => {
    const svc = makeService(0);
    const halfwaySeconds = Math.floor(nowSeconds / 2);
    svc.getColorByRecency({
      recencyTimeSeconds: halfwaySeconds,
      baseColor: "#000000",
      userColor: "#ffffff",
      step: 0.5,
      now,
    });
    const [, , progress] = mockInterpolate.mock.calls[0]!;
    // elapsedRecencySeconds = halfwaySeconds, timeFrameSeconds = nowSeconds
    // progress = halfwaySeconds / nowSeconds ≈ 0.5
    expect(progress).toBeCloseTo(0.5, 2);
  });

  it("uses the provided step instead of the computed defaultStep", () => {
    const svc = makeService(0);
    svc.getColorByRecency({
      recencyTimeSeconds: 0,
      baseColor: "#000000",
      userColor: "#ffffff",
      step: 0.333,
      now,
    });
    const [, , , step] = mockInterpolate.mock.calls[0]!;
    expect(step).toBe(0.333);
  });

  it("uses the computed defaultStep when no step is provided", () => {
    const threshold = 0;
    const svc = makeService(threshold);
    svc.getColorByRecency({
      recencyTimeSeconds: 0,
      baseColor: "#000000",
      userColor: "#ffffff",
      // no step
      now,
    });
    const expectedDefaultStep =
      1 / Math.floor((nowMs - threshold * 1000) / (1000 * 60 * 60 * 24));
    const [, , , step] = mockInterpolate.mock.calls[0]!;
    expect(step).toBeCloseTo(expectedDefaultStep, 10);
  });

  it("uses real Date.now when `now` is not provided — does not throw", () => {
    const svc = makeService(0);
    expect(() =>
      svc.getColorByRecency({
        recencyTimeSeconds: 0,
        baseColor: "#000000",
        userColor: "#ffffff",
        step: 0.1,
      })
    ).not.toThrow();
  });

  it("returns the value from InterpolateHexColors", () => {
    mockInterpolate.mockReturnValueOnce("#recency-result");
    const svc = makeService(0);
    const result = svc.getColorByRecency({
      recencyTimeSeconds: 0,
      baseColor: "#000000",
      userColor: "#ffffff",
      step: 0.5,
      now,
    });
    expect(result).toBe("#recency-result");
  });

  it("setRecencyThresholdTimeSeconds affects the progress calculation in subsequent calls", () => {
    const svc = makeService(0);
    // Set threshold just below nowSeconds so timeFrameSeconds > 0 and
    // recencyTimeSeconds=0 < threshold → elapsedRecencySeconds=0 → progress=0
    svc.setRecencyThresholdTimeSeconds(nowSeconds - 100);
    svc.getColorByRecency({
      recencyTimeSeconds: 0,
      baseColor: "#000000",
      userColor: "#ffffff",
      step: 0.5,
      now,
    });
    const [, , progress] = mockInterpolate.mock.calls[0]!;
    expect(progress).toBe(0);
  });
});
