import {
  RoundToStep,
  IsValueBetween,
  ClosestNumber,
} from "../../../../../packages/seed-bible-utils/domain/functions/math";

// Note: GetCamRotationFocusPoint is not tested — it depends on CasualOS
// runtime globals (Vector3, math.degreesToRadians) unavailable in Jest.

// ─── RoundToStep ─────────────────────────────────────────────────────────────

describe("RoundToStep", () => {
  describe("default step (0.25)", () => {
    it("rounds a value below the midpoint down to the nearest step", () => {
      // 0.124 / 0.25 = 0.496 → Math.round → 0 → 0 * 0.25 = 0
      expect(RoundToStep(0.124)).toBe(0);
    });

    it("rounds a value above the midpoint up to the nearest step", () => {
      // 0.126 / 0.25 = 0.504 → Math.round → 1 → 1 * 0.25 = 0.25
      expect(RoundToStep(0.126)).toBe(0.25);
    });

    it("rounds exactly at the midpoint (0.125) up to the next step", () => {
      // 0.125 / 0.25 = 0.5 → Math.round → 1 → 0.25
      expect(RoundToStep(0.125)).toBe(0.25);
    });

    it("returns the value unchanged when it already sits on a step boundary", () => {
      expect(RoundToStep(0.5)).toBe(0.5);
    });

    it("returns 0 for an input of 0", () => {
      expect(RoundToStep(0)).toBe(0);
    });

    it("rounds negative values to the nearest step", () => {
      // -0.3 / 0.25 = -1.2 → Math.round → -1 → -0.25
      expect(RoundToStep(-0.3)).toBe(-0.25);
    });
  });

  describe("custom step", () => {
    it("rounds down with step=0.5 when value is below midpoint", () => {
      // 0.2 / 0.5 = 0.4 → Math.round → 0 → 0
      expect(RoundToStep(0.2, 0.5)).toBe(0);
    });

    it("rounds up with step=0.5 when value is above midpoint", () => {
      // 0.3 / 0.5 = 0.6 → Math.round → 1 → 0.5
      expect(RoundToStep(0.3, 0.5)).toBe(0.5);
    });

    it("rounds to nearest 10 for a large step", () => {
      // 13 / 10 = 1.3 → Math.round → 1 → 10
      expect(RoundToStep(13, 10)).toBe(10);
    });

    it("rounds to nearest 10 when value is above midpoint of step", () => {
      // 16 / 10 = 1.6 → Math.round → 2 → 20
      expect(RoundToStep(16, 10)).toBe(20);
    });

    it("rounds to nearest integer when step=1", () => {
      expect(RoundToStep(3.7, 1)).toBe(4);
      expect(RoundToStep(3.2, 1)).toBe(3);
    });

    it("returns the value unchanged when it already sits on a step boundary", () => {
      expect(RoundToStep(1.5, 0.5)).toBe(1.5);
    });
  });
});

// ─── IsValueBetween ───────────────────────────────────────────────────────────

describe("IsValueBetween", () => {
  it("returns true when value is strictly between min and max", () => {
    expect(IsValueBetween({ value: 5, min: 0, max: 10 })).toBe(true);
  });

  it("returns true when value equals min (inclusive lower bound)", () => {
    expect(IsValueBetween({ value: 0, min: 0, max: 10 })).toBe(true);
  });

  it("returns true when value equals max (inclusive upper bound)", () => {
    expect(IsValueBetween({ value: 10, min: 0, max: 10 })).toBe(true);
  });

  it("returns false when value is below min", () => {
    expect(IsValueBetween({ value: -1, min: 0, max: 10 })).toBe(false);
  });

  it("returns false when value is above max", () => {
    expect(IsValueBetween({ value: 11, min: 0, max: 10 })).toBe(false);
  });

  it("returns true when min equals max and value equals that point", () => {
    expect(IsValueBetween({ value: 5, min: 5, max: 5 })).toBe(true);
  });

  it("returns false when min equals max and value differs from that point", () => {
    expect(IsValueBetween({ value: 6, min: 5, max: 5 })).toBe(false);
  });

  it("works correctly with negative ranges", () => {
    expect(IsValueBetween({ value: -3, min: -10, max: -1 })).toBe(true);
    expect(IsValueBetween({ value: 0, min: -10, max: -1 })).toBe(false);
  });

  it("works correctly with floating-point values", () => {
    expect(IsValueBetween({ value: 0.5, min: 0.0, max: 1.0 })).toBe(true);
    expect(IsValueBetween({ value: 1.0001, min: 0.0, max: 1.0 })).toBe(false);
  });
});

// ─── ClosestNumber ────────────────────────────────────────────────────────────

describe("ClosestNumber", () => {
  it("returns the closest number when input is nearer to the last element", () => {
    expect(ClosestNumber({ arr: [10, 20], input: 16 })).toBe(20);
  });

  it("returns the closest number when input is nearer to the first element", () => {
    expect(ClosestNumber({ arr: [10, 20], input: 13 })).toBe(10);
  });

  it("returns the exact value when input matches an element in the array", () => {
    expect(ClosestNumber({ arr: [10, 20, 30], input: 20 })).toBe(20);
  });

  it("returns the first of two equidistant values — comparison uses strict '<'", () => {
    // Both 1 and 3 are distance 1 from 2; 3 < 1 is false, so first (1) is kept
    expect(ClosestNumber({ arr: [1, 3], input: 2 })).toBe(1);
  });

  it("works with a larger array and finds the correct closest value", () => {
    expect(ClosestNumber({ arr: [0, 5, 10, 15, 20], input: 13 })).toBe(15);
  });

  it("works with negative numbers", () => {
    expect(ClosestNumber({ arr: [-10, -5, 0, 5], input: -3 })).toBe(-5);
  });

  it("returns the only element when the array has exactly two identical values", () => {
    expect(ClosestNumber({ arr: [7, 7], input: 0 })).toBe(7);
  });

  it("logs an error and returns input when array has fewer than 2 elements (length 1)", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(ClosestNumber({ arr: [42], input: 99 })).toBe(99);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("ClosestNumber")
    );
    errorSpy.mockRestore();
  });

  it("logs an error and returns input when array is empty", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(ClosestNumber({ arr: [], input: 5 })).toBe(5);
    errorSpy.mockRestore();
  });
});
