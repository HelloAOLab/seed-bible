import type {
  Vector2 as Vector2Type,
  Bot,
} from "../../../../../typings/AuxLibraryDefinitions";
import type {
  ParentDataIds,
  ParentDataId,
  BiblePieceType,
} from "bibleVizUtils.models.canvas";
import type { HexString } from "bibleVizUtils.models.commonTypes";
import type { ChapterInfo } from "bibleVizUtils.data.BibleVizDataRepository";
import type { LayoutBibleData } from "bibleVizUtils.models.entities.LayoutBibleData";

interface DataParams {
  id: string;
  piece?: Bot;
  pieceInfo: ChapterInfo;
  parentDataIds: ParentDataIds;
  isActive?: boolean;
  highlightColor?: HexString;
  originalLayoutId: LayoutBibleData["id"] | undefined;
  playlistEntriesItems?: Bot[];
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

  constructor({
    id,
    piece,
    pieceInfo,
    parentDataIds,
    isActive = false,
    highlightColor,
    originalLayoutId,
    playlistEntriesItems = [],
  }: DataParams) {
    this.#playlistEntriesItems = playlistEntriesItems;
    this.#originalLayoutId = originalLayoutId;
    this.#highlightColor = highlightColor;
    this.#parentDataIds = parentDataIds;
    this.#pieceInfo = pieceInfo;
    this.#isActive = isActive;
    this.#piece = piece;
    this.#id = id;
  }

  resetData(): Bot[] {
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
    return this.#piece?.masks.isExpanded ?? false;
  }
  getNotificationDirection(): Vector2Type {
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
  setPiece(piece: Bot) {
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
}
