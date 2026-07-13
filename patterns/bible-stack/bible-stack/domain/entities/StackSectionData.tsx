import { StackPieceData } from "./StackPieceData";
import { StackBookData } from "./StackBookData";
import type {
  BiblePiece,
  ParentDataIds,
  SectionShadow,
  StackSectionCreationParams,
} from "../models/canvas";
import type { SectionInfo, BookInfo } from "../models/arrangement";
import type { Piece } from "../models/canvas";
import {
  SelectionStates,
  SelectionEvents,
  simpleSelectionFSM,
} from "../models/selection";
import type { ActiveBibleHierarchy } from "./StackBibleData";

interface DataParams {
  childrenData?: StackBookData[][];
  id: string;
  piece?: Piece<"StackSection">;
  pieceInfo: SectionInfo;
  parentDataIds: ParentDataIds;
  isSplitIntoBooks?: boolean;
  isInExplodedView?: boolean;
  isInsideBible?: boolean;
  isInsideTestament?: boolean;
  creationParams: StackSectionCreationParams;
  isActive?: boolean;
}

export class StackSectionData extends StackPieceData<
  StackBookData[],
  SectionInfo,
  StackSectionCreationParams,
  "StackSection"
> {
  #isInExplodedView: DataParams["isInExplodedView"];
  #isInsideTestament: DataParams["isInsideTestament"];
  #shadow: SectionShadow | undefined;

  constructor({
    childrenData = [],
    id,
    piece,
    pieceInfo,
    parentDataIds,
    isSplitIntoBooks = false,
    isInExplodedView = false,
    isInsideBible = true,
    isInsideTestament = true,
    isActive = false,
    creationParams,
  }: DataParams) {
    super({
      childrenData,
      id,
      piece,
      pieceInfo,
      parentDataIds,
      isInsideBible,
      isActive,
      creationParams,
      isHidden: false,
      type: "StackSection",
      selectionFSM: simpleSelectionFSM,
    });
    if (isSplitIntoBooks) {
      this.changeSelectionState(SelectionEvents.RequestSelect);
    }
    this.#isInExplodedView = isInExplodedView;
    this.#isInsideTestament = isInsideTestament;
  }

  get isSplitIntoBooks() {
    return this.selectionState !== SelectionStates.Idle;
  }
  get isInExplodedView() {
    return this.#isInExplodedView;
  }
  explode() {
    this.#isInExplodedView = true;
  }
  implode() {
    this.#isInExplodedView = false;
  }
  get isInsideTestament() {
    return this.#isInsideTestament;
  }
  attachToTestament() {
    this.#isInsideTestament = true;
  }
  detachFromTestament() {
    this.#isInsideTestament = false;
  }
  get shadow() {
    return this.#shadow;
  }
  attachShadow(shadow: SectionShadow) {
    this.#shadow = shadow;
  }
  detachShadow(): SectionShadow | undefined {
    let shadow: SectionShadow | undefined;
    if (this.#shadow) {
      shadow = this.#shadow;
      this.#shadow = undefined;
    }
    return shadow;
  }
  tryReplaceBook(currBook: StackBookData, newBook: StackBookData): boolean {
    for (const bookGroup of this.childrenData) {
      const index = bookGroup.indexOf(currBook);
      if (index >= 0) {
        bookGroup.splice(index, 1, newBook);
        return true;
      }
    }
    return false;
  }
  getArrangementIndex(): DataParams["creationParams"]["arrangementIndex"] {
    return this.creationParams.arrangementIndex;
  }
  getTestamentIndex(): DataParams["creationParams"]["testamentIndex"] {
    return this.creationParams.testamentIndex;
  }
  getSectionIndex(): DataParams["creationParams"]["sectionIndex"] {
    return this.creationParams.sectionIndex;
  }
  override resetHierarchy(clearPiece: boolean = true): Piece[] {
    const piecesToRelease: Piece[] = [];
    const shadow = this.detachShadow();
    this.implode();
    this.resetSelectionState();
    if (shadow) {
      piecesToRelease.push(shadow);
    }
    piecesToRelease.push(...super.resetHierarchy(clearPiece));
    return piecesToRelease;
  }
  tryExplode(): boolean {
    if (
      this.selectionState !== SelectionStates.Idle &&
      !this.isInExplodedView
    ) {
      this.explode();
      return true;
    }
    return false;
  }
  isExplodable(): boolean {
    return (
      this.selectionState !== SelectionStates.Idle && !this.isInExplodedView
    );
  }
  isSelectable(): boolean {
    return this.selectionState === SelectionStates.Idle;
  }
  getActivelySelectedBooks(): StackBookData[] {
    return this.childrenData.flat().filter((bookData) => {
      return bookData.isActivelySelected();
    });
  }
  clearChildrenPieces(): Piece[] {
    const pieces = this.childrenData
      .flat()
      .filter((book) => {
        return book.piece;
      })
      .map((book) => {
        return book.clearPiece();
      }) as Piece[];
    return pieces;
  }
  findBookByPieceInfoProperty<K extends keyof BookInfo>(
    property: K,
    value: BookInfo[K]
  ): StackBookData | undefined {
    return this.childrenData.flat().find((book) => {
      return book.getPieceInfoProperty(property) === value;
    });
  }
  getActiveBooks(): StackBookData[] {
    return this.childrenData.flat().filter((book) => book.isActive);
  }
  getReversedActiveBooks(): StackBookData[] {
    return this.getReversedChildren()
      .flat()
      .filter((book) => book.isActive);
  }
  getActiveBookPieces(): Piece[] {
    return this.childrenData
      .flat()
      .filter((bookData) => {
        return bookData.isActive && bookData.piece;
      })
      .map((bookData) => bookData.piece as Piece);
  }

  collectActiveHierarchy(hierarchy: ActiveBibleHierarchy) {
    if (!this.isActive) return;

    hierarchy.sectionsData.push(this);

    if (this.isSplitIntoBooks) {
      for (const bookData of this.childrenData.flat()) {
        bookData.collectActiveHierarchy(hierarchy);
      }
    }
  }

  hasActiveContent(stopAtLayer?: BiblePiece): boolean {
    if (this.type === stopAtLayer) {
      return this.isActive || this.selectionState !== SelectionStates.Idle;
    }

    if (this.isSplitIntoBooks) {
      return this.childrenData.flat().some((book) => book.hasActiveContent());
    }

    return this.isActive;
  }

  getHighlightedChildren(): StackBookData[] {
    const highlighted: StackBookData[] = [];

    for (const children of this.childrenData) {
      if (children instanceof StackPieceData) {
        for (const bookData of children) {
          if (bookData.highlightState === "Highlighted") {
            highlighted.push(bookData);
          }
        }
      }
    }

    return highlighted;
  }

  getActivelyHighlightedChildren(): StackBookData[] {
    const highlighted = this.getHighlightedChildren();

    const activelyHighlighted: StackBookData[] = highlighted.filter(
      (child) => child.isActive
    );

    return activelyHighlighted;
  }
}
