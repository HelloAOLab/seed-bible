import { StackPieceData } from "bibleVizUtils.domain.entities.StackPieceData";
import type {
  ParentDataIds,
  ChapterCreationParams,
  BiblePieceType,
  ActivityIndicator,
  ActivityNotification,
} from "bibleVizUtils.domain.models.canvas";
import type { ChapterInfo } from "bibleVizUtils.domain.models.arrangement";
import type { HexString } from "bibleVizUtils.domain.models.commonTypes";
import type { Piece } from "bibleVizUtils.domain.models.canvas";
import type { Point2D } from "bibleVizUtils.domain.models.commonTypes";

interface DataParams {
  isSelected: boolean;
  id: string;
  piece?: Piece<"StackChapter">;
  pieceInfo: ChapterInfo;
  parentDataIds: ParentDataIds;
  isInsideBible: boolean;
  isInsideBook?: boolean;
  isActive?: boolean;
  isHidden?: boolean;
  creationParams: ChapterCreationParams;
  isExpanded?: boolean;
  activityIndicators?: Map<ActivityIndicator["id"], ActivityIndicator>;
  activityNotification?: ActivityNotification;
}

type HighlightInfo = {
  key: string;
  typeOfPiece: BiblePieceType;
  color: HexString;
};

export class StackChapterData extends StackPieceData<
  never,
  ChapterInfo,
  ChapterCreationParams,
  "StackChapter"
> {
  #isSelected: DataParams["isSelected"];
  #highlightsInfo: HighlightInfo[] = [];
  #isInsideBook: DataParams["isInsideBook"];
  #isExpanded: NonNullable<boolean>;
  #activityIndicators: NonNullable<DataParams["activityIndicators"]>;
  #activityNotification: DataParams["activityNotification"];

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
    isExpanded = false,
    activityIndicators = new Map(),
    activityNotification,
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
      type: "StackChapter",
    });
    this.#isInsideBook = isInsideBook;
    this.#isSelected = isSelected;
    this.#isExpanded = isExpanded;
    this.#activityIndicators = activityIndicators;
    this.#activityNotification = activityNotification;
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
    return this.#isExpanded;
  }

  getNotificationDirection(): Point2D {
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
  resetHierarchy(): Piece[] {
    this.show();
    return [];
  }

  get activityIndicators() {
    return [...this.#activityIndicators.values()];
  }
  clearActivityIndicators() {
    if (this.#activityIndicators.size > 0) {
      const indicators = [...this.#activityIndicators.values()];
      this.#activityIndicators.clear();
      return indicators;
    }
  }
  addActivityIndicator(indicator: ActivityIndicator) {
    if (this.#activityIndicators.has(indicator.id)) {
      this.#activityIndicators.set(indicator.id, indicator);
    }
  }
  removeActivityIndicator(indicatorId: ActivityIndicator["id"]) {
    this.#activityIndicators.delete(indicatorId);
  }

  get activityNotification() {
    return this.#activityNotification;
  }

  attachActivityNotification(notification: ActivityNotification) {
    if (!this.#activityNotification) {
      this.#activityNotification = notification;
    }
  }

  detachActivityNotification() {
    const notification = this.#activityNotification;
    if (notification) {
      this.#activityNotification = undefined;
      return notification;
    }
    return undefined;
  }
}
