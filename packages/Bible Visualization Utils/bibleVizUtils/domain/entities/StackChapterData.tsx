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
import type { VersesBundleData } from "bibleVizUtils.domain.entities.VersesBunbleData";

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
  childrenData?: VersesBundleData[];
}

type HighlightInfo = {
  key: string;
  typeOfPiece: BiblePieceType;
  color: HexString;
};

export class StackChapterData extends StackPieceData<
  VersesBundleData,
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
  #isSelecting: boolean = false;
  #isDeselecting: boolean = false;

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
    this.#isSelected = isSelected;
    this.#isExpanded = isExpanded;
    this.#activityIndicators = activityIndicators;
    this.#activityNotification = activityNotification;
  }

  override resetData() {
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
    this.#isSelecting = false;
  }
  deselect() {
    this.#isSelected = false;
    this.#isDeselecting = false;
  }
  get isSelecting() {
    return this.#isSelecting;
  }
  get isDeselecting() {
    return this.#isDeselecting;
  }
  beginSelect() {
    if (this.isSelected || this.isSelecting) {
      return;
    }

    this.#isDeselecting = false;
    this.#isSelecting = true;
  }
  endSelect() {
    if (!this.#isSelecting) return;

    this.select();
  }
  beginDeselect() {
    if (!this.isSelected || this.isDeselecting) {
      return;
    }

    this.#isSelecting = false;
    this.#isDeselecting = true;
  }
  endDeselect() {
    if (!this.isDeselecting) return;

    this.deselect();
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
    return undefined;
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
