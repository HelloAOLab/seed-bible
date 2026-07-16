import { describe, it, expect } from "vitest";
import {
  buildRibbonPath,
  type RibbonRect,
} from "@packages/seed-bible/seed-bible/app/highlightRibbon";

// Pull every numeric literal out of an SVG path `d` string.
function numbersIn(d: string): number[] {
  return (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
}
function xsIn(d: string): number[] {
  return numbersIn(d).filter((_, i) => i % 2 === 0);
}
function ysIn(d: string): number[] {
  return numbersIn(d).filter((_, i) => i % 2 === 1);
}

// A comfortable line pitch for the test rectangles (bottom - top = 45 tall).
const PITCH = 65;

describe("buildRibbonPath", () => {
  it("returns an empty string when there are no lines", () => {
    expect(buildRibbonPath([], 8, 4, PITCH)).toBe("");
  });

  it("draws a closed, rounded path for a single line", () => {
    const lines: RibbonRect[] = [
      { left: 100, right: 500, top: 10, bottom: 55 },
    ];
    const d = buildRibbonPath(lines, 8, 4, PITCH);

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
    const d = buildRibbonPath(lines, 8, 4, PITCH);

    expect(d).not.toContain("NaN");
    expect(numbersIn(d).every(Number.isFinite)).toBe(true);
    // The ribbon reaches beyond the text on both sides (padX = 4).
    expect(Math.min(...xsIn(d))).toBeLessThanOrEqual(395 - 4 + 0.01);
    expect(Math.max(...xsIn(d))).toBeGreaterThanOrEqual(1160 + 4 - 0.01);
  });

  it("handles poetry indentation (a left staircase that steps out and in)", () => {
    const lines: RibbonRect[] = [
      { left: 80, right: 980, top: 830, bottom: 880 },
      { left: 135, right: 390, top: 885, bottom: 935 },
      { left: 80, right: 400, top: 940, bottom: 990 },
      { left: 135, right: 770, top: 995, bottom: 1045 },
    ];
    const d = buildRibbonPath(lines, 8, 4, PITCH);

    expect(d).not.toContain("NaN");
    expect(numbersIn(d).every(Number.isFinite)).toBe(true);
    expect(d).toContain("Q");
  });

  it("clamps the radius on tiny rectangles (no overshoot, no NaN)", () => {
    const lines: RibbonRect[] = [{ left: 0, right: 2, top: 0, bottom: 2 }];
    const d = buildRibbonPath(lines, 20, 4, PITCH);

    expect(d).not.toContain("NaN");
    expect(numbersIn(d).every(Number.isFinite)).toBe(true);
  });

  it("extends the outer edges by half the line leading to fill the line slot", () => {
    // A 45-tall line in a 65 pitch has 20 of leading -> 10 above and below.
    const lines: RibbonRect[] = [
      { left: 100, right: 500, top: 10, bottom: 55 },
    ];
    // No radius so corners land exactly on the slot bounds.
    const ys = ysIn(buildRibbonPath(lines, 0, 4, PITCH));
    expect(Math.min(...ys)).toBeCloseTo(0, 1); // 10 - 10
    expect(Math.max(...ys)).toBeCloseTo(65, 1); // 55 + 10
    // (sanity: the rounded variant is still a valid closed path)
    expect(buildRibbonPath(lines, 8, 4, PITCH)).toContain("Q");
  });

  it("makes two vertically-adjacent runs meet at the shared slot boundary", () => {
    // Two single-line runs on consecutive lines (pitch 65): run A on the first
    // slot, run B on the next. Their touching edges should land on the same y.
    const runA = buildRibbonPath(
      [{ left: 100, right: 400, top: 0, bottom: 45 }],
      0,
      4,
      PITCH
    );
    const runB = buildRibbonPath(
      [{ left: 100, right: 400, top: 65, bottom: 110 }],
      0,
      4,
      PITCH
    );
    const aBottom = Math.max(...ysIn(runA)); // 45 + 10
    const bTop = Math.min(...ysIn(runB)); // 65 - 10
    expect(aBottom).toBeCloseTo(55, 1);
    expect(bTop).toBeCloseTo(55, 1);
    expect(aBottom).toBeCloseTo(bTop, 1); // no gap between the two ribbons
  });
});
