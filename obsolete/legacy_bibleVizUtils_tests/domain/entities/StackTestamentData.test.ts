import { StackTestamentData } from "bibleVizUtils.domain.entities.StackTestamentData";
import { StackSectionData } from "bibleVizUtils.domain.entities.StackSectionData";
import { StackSectionBookData } from "bibleVizUtils.domain.entities.StackSectionBookData";
import {
  SelectionStates,
  SelectionEvents,
} from "bibleVizUtils.domain.models.selection";
import { ExplodeStackActions } from "bibleVizUtils.domain.models.canvas";

// ─── factories ───────────────────────────────────────────────────────────────

const makeTestamentCreationParams = (overrides: any = {}) => ({
  arrangementIndex: 0,
  testamentIndex: 0,
  ...overrides,
});

const makeSectionCreationParams = (overrides: any = {}) => ({
  arrangementIndex: 0,
  testamentIndex: 0,
  sectionIndex: 0,
  amountOfChaptersInSection: 10,
  ...overrides,
});

const makePiece = (id: string, type = "StackSection") => ({ id, type }) as any;

const makeTestament = (overrides: any = {}) =>
  new StackTestamentData({
    id: "testament-1",
    pieceInfo: { name: "OT" } as any,
    parentDataIds: {} as any,
    creationParams: makeTestamentCreationParams(),
    ...overrides,
  });

const makeSection = (overrides: any = {}) =>
  new StackSectionData({
    id: "section-1",
    pieceInfo: { name: "Section 1" } as any,
    parentDataIds: {} as any,
    creationParams: makeSectionCreationParams(),
    ...overrides,
  });

const makeSectionBook = (overrides: any = {}) =>
  new StackSectionBookData({
    id: "section-book-1",
    pieceInfo: { name: "Section 1" } as any,
    pieceBookInfo: { name: "Genesis" } as any,
    creationParams: makeSectionCreationParams(),
    ...overrides,
  });

// ─── tests ───────────────────────────────────────────────────────────────────

