import { LayoutChapterData } from "bibleVizUtils.classes.LayoutChapterData";

export class LayoutBookData {
  constructor({
    childrenData = [],
    id,
    piece,
    pieceInfo,
    isSelected = false,
    parentDataIds = null,
    creationInfo,
  }) {
    this.creationInfo = creationInfo;
    this.childrenData = childrenData;
    this.id = id;
    this.piece = piece;
    this.pieceInfo = pieceInfo;
    this.isSelected = isSelected;
    this.parentDataIds = parentDataIds;
  }

  AddChild(newChild) {
    if (newChild instanceof LayoutChapterData) this.childrenData.push(newChild);
  }
}
