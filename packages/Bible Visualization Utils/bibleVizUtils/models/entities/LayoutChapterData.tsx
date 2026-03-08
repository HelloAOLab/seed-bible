import { Vector2 as Vector2Type } from "../../../../typings/AuxLibraryDefinitions";
import { ObjectPoolTags } from "bibleVizUtils.models.canvas.models";

export class LayoutChapterData {
  constructor({
    id,
    piece,
    pieceInfo,
    parentDataIds,
    isActive = false,
    highlightColor = null,
    originalLayoutId = null,
    playlistEntriesItems = [],
  }) {
    this.playlistEntriesItems = playlistEntriesItems;
    this.originalLayoutId = originalLayoutId;
    this.highlightColor = highlightColor;
    this.parentDataIds = parentDataIds;
    this.pieceInfo = pieceInfo;
    this.isActive = isActive;
    this.HighlightsInfo = [];
    this.isSelected = false;
    this.piece = piece;
    this.id = id;
  }
  AddChild() {}

  ResetData() {
    this.piece = null;
    this.isActive = false;
    this.isSelected = false;
    this.HighlightsInfo = [];

    if (this.playlistEntriesItems?.length > 0) {
      ObjectPooler.ReleaseObject({
        obj: this.playlistEntriesItems,
        tag: ObjectPoolTags.LayoutChapterPlaylistEntryItem,
      });
      this.playlistEntriesItems = [];
    }
  }

  AddHighlightInfo(newHighlightInfo) {
    this.HighlightsInfo.push(newHighlightInfo);
  }

  GetHighlightInfoByKey(key) {
    return this.HighlightsInfo.find((highlightInfo) => {
      return highlightInfo.key == key;
    });
  }

  AddEntryItem(entryItem) {
    this.playlistEntriesItems.push(entryItem);
  }

  getIsSelectedForNotification(): boolean {
    return this.piece.masks.isExpanded;
  }

  getNotificationDirection(): Vector2Type {
    return new Vector2(1, -1);
  }
}
