import { StackPieceData } from "bibleVizUtils.classes.StackPieceData";
import { StackChapterData } from "bibleVizUtils.classes.StackChapterData";

export class StackSectionBookData extends StackPieceData {
  childrenData: any;
  isInsideTestament: boolean;
  currentSelectedChapterData: any;
  queuedChapterData: any;
  currentShape: any;
  isSelected: boolean;
  pieceBookInfo: any;

  constructor({
    childrenData = [],
    id,
    piece,
    pieceInfo,
    pieceBookInfo,
    parentDataIds,
    isSelected = false,
    currentShape,
    isInsideBible = true,
    isInsideTestament = true,
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
    this.pieceBookInfo = pieceBookInfo;
    this.isSelected = isSelected;
    this.currentShape = currentShape;
    this.queuedChapterData = null;
    this.currentSelectedChapterData = null;
    this.isInsideTestament = isInsideTestament;
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
