import { LayoutChapterData } from "bibleVizUtils.domain.entities.LayoutChapterData";
import type {
  ActivityIndicator,
  ActivityNotification,
} from "bibleVizUtils.domain.models.canvas";
import {
  HighlightStates,
  HighlightEvents,
} from "bibleVizUtils.domain.models.highlight";
import {
  SelectionStates,
  SelectionEvents,
} from "bibleVizUtils.domain.models.selection";

// ─── factories ───────────────────────────────────────────────────────────────

const makePiece = (id = "p1") => ({ id, type: "LayoutChapter" as const });

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

const makeParentIds = (partial: any = {}) => ({
  stackBibleId: undefined,
  stackTestamentId: undefined,
  stackSectionId: undefined,
  stackBookId: undefined,
  stackSectionBookId: undefined,
  layoutId: undefined,
  layoutBookId: undefined,
  ...partial,
});

const makeChapter = (overrides: any = {}) =>
  new LayoutChapterData({
    id: "chapter-1",
    pieceInfo: { amountOfVerses: 31, number: 1 },
    parentDataIds: makeParentIds(),
    originalLayoutId: undefined,
    creationParams: { bookId: "gen" },
    ...overrides,
  });

// ─── tests ───────────────────────────────────────────────────────────────────

describe("LayoutChapterData", () => {
  // ─── constructor ─────────────────────────────────────────────────────────────

  describe("constructor", () => {
    it("stores the id", () => {
      expect(makeChapter({ id: "ch-42" }).id).toBe("ch-42");
    });

    it("stores pieceInfo", () => {
      const info = { amountOfVerses: 10, number: 3 };
      expect(makeChapter({ pieceInfo: info }).pieceInfo).toEqual(info);
    });

    it("stores parentDataIds", () => {
      const ids = makeParentIds({ layoutId: "layout-1" });
      expect(makeChapter({ parentDataIds: ids }).parentDataIds).toBe(ids);
    });

    it("stores originalLayoutId", () => {
      expect(makeChapter({ originalLayoutId: "orig-1" }).originalLayoutId).toBe(
        "orig-1"
      );
    });

    it("defaults isActive to false", () => {
      expect(makeChapter().isActive).toBe(false);
    });

    it("stores isActive=true when provided", () => {
      expect(makeChapter({ isActive: true }).isActive).toBe(true);
    });

    it("defaults highlightColor to undefined", () => {
      expect(makeChapter().highlightColor).toBeUndefined();
    });

    it("defaults selectionState to Idle", () => {
      expect(makeChapter().selectionState).toBe(SelectionStates.Idle);
    });

    it("defaults highlightState to Idle", () => {
      expect(makeChapter().highlightState).toBe(HighlightStates.Idle);
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

    it("defaults getIsSelectedForNotification to false when isExpanded is omitted", () => {
      expect(makeChapter().getIsSelectedForNotification()).toBe(false);
    });

    it("getIsSelectedForNotification returns true when isExpanded=true", () => {
      expect(
        makeChapter({ isExpanded: true }).getIsSelectedForNotification()
      ).toBe(true);
    });
  });

  // ─── isActive / activate / deactivate ────────────────────────────────────────

  describe("isActive / activate / deactivate", () => {
    it("activate sets isActive to true", () => {
      const chapter = makeChapter();
      chapter.activate();
      expect(chapter.isActive).toBe(true);
    });

    it("deactivate sets isActive to false", () => {
      const chapter = makeChapter({ isActive: true });
      chapter.deactivate();
      expect(chapter.isActive).toBe(false);
    });
  });

  // ─── piece / clearPiece / setPiece ───────────────────────────────────────────

  describe("piece / clearPiece / setPiece", () => {
    it("piece getter returns the stored piece", () => {
      const piece = makePiece();
      expect(makeChapter({ piece }).piece).toBe(piece);
    });

    it("piece getter returns undefined when no piece is set", () => {
      expect(makeChapter().piece).toBeUndefined();
    });

    it("setPiece stores the piece", () => {
      const chapter = makeChapter();
      const piece = makePiece();
      chapter.setPiece(piece as any);
      expect(chapter.piece).toBe(piece);
    });

    it("clearPiece returns the piece and sets it to undefined", () => {
      const piece = makePiece();
      const chapter = makeChapter({ piece });
      expect(chapter.clearPiece()).toBe(piece);
      expect(chapter.piece).toBeUndefined();
    });

    it("clearPiece returns undefined when no piece is set", () => {
      expect(makeChapter().clearPiece()).toBeUndefined();
    });

    it("setPiece overwrites a previous piece", () => {
      const p1 = makePiece("p1");
      const p2 = makePiece("p2");
      const chapter = makeChapter({ piece: p1 });
      chapter.setPiece(p2 as any);
      expect(chapter.piece).toBe(p2);
    });
  });

  // ─── highlightColor ───────────────────────────────────────────────────────────

  describe("highlightColor / changeHighlightColor", () => {
    it("changeHighlightColor stores the new color", () => {
      const chapter = makeChapter();
      chapter.changeHighlightColor("#ff0000" as any);
      expect(chapter.highlightColor).toBe("#ff0000");
    });

    it("changeHighlightColor overwrites the previous color", () => {
      const chapter = makeChapter({ highlightColor: "#ff0000" as any });
      chapter.changeHighlightColor("#00ff00" as any);
      expect(chapter.highlightColor).toBe("#00ff00");
    });
  });

  // ─── parentDataIds / clearParentId / clearParentIds ──────────────────────────

  describe("parentDataIds / clearParentId / clearParentIds", () => {
    it("clearParentId sets the given key to undefined", () => {
      const chapter = makeChapter({
        parentDataIds: makeParentIds({ layoutId: "layout-1" }),
      });
      chapter.clearParentId("layoutId");
      expect(chapter.parentDataIds.layoutId).toBeUndefined();
    });

    it("clearParentId does not affect other keys", () => {
      const chapter = makeChapter({
        parentDataIds: makeParentIds({
          layoutId: "layout-1",
          stackBibleId: "bible-1",
        }),
      });
      chapter.clearParentId("layoutId");
      expect(chapter.parentDataIds.stackBibleId).toBe("bible-1");
    });

    it("clearParentIds clears all provided keys", () => {
      const chapter = makeChapter({
        parentDataIds: makeParentIds({
          layoutId: "layout-1",
          layoutBookId: "book-1",
        }),
      });
      chapter.clearParentIds(["layoutId", "layoutBookId"]);
      expect(chapter.parentDataIds.layoutId).toBeUndefined();
      expect(chapter.parentDataIds.layoutBookId).toBeUndefined();
    });

    it("clearParentIds does not affect keys not in the list", () => {
      const chapter = makeChapter({
        parentDataIds: makeParentIds({
          layoutId: "layout-1",
          stackBibleId: "bible-1",
        }),
      });
      chapter.clearParentIds(["layoutId"]);
      expect(chapter.parentDataIds.stackBibleId).toBe("bible-1");
    });
  });

  // ─── getPieceInfoProperty / getCreationParam ──────────────────────────────────

  describe("getPieceInfoProperty / getCreationParam", () => {
    it("getPieceInfoProperty returns the value for a given key", () => {
      const chapter = makeChapter({
        pieceInfo: { amountOfVerses: 40, number: 5 },
      });
      expect(chapter.getPieceInfoProperty("amountOfVerses")).toBe(40);
    });

    it("getPieceInfoProperty returns the correct value for another key", () => {
      const chapter = makeChapter({
        pieceInfo: { amountOfVerses: 10, number: 3 },
      });
      expect(chapter.getPieceInfoProperty("number")).toBe(3);
    });

    it("getCreationParam returns the value for a given key", () => {
      const chapter = makeChapter({ creationParams: { bookId: "exo" } });
      expect(chapter.getCreationParam("bookId")).toBe("exo");
    });
  });

  // ─── selection FSM (simpleSelectionFSM) ──────────────────────────────────────

  describe("selection FSM", () => {
    it("selectionState starts at Idle", () => {
      expect(makeChapter().selectionState).toBe(SelectionStates.Idle);
    });

    it("changeSelectionState returns true and transitions Idle → Selected on RequestSelect", () => {
      const chapter = makeChapter();
      expect(chapter.changeSelectionState(SelectionEvents.RequestSelect)).toBe(
        true
      );
      expect(chapter.selectionState).toBe(SelectionStates.Selected);
    });

    it("changeSelectionState returns true and transitions Selected → Idle on RequestDeselect", () => {
      const chapter = makeChapter();
      chapter.changeSelectionState(SelectionEvents.RequestSelect);
      expect(
        chapter.changeSelectionState(SelectionEvents.RequestDeselect)
      ).toBe(true);
      expect(chapter.selectionState).toBe(SelectionStates.Idle);
    });

    it("changeSelectionState returns false for an invalid transition (Idle + RequestDeselect)", () => {
      const chapter = makeChapter();
      expect(
        chapter.changeSelectionState(SelectionEvents.RequestDeselect)
      ).toBe(false);
      expect(chapter.selectionState).toBe(SelectionStates.Idle);
    });

    it("changeSelectionState returns false for an invalid transition (Idle + SequenceComplete)", () => {
      const chapter = makeChapter();
      expect(
        chapter.changeSelectionState(SelectionEvents.SequenceComplete)
      ).toBe(false);
    });

    it("isSelected returns false in Idle state", () => {
      expect(makeChapter().isSelected).toBe(false);
    });

    it("isSelected returns true in Selected state", () => {
      const chapter = makeChapter();
      chapter.changeSelectionState(SelectionEvents.RequestSelect);
      expect(chapter.isSelected).toBe(true);
    });

    it("select() is a shorthand for RequestSelect", () => {
      const chapter = makeChapter();
      chapter.select();
      expect(chapter.selectionState).toBe(SelectionStates.Selected);
    });

    it("deselect() is a shorthand for RequestDeselect", () => {
      const chapter = makeChapter();
      chapter.select();
      chapter.deselect();
      expect(chapter.selectionState).toBe(SelectionStates.Idle);
    });

    it("resetSelectionState always returns state to Idle", () => {
      const chapter = makeChapter();
      chapter.select();
      chapter.resetSelectionState();
      expect(chapter.selectionState).toBe(SelectionStates.Idle);
    });
  });

  // ─── highlight FSM ────────────────────────────────────────────────────────────

  describe("highlight FSM", () => {
    it("highlightState starts at Idle", () => {
      expect(makeChapter().highlightState).toBe(HighlightStates.Idle);
    });

    it("transitions Idle → Highlighting on RequestHighlight and returns true", () => {
      const chapter = makeChapter();
      expect(
        chapter.changeHighlightState(HighlightEvents.RequestHighlight)
      ).toBe(true);
      expect(chapter.highlightState).toBe(HighlightStates.Highlighting);
    });

    it("transitions Highlighting → Highlighted on SequenceComplete", () => {
      const chapter = makeChapter();
      chapter.changeHighlightState(HighlightEvents.RequestHighlight);
      chapter.changeHighlightState(HighlightEvents.SequenceComplete);
      expect(chapter.highlightState).toBe(HighlightStates.Highlighted);
    });

    it("transitions Highlighted → Unhighlighting on RequestUnhighlight", () => {
      const chapter = makeChapter();
      chapter.changeHighlightState(HighlightEvents.RequestHighlight);
      chapter.changeHighlightState(HighlightEvents.SequenceComplete);
      chapter.changeHighlightState(HighlightEvents.RequestUnhighlight);
      expect(chapter.highlightState).toBe(HighlightStates.Unhighlighting);
    });

    it("transitions Unhighlighting → Idle on SequenceComplete", () => {
      const chapter = makeChapter();
      chapter.changeHighlightState(HighlightEvents.RequestHighlight);
      chapter.changeHighlightState(HighlightEvents.SequenceComplete);
      chapter.changeHighlightState(HighlightEvents.RequestUnhighlight);
      chapter.changeHighlightState(HighlightEvents.SequenceComplete);
      expect(chapter.highlightState).toBe(HighlightStates.Idle);
    });

    it("transitions Highlighting → Unhighlighting on RequestUnhighlight (cancel arc)", () => {
      const chapter = makeChapter();
      chapter.changeHighlightState(HighlightEvents.RequestHighlight);
      chapter.changeHighlightState(HighlightEvents.RequestUnhighlight);
      expect(chapter.highlightState).toBe(HighlightStates.Unhighlighting);
    });

    it("transitions Unhighlighting → Highlighting on RequestHighlight (re-request arc)", () => {
      const chapter = makeChapter();
      chapter.changeHighlightState(HighlightEvents.RequestHighlight);
      chapter.changeHighlightState(HighlightEvents.RequestUnhighlight);
      chapter.changeHighlightState(HighlightEvents.RequestHighlight);
      expect(chapter.highlightState).toBe(HighlightStates.Highlighting);
    });

    it("returns false for an invalid transition (Idle + SequenceComplete)", () => {
      const chapter = makeChapter();
      expect(
        chapter.changeHighlightState(HighlightEvents.SequenceComplete)
      ).toBe(false);
      expect(chapter.highlightState).toBe(HighlightStates.Idle);
    });

    it("returns false for an invalid transition (Highlighted + RequestHighlight)", () => {
      const chapter = makeChapter();
      chapter.changeHighlightState(HighlightEvents.RequestHighlight);
      chapter.changeHighlightState(HighlightEvents.SequenceComplete);
      expect(
        chapter.changeHighlightState(HighlightEvents.RequestHighlight)
      ).toBe(false);
    });
  });

  // ─── addHighlightInfo / getHighlightInfoByKey ────────────────────────────────

  describe("addHighlightInfo / getHighlightInfoByKey", () => {
    it("getHighlightInfoByKey returns undefined when no highlight has been added", () => {
      expect(makeChapter().getHighlightInfoByKey("any-key")).toBeUndefined();
    });

    it("returns the matching highlight info by key", () => {
      const chapter = makeChapter();
      const info = {
        key: "yellow",
        typeOfPiece: "LayoutChapter" as any,
        color: "#ffff00" as any,
      };
      chapter.addHighlightInfo(info);
      expect(chapter.getHighlightInfoByKey("yellow")).toBe(info);
    });

    it("returns undefined when key does not match any stored highlight", () => {
      const chapter = makeChapter();
      chapter.addHighlightInfo({
        key: "yellow",
        typeOfPiece: "LayoutChapter" as any,
        color: "#ffff00" as any,
      });
      expect(chapter.getHighlightInfoByKey("blue")).toBeUndefined();
    });

    it("returns the first match when multiple highlights share a key", () => {
      const chapter = makeChapter();
      const first = {
        key: "yellow",
        typeOfPiece: "LayoutChapter" as any,
        color: "#ffff00" as any,
      };
      const second = {
        key: "yellow",
        typeOfPiece: "LayoutChapter" as any,
        color: "#ffffaa" as any,
      };
      chapter.addHighlightInfo(first);
      chapter.addHighlightInfo(second);
      expect(chapter.getHighlightInfoByKey("yellow")).toBe(first);
    });
  });

  // ─── addEntryItem ─────────────────────────────────────────────────────────────

  describe("addEntryItem", () => {
    it("added entry items are returned by resetData", () => {
      const chapter = makeChapter();
      const item = makePiece("entry-1");
      chapter.addEntryItem(item as any);
      expect(chapter.resetData()).toContain(item);
    });

    it("accumulates multiple entry items in insertion order", () => {
      const chapter = makeChapter();
      const item1 = makePiece("e1");
      const item2 = makePiece("e2");
      chapter.addEntryItem(item1 as any);
      chapter.addEntryItem(item2 as any);
      const released = chapter.resetData();
      expect(released).toContain(item1);
      expect(released).toContain(item2);
    });
  });

  // ─── resetData ───────────────────────────────────────────────────────────────

  describe("resetData", () => {
    it("returns an empty array when no pieces or entry items are set", () => {
      expect(makeChapter().resetData()).toEqual([]);
    });

    it("returns the piece when one was set", () => {
      const piece = makePiece();
      const chapter = makeChapter({ piece });
      expect(chapter.resetData()).toContain(piece);
    });

    it("clears the piece — piece is undefined after resetData", () => {
      const piece = makePiece();
      const chapter = makeChapter({ piece });
      chapter.resetData();
      expect(chapter.piece).toBeUndefined();
    });

    it("returns playlist entry items that were added", () => {
      const chapter = makeChapter();
      const item = makePiece("entry-1");
      chapter.addEntryItem(item as any);
      expect(chapter.resetData()).toContain(item);
    });

    it("returns both the piece and entry items together", () => {
      const piece = makePiece("main");
      const item = makePiece("entry-1");
      const chapter = makeChapter({ piece });
      chapter.addEntryItem(item as any);
      const released = chapter.resetData();
      expect(released).toContain(piece);
      expect(released).toContain(item);
    });

    it("clears playlist entry items — not returned on a second resetData call", () => {
      const item = makePiece("entry-1");
      const chapter = makeChapter();
      chapter.addEntryItem(item as any);
      chapter.resetData();
      expect(chapter.resetData()).toEqual([]);
    });

    it("deactivates the chapter", () => {
      const chapter = makeChapter({ isActive: true });
      chapter.resetData();
      expect(chapter.isActive).toBe(false);
    });

    it("resets selectionState to Idle", () => {
      const chapter = makeChapter();
      chapter.select();
      chapter.resetData();
      expect(chapter.selectionState).toBe(SelectionStates.Idle);
    });

    it("clears highlight info — getHighlightInfoByKey returns undefined after resetData", () => {
      const chapter = makeChapter();
      chapter.addHighlightInfo({
        key: "k",
        typeOfPiece: "LayoutChapter" as any,
        color: "#ff0000" as any,
      });
      chapter.resetData();
      expect(chapter.getHighlightInfoByKey("k")).toBeUndefined();
    });
  });

  // ─── activityIndicators ──────────────────────────────────────────────────────

  describe("activityIndicators", () => {
    it("returns an empty array when no indicators are registered", () => {
      expect(makeChapter().activityIndicators).toEqual([]);
    });

    it("returns all registered indicators as an array", () => {
      const i1 = makeIndicator("i1", 0);
      const i2 = makeIndicator("i2", 1);
      const chapter = makeChapter({
        activityIndicators: new Map([
          ["i1", i1],
          ["i2", i2],
        ]),
      });
      expect(chapter.activityIndicators).toEqual([i1, i2]);
    });

    it("clearActivityIndicators returns the indicators and clears the map", () => {
      const i1 = makeIndicator("i1");
      const chapter = makeChapter({
        activityIndicators: new Map([["i1", i1]]),
      });
      expect(chapter.clearActivityIndicators()).toEqual([i1]);
      expect(chapter.activityIndicators).toEqual([]);
    });

    it("clearActivityIndicators returns undefined when map is empty", () => {
      expect(makeChapter().clearActivityIndicators()).toBeUndefined();
    });

    it("addActivityIndicator does NOT add a new indicator when the id is not in the map", () => {
      const chapter = makeChapter();
      chapter.addActivityIndicator(makeIndicator("i1"));
      expect(chapter.activityIndicators).toEqual([]);
    });

    it("addActivityIndicator updates an existing indicator when the id is already in the map", () => {
      const original = makeIndicator("i1", 0);
      const updated = { ...original, index: 99 };
      const chapter = makeChapter({
        activityIndicators: new Map([["i1", original]]),
      });
      chapter.addActivityIndicator(updated);
      expect(chapter.activityIndicators[0]).toBe(updated);
    });

    it("removeActivityIndicator removes the indicator with the given id", () => {
      const chapter = makeChapter({
        activityIndicators: new Map([["i1", makeIndicator("i1")]]),
      });
      chapter.removeActivityIndicator("i1");
      expect(chapter.activityIndicators).toEqual([]);
    });
  });

  // ─── activityNotification ────────────────────────────────────────────────────

  describe("activityNotification", () => {
    it("attachActivityNotification stores the notification when none is set", () => {
      const chapter = makeChapter();
      const notification = makeNotification();
      chapter.attachActivityNotification(notification);
      expect(chapter.activityNotification).toBe(notification);
    });

    it("attachActivityNotification does not replace an existing notification", () => {
      const first = makeNotification("n1");
      const second = makeNotification("n2");
      const chapter = makeChapter({ activityNotification: first });
      chapter.attachActivityNotification(second);
      expect(chapter.activityNotification).toBe(first);
    });

    it("detachActivityNotification returns the notification and clears it", () => {
      const notification = makeNotification();
      const chapter = makeChapter({ activityNotification: notification });
      expect(chapter.detachActivityNotification()).toBe(notification);
      expect(chapter.activityNotification).toBeUndefined();
    });

    it("detachActivityNotification returns undefined when no notification is set", () => {
      expect(makeChapter().detachActivityNotification()).toBeUndefined();
    });
  });
});
