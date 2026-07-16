import { LabelDataStore } from "bibleVizUtils.infrastructure.adapters.labels.LabelDataStore";
import { InfoLabelData } from "bibleVizUtils.domain.entities.InfoLabelData";
import { LabelPosition } from "bibleVizUtils.domain.models.label";

// ─── factories ────────────────────────────────────────────────────────────────

const makeInfoLabel = (overrides: any = {}) =>
  new InfoLabelData({
    id: "label-1",
    transformer: { id: "t-1", type: "InfoLabelTransformer" as const },
    tail: { id: "tail-1", type: "InfoLabelTail" as const },
    label: { id: "text-1", type: "InfoLabelText" as const },
    owner: { id: "owner-1", type: "StackBook" as const },
    positioning: LabelPosition.RightSided,
    ...overrides,
  });

const makeStore = (initial?: Set<InfoLabelData>) =>
  new LabelDataStore({ labelDataSet: initial });

// ─── constructor ──────────────────────────────────────────────────────────────

describe("constructor", () => {
  it("creates an empty store when no initial set is provided", () => {
    expect(makeStore().getAllLabelsData()).toHaveLength(0);
  });

  it("pre-loads entries from the provided initial set", () => {
    const label = makeInfoLabel();
    const store = makeStore(new Set([label]));
    expect(store.getAllLabelsData()).toContain(label);
  });

  it("pre-loads multiple entries", () => {
    const a = makeInfoLabel({ id: "a" });
    const b = makeInfoLabel({ id: "b" });
    const store = makeStore(new Set([a, b]));
    expect(store.getAllLabelsData()).toHaveLength(2);
  });
});

// ─── addLabelData ─────────────────────────────────────────────────────────────

describe("addLabelData", () => {
  it("makes the entry visible in getAllLabelsData", () => {
    const store = makeStore();
    const label = makeInfoLabel();
    store.addLabelData(label);
    expect(store.getAllLabelsData()).toContain(label);
  });

  it("does not duplicate the same instance (Set semantics)", () => {
    const store = makeStore();
    const label = makeInfoLabel();
    store.addLabelData(label);
    store.addLabelData(label);
    expect(store.getAllLabelsData()).toHaveLength(1);
  });

  it("can store multiple distinct instances", () => {
    const store = makeStore();
    store.addLabelData(makeInfoLabel({ id: "a" }));
    store.addLabelData(makeInfoLabel({ id: "b" }));
    expect(store.getAllLabelsData()).toHaveLength(2);
  });
});

// ─── removeLabelData ──────────────────────────────────────────────────────────

describe("removeLabelData", () => {
  it("removes the entry so it no longer appears in getAllLabelsData", () => {
    const label = makeInfoLabel();
    const store = makeStore(new Set([label]));
    store.removeLabelData(label);
    expect(store.getAllLabelsData()).not.toContain(label);
  });

  it("is a no-op when the entry is not in the store", () => {
    const store = makeStore();
    expect(() => store.removeLabelData(makeInfoLabel())).not.toThrow();
  });

  it("does not affect other entries when removing one", () => {
    const keep = makeInfoLabel({ id: "keep" });
    const remove = makeInfoLabel({ id: "remove" });
    const store = makeStore(new Set([keep, remove]));
    store.removeLabelData(remove);
    expect(store.getAllLabelsData()).toContain(keep);
    expect(store.getAllLabelsData()).toHaveLength(1);
  });
});

// ─── getAllLabelsData ──────────────────────────────────────────────────────────

describe("getAllLabelsData", () => {
  it("returns an empty array when the store is empty", () => {
    expect(makeStore().getAllLabelsData()).toEqual([]);
  });

  it("returns all stored instances", () => {
    const a = makeInfoLabel({ id: "a" });
    const b = makeInfoLabel({ id: "b" });
    const store = makeStore(new Set([a, b]));
    const all = store.getAllLabelsData();
    expect(all).toContain(a);
    expect(all).toContain(b);
  });

  it("returns a snapshot — mutating the returned array does not affect internal state", () => {
    const label = makeInfoLabel();
    const store = makeStore(new Set([label]));
    store.getAllLabelsData().splice(0);
    expect(store.getAllLabelsData()).toHaveLength(1);
  });

  it("reflects additions made after construction", () => {
    const store = makeStore();
    store.addLabelData(makeInfoLabel());
    expect(store.getAllLabelsData()).toHaveLength(1);
  });

  it("reflects removals made after construction", () => {
    const label = makeInfoLabel();
    const store = makeStore(new Set([label]));
    store.removeLabelData(label);
    expect(store.getAllLabelsData()).toHaveLength(0);
  });
});

// ─── getDataByTransformerId ───────────────────────────────────────────────────

