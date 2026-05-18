import { StackPieceData } from "bibleVizUtils.domain.entities.StackPieceData";
import { StackBookData } from "bibleVizUtils.domain.entities.StackBookData";
import type {
  ParentDataIds,
  StackSectionCreationParams,
} from "bibleVizUtils.domain.models.canvas";
import type {
  SectionInfo,
  BookInfo,
} from "bibleVizUtils.domain.models.arrangement";
import type { Piece } from "bibleVizUtils.domain.models.canvas";

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
  #isSplitIntoBooks: DataParams["isSplitIntoBooks"];
  #isInExplodedView: DataParams["isInExplodedView"];
  #isInsideTestament: DataParams["isInsideTestament"];
  #shadow: Piece<"StackSectionShadow"> | undefined;

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
    });
    this.#isSplitIntoBooks = isSplitIntoBooks;
    this.#isInExplodedView = isInExplodedView;
    this.#isInsideTestament = isInsideTestament;
  }

  get isSplitIntoBooks() {
    return this.#isSplitIntoBooks;
  }
  split() {
    this.#isSplitIntoBooks = true;
  }
  combine() {
    this.#isSplitIntoBooks = false;
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
  attachShadow(shadow: Piece<"StackSectionShadow">) {
    this.#shadow = shadow;
  }
  detachShadow(): Piece<"StackSectionShadow"> | undefined {
    let shadow: Piece<"StackSectionShadow"> | undefined;
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
    this.combine();
    if (shadow) {
      piecesToRelease.push(shadow);
    }
    piecesToRelease.push(...super.resetHierarchy(clearPiece));

    return piecesToRelease;
  }
  tryExplode(): boolean {
    if (this.isSplitIntoBooks && !this.isInExplodedView) {
      this.explode();
      return true;
    }
    return false;
  }
  isExplodable(): boolean {
    return !!this.isSplitIntoBooks && !this.isInExplodedView;
  }
  isSplittable(): boolean {
    return !this.isSplitIntoBooks;
  }
  override isPieceAvailable(): boolean {
    return !this.isSplitIntoBooks && super.isPieceAvailable();
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
  getActiveBookPieces(): Piece[] {
    return this.childrenData
      .flat()
      .filter((bookData) => {
        return bookData.isActive && bookData.piece;
      })
      .map((bookData) => bookData.piece as Piece);
  }
}
