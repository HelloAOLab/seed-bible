import { StackTestamentData } from "bibleVizUtils.classes.StackTestamentData";
import { StackData } from "bibleVizUtils.classes.StackData";

export class StackBibleData extends StackData {
  bibleType: any;
  arrangementIndex: any;
  currentState: any;
  hasBeenSetUp: false;
  staticBiblePieces: any;
  currentStackVizState: any;
  currentCrossPosition: any;

  constructor({
    childrenData = [],
    id,
    currentCrossPosition,
    currentStackVizState,
    staticBiblePieces = null,
    arrangementIndex,
    bibleType,
  }) {
    super({ childrenData, id });
    this.currentCrossPosition = currentCrossPosition;
    this.currentStackVizState = currentStackVizState;
    this.staticBiblePieces = staticBiblePieces;
    this.hasBeenSetUp = false;
    this.currentState = null;
    this.arrangementIndex = arrangementIndex;
    this.bibleType = bibleType;
  }
  AddChild(newChild: any) {
    if (newChild instanceof StackTestamentData) {
      super.AddChild(newChild);
    } else {
      console.error("The object must be an instance of StackTestamentData");
    }
  }
}
