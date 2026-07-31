import {
  StackBibleData,
  type StaticBiblePieces,
} from "bibleVizUtils.domain.entities.StackBibleData";
import { StackTestamentData } from "bibleVizUtils.domain.entities.StackTestamentData";
import { StackSectionData } from "bibleVizUtils.domain.entities.StackSectionData";
import { StackBookData } from "bibleVizUtils.domain.entities.StackBookData";
import { SelectionEvents } from "bibleVizUtils.domain.models.selection";
import { ExplodeStackActions } from "bibleVizUtils.domain.models.canvas";

// ─── factories ───────────────────────────────────────────────────────────────

const makeTestamentPiece = (id = "tp1") => ({
  id,
  type: "StackTestament" as const,
});
const makeSectionPiece = (id = "sp1") => ({
  id,
  type: "StackSection" as const,
});

const makeTestament = (overrides: any = {}) =>
  new StackTestamentData({
    id: "testament-1",
    pieceInfo: { name: "Old Testament" } as any,
    parentDataIds: {} as any,
    creationParams: { arrangementIndex: 0, testamentIndex: 0 },
    ...overrides,
  });

const makeSection = (overrides: any = {}) =>
  new StackSectionData({
    id: "section-1",
    pieceInfo: { name: "Pentateuch" } as any,
    parentDataIds: {} as any,
    creationParams: {
      arrangementIndex: 0,
      testamentIndex: 0,
      sectionIndex: 0,
      amountOfChaptersInSection: 10,
    },
    ...overrides,
  });

const makeBook = (overrides: any = {}) =>
  new StackBookData({
    id: "book-1",
    pieceInfo: { bookId: "gen", type: "complete" } as any,
    creationParams: {
      arrangementIndex: 0,
      testamentIndex: 0,
      sectionIndex: 0,
      levelIndex: 0,
      bookIndex: 0,
      bookLevelIndex: 0,
      levelsLenght: 1,
    },
    ...overrides,
  });

const makeBible = (overrides: any = {}) =>
  new StackBibleData({
    id: "bible-1",
    currentCrossPosition: "Top",
    currentStackVizState: "Regular",
    arrangementIndex: 0,
    bibleType: "Default",
    ...overrides,
  });

const makeStaticPieces = (): StaticBiblePieces =>
  ({
    bibleTransformer: {
      id: "transformer",
      type: "StackTransformer",
      bibleId: "b1",
    },
    upperCover: { id: "upper", type: "StackCover", bibleId: "b1" },
    leftCover: { id: "left", type: "StackCover", bibleId: "b1" },
    lowerCover: { id: "lower", type: "StackCover", bibleId: "b1" },
    crossVerticalLine: {
      id: "vertical",
      type: "StackCrossLine",
      bibleId: "b1",
    },
    crossHorizontalLine: {
      id: "horizontal",
      type: "StackCrossLine",
      bibleId: "b1",
    },
    bibleShadow: { id: "shadow", type: "StackShadow", bibleId: "b1" },
  }) as any;

// ─── tests ───────────────────────────────────────────────────────────────────

