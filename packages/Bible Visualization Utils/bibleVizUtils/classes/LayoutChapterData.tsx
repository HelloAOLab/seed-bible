export class LayoutChapterData {
  playlistEntriesItems: any[];
  isSelected: false;
  HighlightsInfo: any[];
  originalLayoutId: any;
  isActive: boolean;
  parentDataIds: any;
  pieceInfo: any;
  piece: any;
  id: any;
  highlightColor: any;

  constructor({
    id,
    piece,
    playlistEntriesItems = [],
    pieceInfo,
    parentDataIds,
    isActive = false,
    highlightColor = null,
    originalLayoutId = null,
  }) {
    this.highlightColor = highlightColor;
    this.id = id;
    this.piece = piece;
    this.pieceInfo = pieceInfo;
    this.parentDataIds = parentDataIds;
    this.isActive = isActive;
    this.originalLayoutId = originalLayoutId;
    this.HighlightsInfo = [];
    this.isSelected = false;
    this.playlistEntriesItems = playlistEntriesItems;
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
        tag: BibleVizUtils.Data.tags.ObjectPoolTags
          .LayoutChapterPlaylistEntryItem,
      });
      this.playlistEntriesItems = [];
    }
  }

  AddHighlightInfo(newHighlightInfo: any) {
    this.HighlightsInfo.push(newHighlightInfo);
  }

  GetHighlightInfoByKey(key: any) {
    return this.HighlightsInfo.find((highlightInfo) => {
      return highlightInfo.key == key;
    });
  }

  AddEntryItem(entryItem: any) {
    this.playlistEntriesItems.push(entryItem);
  }
}