describe("StackTestamentData", () => {
  // ─── constructor ────────────────────────────────────────────────────────────

  describe("constructor", () => {
    it("defaults isSplitIntoSections to false", () => {
      expect(makeTestament().isSplitIntoSections).toBe(false);
    });

    it("sets isSplitIntoSections to true when isSplitIntoSections=true", () => {
      expect(
        makeTestament({ isSplitIntoSections: true }).isSplitIntoSections
      ).toBe(true);
    });

    it("defaults isActive to false", () => {
      expect(makeTestament().isActive).toBe(false);
    });

    it("defaults isInsideBible to true", () => {
      expect(makeTestament().isInsideBible).toBe(true);
    });

    it("starts with selectionState Idle when not split", () => {
      expect(makeTestament().selectionState).toBe(SelectionStates.Idle);
    });

    it("starts with selectionState Selected when split (simpleSelectionFSM)", () => {
      expect(makeTestament({ isSplitIntoSections: true }).selectionState).toBe(
        SelectionStates.Selected
      );
    });
  });

  // ─── isSplitIntoSections ────────────────────────────────────────────────────

  describe("isSplitIntoSections", () => {
    it("is false when selectionState is Idle", () => {
      expect(makeTestament().isSplitIntoSections).toBe(false);
    });

    it("is true after selecting via FSM", () => {
      const testament = makeTestament();
      testament.changeSelectionState(SelectionEvents.RequestSelect);
      expect(testament.isSplitIntoSections).toBe(true);
    });

    it("is false after deselecting", () => {
      const testament = makeTestament({ isSplitIntoSections: true });
      testament.changeSelectionState(SelectionEvents.RequestDeselect);
      expect(testament.isSplitIntoSections).toBe(false);
    });
  });

  // ─── findExplodedSection / hasExplodedSection ────────────────────────────────

  describe("findExplodedSection", () => {
    it("returns undefined when there are no children", () => {
      expect(makeTestament().findExplodedSection()).toBeUndefined();
    });

    it("returns undefined when no StackSectionData child is exploded", () => {
      const testament = makeTestament({ childrenData: [makeSection()] });
      expect(testament.findExplodedSection()).toBeUndefined();
    });

    it("returns the exploded StackSectionData", () => {
      const section = makeSection();
      section.explode();
      const testament = makeTestament({ childrenData: [section] });
      expect(testament.findExplodedSection()).toBe(section);
    });

    it("returns the first exploded section when multiple are exploded", () => {
      const s1 = makeSection({ id: "s1" });
      const s2 = makeSection({ id: "s2" });
      s1.explode();
      s2.explode();
      const testament = makeTestament({ childrenData: [s1, s2] });
      expect(testament.findExplodedSection()).toBe(s1);
    });

    it("ignores StackSectionBookData children", () => {
      const sectionBook = makeSectionBook();
      const testament = makeTestament({ childrenData: [sectionBook] });
      expect(testament.findExplodedSection()).toBeUndefined();
    });
  });

  describe("hasExplodedSection", () => {
    it("returns false when no section is exploded", () => {
      const testament = makeTestament({ childrenData: [makeSection()] });
      expect(testament.hasExplodedSection()).toBe(false);
    });

    it("returns true when a section is exploded", () => {
      const section = makeSection();
      section.explode();
      const testament = makeTestament({ childrenData: [section] });
      expect(testament.hasExplodedSection()).toBe(true);
    });
  });

  // ─── creationParams index getters ───────────────────────────────────────────

  describe("getArrangementIndex", () => {
    it("returns the arrangementIndex from creationParams", () => {
      const testament = makeTestament({
        creationParams: makeTestamentCreationParams({ arrangementIndex: 3 }),
      });
      expect(testament.getArrangementIndex()).toBe(3);
    });
  });

  describe("getTestamentIndex", () => {
    it("returns the testamentIndex from creationParams", () => {
      const testament = makeTestament({
        creationParams: makeTestamentCreationParams({ testamentIndex: 1 }),
      });
      expect(testament.getTestamentIndex()).toBe(1);
    });
  });

  // ─── resetHierarchy ─────────────────────────────────────────────────────────

  describe("resetHierarchy", () => {
    it("resets selectionState to Idle", () => {
      const testament = makeTestament({ isSplitIntoSections: true });
      testament.resetHierarchy();
      expect(testament.selectionState).toBe(SelectionStates.Idle);
    });

    it("releases and clears the piece when clearPiece is true (default)", () => {
      const piece = { id: "tp1", type: "StackTestament" as const };
      const testament = makeTestament();
      testament.setPiece(piece);
      const released = testament.resetHierarchy();
      expect(released).toContain(piece);
      expect(testament.piece).toBeUndefined();
    });

    it("does not release the piece when clearPiece is false", () => {
      const piece = { id: "tp1", type: "StackTestament" as const };
      const testament = makeTestament();
      testament.setPiece(piece);
      const released = testament.resetHierarchy(false);
      expect(released).not.toContain(piece);
      expect(testament.piece).toBe(piece);
    });

    it("leaves selectionState as Idle when split=false (default)", () => {
      const testament = makeTestament({ isSplitIntoSections: true });
      testament.resetHierarchy(true, false);
      expect(testament.isSplitIntoSections).toBe(false);
    });

    it("transitions selectionState to Selected when split=true", () => {
      const testament = makeTestament();
      testament.resetHierarchy(true, true);
      expect(testament.selectionState).toBe(SelectionStates.Selected);
      expect(testament.isSplitIntoSections).toBe(true);
    });
  });

  // ─── isSelectable ───────────────────────────────────────────────────────────

  describe("isSelectable", () => {
    it("returns false when not active", () => {
      expect(makeTestament().isSelectable()).toBe(false);
    });

    it("returns false when active but selectionState is not Idle", () => {
      const testament = makeTestament({ isActive: true });
      testament.changeSelectionState(SelectionEvents.RequestSelect);
      expect(testament.isSelectable()).toBe(false);
    });

    it("returns true when active and selectionState is Idle", () => {
      const testament = makeTestament({ isActive: true });
      expect(testament.isSelectable()).toBe(true);
    });
  });

  // ─── tryExplodeSplitSections ────────────────────────────────────────────────

  describe("tryExplodeSplitSections", () => {
    it("returns false when there are no StackSectionData children", () => {
      expect(makeTestament().tryExplodeSplitSections()).toBe(false);
    });

    it("returns false when sections are not explodable (Idle selectionState)", () => {
      const testament = makeTestament({ childrenData: [makeSection()] });
      expect(testament.tryExplodeSplitSections()).toBe(false);
    });

    it("returns true and explodes a section that is explodable", () => {
      const section = makeSection();
      section.changeSelectionState(SelectionEvents.RequestSelect); // → Selected
      const testament = makeTestament({ childrenData: [section] });

      const result = testament.tryExplodeSplitSections();

      expect(result).toBe(true);
      expect(section.isInExplodedView).toBe(true);
    });

    it("returns false when a section is already exploded", () => {
      const section = makeSection();
      section.changeSelectionState(SelectionEvents.RequestSelect);
      section.explode();
      const testament = makeTestament({ childrenData: [section] });
      expect(testament.tryExplodeSplitSections()).toBe(false);
    });

    it("only explodes the first explodable section", () => {
      const s1 = makeSection({ id: "s1" });
      const s2 = makeSection({ id: "s2" });
      s1.changeSelectionState(SelectionEvents.RequestSelect);
      s2.changeSelectionState(SelectionEvents.RequestSelect);
      const testament = makeTestament({ childrenData: [s1, s2] });

      testament.tryExplodeSplitSections();

      expect(s1.isInExplodedView).toBe(true);
      expect(s2.isInExplodedView).toBe(false);
    });

    it("skips StackSectionBookData children", () => {
      const sectionBook = makeSectionBook();
      const testament = makeTestament({ childrenData: [sectionBook] });
      expect(testament.tryExplodeSplitSections()).toBe(false);
    });
  });

  // ─── getPureSectionsReversed ─────────────────────────────────────────────────

  describe("getPureSectionsReversed", () => {
    it("returns an empty array when there are no children", () => {
      expect(makeTestament().getPureSectionsReversed()).toEqual([]);
    });

    it("returns only StackSectionData children, excluding StackSectionBookData", () => {
      const section = makeSection({ id: "s1" });
      const sectionBook = makeSectionBook({ id: "sb1" });
      const testament = makeTestament({ childrenData: [section, sectionBook] });
      const result = testament.getPureSectionsReversed();
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(section);
    });

    it("returns StackSectionData children in reversed order", () => {
      const s1 = makeSection({ id: "s1" });
      const s2 = makeSection({ id: "s2" });
      const s3 = makeSection({ id: "s3" });
      const testament = makeTestament({ childrenData: [s1, s2, s3] });
      expect(testament.getPureSectionsReversed()).toEqual([s3, s2, s1]);
    });
  });

  // ─── getExplodeAnimationCommands ─────────────────────────────────────────────

  describe("getExplodeAnimationCommands", () => {
    it("returns an empty array when there are no pure sections", () => {
      expect(makeTestament().getExplodeAnimationCommands()).toEqual([]);
    });

    it("returns a SelectSection command for an Idle section with a piece", () => {
      const section = makeSection();
      const piece = makePiece("sp1");
      section.setPiece(piece);
      const testament = makeTestament({ childrenData: [section] });

      const commands = testament.getExplodeAnimationCommands();

      expect(commands).toEqual([
        { piece, action: ExplodeStackActions.SelectSection },
      ]);
    });

    it("returns an ExplodeSection command for a selected, non-exploded section with a piece", () => {
      const section = makeSection();
      section.changeSelectionState(SelectionEvents.RequestSelect); // → Selected
      const piece = makePiece("sp1");
      section.setPiece(piece);
      const testament = makeTestament({ childrenData: [section] });

      const commands = testament.getExplodeAnimationCommands();

      expect(commands).toEqual([
        { piece, action: ExplodeStackActions.ExplodeSection },
      ]);
    });

    it("skips sections that are already in exploded view", () => {
      const section = makeSection();
      section.changeSelectionState(SelectionEvents.RequestSelect);
      section.explode();
      section.setPiece(makePiece("sp1"));
      const testament = makeTestament({ childrenData: [section] });

      expect(testament.getExplodeAnimationCommands()).toEqual([]);
    });

    it("skips sections that have no piece", () => {
      const section = makeSection();
      // no piece set
      const testament = makeTestament({ childrenData: [section] });

      expect(testament.getExplodeAnimationCommands()).toEqual([]);
    });

    it("produces commands in reversed children order", () => {
      const s1 = makeSection({ id: "s1" });
      const s2 = makeSection({ id: "s2" });
      const piece1 = makePiece("p1");
      const piece2 = makePiece("p2");
      s1.setPiece(piece1);
      s2.setPiece(piece2);
      // childrenData = [s1, s2] → reversed = [s2, s1]
      const testament = makeTestament({ childrenData: [s1, s2] });

      const commands = testament.getExplodeAnimationCommands();

      expect(commands[0]!.piece).toBe(piece2);
      expect(commands[1]!.piece).toBe(piece1);
    });
  });

  // ─── implodeSections ────────────────────────────────────────────────────────

  describe("implodeSections", () => {
    it("sets isInExplodedView to false on all StackSectionData children", () => {
      const s1 = makeSection({ id: "s1" });
      const s2 = makeSection({ id: "s2" });
      s1.explode();
      s2.explode();
      const testament = makeTestament({ childrenData: [s1, s2] });

      testament.implodeSections();

      expect(s1.isInExplodedView).toBe(false);
      expect(s2.isInExplodedView).toBe(false);
    });

    it("does not affect StackSectionBookData children", () => {
      const sectionBook = makeSectionBook();
      // StackSectionBookData has no explode/implode — this just verifies no error
      const testament = makeTestament({ childrenData: [sectionBook] });
      expect(() => testament.implodeSections()).not.toThrow();
    });
  });

  // ─── isEmpty ────────────────────────────────────────────────────────────────

  describe("isEmpty", () => {
    describe("when selectionState is Idle", () => {
      it("returns true when testament is not active", () => {
        expect(makeTestament().isEmpty()).toBe(true);
      });

      it("returns false when testament is active", () => {
        const testament = makeTestament({ isActive: true });
        expect(testament.isEmpty()).toBe(false);
      });
    });

    describe("when selectionState is not Idle (Selected)", () => {
      it("returns true when there are no children", () => {
        const testament = makeTestament({ isSplitIntoSections: true });
        expect(testament.isEmpty()).toBe(true);
      });

      it("returns true when all children are StackSectionData with Idle selection and not active", () => {
        const section = makeSection();
        const testament = makeTestament({
          isSplitIntoSections: true,
          childrenData: [section],
        });
        expect(testament.isEmpty()).toBe(true);
      });

      it("returns false when a StackSectionData child has non-Idle selectionState", () => {
        const section = makeSection();
        section.changeSelectionState(SelectionEvents.RequestSelect); // → Selected
        const testament = makeTestament({
          isSplitIntoSections: true,
          childrenData: [section],
        });
        expect(testament.isEmpty()).toBe(false);
      });

      it("returns false when a StackSectionData child is active", () => {
        const section = makeSection({ isActive: true });
        const testament = makeTestament({
          isSplitIntoSections: true,
          childrenData: [section],
        });
        expect(testament.isEmpty()).toBe(false);
      });

      it("returns false when a StackSectionBookData child is active", () => {
        const sectionBook = makeSectionBook({ isActive: true });
        const testament = makeTestament({
          isSplitIntoSections: true,
          childrenData: [sectionBook],
        });
        expect(testament.isEmpty()).toBe(false);
      });

      it("returns true when a StackSectionBookData child is not active", () => {
        const sectionBook = makeSectionBook();
        const testament = makeTestament({
          isSplitIntoSections: true,
          childrenData: [sectionBook],
        });
        expect(testament.isEmpty()).toBe(true);
      });
    });
  });
});
