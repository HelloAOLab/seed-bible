import { InfoLabelData } from "bibleVizUtils.domain.entities.InfoLabelData";
import { LabelPosition } from "bibleVizUtils.domain.models.label";
import type { ActivityIndicator } from "bibleVizUtils.domain.models.canvas";

// ─── factories ───────────────────────────────────────────────────────────────

const makeTransformer = (id = "t1") => ({
  id,
  type: "InfoLabelTransformer" as const,
});
const makeTail = (id = "tail1") => ({ id, type: "InfoLabelTail" as const });
const makeLabel = (id = "label1") => ({ id, type: "InfoLabelText" as const });
const makeDate = (id = "date1") => ({ id, type: "InfoLabelDate" as const });
const makeOwner = (id = "owner1") => ({ id, type: "StackBook" as const });

const makeIndicator = (id = "i1", index = 0): ActivityIndicator => ({
  id,
  type: "ActivityIndicator",
  indicatorType: "regular",
  index,
});

const makeInfoLabel = (overrides: any = {}) =>
  new InfoLabelData({
    id: "label-1",
    transformer: makeTransformer(),
    tail: makeTail(),
    label: makeLabel(),
    owner: makeOwner(),
    positioning: LabelPosition.RightSided,
    ...overrides,
  });

// ─── tests ───────────────────────────────────────────────────────────────────

