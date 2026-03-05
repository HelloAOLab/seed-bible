import { StackPieceData } from "bibleVizUtils.classes.StackPieceData";
import { StackChapterData } from "bibleVizUtils.classes.StackChapterData";

export class StackBookData extends StackPieceData {
  childrenData: any;
  isInsideSection: boolean;
  isInsideTestament: boolean;
  currentSelectedChapterData: any;
  queuedChapterData: any;
  currentShape: any;
  isSelected: boolean;

  constructor({
    childrenData = [],
    id,
    piece,
    pieceInfo,
    parentDataIds = null,
    isSelected = false,
    currentShape = null,
    isInsideBible = true,
    isInsideTestament = true,
    isInsideSection = true,
    isActive = false,
    creationInfo,
  }) {
    super({
      childrenData,
      id,
      piece,
      pieceInfo,
      parentDataIds,
      isInsideBible,
      isActive,
      creationInfo,
    });
    this.isSelected = isSelected;
    this.currentShape = currentShape;
    this.queuedChapterData = null;
    this.currentSelectedChapterData = null;
    this.isInsideTestament = isInsideTestament;
    this.isInsideSection = isInsideSection;
  }
  SetChildrenData(childrenData: any) {
    const filteredChildrenData = childrenData.filter((chapterData: any) => {
      return chapterData instanceof StackChapterData;
    });
    if (filteredChildrenData.length > 0)
      this.childrenData = filteredChildrenData;
    else {
      console.error(
        "The object must be an array of instances of StackChapterData"
      );
    }
  }
}
