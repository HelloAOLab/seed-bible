import { StackData } from "bibleVizUtils.domain.entities.StackData";

const makePiece = (id: string) => ({ id }) as any;

class TestNode extends StackData<unknown> {
  ownPieces: ReturnType<typeof makePiece>[];

  constructor(
    id: string,
    ownPieces: ReturnType<typeof makePiece>[] = [],
    children: unknown[] = []
  ) {
    super({ id, childrenData: children });
    this.ownPieces = ownPieces;
  }

  override resetHierarchy() {
    return [...this.ownPieces, ...super.resetHierarchy()];
  }
}

describe("StackData", () => {
  describe("constructor", () => {
    it("stores the provided id", () => {
      const data = new StackData({ id: "abc" });
      expect(data.id).toBe("abc");
    });

    it("defaults childrenData to an empty array when not provided", () => {
      const data = new StackData({ id: "x" });
      expect(data.childrenData).toEqual([]);
    });

    it("stores the provided childrenData", () => {
      const children = ["a", "b"];
      const data = new StackData({ id: "x", childrenData: children });
      expect(data.childrenData).toEqual(children);
    });
  });

  describe("childrenData", () => {
    it("returns a shallow copy so external mutations do not affect internal state", () => {
      const data = new StackData({ id: "x", childrenData: ["a", "b"] });
      const snapshot = data.childrenData;
      snapshot.push("c");
      expect(data.childrenData).toEqual(["a", "b"]);
    });
  });

  describe("addChild", () => {
    it("appends a child to childrenData", () => {
      const data = new StackData<string>({ id: "x" });
      data.addChild("a");
      expect(data.childrenData).toEqual(["a"]);
    });

    it("appends multiple children in insertion order", () => {
      const data = new StackData<string>({ id: "x" });
      data.addChild("a");
      data.addChild("b");
      data.addChild("c");
      expect(data.childrenData).toEqual(["a", "b", "c"]);
    });
  });

  describe("clearChildren", () => {
    it("returns the children that existed before clearing", () => {
      const data = new StackData<string>({ id: "x", childrenData: ["a", "b"] });
      const returned = data.clearChildren();
      expect(returned).toEqual(["a", "b"]);
    });

    it("empties childrenData after clearing", () => {
      const data = new StackData<string>({ id: "x", childrenData: ["a", "b"] });
      data.clearChildren();
      expect(data.childrenData).toEqual([]);
    });

    it("returns an empty array when already empty", () => {
      const data = new StackData<string>({ id: "x" });
      expect(data.clearChildren()).toEqual([]);
    });

    it("allows adding new children after clearing", () => {
      const data = new StackData<string>({ id: "x", childrenData: ["a"] });
      data.clearChildren();
      data.addChild("b");
      expect(data.childrenData).toEqual(["b"]);
    });
  });

  describe("tryReplaceChild", () => {
    it("returns true and replaces the child at the correct position", () => {
      const a = { name: "a" };
      const b = { name: "b" };
      const c = { name: "c" };
      const data = new StackData({ id: "x", childrenData: [a, b] });

      const result = data.tryReplaceChild(b, c);

      expect(result).toBe(true);
      expect(data.childrenData).toEqual([a, c]);
    });

    it("returns false when the child is not in the list", () => {
      const a = { name: "a" };
      const b = { name: "b" };
      const data = new StackData({ id: "x", childrenData: [a] });

      expect(data.tryReplaceChild(b, a)).toBe(false);
    });

    it("does not mutate childrenData when the child is not found", () => {
      const a = { name: "a" };
      const b = { name: "b" };
      const data = new StackData({ id: "x", childrenData: [a] });

      data.tryReplaceChild(b, { name: "c" });

      expect(data.childrenData).toEqual([a]);
    });

    it("replaces only the matching reference, leaving others unchanged", () => {
      const a = { name: "a" };
      const b = { name: "b" };
      const c = { name: "c" };
      const replacement = { name: "X" };
      const data = new StackData({ id: "x", childrenData: [a, b, c] });

      data.tryReplaceChild(b, replacement);

      expect(data.childrenData[0]).toBe(a);
      expect(data.childrenData[1]).toBe(replacement);
      expect(data.childrenData[2]).toBe(c);
    });

    it("uses reference equality, not deep equality, to find the child", () => {
      const a = { name: "a" };
      const lookalike = { name: "a" };
      const replacement = { name: "X" };
      const data = new StackData({ id: "x", childrenData: [a] });

      const result = data.tryReplaceChild(lookalike, replacement);

      expect(result).toBe(false);
      expect(data.childrenData).toEqual([a]);
    });
  });

  describe("getReversedChildren", () => {
    it("returns children in reversed order", () => {
      const data = new StackData({ id: "x", childrenData: ["a", "b", "c"] });
      expect(data.getReversedChildren()).toEqual(["c", "b", "a"]);
    });

    it("returns an empty array when there are no children", () => {
      const data = new StackData({ id: "x" });
      expect(data.getReversedChildren()).toEqual([]);
    });

    it("does not mutate the original children order", () => {
      const data = new StackData({ id: "x", childrenData: ["a", "b", "c"] });
      data.getReversedChildren();
      expect(data.childrenData).toEqual(["a", "b", "c"]);
    });
  });

  describe("resetHierarchy", () => {
    it("returns an empty array for a leaf node with no children", () => {
      const data = new StackData({ id: "x" });
      expect(data.resetHierarchy()).toEqual([]);
    });

    it("skips children that are not StackData instances", () => {
      const data = new StackData({ id: "x", childrenData: [{ id: "plain" }] });
      expect(data.resetHierarchy()).toEqual([]);
    });

    it("recursively calls resetHierarchy on StackData children and collects their pieces", () => {
      const piece1 = makePiece("p1");
      const piece2 = makePiece("p2");
      const child1 = new TestNode("child1", [piece1]);
      const child2 = new TestNode("child2", [piece2]);
      const parent = new StackData({
        id: "parent",
        childrenData: [child1, child2],
      });

      expect(parent.resetHierarchy()).toEqual([piece1, piece2]);
    });

    it("collects pieces from deeply nested hierarchies", () => {
      const deepPiece = makePiece("deep");
      const midPiece = makePiece("mid");
      const leaf = new TestNode("leaf", [deepPiece]);
      const mid = new TestNode("mid", [midPiece], [leaf]);
      const root = new StackData({ id: "root", childrenData: [mid] });

      expect(root.resetHierarchy()).toEqual([midPiece, deepPiece]);
    });

    it("handles children that are arrays of StackData instances", () => {
      const piece1 = makePiece("p1");
      const piece2 = makePiece("p2");
      const child1 = new TestNode("c1", [piece1]);
      const child2 = new TestNode("c2", [piece2]);
      const parent = new StackData<TestNode[]>({
        id: "parent",
        childrenData: [[child1, child2]],
      });

      expect(parent.resetHierarchy()).toEqual([piece1, piece2]);
    });

    it("skips non-StackData elements inside array children", () => {
      const piece = makePiece("p1");
      const child = new TestNode("c1", [piece]);
      const plain = { id: "plain" };
      const parent = new StackData<(TestNode | typeof plain)[]>({
        id: "parent",
        childrenData: [[child, plain]],
      });

      expect(parent.resetHierarchy()).toEqual([piece]);
    });

    it("returns an empty array when all children are non-StackData inside arrays", () => {
      const parent = new StackData<object[]>({
        id: "parent",
        childrenData: [[{ id: "a" }, { id: "b" }]],
      });

      expect(parent.resetHierarchy()).toEqual([]);
    });
  });
});