describe("InfoLabelData", () => {
  // ─── constructor ─────────────────────────────────────────────────────────────

  describe("constructor", () => {
    it("stores the id", () => {
      expect(makeInfoLabel({ id: "label-42" }).id).toBe("label-42");
    });

    it("stores the transformer by reference", () => {
      const transformer = makeTransformer("t-custom");
      expect(makeInfoLabel({ transformer }).transformer).toBe(transformer);
    });

    it("stores the tail by reference", () => {
      const tail = makeTail("tail-custom");
      expect(makeInfoLabel({ tail }).tail).toBe(tail);
    });

    it("stores the label by reference", () => {
      const label = makeLabel("label-custom");
      expect(makeInfoLabel({ label }).label).toBe(label);
    });

    it("stores the owner by reference", () => {
      const owner = makeOwner("owner-custom");
      expect(makeInfoLabel({ owner }).owner).toBe(owner);
    });

    it("stores the positioning", () => {
      expect(
        makeInfoLabel({ positioning: LabelPosition.LeftSided }).positioning
      ).toBe(LabelPosition.LeftSided);
    });

    it("defaults date to undefined", () => {
      expect(makeInfoLabel().date).toBeUndefined();
    });

    it("stores a provided date by reference", () => {
      const date = makeDate();
      expect(makeInfoLabel({ date }).date).toBe(date);
    });

    it("defaults activityIndicators to an empty array", () => {
      expect(makeInfoLabel().activityIndicators).toEqual([]);
    });

    it("stores initial activityIndicators from a provided Map", () => {
      const indicator = makeIndicator("i1");
      const map = new Map([["i1", indicator]]);
      expect(
        makeInfoLabel({ activityIndicators: map }).activityIndicators
      ).toEqual([indicator]);
    });

    it("defaults isHiding to false", () => {
      expect(makeInfoLabel().isHiding).toBe(false);
    });
  });

  // ─── getTransformerProperty ───────────────────────────────────────────────────

  describe("getTransformerProperty", () => {
    it("returns the value for 'id'", () => {
      const transformer = makeTransformer("t-42");
      expect(makeInfoLabel({ transformer }).getTransformerProperty("id")).toBe(
        "t-42"
      );
    });

    it("returns the value for 'type'", () => {
      expect(makeInfoLabel().getTransformerProperty("type")).toBe(
        "InfoLabelTransformer"
      );
    });
  });

  // ─── getTailProperty ──────────────────────────────────────────────────────────

  describe("getTailProperty", () => {
    it("returns the value for 'id'", () => {
      const tail = makeTail("tail-42");
      expect(makeInfoLabel({ tail }).getTailProperty("id")).toBe("tail-42");
    });

    it("returns the value for 'type'", () => {
      expect(makeInfoLabel().getTailProperty("type")).toBe("InfoLabelTail");
    });
  });

  // ─── getTextProperty ──────────────────────────────────────────────────────────

  describe("getTextProperty", () => {
    it("returns the value for 'id'", () => {
      const label = makeLabel("text-42");
      expect(makeInfoLabel({ label }).getTextProperty("id")).toBe("text-42");
    });

    it("returns the value for 'type'", () => {
      expect(makeInfoLabel().getTextProperty("type")).toBe("InfoLabelText");
    });
  });

  // ─── getOwnerProperty ─────────────────────────────────────────────────────────

  describe("getOwnerProperty", () => {
    it("returns the value for 'id'", () => {
      const owner = makeOwner("owner-42");
      expect(makeInfoLabel({ owner }).getOwnerProperty("id")).toBe("owner-42");
    });

    it("returns the value for 'type'", () => {
      expect(makeInfoLabel().getOwnerProperty("type")).toBe("StackBook");
    });
  });

  // ─── date / clearDate ─────────────────────────────────────────────────────────

  describe("date / clearDate", () => {
    it("clearDate returns the date and sets it to undefined", () => {
      const date = makeDate();
      const infoLabel = makeInfoLabel({ date });
      const result = infoLabel.clearDate();
      expect(result).toBe(date);
      expect(infoLabel.date).toBeUndefined();
    });

    it("clearDate returns undefined when no date is set", () => {
      expect(makeInfoLabel().clearDate()).toBeUndefined();
    });

    it("clearDate returns undefined on a second call after already clearing", () => {
      const infoLabel = makeInfoLabel({ date: makeDate() });
      infoLabel.clearDate();
      expect(infoLabel.clearDate()).toBeUndefined();
    });
  });

  // ─── positioning / changePositioning ─────────────────────────────────────────

  describe("positioning / changePositioning", () => {
    it("changePositioning updates the positioning", () => {
      const infoLabel = makeInfoLabel({
        positioning: LabelPosition.RightSided,
      });
      infoLabel.changePositioning(LabelPosition.LeftSided);
      expect(infoLabel.positioning).toBe(LabelPosition.LeftSided);
    });

    it("changePositioning overwrites a previous value", () => {
      const infoLabel = makeInfoLabel({ positioning: LabelPosition.Top });
      infoLabel.changePositioning(LabelPosition.RightSidedCorner);
      expect(infoLabel.positioning).toBe(LabelPosition.RightSidedCorner);
    });
  });

  // ─── isHiding / beginHiding / endHiding ──────────────────────────────────────

  describe("isHiding / beginHiding / endHiding", () => {
    it("beginHiding sets isHiding to true", () => {
      const infoLabel = makeInfoLabel();
      infoLabel.beginHiding();
      expect(infoLabel.isHiding).toBe(true);
    });

    it("endHiding sets isHiding to false", () => {
      const infoLabel = makeInfoLabel();
      infoLabel.beginHiding();
      infoLabel.endHiding();
      expect(infoLabel.isHiding).toBe(false);
    });

    it("endHiding is idempotent when already false", () => {
      const infoLabel = makeInfoLabel();
      infoLabel.endHiding();
      expect(infoLabel.isHiding).toBe(false);
    });
  });

  // ─── activityIndicators ──────────────────────────────────────────────────────

  describe("activityIndicators", () => {
    it("returns an empty array when no indicators are registered", () => {
      expect(makeInfoLabel().activityIndicators).toEqual([]);
    });

    it("returns all registered indicators as an array", () => {
      const i1 = makeIndicator("i1", 0);
      const i2 = makeIndicator("i2", 1);
      const map = new Map([
        ["i1", i1],
        ["i2", i2],
      ]);
      expect(
        makeInfoLabel({ activityIndicators: map }).activityIndicators
      ).toEqual([i1, i2]);
    });

    it("returns a shallow copy — mutations do not affect internal state", () => {
      const i1 = makeIndicator("i1");
      const infoLabel = makeInfoLabel({
        activityIndicators: new Map([["i1", i1]]),
      });
      const snapshot = infoLabel.activityIndicators;
      snapshot.push(makeIndicator("i2"));
      expect(infoLabel.activityIndicators).toHaveLength(1);
    });

    it("clearActivityIndicators returns the indicators and clears the map", () => {
      const i1 = makeIndicator("i1");
      const infoLabel = makeInfoLabel({
        activityIndicators: new Map([["i1", i1]]),
      });
      const result = infoLabel.clearActivityIndicators();
      expect(result).toEqual([i1]);
      expect(infoLabel.activityIndicators).toEqual([]);
    });

    it("clearActivityIndicators returns undefined when no indicators are registered", () => {
      expect(makeInfoLabel().clearActivityIndicators()).toBeUndefined();
    });

    it("clearActivityIndicators returns undefined on a second call after already clearing", () => {
      const infoLabel = makeInfoLabel({
        activityIndicators: new Map([["i1", makeIndicator("i1")]]),
      });
      infoLabel.clearActivityIndicators();
      expect(infoLabel.clearActivityIndicators()).toBeUndefined();
    });

    it("addActivityIndicator does NOT add a new indicator when the id is not already in the map", () => {
      const infoLabel = makeInfoLabel();
      infoLabel.addActivityIndicator(makeIndicator("i1"));
      expect(infoLabel.activityIndicators).toEqual([]);
    });

    it("addActivityIndicator updates an existing indicator when the id is already in the map", () => {
      const original = makeIndicator("i1", 0);
      const updated = { ...original, index: 99 };
      const infoLabel = makeInfoLabel({
        activityIndicators: new Map([["i1", original]]),
      });
      infoLabel.addActivityIndicator(updated);
      expect(infoLabel.activityIndicators[0]).toEqual(updated);
    });

    it("removeActivityIndicator removes the indicator with the given id", () => {
      const infoLabel = makeInfoLabel({
        activityIndicators: new Map([["i1", makeIndicator("i1")]]),
      });
      infoLabel.removeActivityIndicator("i1");
      expect(infoLabel.activityIndicators).toEqual([]);
    });

    it("removeActivityIndicator is a no-op when the id does not exist in the map", () => {
      const i1 = makeIndicator("i1");
      const infoLabel = makeInfoLabel({
        activityIndicators: new Map([["i1", i1]]),
      });
      infoLabel.removeActivityIndicator("nonexistent");
      expect(infoLabel.activityIndicators).toEqual([i1]);
    });
  });
});
