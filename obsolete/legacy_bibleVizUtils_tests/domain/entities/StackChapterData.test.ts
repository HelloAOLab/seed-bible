import { StackChapterData } from "bibleVizUtils.domain.entities.StackChapterData";
import type {
  ActivityIndicator,
  ActivityNotification,
} from "bibleVizUtils.domain.models.canvas";
import {
  SelectionStates,
  SelectionEvents,
} from "bibleVizUtils.domain.models.selection";

// ─── factories ───────────────────────────────────────────────────────────────

const makeChapterPiece = (id = "cp1") => ({
  id,
  type: "StackChapter" as const,
});

const makeIndicator = (id = "i1", index = 0): ActivityIndicator => ({
  id,
  type: "ActivityIndicator",
  indicatorType: "regular",
  index,
});

const makeNotification = (id = "n1"): ActivityNotification => ({
  id,
  type: "ActivityNotification",
});

const makeChapter = (overrides: any = {}) =>
  new StackChapterData({
    id: "chapter-1",
    pieceInfo: { amountOfVerses: 31, number: 1 },
    parentDataIds: {} as any,
    isInsideBible: true,
    creationParams: { bookId: "gen" },
    ...overrides,
  });

// Advances a chapter (standardSelectionFSM) all the way to Selected state.
const selectChapter = (chapter: StackChapterData) => {
  chapter.changeSelectionState(SelectionEvents.RequestSelect); // Idle → Selecting
  chapter.changeSelectionState(SelectionEvents.SequenceComplete); // Selecting → Selected
};

// ─── tests ───────────────────────────────────────────────────────────────────

