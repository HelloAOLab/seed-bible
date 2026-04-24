import { StackPieceData } from "bibleVizUtils.domain.entities.StackPieceData";
import { StackChapterData } from "bibleVizUtils.domain.entities.StackChapterData";
import {
  type ParentDataIds,
  type BookShapeType,
  type StackSectionCreationParams,
  BookShape,
} from "bibleVizUtils.domain.models.canvas";
import type {
  BookInfo,
  SectionInfo,
} from "bibleVizUtils.domain.models.arrangement";
import type { Piece } from "bibleVizUtils.domain.models.canvas";

interface DataParams {
  childrenData?: StackChapterData[];
  id: string;
  piece?: Piece<"StackSectionBook">;
  pieceInfo: SectionInfo;
  pieceBookInfo: BookInfo;
  parentDataIds?: ParentDataIds;
  isSelected?: boolean;
  currentShape?: BookShapeType;
  isSplitIntoBooks?: boolean;
  isInExplodedView?: boolean;
  isInsideBible?: boolean;
  isInsideTestament?: boolean;
  creationParams: StackSectionCreationParams;
  isActive?: boolean;
}
export class StackSectionBookData extends StackPieceData<
  StackChapterData,
  SectionInfo,
  StackSectionCreationParams,
  "StackSectionBook"
> {
  #isSelected: DataParams["isSelected"];
  #currentShape: DataParams["currentShape"];
  #queuedChapterData: StackChapterData | undefined;
  #currentSelectedChapterData: StackChapterData | undefined;
  #isInsideTestament: DataParams["isInsideTestament"];
  #pieceBookInfo: DataParams["pieceBookInfo"];
  #previousHighlightedChapterData: StackChapterData | undefined;

  constructor({
    childrenData = [],
    id,
    piece,
    pieceInfo,
    pieceBookInfo,
    parentDataIds = undefined,
    isSelected = false,
    currentShape,
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
      type: "StackSectionBook",
    });
    this.#isSelected = isSelected;
    this.#currentShape = currentShape;
    this.#isInsideTestament = isInsideTestament;
    this.#pieceBookInfo = pieceBookInfo;
    this.#isSelected = isSelected;
  }

  get isSelected() {
    return this.#isSelected;
  }
  select() {
    this.#isSelected = true;
  }
  deselect() {
    this.#isSelected = false;
  }
  get currentShape() {
    return this.#currentShape;
  }
  changeShape(shape: DataParams["currentShape"]) {
    this.#currentShape = shape;
  }
  get queuedChapterData() {
    return this.#queuedChapterData;
  }
  setQueuedChapterData(data: StackChapterData) {
    this.#queuedChapterData = data;
  }
  clearQueuedChapterData() {
    this.#queuedChapterData = undefined;
  }
  get currentSelectedChapterData() {
    return this.#currentSelectedChapterData;
  }
  setSelectedChapterData(data: StackChapterData) {
    this.#currentSelectedChapterData = data;
  }
  clearSelectedChapterData() {
    this.#currentSelectedChapterData = undefined;
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
  get pieceBookInfo() {
    return this.#pieceBookInfo;
  }

  getPieceBookInfoProperty: <K extends keyof DataParams["pieceBookInfo"]>(
    key: K
  ) => DataParams["pieceBookInfo"][K] = (key) => {
    return this.#pieceBookInfo[key];
  };
  tryReplaceChild(
    currChild: StackChapterData,
    newChild: StackChapterData
  ): boolean {
    const wasReplaced = super.tryReplaceChild(currChild, newChild);

    if (wasReplaced) {
      if (this.currentSelectedChapterData === currChild) {
        this.clearSelectedChapterData();
      }
      if (this.#previousHighlightedChapterData === currChild) {
        this.#previousHighlightedChapterData = undefined;
      }
    }

    return wasReplaced;
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
  resetHierarchy(clearPiece: boolean = true): Piece[] {
    this.deselect();
    this.clearQueuedChapterData();
    this.clearSelectedChapterData();
    this.changeShape(BookShape.Regular);

    return super.resetHierarchy(clearPiece);
  }
  isPieceAvailable(): boolean {
    return !this.#isSelected && super.isPieceAvailable();
  }

  isChapterAvailable(chapterNumber: number): boolean {
    const chapterData = this.childrenData[chapterNumber - 1];

    return !!chapterData && !chapterData.isHidden;
  }
}
