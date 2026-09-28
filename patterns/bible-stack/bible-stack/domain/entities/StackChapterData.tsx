import { StackPieceData } from "./StackPieceData";
import type {
  ParentDataIds,
  ChapterCreationParams,
  BiblePiece,
  ActivityIndicator,
  ActivityNotification,
} from "../models/canvas";
import type { ChapterInfo } from "../models/arrangement";
import type { HexString } from "../models/commonTypes";
import type { Piece } from "../models/canvas";
import type { Point2D } from "../models/commonTypes";
import type { VersesBundleData } from "./VersesBundleData";
import { SelectionEvents, SelectionStates } from "../models/selection";

interface DataParams {
  isSelected?: boolean;
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
  childrenData?: VersesBundleData[];
}

type HighlightInfo = {
  key: string;
  typeOfPiece: BiblePiece;
  color: HexString;
};

export class StackChapterData extends StackPieceData<
  VersesBundleData,
  ChapterInfo,
  ChapterCreationParams,
  "StackChapter"
> {
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
    childrenData,
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
      childrenData,
    });
    this.#isInsideBook = isInsideBook;
    if (isSelected) {
      this.changeSelectionState(SelectionEvents.RequestSelect);
    }
    this.#isExpanded = isExpanded;
    this.#activityIndicators = activityIndicators;
    this.#activityNotification = activityNotification;
  }

  override resetData() {
    super.resetData();
    this.#isInsideBook = undefined;
  }

  addHighlightInfo(newHighlightInfo: HighlightInfo) {
    this.#highlightsInfo.push(newHighlightInfo);
  }

  getHighlightInfoByKey(key: string) {
    return this.#highlightsInfo.find((highlightInfo) => {
      return highlightInfo.key === key;
    });
  }

  get isSelected() {
    return this.selectionState === SelectionStates.Selected;
  }

  getIsSelectedForNotification(): boolean {
    return this.#isExpanded;
  }

  getNotificationDirection(): Point2D {
    return new Vector2(1, -1);
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
  override resetHierarchy(): Piece[] {
    this.show();
    return super.resetHierarchy();
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
    return undefined;
  }
  addActivityIndicator(indicator: ActivityIndicator) {
    if (!this.#activityIndicators.has(indicator.id)) {
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
