import {
  getRandomArrayElement,
  rotateArray,
  subtractArrays,
} from "../../../../../packages/seed-bible-utils/domain/functions/array";

// ─── getRandomArrayElement ────────────────────────────────────────────────────

describe("getRandomArrayElement", () => {
  afterEach(() => void vi.restoreAllMocks());

  it("returns undefined for an empty array", () => {
    expect(getRandomArrayElement([])).toBeUndefined();
  });

  it("always returns the only element of a single-element array", () => {
    expect(getRandomArrayElement(["only"])).toBe("only");
  });

  it("returns the element at index 0 when Math.random returns 0", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(getRandomArrayElement(["a", "b", "c"])).toBe("a");
  });

  it("returns the element at index 1 when Math.random returns 0.5 for a 2-element array", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    expect(getRandomArrayElement(["a", "b"])).toBe("b");
  });

  it("returns the last element when Math.random returns a value just below 1", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.999);
    expect(getRandomArrayElement(["a", "b", "c"])).toBe("c");
  });

  it("works with numeric arrays", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(getRandomArrayElement([10, 20, 30])).toBe(10);
  });

  it("works with object arrays — returns the element by reference", () => {
    const obj = { id: 1 };
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(getRandomArrayElement([obj])).toBe(obj);
  });
});

// ─── rotateArray ──────────────────────────────────────────────────────────────

describe("rotateArray", () => {
  it("throws when startIndex is negative", () => {
    expect(() => rotateArray(["a", "b", "c"], -1)).toThrow(
      "The start index is off of the array limits."
    );
  });

  it("throws when startIndex equals the array length", () => {
    expect(() => rotateArray(["a", "b", "c"], 3)).toThrow(
      "The start index is off of the array limits."
    );
  });

  it("throws when startIndex is greater than the array length", () => {
    expect(() => rotateArray(["a", "b"], 5)).toThrow(
      "The start index is off of the array limits."
    );
  });

  it("returns an equal array when startIndex is 0", () => {
    expect(rotateArray(["a", "b", "c"], 0)).toEqual(["a", "b", "c"]);
  });

  it("rotates by 1: moves first element to the end", () => {
    expect(rotateArray(["a", "b", "c"], 1)).toEqual(["b", "c", "a"]);
  });

  it("rotates by 2: moves first two elements to the end", () => {
    expect(rotateArray(["a", "b", "c"], 2)).toEqual(["c", "a", "b"]);
  });

  it("rotating a single-element array at index 0 returns the same array", () => {
    expect(rotateArray(["a"], 0)).toEqual(["a"]);
  });

  it("does not mutate the original array", () => {
    const original = ["a", "b", "c"];
    rotateArray(original, 1);
    expect(original).toEqual(["a", "b", "c"]);
  });

  it("works with numeric arrays", () => {
    expect(rotateArray([1, 2, 3, 4], 2)).toEqual([3, 4, 1, 2]);
  });

  it("preserves element references in the rotated result", () => {
    const obj1 = { id: 1 };
    const obj2 = { id: 2 };
    const result = rotateArray([obj1, obj2], 1);
    expect(result[0]).toBe(obj2);
    expect(result[1]).toBe(obj1);
  });
});

// ─── subtractArrays ───────────────────────────────────────────────────────────

describe("subtractArrays", () => {
  it("returns items in arr1 that are not in arr2", () => {
    expect(subtractArrays([1, 2, 3], [2])).toEqual([1, 3]);
  });

  it("returns an empty array when arr1 is empty", () => {
    expect(subtractArrays([], [1, 2, 3])).toEqual([]);
  });

  it("returns all items from arr1 when arr2 is empty", () => {
    expect(subtractArrays([1, 2, 3], [])).toEqual([1, 2, 3]);
  });

  it("returns an empty array when both arrays are empty", () => {
    expect(subtractArrays([], [])).toEqual([]);
  });

  it("returns an empty array when all items in arr1 are present in arr2", () => {
    expect(subtractArrays([1, 2, 3], [1, 2, 3])).toEqual([]);
  });

  it("items in arr2 that are not in arr1 have no effect", () => {
    expect(subtractArrays([1, 2], [3, 4])).toEqual([1, 2]);
  });

  it("removes all occurrences of a duplicate item that appears in arr2", () => {
    expect(subtractArrays([1, 2, 1, 3], [1])).toEqual([2, 3]);
  });

  it("uses strict reference equality — two objects with the same shape are not considered equal", () => {
    const a = { id: 1 };
    const b = { id: 1 };
    expect(subtractArrays([a], [b])).toEqual([a]);
  });

  it("correctly removes an object that is the same reference", () => {
    const obj = { id: 1 };
    expect(subtractArrays([obj], [obj])).toEqual([]);
  });

  it("preserves the original order of remaining items", () => {
    expect(subtractArrays([3, 1, 4, 1, 5], [1])).toEqual([3, 4, 5]);
  });
});