describe("StackBibleData", () => {
  // ─── constructor ─────────────────────────────────────────────────────────────

  describe("constructor", () => {
    it("stores currentCrossPosition", () => {
      expect(
        makeBible({ currentCrossPosition: "Middle" }).currentCrossPosition
      ).toBe("Middle");
    });

    it("stores currentStackVizState", () => {
      expect(
        makeBible({ currentStackVizState: "Expanded" }).currentStackVizState
      ).toBe("Expanded");
    });

    it("stores bibleType", () => {
      expect(makeBible({ bibleType: "PlatformerGame" }).bibleType).toBe(
        "PlatformerGame"
      );
    });

    it("stores arrangementIndex", () => {
      expect(makeBible({ arrangementIndex: 3 }).arrangementIndex).toBe(3);
    });

    it("defaults hasBeenSetUp to false", () => {
      expect(makeBible().hasBeenSetUp).toBe(false);
    });

    it("defaults currentState to undefined", () => {
      expect(makeBible().currentState).toBeUndefined();
    });

    it("defaults staticBiblePieces to undefined", () => {
      expect(makeBible().staticBiblePieces).toBeUndefined();
    });

    it("defaults childrenData to an empty array", () => {
      expect(makeBible().childrenData).toEqual([]);
    });

    it("stores provided childrenData", () => {
      const testament = makeTestament();
      expect(makeBible({ childrenData: [testament] }).childrenData).toEqual([
        testament,
      ]);
    });

    it("stores provided staticBiblePieces", () => {
      const pieces = makeStaticPieces();
      expect(
        makeBible({ staticBiblePieces: pieces }).staticBiblePieces
      ).toBeDefined();
    });
  });

  // ─── staticBiblePieces ───────────────────────────────────────────────────────

  describe("staticBiblePieces / setStaticBiblePieces / clearStaticBiblePieces", () => {
    it("getter returns undefined when no pieces are set", () => {
      expect(makeBible().staticBiblePieces).toBeUndefined();
    });

    it("setStaticBiblePieces stores the pieces and getter returns them", () => {
      const bible = makeBible();
      bible.setStaticBiblePieces(makeStaticPieces());
      expect(bible.staticBiblePieces).toBeDefined();
    });

    it("getter returns a shallow copy — the container object is not the same reference", () => {
      const pieces = makeStaticPieces();
      const bible = makeBible({ staticBiblePieces: pieces });
      expect(bible.staticBiblePieces).not.toBe(pieces);
    });

    it("getter returns pieces with the same piece references inside the copy", () => {
      const pieces = makeStaticPieces();
      const bible = makeBible({ staticBiblePieces: pieces });
      expect(bible.staticBiblePieces?.bibleTransformer).toBe(
        pieces.bibleTransformer
      );
    });

    it("setStaticBiblePieces overwrites previously stored pieces", () => {
      const bible = makeBible({ staticBiblePieces: makeStaticPieces() });
      const newPieces = makeStaticPieces();
      (newPieces as any).bibleTransformer = {
        id: "new-transformer",
        type: "StackTransformer",
        bibleId: "b2",
      };
      bible.setStaticBiblePieces(newPieces);
      expect(bible.staticBiblePieces?.bibleTransformer.id).toBe(
        "new-transformer"
      );
    });

    it("clearStaticBiblePieces returns all piece values as an array", () => {
      const pieces = makeStaticPieces();
      const bible = makeBible({ staticBiblePieces: pieces });
      const released = bible.clearStaticBiblePieces();
      expect(released).toHaveLength(Object.keys(pieces).length);
      expect(released).toContain(pieces.bibleTransformer);
    });

    it("clearStaticBiblePieces sets staticBiblePieces to undefined", () => {
      const bible = makeBible({ staticBiblePieces: makeStaticPieces() });
      bible.clearStaticBiblePieces();
      expect(bible.staticBiblePieces).toBeUndefined();
    });

    it("clearStaticBiblePieces returns undefined when no pieces are set", () => {
      expect(makeBible().clearStaticBiblePieces()).toBeUndefined();
    });

    it("clearStaticBiblePieces returns undefined on a second call", () => {
      const bible = makeBible({ staticBiblePieces: makeStaticPieces() });
      bible.clearStaticBiblePieces();
      expect(bible.clearStaticBiblePieces()).toBeUndefined();
    });
  });

  // ─── getStaticPiece / getStaticPieceId ───────────────────────────────────────

  describe("getStaticPiece / getStaticPieceId", () => {
    it("getStaticPiece returns the piece for the given key", () => {
      const pieces = makeStaticPieces();
      const bible = makeBible({ staticBiblePieces: pieces });
      expect(bible.getStaticPiece("bibleTransformer")).toBe(
        pieces.bibleTransformer
      );
    });

    it("getStaticPiece returns undefined when no pieces are set", () => {
      expect(makeBible().getStaticPiece("bibleTransformer")).toBeUndefined();
    });

    it("getStaticPieceId returns the id of the piece for the given key", () => {
      const pieces = makeStaticPieces();
      const bible = makeBible({ staticBiblePieces: pieces });
      expect(bible.getStaticPieceId("bibleTransformer")).toBe("transformer");
    });

    it("getStaticPieceId returns undefined when no pieces are set", () => {
      expect(makeBible().getStaticPieceId("bibleShadow")).toBeUndefined();
    });
  });

  // ─── currentCrossPosition ────────────────────────────────────────────────────

  describe("currentCrossPosition / changeCrossPosition", () => {
    it("changeCrossPosition updates the stored value", () => {
      const bible = makeBible({ currentCrossPosition: "Top" });
      bible.changeCrossPosition("Middle");
      expect(bible.currentCrossPosition).toBe("Middle");
    });
  });

  // ─── currentStackVizState ────────────────────────────────────────────────────

  describe("currentStackVizState / changeVizState", () => {
    it("changeVizState updates the stored value", () => {
      const bible = makeBible({ currentStackVizState: "Regular" });
      bible.changeVizState("Expanded");
      expect(bible.currentStackVizState).toBe("Expanded");
    });
  });

  // ─── hasBeenSetUp ────────────────────────────────────────────────────────────

  describe("hasBeenSetUp / handleSetup", () => {
    it("handleSetup sets hasBeenSetUp to true", () => {
      const bible = makeBible();
      bible.handleSetup();
      expect(bible.hasBeenSetUp).toBe(true);
    });

    it("handleSetup is idempotent — remains true after multiple calls", () => {
      const bible = makeBible();
      bible.handleSetup();
      bible.handleSetup();
      expect(bible.hasBeenSetUp).toBe(true);
    });
  });

  // ─── currentState ────────────────────────────────────────────────────────────

  describe("currentState / changeState", () => {
    it("changeState stores the new state", () => {
      const bible = makeBible();
      bible.changeState("Open");
      expect(bible.currentState).toBe("Open");
    });

    it("changeState overwrites the previous state", () => {
      const bible = makeBible();
      bible.changeState("Open");
      bible.changeState("Closed");
      expect(bible.currentState).toBe("Closed");
    });
  });

  // ─── getTestamentWithExplodedSection ─────────────────────────────────────────

  describe("getTestamentWithExplodedSection", () => {
    it("returns undefined when there are no testaments", () => {
      expect(makeBible().getTestamentWithExplodedSection()).toBeUndefined();
    });

    it("returns undefined when no section is in exploded view", () => {
      const section = makeSection();
      const testament = makeTestament({ childrenData: [section] });
      expect(
        makeBible({
          childrenData: [testament],
        }).getTestamentWithExplodedSection()
      ).toBeUndefined();
    });

    it("returns the testament whose section is in exploded view", () => {
      const section = makeSection();
      section.changeSelectionState(SelectionEvents.RequestSelect); // → Selected (isExplodable)
      section.tryExplode(); // → isInExplodedView = true
      const testament = makeTestament({ childrenData: [section] });
      const bible = makeBible({ childrenData: [testament] });
      expect(bible.getTestamentWithExplodedSection()).toBe(testament);
    });

    it("returns the first testament that has an exploded section", () => {
      const s1 = makeSection({ id: "s1" });
      s1.changeSelectionState(SelectionEvents.RequestSelect);
      s1.tryExplode();
      const s2 = makeSection({ id: "s2" });
      s2.changeSelectionState(SelectionEvents.RequestSelect);
      s2.tryExplode();
      const t1 = makeTestament({ id: "t1", childrenData: [s1] });
      const t2 = makeTestament({ id: "t2", childrenData: [s2] });
      const bible = makeBible({ childrenData: [t1, t2] });
      expect(bible.getTestamentWithExplodedSection()).toBe(t1);
    });
  });

  // ─── tryExplodeSplitSections ─────────────────────────────────────────────────

  describe("tryExplodeSplitSections", () => {
    it("returns false when there are no testaments", () => {
      expect(makeBible().tryExplodeSplitSections()).toBe(false);
    });

    it("returns false when no section is explodable", () => {
      const section = makeSection(); // Idle → not explodable (needs Selected state)
      const testament = makeTestament({ childrenData: [section] });
      expect(
        makeBible({ childrenData: [testament] }).tryExplodeSplitSections()
      ).toBe(false);
    });

    it("returns true when at least one section can be exploded", () => {
      const section = makeSection();
      section.changeSelectionState(SelectionEvents.RequestSelect); // → Selected → isExplodable
      const testament = makeTestament({ childrenData: [section] });
      expect(
        makeBible({ childrenData: [testament] }).tryExplodeSplitSections()
      ).toBe(true);
    });

    it("sets the explodable section into exploded view after returning true", () => {
      const section = makeSection();
      section.changeSelectionState(SelectionEvents.RequestSelect);
      const testament = makeTestament({ childrenData: [section] });
      makeBible({ childrenData: [testament] }).tryExplodeSplitSections();
      expect(section.isInExplodedView).toBe(true);
    });
  });

  // ─── implodeAllSections ──────────────────────────────────────────────────────

  describe("implodeAllSections", () => {
    it("does nothing when there are no testaments", () => {
      expect(() => makeBible().implodeAllSections()).not.toThrow();
    });

    it("clears isInExplodedView on each section by calling implode()", () => {
      const section = makeSection();
      section.changeSelectionState(SelectionEvents.RequestSelect);
      section.tryExplode(); // → isInExplodedView = true
      const testament = makeTestament({ childrenData: [section] });
      makeBible({ childrenData: [testament] }).implodeAllSections();
      expect(section.isInExplodedView).toBe(false);
    });

    it("does not reset isSplitIntoBooks — selectionState is preserved by implode()", () => {
      const section = makeSection();
      section.changeSelectionState(SelectionEvents.RequestSelect); // → isSplitIntoBooks = true
      const testament = makeTestament({ childrenData: [section] });
      makeBible({ childrenData: [testament] }).implodeAllSections();
      expect(section.isSplitIntoBooks).toBe(true); // implode() does not reset selectionState
    });

    it("clears isInExplodedView across sections in multiple testaments", () => {
      const s1 = makeSection({ id: "s1" });
      const s2 = makeSection({ id: "s2" });
      s1.changeSelectionState(SelectionEvents.RequestSelect);
      s2.changeSelectionState(SelectionEvents.RequestSelect);
      s1.tryExplode();
      s2.tryExplode();
      const t1 = makeTestament({ id: "t1", childrenData: [s1] });
      const t2 = makeTestament({ id: "t2", childrenData: [s2] });
      makeBible({ childrenData: [t1, t2] }).implodeAllSections();
      expect(s1.isInExplodedView).toBe(false);
      expect(s2.isInExplodedView).toBe(false);
    });
  });

  // ─── areAllTestamentsSelected ────────────────────────────────────────────────

  describe("areAllTestamentsSelected", () => {
    it("returns true when there are no testaments (vacuous)", () => {
      expect(makeBible().areAllTestamentsSelected()).toBe(true);
    });

    it("returns false when at least one testament is not split into sections", () => {
      const t1 = makeTestament({ id: "t1", isSplitIntoSections: true });
      const t2 = makeTestament({ id: "t2" }); // not split
      expect(
        makeBible({ childrenData: [t1, t2] }).areAllTestamentsSelected()
      ).toBe(false);
    });

    it("returns true when all testaments are split into sections", () => {
      const t1 = makeTestament({ id: "t1", isSplitIntoSections: true });
      const t2 = makeTestament({ id: "t2", isSplitIntoSections: true });
      expect(
        makeBible({ childrenData: [t1, t2] }).areAllTestamentsSelected()
      ).toBe(true);
    });
  });

  // ─── isEmpty ─────────────────────────────────────────────────────────────────

  describe("isEmpty", () => {
    it("returns true when there are no testaments (vacuous)", () => {
      expect(makeBible().isEmpty()).toBe(true);
    });

    it("returns true when all testaments are inactive (Idle, not active)", () => {
      const t1 = makeTestament({ id: "t1" }); // isActive=false
      const t2 = makeTestament({ id: "t2" });
      expect(makeBible({ childrenData: [t1, t2] }).isEmpty()).toBe(true);
    });

    it("returns false when at least one testament is active", () => {
      const t1 = makeTestament({ id: "t1", isActive: true });
      expect(makeBible({ childrenData: [t1] }).isEmpty()).toBe(false);
    });

    it("returns false when a split testament has an active section", () => {
      const section = makeSection();
      section.changeSelectionState(SelectionEvents.RequestSelect); // section selectionState !== Idle
      const testament = makeTestament({
        isSplitIntoSections: true,
        childrenData: [section],
      });
      expect(makeBible({ childrenData: [testament] }).isEmpty()).toBe(false);
    });
  });

  // ─── getAllSectionsData ───────────────────────────────────────────────────────

  describe("getAllSectionsData", () => {
    it("returns an empty array when there are no testaments", () => {
      expect(makeBible().getAllSectionsData()).toEqual([]);
    });

    it("returns an empty array when testaments have no sections", () => {
      expect(
        makeBible({ childrenData: [makeTestament()] }).getAllSectionsData()
      ).toEqual([]);
    });

    it("returns all sections from a single testament", () => {
      const s1 = makeSection({ id: "s1" });
      const s2 = makeSection({ id: "s2" });
      const testament = makeTestament({ childrenData: [s1, s2] });
      expect(
        makeBible({ childrenData: [testament] }).getAllSectionsData()
      ).toEqual([s1, s2]);
    });

    it("concatenates sections from multiple testaments", () => {
      const s1 = makeSection({ id: "s1" });
      const s2 = makeSection({ id: "s2" });
      const t1 = makeTestament({ id: "t1", childrenData: [s1] });
      const t2 = makeTestament({ id: "t2", childrenData: [s2] });
      expect(
        makeBible({ childrenData: [t1, t2] }).getAllSectionsData()
      ).toEqual([s1, s2]);
    });
  });

  // ─── getExplodeAnimationPlan ─────────────────────────────────────────────────

  describe("getExplodeAnimationPlan", () => {
    it("returns an empty array when there are no testaments", () => {
      expect(makeBible().getExplodeAnimationPlan()).toEqual([]);
    });

    it("includes SelectTestament for a selectable testament (active + Idle) that has a piece", () => {
      const piece = makeTestamentPiece();
      const testament = makeTestament({ isActive: true, piece }); // Idle + active = selectable
      const plan = makeBible({
        childrenData: [testament],
      }).getExplodeAnimationPlan();
      expect(plan).toContainEqual({
        action: ExplodeStackActions.SelectTestament,
        piece,
      });
    });

    it("does not include SelectTestament when the testament has no piece", () => {
      const testament = makeTestament({ isActive: true }); // selectable but no piece
      const plan = makeBible({
        childrenData: [testament],
      }).getExplodeAnimationPlan();
      expect(
        plan.filter((c) => c.action === ExplodeStackActions.SelectTestament)
      ).toHaveLength(0);
    });

    it("does not include SelectTestament when the testament is not active (not selectable)", () => {
      const testament = makeTestament({ piece: makeTestamentPiece() }); // inactive → not selectable
      const plan = makeBible({
        childrenData: [testament],
      }).getExplodeAnimationPlan();
      expect(
        plan.filter((c) => c.action === ExplodeStackActions.SelectTestament)
      ).toHaveLength(0);
    });

    it("includes SelectSection for a section in Idle state that has a piece", () => {
      const sectionPiece = makeSectionPiece();
      const section = makeSection({ piece: sectionPiece }); // Idle → isSelectable
      const testament = makeTestament({ childrenData: [section] });
      const plan = makeBible({
        childrenData: [testament],
      }).getExplodeAnimationPlan();
      expect(plan).toContainEqual({
        action: ExplodeStackActions.SelectSection,
        piece: sectionPiece,
      });
    });

    it("includes ExplodeSection for a section that is explodable (Selected + not in exploded view)", () => {
      const sectionPiece = makeSectionPiece();
      const section = makeSection({ piece: sectionPiece });
      section.changeSelectionState(SelectionEvents.RequestSelect); // → Selected → isExplodable
      const testament = makeTestament({ childrenData: [section] });
      const plan = makeBible({
        childrenData: [testament],
      }).getExplodeAnimationPlan();
      expect(plan).toContainEqual({
        action: ExplodeStackActions.ExplodeSection,
        piece: sectionPiece,
      });
    });

    it("processes testaments in reversed order", () => {
      const piece1 = makeTestamentPiece("p1");
      const piece2 = makeTestamentPiece("p2");
      const t1 = makeTestament({ id: "t1", isActive: true, piece: piece1 });
      const t2 = makeTestament({ id: "t2", isActive: true, piece: piece2 });
      const bible = makeBible({ childrenData: [t1, t2] });
      const plan = bible.getExplodeAnimationPlan();
      const cmds = plan.filter(
        (c) => c.action === ExplodeStackActions.SelectTestament
      );
      expect(cmds[0]!.piece).toBe(piece2); // t2 first (reversed)
      expect(cmds[1]!.piece).toBe(piece1); // t1 second
    });
  });

  // ─── getActiveHierarchy ──────────────────────────────────────────────────────

  describe("getActiveHierarchy", () => {
    it("returns empty lists when there are no testaments", () => {
      const result = makeBible().getActiveHierarchy();
      expect(result.testamentsData).toEqual([]);
      expect(result.sectionsData).toEqual([]);
      expect(result.booksData).toEqual([]);
    });

    it("includes an active, non-split testament in testamentsData", () => {
      const testament = makeTestament({ isActive: true }); // isSplitIntoSections = false
      const result = makeBible({
        childrenData: [testament],
      }).getActiveHierarchy();
      expect(result.testamentsData).toContain(testament);
    });

    it("excludes an inactive, non-split testament from all lists", () => {
      const testament = makeTestament(); // isActive=false
      const result = makeBible({
        childrenData: [testament],
      }).getActiveHierarchy();
      expect(result.testamentsData).toEqual([]);
    });

    it("excludes a split testament from testamentsData even if it is active", () => {
      const testament = makeTestament({
        isActive: true,
        isSplitIntoSections: true,
      });
      const result = makeBible({
        childrenData: [testament],
      }).getActiveHierarchy();
      expect(result.testamentsData).toEqual([]);
    });

    it("includes an active section in sectionsData when its testament is split", () => {
      const section = makeSection();
      section.activate();
      const testament = makeTestament({
        isSplitIntoSections: true,
        childrenData: [section],
      });
      const result = makeBible({
        childrenData: [testament],
      }).getActiveHierarchy();
      expect(result.sectionsData).toContain(section);
    });

    it("excludes an inactive section from sectionsData", () => {
      const section = makeSection(); // isActive=false
      const testament = makeTestament({
        isSplitIntoSections: true,
        childrenData: [section],
      });
      const result = makeBible({
        childrenData: [testament],
      }).getActiveHierarchy();
      expect(result.sectionsData).toEqual([]);
    });

    it("includes active books in booksData when section is a StackSectionData split into books", () => {
      const book = makeBook({ isActive: true });
      const section = makeSection({ childrenData: [[book]] });
      section.changeSelectionState(SelectionEvents.RequestSelect); // → isSplitIntoBooks = true
      section.activate(); // section must be active to enter sectionsData
      const testament = makeTestament({
        isSplitIntoSections: true,
        childrenData: [section],
      });
      const result = makeBible({
        childrenData: [testament],
      }).getActiveHierarchy();
      expect(result.booksData).toContain(book);
    });

    it("excludes inactive books from booksData", () => {
      const book = makeBook(); // isActive=false
      const section = makeSection({ childrenData: [[book]] });
      section.changeSelectionState(SelectionEvents.RequestSelect); // → isSplitIntoBooks = true
      section.activate();
      const testament = makeTestament({
        isSplitIntoSections: true,
        childrenData: [section],
      });
      const result = makeBible({
        childrenData: [testament],
      }).getActiveHierarchy();
      expect(result.booksData).toEqual([]);
    });

    it("does not add books to booksData when section is not split into books", () => {
      const book = makeBook({ isActive: true });
      const section = makeSection({ childrenData: [[book]] }); // isSplitIntoBooks = false (Idle)
      section.activate();
      const testament = makeTestament({
        isSplitIntoSections: true,
        childrenData: [section],
      });
      const result = makeBible({
        childrenData: [testament],
      }).getActiveHierarchy();
      expect(result.booksData).toEqual([]);
    });
  });
});
