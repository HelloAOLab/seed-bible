import { StackBookBaseData } from "bibleVizUtils.domain.entities.StackBookBaseData";
import { StackChapterData } from "bibleVizUtils.domain.entities.StackChapterData";
import { SelectionStates } from "bibleVizUtils.domain.models.selection";
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
import type { ActiveBibleHierarchy } from "./StackBibleData";

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

export class StackBookData extends StackBookBaseData<
  BookInfo,
  StackBookCreationParams,
  "StackBook"
> {
  #isInsideSection: DataParams["isInsideSection"];

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
      isSelected,
      currentShape,
      isInsideBible,
      isInsideTestament,
      isActive,
      creationParams,
      type: "StackBook",
    });
    this.#isInsideSection = isInsideSection;
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

  override resetHierarchy(clearPiece: boolean = true): Piece[] {
    this.clearShape();
    this.deactivate();
    return super.resetHierarchy(clearPiece);
  }

  isActivelySelected(): boolean {
    return !!this.isActive && this.selectionState === SelectionStates.Selected;
  }

  findChapterByPieceInfoProperty<K extends keyof ChapterInfo>(
    property: K,
    value: ChapterInfo[K]
  ): StackChapterData | undefined {
    return this.childrenData.find((chapter) => {
      return chapter.getPieceInfoProperty(property) === value;
    });
  }

  collectActiveHierarchy(hierarchy: ActiveBibleHierarchy) {
    if (this.isActive) hierarchy.booksData.push(this);
  }

  hasActiveContent() {
    return this.isActive;
  }
}
