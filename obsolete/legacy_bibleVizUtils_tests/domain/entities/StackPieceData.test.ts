import { StackPieceData } from "bibleVizUtils.domain.entities.StackPieceData";
import {
  HighlightStates,
  HighlightEvents,
} from "bibleVizUtils.domain.models.highlight";
import {
  SelectionStates,
  SelectionEvents,
  simpleSelectionFSM,
} from "bibleVizUtils.domain.models.selection";
import type { SelectionFSM } from "bibleVizUtils.domain.models.selection";
import type {
  BiblePieceType,
  ParentDataIds,
} from "bibleVizUtils.domain.models.canvas";

const makePiece = (id = "p1") => ({ id, type: "StackBook" as const });

const makeParentIds = (
  partial: Partial<ParentDataIds> = {}
): ParentDataIds => ({
  stackBibleId: undefined,
  stackTestamentId: undefined,
  stackSectionId: undefined,
  stackBookId: undefined,
  stackSectionBookId: undefined,
  layoutId: undefined,
  layoutBookId: undefined,
  ...partial,
});

type SPDOverrides<TChild, TPieceInfo, TCreationParams> = {
  id?: string;
  type?: BiblePieceType;
  pieceInfo?: TPieceInfo;
  parentDataIds?: ParentDataIds;
  creationParams?: TCreationParams;
  isActive?: boolean;
  isHidden?: boolean;
  isInsideBible?: boolean;
  selectionFSM?: SelectionFSM;
  childrenData?: TChild[];
};

const makeSPD = <
  TChild = unknown,
  TPieceInfo = Record<string, unknown>,
  TCreationParams = Record<string, unknown>,
>(
  overrides: SPDOverrides<TChild, TPieceInfo, TCreationParams> = {}
): StackPieceData<TChild, TPieceInfo, TCreationParams, "StackBook"> =>
  new StackPieceData<TChild, TPieceInfo, TCreationParams, "StackBook">({
    id: overrides.id ?? "test-id",
    type: (overrides.type ?? "StackBook") as "StackBook",
    pieceInfo: (overrides.pieceInfo ?? { name: "Genesis" }) as TPieceInfo,
    parentDataIds: overrides.parentDataIds,
    creationParams: (overrides.creationParams ?? {
      index: 0,
    }) as TCreationParams,
    isActive: overrides.isActive,
    isHidden: overrides.isHidden,
    isInsideBible: overrides.isInsideBible,
    selectionFSM: overrides.selectionFSM,
    childrenData: overrides.childrenData,
  });

