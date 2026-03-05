import { StackData } from "bibleVizUtils.classes.StackData";

export class StackPieceData extends StackData {
  lastInteractionSource: any;
  highlightColor: any;
  creationInfo: boolean;
  isActive: boolean;
  isHidden: boolean;
  isInsideBible: boolean;
  parentDataIds: any;
  pieceInfo: any;
  piece: any;

  constructor({
    childrenData = [],
    id,
    piece,
    pieceInfo,
    parentDataIds = null,
    isInsideBible = true,
    isActive = false,
    isHidden = false,
    creationInfo = false,
  }) {
    super({ childrenData, id });
    this.piece = piece;
    this.pieceInfo = pieceInfo;
    this.parentDataIds = parentDataIds;
    this.isInsideBible = isInsideBible;
    this.isHidden = isHidden;
    this.isActive = isActive;
    this.creationInfo = creationInfo;
    this.highlightColor = null;
    this.lastInteractionSource = null;
  }
}
