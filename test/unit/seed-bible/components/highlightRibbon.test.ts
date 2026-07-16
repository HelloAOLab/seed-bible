import { describe, it, expect } from "vitest";
import {
  buildRibbonPath,
  type RibbonRect,
} from "@packages/seed-bible/seed-bible/app/highlightRibbon";

// Pull every numeric literal out of an SVG path `d` string.
function numbersIn(d: string): number[] {
  return (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
}

describe("buildRibbonPath", () => {
  it("returns an empty string when there are no lines", () => {
    expect(buildRibbonPath([], 8, 4, 3)).toBe("");
  });

  it("draws a closed, rounded path for a single line", () => {
    const lines: RibbonRect[] = [
      { left: 100, right: 500, top: 10, bottom: 55 },
    ];
    const d = buildRibbonPath(lines, 8, 4, 3);

    expect(d).toMatch(/^M /); // starts with a moveto
    expect(d.trim().endsWith("Z")).toBe(true); // closed
    expect(d).toContain("Q"); // has rounded corners
    expect(d).not.toContain("NaN");
    expect(numbersIn(d).every(Number.isFinite)).toBe(true);
  });

  it("spans a prose run (equal left, ragged right) without NaNs", () => {
    const lines: RibbonRect[] = [
      { left: 395, right: 1160, top: 140, bottom: 185 },
      { left: 395, right: 1150, top: 192, bottom: 237 },
      { left: 395, right: 1110, top: 244, bottom: 289 },
      { left: 395, right: 920, top: 296, bottom: 341 },
    ];
    const d = buildRibbonPath(lines, 8, 4, 3);

    expect(d).not.toContain("NaN");
    expect(numbersIn(d).every(Number.isFinite)).toBe(true);
    // The ribbon reaches beyond the text on both sides (padX = 4).
    const xs = numbersIn(d).filter((_, i) => i % 2 === 0);
    expect(Math.min(...xs)).toBeLessThanOrEqual(395 - 4 + 0.01);
    expect(Math.max(...xs)).toBeGreaterThanOrEqual(1160 + 4 - 0.01);
  });

  it("handles poetry indentation (a left staircase that steps out and in)", () => {
    const lines: RibbonRect[] = [
      { left: 80, right: 980, top: 830, bottom: 880 },
      { left: 135, right: 390, top: 885, bottom: 935 },
      { left: 80, right: 400, top: 940, bottom: 990 },
      { left: 135, right: 770, top: 995, bottom: 1045 },
    ];
    const d = buildRibbonPath(lines, 8, 4, 3);

    expect(d).not.toContain("NaN");
    expect(numbersIn(d).every(Number.isFinite)).toBe(true);
    expect(d).toContain("Q");
  });

  it("clamps the radius on tiny rectangles (no overshoot, no NaN)", () => {
    const lines: RibbonRect[] = [{ left: 0, right: 2, top: 0, bottom: 2 }];
    const d = buildRibbonPath(lines, 20, 4, 3);

    expect(d).not.toContain("NaN");
    expect(numbersIn(d).every(Number.isFinite)).toBe(true);
  });
});
