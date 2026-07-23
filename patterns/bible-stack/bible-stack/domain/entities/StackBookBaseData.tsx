import { StackPieceData } from "./StackPieceData";
import { StackChapterData } from "./StackChapterData";
import type {
  ParentDataIds,
  BookShape,
  BiblePiece,
  Piece,
} from "../models/canvas";
import type { LabelTranslucencyMode } from "../models/label";

interface BaseDataParams<
  TPieceInfo,
  TCreationParams,
  TPiece extends BiblePiece,
> {
  childrenData?: StackChapterData[];
  id: string;
  piece?: Piece<TPiece>;
  pieceInfo: TPieceInfo;
  parentDataIds?: ParentDataIds;
  isSelected?: boolean;
  currentShape?: BookShape;
  isInsideBible?: boolean;
  isInsideTestament?: boolean;
  isActive?: boolean;
  creationParams: TCreationParams;
  type: TPiece;
}

export abstract class StackBookBaseData<
  TPieceInfo,
  TCreationParams,
  TPiece extends BiblePiece,
> extends StackPieceData<
  StackChapterData,
  TPieceInfo,
  TCreationParams,
  TPiece
> {
  #currentShape: BookShape | undefined;
  #queuedChapterData: StackChapterData | undefined;
  #currentSelectedChapterData: StackChapterData | undefined;
  #isInsideTestament: boolean | undefined;
  #previousHighlightedChapterData: StackChapterData | undefined;
  #labelTranslucency: LabelTranslucencyMode | undefined = undefined;
  #isShowingChapters: boolean = false;

  constructor({
    childrenData = [],
    id,
    piece,
    pieceInfo,
    parentDataIds = undefined,
    isSelected = false,
    currentShape,
    isInsideBible = true,
    isInsideTestament = true,
    isActive = false,
    creationParams,
    type,
  }: BaseDataParams<TPieceInfo, TCreationParams, TPiece>) {
    super({
      childrenData,
      id,
      piece,
      pieceInfo,
      parentDataIds,
      isInsideBible,
      isActive,
      creationParams,
      isHidden: false,
      type,
    });
    if (isSelected) {
      this.changeSelectionState("RequestSelect");
    }
    this.#currentShape = currentShape;
    this.#isInsideTestament = isInsideTestament;
  }

  get isShowingChapters() {
    return this.#isShowingChapters;
  }
  showChapters() {
    this.#isShowingChapters = true;
  }
  hideChapters() {
    this.#isShowingChapters = false;
  }

  get labelTranslucency() {
    return this.#labelTranslucency;
  }
  changeLabelTranslucency(translucency: LabelTranslucencyMode) {
    this.#labelTranslucency = translucency;
  }
  clearLabelTranslucency() {
    this.#labelTranslucency = undefined;
  }

  get currentShape() {
    return this.#currentShape;
  }
  changeShape(shape: BookShape) {
    this.#currentShape = shape;
  }
  clearShape() {
    this.#currentShape = undefined;
  }

  get queuedChapterData() {
    return this.#queuedChapterData;
  }
  setQueuedChapterData(data: StackChapterData) {
    this.#queuedChapterData = data;
  }
  clearQueuedChapterData() {
    this.#queuedChapterData = undefined;
  }

  get currentSelectedChapterData() {
    return this.#currentSelectedChapterData;
  }
  setSelectedChapterData(data: StackChapterData) {
    this.#currentSelectedChapterData = data;
  }
  clearSelectedChapterData() {
    this.#currentSelectedChapterData = undefined;
  }

  get previousHighlightedChapterData() {
    return this.#previousHighlightedChapterData;
  }
  clearPreviousHighlightedChapterData() {
    this.#previousHighlightedChapterData = undefined;
  }

  get isInsideTestament() {
    return this.#isInsideTestament;
  }
  attachToTestament() {
    this.#isInsideTestament = true;
  }
  detachFromTestament() {
    this.#isInsideTestament = false;
  }

  override tryReplaceChild(
    currChild: StackChapterData,
    newChild: StackChapterData
  ): boolean {
    const wasReplaced = super.tryReplaceChild(currChild, newChild);

    if (wasReplaced) {
      if (this.currentSelectedChapterData === currChild) {
        this.clearSelectedChapterData();
      }
      if (this.#previousHighlightedChapterData === currChild) {
        this.#previousHighlightedChapterData = undefined;
      }
    }

    return wasReplaced;
  }

  override resetHierarchy(clearPiece: boolean = true): Piece[] {
    this.resetSelectionState();
    this.clearQueuedChapterData();
    this.clearSelectedChapterData();
    return super.resetHierarchy(clearPiece);
  }

  isChapterAvailable(chapterNumber: number): boolean {
    const chapterData = this.childrenData[chapterNumber - 1];
    return !!chapterData && !chapterData.isHidden;
  }

  getActiveChildrenByNumber(number: number): StackChapterData | undefined {
    return this.childrenData.find((child) => {
      return (
        child.getPieceInfoProperty("number") === number &&
        child.isActive &&
        !child.isHidden &&
        !!child.piece
      );
    });
  }
}
