import { StackPieceData } from "bibleVizUtils.classes.StackPieceData";
import { StackBookData } from "bibleVizUtils.classes.StackBookData";

export class StackSectionData extends StackPieceData {
  constructor({
    childrenData = [],
    id,
    piece,
    pieceInfo,
    parentDataIds,
    isSplitIntoBooks = false,
    isInExplodedView = false,
    isInsideBible = true,
    isInsideTestament = true,
    isActive = false,
    creationInfo = false,
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
    this.isSplitIntoBooks = isSplitIntoBooks;
    this.isInExplodedView = isInExplodedView;
    this.isInsideTestament = isInsideTestament;
    this.shadow = null;
  }

  AddChild(newChild) {
    const filteredBooksData = newChild.filter((bookData) => {
      return bookData instanceof StackBookData;
    });
    if (filteredBooksData.length > 0) {
      super.AddChild(newChild);
    } else {
      console.error(
        "The object must be an array of instances of StackBookData"
      );
    }
  }
}
