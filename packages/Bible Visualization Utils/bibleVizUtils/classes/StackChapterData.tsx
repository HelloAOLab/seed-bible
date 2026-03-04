import { Vector2 as Vector2Type } from "../../../../typings/AuxLibraryDefinitions";
import { StackPieceData } from "bibleVizUtils.classes.StackPieceData";

export class StackChapterData extends StackPieceData {
  constructor({
    isSelected,
    id,
    piece,
    pieceInfo,
    parentDataIds,
    isInsideBible = true,
    isInsideBook = true,
    isActive = false,
    isHidden = false,
    creationInfo = false,
  }) {
    super({
      id,
      piece,
      pieceInfo,
      parentDataIds,
      isInsideBible,
      isHidden,
      creationInfo,
    });
    this.isInsideBook = isInsideBook;
    this.isActive = isActive;
    this.HighlightsInfo = [];
    this.isSelected = isSelected;
  }
  AddChild() {}

  ResetData() {
    this.piece = null;
    this.isInsideBible = null;
    this.isInsideBook = null;
    this.isActive = false;
    this.isSelected = false;
  }

  AddHighlightInfo(newHighlightInfo) {
    this.HighlightsInfo.push(newHighlightInfo);
  }

  GetHighlightInfoByKey(key) {
    return this.HighlightsInfo.find((highlightInfo) => {
      return highlightInfo.key == key;
    });
  }

  getIsSelectedForNotification(): boolean {
    return this.piece.masks.isExpanded;
  }

  getNotificationDirection(): Vector2Type {
    return new Vector2(1, -1);
  }
}