describe("getDataByTransformerId", () => {
  it("returns the entry whose transformer id matches", () => {
    const label = makeInfoLabel({
      transformer: { id: "t-42", type: "InfoLabelTransformer" as const },
    });
    const store = makeStore(new Set([label]));
    expect(store.getDataByTransformerId("t-42")).toBe(label);
  });

  it("returns undefined when no entry has a matching transformer id", () => {
    const store = makeStore(new Set([makeInfoLabel()]));
    expect(store.getDataByTransformerId("nonexistent")).toBeUndefined();
  });

  it("does not match by tail or text id", () => {
    const label = makeInfoLabel({
      transformer: { id: "t-unique", type: "InfoLabelTransformer" as const },
      tail: { id: "shared-id", type: "InfoLabelTail" as const },
      label: { id: "shared-id", type: "InfoLabelText" as const },
    });
    const store = makeStore(new Set([label]));
    expect(store.getDataByTransformerId("shared-id")).toBeUndefined();
  });

  it("returns undefined when the store is empty", () => {
    expect(makeStore().getDataByTransformerId("any")).toBeUndefined();
  });
});

// ─── getDataByTailId ──────────────────────────────────────────────────────────

describe("getDataByTailId", () => {
  it("returns the entry whose tail id matches", () => {
    const label = makeInfoLabel({
      tail: { id: "tail-99", type: "InfoLabelTail" as const },
    });
    const store = makeStore(new Set([label]));
    expect(store.getDataByTailId("tail-99")).toBe(label);
  });

  it("returns undefined when no entry has a matching tail id", () => {
    const store = makeStore(new Set([makeInfoLabel()]));
    expect(store.getDataByTailId("ghost")).toBeUndefined();
  });

  it("does not match by transformer or text id", () => {
    const label = makeInfoLabel({
      transformer: { id: "shared-id", type: "InfoLabelTransformer" as const },
      tail: { id: "tail-unique", type: "InfoLabelTail" as const },
      label: { id: "shared-id", type: "InfoLabelText" as const },
    });
    const store = makeStore(new Set([label]));
    expect(store.getDataByTailId("shared-id")).toBeUndefined();
  });

  it("returns undefined when the store is empty", () => {
    expect(makeStore().getDataByTailId("any")).toBeUndefined();
  });
});

// ─── getDataByTextId ──────────────────────────────────────────────────────────

describe("getDataByTextId", () => {
  it("returns the entry whose text id matches", () => {
    const label = makeInfoLabel({
      label: { id: "text-77", type: "InfoLabelText" as const },
    });
    const store = makeStore(new Set([label]));
    expect(store.getDataByTextId("text-77")).toBe(label);
  });

  it("returns undefined when no entry has a matching text id", () => {
    const store = makeStore(new Set([makeInfoLabel()]));
    expect(store.getDataByTextId("missing")).toBeUndefined();
  });

  it("does not match by transformer or tail id", () => {
    const label = makeInfoLabel({
      transformer: { id: "shared-id", type: "InfoLabelTransformer" as const },
      tail: { id: "shared-id", type: "InfoLabelTail" as const },
      label: { id: "text-unique", type: "InfoLabelText" as const },
    });
    const store = makeStore(new Set([label]));
    expect(store.getDataByTextId("shared-id")).toBeUndefined();
  });

  it("returns undefined when the store is empty", () => {
    expect(makeStore().getDataByTextId("any")).toBeUndefined();
  });
});

// ─── getDataByOwnerId ─────────────────────────────────────────────────────────

describe("getDataByOwnerId", () => {
  it("returns the entry whose owner id matches", () => {
    const label = makeInfoLabel({
      owner: { id: "owner-55", type: "StackBook" as const },
    });
    const store = makeStore(new Set([label]));
    expect(store.getDataByOwnerId("owner-55")).toBe(label);
  });

  it("returns undefined when no entry has a matching owner id", () => {
    const store = makeStore(new Set([makeInfoLabel()]));
    expect(store.getDataByOwnerId("unknown-owner")).toBeUndefined();
  });

  it("returns undefined when the store is empty", () => {
    expect(makeStore().getDataByOwnerId("any")).toBeUndefined();
  });

  it("returns the first match when multiple entries share an owner id", () => {
    const first = makeInfoLabel({
      id: "label-a",
      owner: { id: "same-owner", type: "StackBook" as const },
    });
    const second = makeInfoLabel({
      id: "label-b",
      owner: { id: "same-owner", type: "StackBook" as const },
    });
    const store = makeStore(new Set([first, second]));
    // Set iteration order is insertion order
    expect(store.getDataByOwnerId("same-owner")).toBe(first);
  });
});
