import { StackBookBaseData } from "./StackBookBaseData";
import { StackChapterData } from "./StackChapterData";
import {
  type ParentDataIds,
  type BookShape,
  type StackSectionCreationParams,
  BookShapes,
} from "../models/canvas";
import type { BookInfo, SectionInfo } from "../models/arrangement";
import type { Piece } from "../models/canvas";
import type { ActiveBibleHierarchy } from "./StackBibleData";

interface DataParams {
  childrenData?: StackChapterData[];
  id: string;
  piece?: Piece<"StackSectionBook">;
  pieceInfo: SectionInfo;
  pieceBookInfo: BookInfo;
  parentDataIds?: ParentDataIds;
  isSelected?: boolean;
  currentShape?: BookShape;
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
    this.changeShape(BookShapes.Regular);
    return super.resetHierarchy(clearPiece);
  }

  collectActiveHierarchy(hierarchy: ActiveBibleHierarchy) {
    if (this.isActive) hierarchy.sectionsData.push(this);
  }

  hasActiveContent() {
    return this.isActive;
  }
}
