import { StackBookBaseData } from "bibleVizUtils.domain.entities.StackBookBaseData";
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
  isInsideBible?: boolean;
  isInsideTestament?: boolean;
  creationParams: StackSectionCreationParams;
  isActive?: boolean;
}

export class StackSectionBookData extends StackBookBaseData<
  SectionInfo,
  StackSectionCreationParams,
  "StackSectionBook"
> {
  #pieceBookInfo: DataParams["pieceBookInfo"];

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
      isSelected,
      currentShape,
      isInsideBible,
      isInsideTestament,
      isActive,
      creationParams,
      type: "StackSectionBook",
    });
    this.#pieceBookInfo = pieceBookInfo;
  }

  get pieceBookInfo() {
    return this.#pieceBookInfo;
  }

  getPieceBookInfoProperty: <K extends keyof DataParams["pieceBookInfo"]>(
    key: K
  ) => DataParams["pieceBookInfo"][K] = (key) => {
    return this.#pieceBookInfo[key];
  };

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
    this.changeShape(BookShape.Regular);
    return super.resetHierarchy(clearPiece);
  }
}
