import { resolveReorderIndices } from "@packages/seed-bible/seed-bible/components/resolveReorderIndices";

describe("resolveReorderIndices", () => {
  it("returns the from/to indices for a valid drag", () => {
    expect(
      resolveReorderIndices({ active: { id: 0 }, over: { id: 2 } } as any)
    ).toEqual({ from: 0, to: 2 });
  });

  it("returns null when dropped outside any row", () => {
    expect(
      resolveReorderIndices({ active: { id: 0 }, over: null } as any)
    ).toBeNull();
  });

  it("returns null when dropped back on itself", () => {
    expect(
      resolveReorderIndices({ active: { id: 1 }, over: { id: 1 } } as any)
    ).toBeNull();
  });
});