describe("StackChapterData", () => {
  // ─── constructor ─────────────────────────────────────────────────────────────

  describe("constructor", () => {
    it("defaults isInsideBook to true", () => {
      expect(makeChapter().isInsideBook).toBe(true);
    });

    it("stores isInsideBook=false when provided", () => {
      expect(makeChapter({ isInsideBook: false }).isInsideBook).toBe(false);
    });

    it("defaults isHidden to false", () => {
      expect(makeChapter().isHidden).toBe(false);
    });

    it("defaults selectionState to Idle", () => {
      expect(makeChapter().selectionState).toBe(SelectionStates.Idle);
    });

    it("when isSelected=true, advances selectionState to Selecting (standardSelectionFSM first step)", () => {
      expect(makeChapter({ isSelected: true }).selectionState).toBe(
        SelectionStates.Selecting
      );
    });

    it("defaults activityIndicators to an empty array", () => {
      expect(makeChapter().activityIndicators).toEqual([]);
    });

    it("stores initial activityIndicators from a provided Map", () => {
      const indicator = makeIndicator("i1");
      const map = new Map([["i1", indicator]]);
      expect(
        makeChapter({ activityIndicators: map }).activityIndicators
      ).toEqual([indicator]);
    });

    it("defaults activityNotification to undefined", () => {
      expect(makeChapter().activityNotification).toBeUndefined();
    });

    it("stores a provided activityNotification", () => {
      const notification = makeNotification();
      expect(
        makeChapter({ activityNotification: notification }).activityNotification
      ).toBe(notification);
    });

    it("defaults getIsSelectedForNotification to false when isExpanded is omitted", () => {
      expect(makeChapter().getIsSelectedForNotification()).toBe(false);
    });

    it("getIsSelectedForNotification returns true when isExpanded=true", () => {
      expect(
        makeChapter({ isExpanded: true }).getIsSelectedForNotification()
      ).toBe(true);
    });
  });

  // ─── isInsideBook ─────────────────────────────────────────────────────────────

  describe("isInsideBook / attachToBook / detachFromBook", () => {
    it("attachToBook sets isInsideBook to true", () => {
      const chapter = makeChapter({ isInsideBook: false });
      chapter.attachToBook();
      expect(chapter.isInsideBook).toBe(true);
    });

    it("detachFromBook sets isInsideBook to false", () => {
      const chapter = makeChapter();
      chapter.detachFromBook();
      expect(chapter.isInsideBook).toBe(false);
    });
  });

  // ─── isSelected ──────────────────────────────────────────────────────────────

  describe("isSelected", () => {
    it("returns false in Idle state", () => {
      expect(makeChapter().isSelected).toBe(false);
    });

    it("returns false in Selecting state (FSM mid-transition)", () => {
      const chapter = makeChapter();
      chapter.changeSelectionState(SelectionEvents.RequestSelect);
      expect(chapter.isSelected).toBe(false);
    });

    it("returns true only when selectionState reaches Selected", () => {
      const chapter = makeChapter();
      selectChapter(chapter);
      expect(chapter.isSelected).toBe(true);
    });

    it("returns false again after deselecting from Selected", () => {
      const chapter = makeChapter();
      selectChapter(chapter);
      chapter.changeSelectionState(SelectionEvents.RequestDeselect);
      expect(chapter.isSelected).toBe(false);
    });
  });

  // ─── getIsSelectedForNotification ────────────────────────────────────────────

  describe("getIsSelectedForNotification", () => {
    it("returns false when isExpanded was not provided", () => {
      expect(makeChapter().getIsSelectedForNotification()).toBe(false);
    });

    it("returns true when constructed with isExpanded=true", () => {
      expect(
        makeChapter({ isExpanded: true }).getIsSelectedForNotification()
      ).toBe(true);
    });
  });

  // ─── highlightInfo ────────────────────────────────────────────────────────────

  describe("addHighlightInfo / getHighlightInfoByKey", () => {
    it("getHighlightInfoByKey returns undefined when no highlight has been added", () => {
      expect(makeChapter().getHighlightInfoByKey("any-key")).toBeUndefined();
    });

    it("getHighlightInfoByKey returns the matching highlight info", () => {
      const chapter = makeChapter();
      const info = {
        key: "yellow",
        typeOfPiece: "StackBook" as any,
        color: "#ffff00" as any,
      };
      chapter.addHighlightInfo(info);
      expect(chapter.getHighlightInfoByKey("yellow")).toBe(info);
    });

    it("getHighlightInfoByKey returns undefined when key does not match any stored highlight", () => {
      const chapter = makeChapter();
      chapter.addHighlightInfo({
        key: "yellow",
        typeOfPiece: "StackBook" as any,
        color: "#ffff00" as any,
      });
      expect(chapter.getHighlightInfoByKey("blue")).toBeUndefined();
    });

    it("returns the first matching highlight when multiple highlights share a key", () => {
      const chapter = makeChapter();
      const first = {
        key: "yellow",
        typeOfPiece: "StackBook" as any,
        color: "#ffff00" as any,
      };
      const second = {
        key: "yellow",
        typeOfPiece: "StackChapter" as any,
        color: "#ffffaa" as any,
      };
      chapter.addHighlightInfo(first);
      chapter.addHighlightInfo(second);
      expect(chapter.getHighlightInfoByKey("yellow")).toBe(first);
    });

    it("accumulates multiple highlights added in sequence", () => {
      const chapter = makeChapter();
      chapter.addHighlightInfo({
        key: "a",
        typeOfPiece: "StackBook" as any,
        color: "#aaaaaa" as any,
      });
      chapter.addHighlightInfo({
        key: "b",
        typeOfPiece: "StackBook" as any,
        color: "#bbbbbb" as any,
      });
      expect(chapter.getHighlightInfoByKey("a")).toBeDefined();
      expect(chapter.getHighlightInfoByKey("b")).toBeDefined();
    });
  });

  // ─── resetData ───────────────────────────────────────────────────────────────

  describe("resetData", () => {
    it("sets isInsideBook to undefined", () => {
      const chapter = makeChapter({ isInsideBook: true });
      chapter.resetData();
      expect(chapter.isInsideBook).toBeUndefined();
    });

    it("resets selectionState to Idle", () => {
      const chapter = makeChapter();
      selectChapter(chapter);
      chapter.resetData();
      expect(chapter.selectionState).toBe(SelectionStates.Idle);
    });

    it("sets isActive to false", () => {
      const chapter = makeChapter({ isActive: true });
      chapter.resetData();
      expect(chapter.isActive).toBe(false);
    });

    it("clears the attached piece", () => {
      const piece = makeChapterPiece();
      const chapter = makeChapter({ piece });
      chapter.resetData();
      expect(chapter.isPieceAvailable()).toBe(false);
    });
  });

  // ─── resetHierarchy ──────────────────────────────────────────────────────────

  describe("resetHierarchy", () => {
    it("returns an empty array (chapters never yield releasable pieces through resetHierarchy)", () => {
      expect(makeChapter().resetHierarchy()).toEqual([]);
    });

    it("makes the chapter visible (show) after being hidden", () => {
      const chapter = makeChapter({ isHidden: true });
      chapter.resetHierarchy();
      expect(chapter.isHidden).toBe(false);
    });

    it("does not release the piece — piece remains available after resetHierarchy", () => {
      const piece = makeChapterPiece();
      const chapter = makeChapter({ piece });
      chapter.resetHierarchy();
      expect(chapter.isPieceAvailable()).toBe(true);
    });

    it("does not call resetData — isInsideBook remains after resetHierarchy", () => {
      const chapter = makeChapter({ isInsideBook: false });
      chapter.resetHierarchy();
      expect(chapter.isInsideBook).toBe(false);
    });

    it("does not reset selectionState — FSM state remains after resetHierarchy", () => {
      const chapter = makeChapter();
      selectChapter(chapter);
      chapter.resetHierarchy();
      expect(chapter.selectionState).toBe(SelectionStates.Selected);
    });
  });

  // ─── activityIndicators ──────────────────────────────────────────────────────

  describe("activityIndicators getter", () => {
    it("returns an empty array when no indicators are registered", () => {
      expect(makeChapter().activityIndicators).toEqual([]);
    });

    it("returns all registered indicators as an array", () => {
      const i1 = makeIndicator("i1", 0);
      const i2 = makeIndicator("i2", 1);
      const map = new Map([
        ["i1", i1],
        ["i2", i2],
      ]);
      expect(
        makeChapter({ activityIndicators: map }).activityIndicators
      ).toEqual([i1, i2]);
    });

    it("returns a shallow copy — mutations do not affect internal state", () => {
      const i1 = makeIndicator("i1");
      const chapter = makeChapter({
        activityIndicators: new Map([["i1", i1]]),
      });
      const snapshot = chapter.activityIndicators;
      snapshot.push(makeIndicator("i2"));
      expect(chapter.activityIndicators).toHaveLength(1);
    });
  });

  // ─── clearActivityIndicators ─────────────────────────────────────────────────

  describe("clearActivityIndicators", () => {
    it("returns the indicators that were present and clears the map", () => {
      const i1 = makeIndicator("i1");
      const chapter = makeChapter({
        activityIndicators: new Map([["i1", i1]]),
      });
      const result = chapter.clearActivityIndicators();
      expect(result).toEqual([i1]);
      expect(chapter.activityIndicators).toEqual([]);
    });

    it("returns undefined (not an empty array) when no indicators are registered", () => {
      expect(makeChapter().clearActivityIndicators()).toBeUndefined();
    });

    it("returns undefined on a second call after already clearing", () => {
      const chapter = makeChapter({
        activityIndicators: new Map([["i1", makeIndicator("i1")]]),
      });
      chapter.clearActivityIndicators();
      expect(chapter.clearActivityIndicators()).toBeUndefined();
    });
  });

  // ─── addActivityIndicator ────────────────────────────────────────────────────

  describe("addActivityIndicator", () => {
    it("does NOT add a new indicator when the id is not already in the map", () => {
      const chapter = makeChapter(); // empty map
      const indicator = makeIndicator("i1");
      chapter.addActivityIndicator(indicator);
      expect(chapter.activityIndicators).toEqual([indicator]);
    });

    it("updates an existing indicator when the id is already in the map", () => {
      const original = makeIndicator("i1", 0);
      const updated = { ...original, index: 99 };
      const chapter = makeChapter({
        activityIndicators: new Map([["i1", original]]),
      });
      chapter.addActivityIndicator(updated);
      expect(chapter.activityIndicators[0]).toBe(original);
    });

    it("does not affect other indicators when updating one", () => {
      const i1 = makeIndicator("i1", 0);
      const i2 = makeIndicator("i2", 1);
      const chapter = makeChapter({
        activityIndicators: new Map([
          ["i1", i1],
          ["i2", i2],
        ]),
      });
      chapter.addActivityIndicator({ ...i1, index: 99 });
      expect(chapter.activityIndicators.find((i) => i.id === "i2")).toBe(i2);
    });
  });

  // ─── removeActivityIndicator ─────────────────────────────────────────────────

  describe("removeActivityIndicator", () => {
    it("removes the indicator with the given id", () => {
      const chapter = makeChapter({
        activityIndicators: new Map([["i1", makeIndicator("i1")]]),
      });
      chapter.removeActivityIndicator("i1");
      expect(chapter.activityIndicators).toEqual([]);
    });

    it("is a no-op when the id does not exist in the map", () => {
      const i1 = makeIndicator("i1");
      const chapter = makeChapter({
        activityIndicators: new Map([["i1", i1]]),
      });
      chapter.removeActivityIndicator("nonexistent");
      expect(chapter.activityIndicators).toEqual([i1]);
    });
  });

  // ─── activityNotification ────────────────────────────────────────────────────

  describe("activityNotification getter", () => {
    it("returns undefined when no notification is attached", () => {
      expect(makeChapter().activityNotification).toBeUndefined();
    });

    it("returns the attached notification", () => {
      const notification = makeNotification();
      expect(
        makeChapter({ activityNotification: notification }).activityNotification
      ).toBe(notification);
    });
  });

  // ─── attachActivityNotification ──────────────────────────────────────────────

  describe("attachActivityNotification", () => {
    it("stores the notification when none is currently attached", () => {
      const chapter = makeChapter();
      const notification = makeNotification();
      chapter.attachActivityNotification(notification);
      expect(chapter.activityNotification).toBe(notification);
    });

    it("does not replace an existing notification", () => {
      const first = makeNotification("n1");
      const second = makeNotification("n2");
      const chapter = makeChapter({ activityNotification: first });
      chapter.attachActivityNotification(second);
      expect(chapter.activityNotification).toBe(first);
    });
  });

  // ─── detachActivityNotification ──────────────────────────────────────────────

  describe("detachActivityNotification", () => {
    it("returns the notification and clears it when one is attached", () => {
      const notification = makeNotification();
      const chapter = makeChapter({ activityNotification: notification });
      const result = chapter.detachActivityNotification();
      expect(result).toBe(notification);
      expect(chapter.activityNotification).toBeUndefined();
    });

    it("returns undefined when no notification is attached", () => {
      expect(makeChapter().detachActivityNotification()).toBeUndefined();
    });

    it("returns undefined on a second call after already detaching", () => {
      const chapter = makeChapter({ activityNotification: makeNotification() });
      chapter.detachActivityNotification();
      expect(chapter.detachActivityNotification()).toBeUndefined();
    });
  });
});
