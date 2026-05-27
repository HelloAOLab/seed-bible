import type {
  Vector2 as Vector2Type,
  Bot,
} from "../../../../../typings/AuxLibraryDefinitions";
import { StackPieceData } from "bibleVizUtils.models.entities.StackPieceData";
import type {
  ParentDataIds,
  StackChapterCreationParams,
  BiblePieceType,
} from "bibleVizUtils.models.canvas";
import type { ChapterInfo } from "bibleVizUtils.data.BibleVizDataRepository";
import type { HexString } from "bibleVizUtils.models.commonTypes";

interface DataParams {
  isSelected: boolean;
  id: string;
  piece?: Bot;
  pieceInfo: ChapterInfo;
  parentDataIds: ParentDataIds;
  isInsideBible: boolean;
  isInsideBook?: boolean;
  isActive?: boolean;
  isHidden?: boolean;
  creationParams: StackChapterCreationParams;
}

type HighlightInfo = {
  key: string;
  typeOfPiece: BiblePieceType;
  color: HexString;
};

export class StackChapterData extends StackPieceData<
  never,
  ChapterInfo,
  StackChapterCreationParams
> {
  #isSelected: DataParams["isSelected"];
  #highlightsInfo: HighlightInfo[] = [];
  #isInsideBook: DataParams["isInsideBook"];

  constructor({
    isSelected,
    id,
    piece,
    pieceInfo,
    parentDataIds,
    isInsideBible = true,
    isInsideBook = true,
    isHidden = false,
    creationParams,
  }: DataParams) {
    super({
      id,
      piece,
      pieceInfo,
      parentDataIds,
      isInsideBible,
      isHidden,
      creationParams,
      isActive: false,
    });
    this.#isInsideBook = isInsideBook;
    this.#isSelected = isSelected;
  }

  resetData() {
    super.resetData();
    this.#isInsideBook = undefined;
    this.#isSelected = false;
  }

  addHighlightInfo(newHighlightInfo: HighlightInfo) {
    this.#highlightsInfo.push(newHighlightInfo);
  }

  getHighlightInfoByKey(key: string) {
    return this.#highlightsInfo.find((highlightInfo) => {
      return highlightInfo.key === key;
    });
  }

  getIsSelectedForNotification(): boolean {
    return !!this.piece?.masks.isExpanded;
  }

  getNotificationDirection(): Vector2Type {
    return new Vector2(1, -1);
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
  get isInsideBook() {
    return this.#isInsideBook;
  }
  attachToBook() {
    this.#isInsideBook = true;
  }
  detachFromBook() {
    this.#isInsideBook = false;
  }
  resetHierarchy(): Bot[] {
    this.show();
    return [];
  }
}
