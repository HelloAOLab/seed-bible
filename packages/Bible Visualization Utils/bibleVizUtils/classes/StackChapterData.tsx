import { StackPieceData } from "bibleVizUtils.classes.StackPieceData";

export class StackChapterData extends StackPieceData {
  isInsideBible: any;
  piece: any;
  isSelected: any;
  HighlightsInfo: any[];
  isActive: boolean;
  isInsideBook: boolean;

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

  AddHighlightInfo(newHighlightInfo: any) {
    this.HighlightsInfo.push(newHighlightInfo);
  }

  GetHighlightInfoByKey(key: any) {
    return this.HighlightsInfo.find((highlightInfo) => {
      return highlightInfo.key == key;
    });
  }
}
