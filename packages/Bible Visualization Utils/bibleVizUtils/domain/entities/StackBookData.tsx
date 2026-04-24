import { StackPieceData } from "bibleVizUtils.domain.entities.StackPieceData";
import { StackChapterData } from "bibleVizUtils.domain.entities.StackChapterData";
import type {
  ParentDataIds,
  BookShapeType,
  StackBookCreationParams,
} from "bibleVizUtils.domain.models.canvas";
import type {
  BookInfo,
  ChapterInfo,
} from "bibleVizUtils.domain.models.arrangement";
import type { Piece } from "bibleVizUtils.domain.models.canvas";

interface DataParams {
  childrenData?: StackChapterData[];
  id: string;
  piece?: Piece<"StackBook">;
  pieceInfo: BookInfo;
  parentDataIds?: ParentDataIds;
  isSelected?: boolean;
  currentShape?: BookShapeType;
  isSplitIntoBooks?: boolean;
  isInExplodedView?: boolean;
  isInsideBible?: boolean;
  isInsideTestament?: boolean;
  isInsideSection?: boolean;
  creationParams: StackBookCreationParams;
  isActive?: boolean;
}

export class StackBookData extends StackPieceData<
  StackChapterData,
  BookInfo,
  StackBookCreationParams,
  "StackBook"
> {
  #isSelected: DataParams["isSelected"];
  #currentShape: DataParams["currentShape"];
  #queuedChapterData: StackChapterData | undefined;
  #currentSelectedChapterData: StackChapterData | undefined;
  #isInsideTestament: DataParams["isInsideTestament"];
  #isInsideSection: DataParams["isInsideSection"];
  #previousHighlightedChapterData: StackChapterData | undefined;

  constructor({
    childrenData = [],
    id,
    piece,
    pieceInfo,
    parentDataIds = undefined,
    isSelected = false,
    currentShape,
    isInsideBible = true,
    isInsideTestament = true,
    isInsideSection = true,
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
      type: "StackBook",
    });
    this.#isSelected = isSelected;
    this.#currentShape = currentShape;
    this.#isInsideTestament = isInsideTestament;
    this.#isInsideSection = isInsideSection;
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
  changeShape(shape: BookShapeType) {
    this.#currentShape = shape;
  }
  clearShape() {
    this.#currentShape = undefined;
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
  get isInsideSection() {
    return this.#isInsideSection;
  }
  attachToSection() {
    this.#isInsideSection = true;
  }
  detachFromSection() {
    this.#isInsideSection = false;
  }
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
  getLevelIndex(): DataParams["creationParams"]["levelIndex"] {
    return this.creationParams.levelIndex;
  }
  getBookIndex(): DataParams["creationParams"]["bookIndex"] {
    return this.creationParams.bookIndex;
  }
  getBookLevelIndex(): DataParams["creationParams"]["bookLevelIndex"] {
    return this.creationParams.bookLevelIndex;
  }
  getLevelsLength(): DataParams["creationParams"]["levelsLenght"] {
    return this.creationParams.levelsLenght;
  }
  resetHierarchy(clearPiece: boolean = true): Piece[] {
    this.deselect();
    this.clearQueuedChapterData();
    this.clearSelectedChapterData();
    this.clearShape();
    this.deactivate();

    return super.resetHierarchy(clearPiece);
  }
  isPieceAvailable(): boolean {
    return !this.#isSelected && super.isPieceAvailable();
  }
  isActivelySelected(): boolean {
    return !!this.isActive && !!this.isSelected;
  }
  findChapterByPieceInfoProperty<K extends keyof ChapterInfo>(
    property: K,
    value: ChapterInfo[K]
  ): StackChapterData | undefined {
    return this.childrenData.find((chapter) => {
      return chapter.getPieceInfoProperty(property) === value;
    });
  }

  isChapterAvailable(chapterNumber: number): boolean {
    const chapterData = this.childrenData[chapterNumber - 1];

    return !!chapterData && !chapterData.isHidden;
  }
}
