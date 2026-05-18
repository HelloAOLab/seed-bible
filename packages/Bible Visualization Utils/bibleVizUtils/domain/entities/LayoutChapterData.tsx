import type {
  ParentDataIds,
  ParentDataId,
  BiblePieceType,
  ChapterCreationParams,
  ActivityIndicator,
  ActivityNotification,
} from "bibleVizUtils.domain.models.canvas";
import {
  HighlightStates,
  type HighlightState,
  type HighlightEvent,
} from "bibleVizUtils.domain.models.highlight";
import type { HexString } from "bibleVizUtils.domain.models.commonTypes";
import type { ChapterInfo } from "bibleVizUtils.domain.models.arrangement";
import type { LayoutBibleData } from "bibleVizUtils.domain.entities.LayoutBibleData";
import type { Piece } from "bibleVizUtils.domain.models.canvas";
import type { Point2D } from "bibleVizUtils.domain.models.commonTypes";

const highlightFSM: Record<
  HighlightState,
  Partial<Record<HighlightEvent, HighlightState>>
> = {
  Idle: {
    RequestHighlight: HighlightStates.Highlighting,
  },
  Highlighting: {
    SequenceComplete: HighlightStates.Highlighted,
    RequestUnhighlight: HighlightStates.Unhighlighting,
  },
  Unhighlighting: {
    SequenceComplete: HighlightStates.Idle,
    RequestHighlight: HighlightStates.Highlighting,
  },
  Highlighted: {
    RequestUnhighlight: HighlightStates.Unhighlighting,
  },
};

interface DataParams {
  id: string;
  piece?: Piece;
  pieceInfo: ChapterInfo;
  parentDataIds: ParentDataIds;
  isActive?: boolean;
  highlightColor?: HexString;
  originalLayoutId: LayoutBibleData["id"] | undefined;
  playlistEntriesItems?: Piece[];
  isExpanded?: boolean;
  creationParams: ChapterCreationParams;
  activityIndicators?: Map<ActivityIndicator["id"], ActivityIndicator>;
  activityNotification?: ActivityNotification;
}

type HighlightInfo = {
  key: string;
  typeOfPiece: BiblePieceType;
  color: HexString;
};

export class LayoutChapterData {
  #playlistEntriesItems: NonNullable<DataParams["playlistEntriesItems"]>;
  #originalLayoutId: DataParams["originalLayoutId"];
  #highlightColor: DataParams["highlightColor"];
  #parentDataIds: DataParams["parentDataIds"];
  #pieceInfo: DataParams["pieceInfo"];
  #isActive: NonNullable<DataParams["isActive"]>;
  #highlightsInfo: HighlightInfo[] = [];
  #isSelected: boolean = false;
  #piece: DataParams["piece"] | undefined;
  #id: NonNullable<DataParams["id"]>;
  #isExpanded: NonNullable<DataParams["isExpanded"]>;
  #creationParams: DataParams["creationParams"];
  #activityIndicators: NonNullable<DataParams["activityIndicators"]>;
  #activityNotification: DataParams["activityNotification"];
  #highlightState: HighlightState;

  constructor({
    id,
    piece,
    pieceInfo,
    parentDataIds,
    isActive = false,
    highlightColor,
    originalLayoutId,
    playlistEntriesItems = [],
    isExpanded = false,
    creationParams,
    activityIndicators = new Map(),
    activityNotification,
  }: DataParams) {
    this.#playlistEntriesItems = playlistEntriesItems;
    this.#originalLayoutId = originalLayoutId;
    this.#highlightColor = highlightColor;
    this.#parentDataIds = parentDataIds;
    this.#pieceInfo = pieceInfo;
    this.#isActive = isActive;
    this.#piece = piece;
    this.#id = id;
    this.#isExpanded = isExpanded;
    this.#creationParams = creationParams;
    this.#activityIndicators = activityIndicators;
    this.#activityNotification = activityNotification;
    this.#highlightState = HighlightStates.Idle;
  }

  resetData(): Piece[] {
    const itemsToRelease = [...this.#playlistEntriesItems];

    const piece = this.clearPiece();
    if (piece) {
      itemsToRelease.push(piece);
    }
    this.deactivate();
    this.deselect();
    this.#highlightsInfo = [];
    this.#playlistEntriesItems = [];

    return itemsToRelease;
  }
  addHighlightInfo(newHighlightInfo: HighlightInfo) {
    this.#highlightsInfo.push(newHighlightInfo);
  }
  getHighlightInfoByKey(key: string) {
    return this.#highlightsInfo.find((highlightInfo) => {
      return highlightInfo.key == key;
    });
  }
  addEntryItem(
    entryItem: NonNullable<DataParams["playlistEntriesItems"]>[number]
  ) {
    this.#playlistEntriesItems.push(entryItem);
  }
  getIsSelectedForNotification(): boolean {
    return this.#isExpanded ?? false;
  }
  getNotificationDirection(): Point2D {
    return new Vector2(1, -1);
  }
  get originalLayoutId() {
    return this.#originalLayoutId;
  }
  get highlightColor() {
    return this.#highlightColor;
  }
  changeHighlightColor(color: HexString) {
    this.#highlightColor = color;
  }
  get parentDataIds() {
    return this.#parentDataIds;
  }
  get pieceInfo() {
    return this.#pieceInfo;
  }
  get isActive() {
    return this.#isActive;
  }
  activate() {
    this.#isActive = true;
  }
  deactivate() {
    this.#isActive = false;
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
  get id() {
    return this.#id;
  }
  get piece() {
    return this.#piece;
  }
  clearPiece(): DataParams["piece"] | undefined {
    const clearedPiece = this.piece;
    this.#piece = undefined;
    return clearedPiece;
  }
  setPiece(piece: Piece) {
    this.#piece = piece;
  }
  clearParentId(key: ParentDataId) {
    if (this.#parentDataIds) {
      this.#parentDataIds[key] = undefined;
    }
  }
  clearParentIds(keys: ParentDataId[]) {
    if (this.#parentDataIds) {
      for (const key of keys) {
        this.clearParentId(key);
      }
    }
  }

  getPieceInfoProperty: <K extends keyof DataParams["pieceInfo"]>(
    key: K
  ) => DataParams["pieceInfo"][K] = (key) => {
    return this.#pieceInfo[key];
  };

  getCreationParam: <K extends keyof DataParams["creationParams"]>(
    key: K
  ) => DataParams["creationParams"][K] = (key) => {
    return this.#creationParams[key];
  };

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
  changeHighlightState(event: HighlightEvent): boolean {
    const prevState = this.#highlightState;
    const newState = highlightFSM[prevState][event];
    if (!newState) {
      return false;
    }
    this.#highlightState = newState;
    return prevState !== this.#highlightState;
  }
  get highlightState() {
    return this.#highlightState;
  }
}
