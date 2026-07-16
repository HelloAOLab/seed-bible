import { resolveReorderIndices } from "@packages/seed-bible/seed-bible/components/resolveReorderIndices";

describe("resolveReorderIndices", () => {
  it("returns the from/to indices for a valid drag", () => {
    expect(
      resolveReorderIndices(
        { active: { id: 10 }, over: { id: 12 } } as any,
        [10, 11, 12]
      )
    ).toEqual({ from: 0, to: 2 });
  });

  it("returns null when dropped outside any row", () => {
    expect(
      resolveReorderIndices(
        { active: { id: 10 }, over: null } as any,
        [10, 11, 12]
      )
    ).toBeNull();
  });

  it("returns null when dropped back on itself", () => {
    expect(
      resolveReorderIndices(
        { active: { id: 11 }, over: { id: 11 } } as any,
        [10, 11, 12]
      )
    ).toBeNull();
  });

  it("returns null when an id no longer matches a row", () => {
    expect(
      resolveReorderIndices(
        { active: { id: 99 }, over: { id: 11 } } as any,
        [10, 11, 12]
      )
    ).toBeNull();
  });
});