describe("StackPieceData", () => {
  // ─── constructor ────────────────────────────────────────────────────────────

  describe("constructor", () => {
    it("stores the type", () => {
      const node = makeSPD({ type: "StackChapter" });
      expect(node.type).toBe("StackChapter");
    });

    it("stores pieceInfo", () => {
      const node = makeSPD({ pieceInfo: { name: "Exodus" } });
      expect(node.pieceInfo).toEqual({ name: "Exodus" });
    });

    it("defaults isActive to false", () => {
      expect(makeSPD().isActive).toBe(false);
    });

    it("defaults isHidden to false", () => {
      expect(makeSPD().isHidden).toBe(false);
    });

    it("defaults isInsideBible to true", () => {
      expect(makeSPD().isInsideBible).toBe(true);
    });

    it("defaults selectionState to Idle", () => {
      expect(makeSPD().selectionState).toBe(SelectionStates.Idle);
    });

    it("defaults highlightState to Idle", () => {
      expect(makeSPD().highlightState).toBe(HighlightStates.Idle);
    });

    it("defaults piece to undefined", () => {
      expect(makeSPD().piece).toBeUndefined();
    });

    it("defaults highlightColor to undefined", () => {
      expect(makeSPD().highlightColor).toBeUndefined();
    });

    it("defaults lastInteractionSource to undefined", () => {
      expect(makeSPD().lastInteractionSource).toBeUndefined();
    });

    it("uses the provided selectionFSM", () => {
      const node = makeSPD({ selectionFSM: simpleSelectionFSM });
      node.changeSelectionState(SelectionEvents.RequestSelect);
      // simpleSelectionFSM skips Selecting and goes straight to Selected
      expect(node.selectionState).toBe(SelectionStates.Selected);
    });
  });

  // ─── type ───────────────────────────────────────────────────────────────────

  describe("type", () => {
    it("returns the type passed at construction", () => {
      expect(makeSPD({ type: "StackTestament" }).type).toBe("StackTestament");
    });
  });

  // ─── piece management ───────────────────────────────────────────────────────

  describe("piece management", () => {
    it("setPiece stores the piece", () => {
      const node = makeSPD();
      const piece = makePiece();
      node.setPiece(piece as any);
      expect(node.piece).toBe(piece);
    });

    it("clearPiece returns the piece and removes it", () => {
      const node = makeSPD();
      const piece = makePiece();
      node.setPiece(piece as any);
      const returned = node.clearPiece();
      expect(returned).toBe(piece);
      expect(node.piece).toBeUndefined();
    });

    it("clearPiece returns undefined when no piece is set", () => {
      expect(makeSPD().clearPiece()).toBeUndefined();
    });
  });

  // ─── isPieceAvailable ───────────────────────────────────────────────────────

  describe("isPieceAvailable", () => {
    it("returns false when no piece is set", () => {
      expect(makeSPD().isPieceAvailable()).toBe(false);
    });

    it("returns true when a piece is set and selectionState is Idle", () => {
      const node = makeSPD();
      node.setPiece(makePiece() as any);
      expect(node.isPieceAvailable()).toBe(true);
    });

    it("returns false when a piece is set but selectionState is not Idle", () => {
      const node = makeSPD();
      node.setPiece(makePiece() as any);
      node.changeSelectionState(SelectionEvents.RequestSelect);
      expect(node.isPieceAvailable()).toBe(false);
    });
  });

  // ─── pieceInfo ──────────────────────────────────────────────────────────────

  describe("pieceInfo", () => {
    it("get pieceInfo returns the value from construction", () => {
      const info = { name: "Leviticus", chapters: 27 };
      const node = makeSPD({ pieceInfo: info });
      expect(node.pieceInfo).toEqual(info);
    });

    it("getPieceInfoProperty returns the value for a given key", () => {
      const node = makeSPD({ pieceInfo: { name: "Numbers" } });
      expect(node.getPieceInfoProperty("name")).toBe("Numbers");
    });
  });

  // ─── creationParams ─────────────────────────────────────────────────────────

  describe("creationParams", () => {
    it("get creationParams returns the value from construction", () => {
      const params = { index: 5 };
      const node = makeSPD({ creationParams: params });
      expect(node.creationParams).toEqual(params);
    });

    it("getCreationParam returns the value for a given key", () => {
      const node = makeSPD({ creationParams: { index: 3 } });
      expect(node.getCreationParam("index")).toBe(3);
    });
  });

  // ─── selection FSM (standardSelectionFSM) ───────────────────────────────────

  describe("selection FSM — standardSelectionFSM (default)", () => {
    it("transitions Idle → Selecting on RequestSelect", () => {
      const node = makeSPD();
      node.changeSelectionState(SelectionEvents.RequestSelect);
      expect(node.selectionState).toBe(SelectionStates.Selecting);
    });

    it("transitions Selecting → Selected on SequenceComplete", () => {
      const node = makeSPD();
      node.changeSelectionState(SelectionEvents.RequestSelect);
      node.changeSelectionState(SelectionEvents.SequenceComplete);
      expect(node.selectionState).toBe(SelectionStates.Selected);
    });

    it("transitions Selecting → Deselecting on RequestDeselect (cancel)", () => {
      const node = makeSPD();
      node.changeSelectionState(SelectionEvents.RequestSelect);
      node.changeSelectionState(SelectionEvents.RequestDeselect);
      expect(node.selectionState).toBe(SelectionStates.Deselecting);
    });

    it("transitions Deselecting → Idle on SequenceComplete", () => {
      const node = makeSPD();
      node.changeSelectionState(SelectionEvents.RequestSelect);
      node.changeSelectionState(SelectionEvents.RequestDeselect);
      node.changeSelectionState(SelectionEvents.SequenceComplete);
      expect(node.selectionState).toBe(SelectionStates.Idle);
    });

    it("transitions Deselecting → Selecting on RequestSelect (cancel)", () => {
      const node = makeSPD();
      node.changeSelectionState(SelectionEvents.RequestSelect);
      node.changeSelectionState(SelectionEvents.SequenceComplete);
      node.changeSelectionState(SelectionEvents.RequestDeselect);
      node.changeSelectionState(SelectionEvents.RequestSelect);
      expect(node.selectionState).toBe(SelectionStates.Selecting);
    });

    it("transitions Selected → Deselecting on RequestDeselect", () => {
      const node = makeSPD();
      node.changeSelectionState(SelectionEvents.RequestSelect);
      node.changeSelectionState(SelectionEvents.SequenceComplete);
      node.changeSelectionState(SelectionEvents.RequestDeselect);
      expect(node.selectionState).toBe(SelectionStates.Deselecting);
    });

    it("returns true when the state changes", () => {
      const node = makeSPD();
      expect(node.changeSelectionState(SelectionEvents.RequestSelect)).toBe(
        true
      );
    });

    it("returns false for an invalid transition and does not change state", () => {
      const node = makeSPD();
      const changed = node.changeSelectionState(
        SelectionEvents.RequestDeselect
      );
      expect(changed).toBe(false);
      expect(node.selectionState).toBe(SelectionStates.Idle);
    });

    it("resetSelectionState resets to Idle from any state", () => {
      const node = makeSPD();
      node.changeSelectionState(SelectionEvents.RequestSelect);
      node.changeSelectionState(SelectionEvents.SequenceComplete);
      node.resetSelectionState();
      expect(node.selectionState).toBe(SelectionStates.Idle);
    });
  });

  // ─── selection FSM (simpleSelectionFSM) ─────────────────────────────────────

  describe("selection FSM — simpleSelectionFSM", () => {
    it("transitions Idle → Selected directly on RequestSelect", () => {
      const node = makeSPD({ selectionFSM: simpleSelectionFSM });
      node.changeSelectionState(SelectionEvents.RequestSelect);
      expect(node.selectionState).toBe(SelectionStates.Selected);
    });

    it("transitions Selected → Idle directly on RequestDeselect", () => {
      const node = makeSPD({ selectionFSM: simpleSelectionFSM });
      node.changeSelectionState(SelectionEvents.RequestSelect);
      node.changeSelectionState(SelectionEvents.RequestDeselect);
      expect(node.selectionState).toBe(SelectionStates.Idle);
    });
  });

  // ─── highlight FSM ──────────────────────────────────────────────────────────

  describe("highlight FSM", () => {
    it("transitions Idle → Highlighting on RequestHighlight", () => {
      const node = makeSPD();
      node.changeHighlightState(HighlightEvents.RequestHighlight);
      expect(node.highlightState).toBe(HighlightStates.Highlighting);
    });

    it("transitions Highlighting → Highlighted on SequenceComplete", () => {
      const node = makeSPD();
      node.changeHighlightState(HighlightEvents.RequestHighlight);
      node.changeHighlightState(HighlightEvents.SequenceComplete);
      expect(node.highlightState).toBe(HighlightStates.Highlighted);
    });

    it("transitions Highlighting → Unhighlighting on RequestUnhighlight (cancel)", () => {
      const node = makeSPD();
      node.changeHighlightState(HighlightEvents.RequestHighlight);
      node.changeHighlightState(HighlightEvents.RequestUnhighlight);
      expect(node.highlightState).toBe(HighlightStates.Unhighlighting);
    });

    it("transitions Unhighlighting → Idle on SequenceComplete", () => {
      const node = makeSPD();
      node.changeHighlightState(HighlightEvents.RequestHighlight);
      node.changeHighlightState(HighlightEvents.RequestUnhighlight);
      node.changeHighlightState(HighlightEvents.SequenceComplete);
      expect(node.highlightState).toBe(HighlightStates.Idle);
    });

    it("transitions Unhighlighting → Highlighting on RequestHighlight (cancel)", () => {
      const node = makeSPD();
      node.changeHighlightState(HighlightEvents.RequestHighlight);
      node.changeHighlightState(HighlightEvents.RequestUnhighlight);
      node.changeHighlightState(HighlightEvents.RequestHighlight);
      expect(node.highlightState).toBe(HighlightStates.Highlighting);
    });

    it("transitions Highlighted → Unhighlighting on RequestUnhighlight", () => {
      const node = makeSPD();
      node.changeHighlightState(HighlightEvents.RequestHighlight);
      node.changeHighlightState(HighlightEvents.SequenceComplete);
      node.changeHighlightState(HighlightEvents.RequestUnhighlight);
      expect(node.highlightState).toBe(HighlightStates.Unhighlighting);
    });

    it("returns true when the state changes", () => {
      const node = makeSPD();
      expect(node.changeHighlightState(HighlightEvents.RequestHighlight)).toBe(
        true
      );
    });

    it("returns false for an invalid transition and does not change state", () => {
      const node = makeSPD();
      const changed = node.changeHighlightState(
        HighlightEvents.RequestUnhighlight
      );
      expect(changed).toBe(false);
      expect(node.highlightState).toBe(HighlightStates.Idle);
    });
  });

  // ─── highlightIntensity ─────────────────────────────────────────────────────

  describe("highlightIntensity", () => {
    it("defaults to Solid", () => {
      expect(makeSPD().highlightIntensity).toBe("Solid");
    });

    it("returns false and does not update when highlight state is Idle", () => {
      const node = makeSPD();
      const result = node.changeHighlightIntensity("Faded");
      expect(result).toBe(false);
      expect(node.highlightIntensity).toBe("Solid");
    });

    it("returns true and updates when not in Idle and intensity differs", () => {
      const node = makeSPD();
      node.changeHighlightState(HighlightEvents.RequestHighlight);
      const result = node.changeHighlightIntensity("Faded");
      expect(result).toBe(true);
      expect(node.highlightIntensity).toBe("Faded");
    });

    it("returns false when intensity is already the requested value", () => {
      const node = makeSPD();
      node.changeHighlightState(HighlightEvents.RequestHighlight);
      node.changeHighlightIntensity("Faded");
      const result = node.changeHighlightIntensity("Faded");
      expect(result).toBe(false);
    });
  });

  // ─── highlightColor ─────────────────────────────────────────────────────────

  describe("highlightColor", () => {
    it("is undefined by default", () => {
      expect(makeSPD().highlightColor).toBeUndefined();
    });

    it("changeHighlightColor stores the color", () => {
      const node = makeSPD();
      node.changeHighlightColor("#ff0000" as any);
      expect(node.highlightColor).toBe("#ff0000");
    });

    it("clearHighlightColor removes the color", () => {
      const node = makeSPD();
      node.changeHighlightColor("#ff0000" as any);
      node.clearHighlightColor();
      expect(node.highlightColor).toBeUndefined();
    });
  });

  // ─── parentDataIds ──────────────────────────────────────────────────────────

  describe("parentDataIds", () => {
    it("returns undefined when not set", () => {
      expect(makeSPD().parentDataIds).toBeUndefined();
    });

    it("returns a shallow copy so external mutations do not affect internal state", () => {
      const ids = makeParentIds({ stackBibleId: "bible-1" });
      const node = makeSPD({ parentDataIds: ids });
      const snapshot = node.parentDataIds!;
      snapshot.stackBibleId = "mutated";
      expect(node.parentDataIds!.stackBibleId).toBe("bible-1");
    });

    it("getParentId returns the value for a known key", () => {
      const ids = makeParentIds({ stackBibleId: "bible-1" });
      const node = makeSPD({ parentDataIds: ids });
      expect(node.getParentId("stackBibleId")).toBe("bible-1");
    });

    it("getParentId returns undefined when parentDataIds is not set", () => {
      expect(makeSPD().getParentId("stackBibleId")).toBeUndefined();
    });

    it("setParentId updates the specified key", () => {
      const node = makeSPD({ parentDataIds: makeParentIds() });
      node.setParentId("stackBibleId", "bible-2");
      expect(node.getParentId("stackBibleId")).toBe("bible-2");
    });

    it("setParentId has no effect when parentDataIds is undefined", () => {
      const node = makeSPD();
      node.setParentId("stackBibleId", "bible-2");
      expect(node.parentDataIds).toBeUndefined();
    });

    it("clearParentId sets the specified key to undefined", () => {
      const node = makeSPD({
        parentDataIds: makeParentIds({ stackBibleId: "bible-1" }),
      });
      node.clearParentId("stackBibleId");
      expect(node.getParentId("stackBibleId")).toBeUndefined();
    });

    it("clearParentIds clears multiple specified keys", () => {
      const ids = makeParentIds({
        stackBibleId: "b1",
        stackTestamentId: "t1",
        stackBookId: "bk1",
      });
      const node = makeSPD({ parentDataIds: ids });
      node.clearParentIds(["stackBibleId", "stackTestamentId"]);
      expect(node.getParentId("stackBibleId")).toBeUndefined();
      expect(node.getParentId("stackTestamentId")).toBeUndefined();
      expect(node.getParentId("stackBookId")).toBe("bk1");
    });

    it("clearParentIds with propagate=true clears keys on StackPieceData children", () => {
      const childIds = makeParentIds({ stackBibleId: "b1" });
      const child = makeSPD({ parentDataIds: childIds });
      const parent = makeSPD({ childrenData: [child] });
      parent.clearParentIds(["stackBibleId"], true);
      expect(child.getParentId("stackBibleId")).toBeUndefined();
    });

    it("clearParentIds with propagate=false does not touch children", () => {
      const childIds = makeParentIds({ stackBibleId: "b1" });
      const child = makeSPD({ parentDataIds: childIds });
      const parent = makeSPD({ childrenData: [child] });
      parent.clearParentIds(["stackBibleId"], false);
      expect(child.getParentId("stackBibleId")).toBe("b1");
    });

    it("clearAllParentIds clears every known key", () => {
      const ids = makeParentIds({
        stackBibleId: "b1",
        stackTestamentId: "t1",
        stackSectionId: "s1",
        stackBookId: "bk1",
        stackSectionBookId: "sb1",
        layoutId: "l1",
        layoutBookId: "lb1",
      });
      const node = makeSPD({ parentDataIds: ids });
      node.clearAllParentIds(false);
      const result = node.parentDataIds!;
      expect(Object.values(result).every((v) => v === undefined)).toBe(true);
    });
  });

  // ─── isInsideBible ──────────────────────────────────────────────────────────

  describe("isInsideBible", () => {
    it("defaults to true", () => {
      expect(makeSPD().isInsideBible).toBe(true);
    });

    it("detachFromBible sets isInsideBible to false", () => {
      const node = makeSPD();
      node.detachFromBible();
      expect(node.isInsideBible).toBe(false);
    });

    it("attachToBible sets isInsideBible to true", () => {
      const node = makeSPD();
      node.detachFromBible();
      node.attachToBible();
      expect(node.isInsideBible).toBe(true);
    });
  });

  // ─── isHidden ───────────────────────────────────────────────────────────────

  describe("isHidden", () => {
    it("defaults to false", () => {
      expect(makeSPD().isHidden).toBe(false);
    });

    it("hide sets isHidden to true", () => {
      const node = makeSPD();
      node.hide();
      expect(node.isHidden).toBe(true);
    });

    it("show sets isHidden to false", () => {
      const node = makeSPD();
      node.hide();
      node.show();
      expect(node.isHidden).toBe(false);
    });
  });

  // ─── isActive ───────────────────────────────────────────────────────────────

  describe("isActive", () => {
    it("defaults to false", () => {
      expect(makeSPD().isActive).toBe(false);
    });

    it("activate sets isActive to true", () => {
      const node = makeSPD();
      node.activate();
      expect(node.isActive).toBe(true);
    });

    it("deactivate sets isActive to false", () => {
      const node = makeSPD();
      node.activate();
      node.deactivate();
      expect(node.isActive).toBe(false);
    });
  });

  // ─── lastInteractionSource ───────────────────────────────────────────────────

  describe("lastInteractionSource", () => {
    it("is undefined by default", () => {
      expect(makeSPD().lastInteractionSource).toBeUndefined();
    });

    it("changeLastInteractionSource stores the source", () => {
      const node = makeSPD();
      node.changeLastInteractionSource("pointer" as any);
      expect(node.lastInteractionSource).toBe("pointer");
    });

    it("clearLastInteractionSource removes the source", () => {
      const node = makeSPD();
      node.changeLastInteractionSource("pointer" as any);
      node.clearLastInteractionSource();
      expect(node.lastInteractionSource).toBeUndefined();
    });
  });

  // ─── isOnTheGround ──────────────────────────────────────────────────────────

  describe("isOnTheGround", () => {
    it("is false by default", () => {
      expect(makeSPD().isOnTheGround).toBe(false);
    });

    it("placeOnGround sets isOnTheGround to true", () => {
      const node = makeSPD();
      node.placeOnGround();
      expect(node.isOnTheGround).toBe(true);
    });

    it("pickFromGround sets isOnTheGround to false", () => {
      const node = makeSPD();
      node.placeOnGround();
      node.pickFromGround();
      expect(node.isOnTheGround).toBe(false);
    });
  });

  // ─── isBeingDragged ─────────────────────────────────────────────────────────

  describe("isBeingDragged", () => {
    it("is false by default", () => {
      expect(makeSPD().isBeingDragged).toBe(false);
    });

    it("beginDrag sets isBeingDragged to true", () => {
      const node = makeSPD();
      node.beginDrag();
      expect(node.isBeingDragged).toBe(true);
    });

    it("endDrag sets isBeingDragged to false", () => {
      const node = makeSPD();
      node.beginDrag();
      node.endDrag();
      expect(node.isBeingDragged).toBe(false);
    });
  });

  // ─── isHighlightable ────────────────────────────────────────────────────────

  describe("isHighlightable", () => {
    it("is false by default", () => {
      expect(makeSPD().isHighlightable).toBe(false);
    });

    it("becomeHighlightable sets isHighlightable to true", () => {
      const node = makeSPD();
      node.becomeHighlightable();
      expect(node.isHighlightable).toBe(true);
    });

    it("becomeNonHighlightable sets isHighlightable to false", () => {
      const node = makeSPD();
      node.becomeHighlightable();
      node.becomeNonHighlightable();
      expect(node.isHighlightable).toBe(false);
    });
  });

  // ─── isFocused ──────────────────────────────────────────────────────────────

  describe("isFocused", () => {
    it("is false by default", () => {
      expect(makeSPD().isFocused).toBe(false);
    });

    it("beginFocus sets isFocused to true", () => {
      const node = makeSPD();
      node.beginFocus();
      expect(node.isFocused).toBe(true);
    });

    it("endFocus sets isFocused to false", () => {
      const node = makeSPD();
      node.beginFocus();
      node.endFocus();
      expect(node.isFocused).toBe(false);
    });
  });

  // ─── resetData ──────────────────────────────────────────────────────────────

  describe("resetData", () => {
    it("removes the piece", () => {
      const node = makeSPD();
      node.setPiece(makePiece() as any);
      node.resetData();
      expect(node.piece).toBeUndefined();
    });

    it("sets isInsideBible to undefined", () => {
      const node = makeSPD();
      node.resetData();
      expect(node.isInsideBible).toBeUndefined();
    });

    it("sets isActive to false", () => {
      const node = makeSPD();
      node.activate();
      node.resetData();
      expect(node.isActive).toBe(false);
    });

    it("resets selectionState to Idle", () => {
      const node = makeSPD();
      node.changeSelectionState(SelectionEvents.RequestSelect);
      node.changeSelectionState(SelectionEvents.SequenceComplete);
      node.resetData();
      expect(node.selectionState).toBe(SelectionStates.Idle);
    });
  });

  // ─── resetHierarchy ─────────────────────────────────────────────────────────

  describe("resetHierarchy", () => {
    it("returns the piece when clearPiece is true (default) and a piece is set", () => {
      const node = makeSPD();
      const piece = makePiece();
      node.setPiece(piece as any);
      const released = node.resetHierarchy();
      expect(released).toContain(piece);
    });

    it("clears the piece when clearPiece is true", () => {
      const node = makeSPD();
      node.setPiece(makePiece() as any);
      node.resetHierarchy();
      expect(node.piece).toBeUndefined();
    });

    it("deactivates the node when clearPiece is true and piece is present", () => {
      const node = makeSPD();
      node.activate();
      node.setPiece(makePiece() as any);
      node.resetHierarchy();
      expect(node.isActive).toBe(false);
    });

    it("does not release or clear the piece when clearPiece is false", () => {
      const node = makeSPD();
      const piece = makePiece();
      node.setPiece(piece as any);
      const released = node.resetHierarchy(false);
      expect(released).not.toContain(piece);
      expect(node.piece).toBe(piece);
    });

    it("returns an empty array when no piece is set", () => {
      expect(makeSPD().resetHierarchy()).toEqual([]);
    });

    it("collects pieces from StackPieceData children via super.resetHierarchy", () => {
      const child = makeSPD();
      const childPiece = makePiece("child-piece");
      child.setPiece(childPiece as any);
      child.activate();
      const parent = makeSPD({ childrenData: [child] });
      const released = parent.resetHierarchy();
      expect(released).toContain(childPiece);
    });
  });
});
