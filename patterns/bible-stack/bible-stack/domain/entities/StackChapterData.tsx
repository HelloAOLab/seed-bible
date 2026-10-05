import { StackPieceData } from "./StackPieceData";
import type {
  ParentDataIds,
  ChapterCreationParams,
  BiblePiece,
  ActivityNotification,
} from "../models/canvas";
import type { ActivityIndicatorData } from "./ActivityIndicatorData";
import type { ChapterInfo } from "../models/arrangement";
import type { HexString } from "../models/commonTypes";
import type { Piece } from "../models/canvas";
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
  activityIndicators?: ActivityIndicatorData[];
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
    activityIndicators = [],
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
    return (
      this.selectionState === SelectionStates.Selected && this.isOnTheGround
    );
  }

  shouldShowActivityIndicators() {
    return (
      this.selectionState === SelectionStates.Selected && this.isOnTheGround
    );
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
    return [...this.#activityIndicators];
  }
  clearActivityIndicators() {
    if (this.#activityIndicators.length > 0) {
      const indicators = [...this.#activityIndicators];
      this.#activityIndicators = [];
      return indicators;
    }
    return undefined;
  }
  addActivityIndicator(indicator: ActivityIndicatorData) {
    if (!this.#activityIndicators.some((data) => data.id === indicator.id)) {
      this.#activityIndicators.push(indicator);
    }
  }
  removeActivityIndicator(indicatorId: ActivityIndicatorData["id"]) {
    this.#activityIndicators = this.#activityIndicators.filter(
      (data) => data.id !== indicatorId
    );
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
