import { StackData } from "bibleVizUtils.domain.entities.StackData";
import type { BiblePieceType, Piece } from "bibleVizUtils.domain.models.canvas";
import type {
  ParentDataId,
  ParentDataIds,
  PieceSelectionSource,
} from "bibleVizUtils.domain.models.canvas";
import type { HexString } from "bibleVizUtils.domain.models.commonTypes";

interface DataParams<
  TChild,
  TPieceInfo,
  TCreationParams,
  TPiece extends BiblePieceType,
> {
  childrenData?: TChild[];
  id: string;
  piece?: Piece<TPiece>;
  type: TPiece;
  pieceInfo: TPieceInfo;
  parentDataIds: ParentDataIds | undefined;
  isInsideBible?: boolean;
  isActive?: boolean;
  isHidden?: boolean;
  creationParams: TCreationParams;
  isHighlighted?: boolean;
}
type HighlightColor = undefined | HexString;
type LastInteractionSource = PieceSelectionSource | undefined;

export class StackPieceData<
  TChild,
  TPieceInfo,
  TCreationParams,
  TPiece extends BiblePieceType = BiblePieceType,
> extends StackData<TChild> {
  #piece: DataParams<TChild, TPieceInfo, TCreationParams, TPiece>["piece"];
  #type: DataParams<TChild, TPieceInfo, TCreationParams, TPiece>["type"];
  #pieceInfo: DataParams<
    TChild,
    TPieceInfo,
    TCreationParams,
    TPiece
  >["pieceInfo"];
  #parentDataIds: DataParams<
    TChild,
    TPieceInfo,
    TCreationParams,
    TPiece
  >["parentDataIds"];
  #isInsideBible: DataParams<
    TChild,
    TPieceInfo,
    TCreationParams,
    TPiece
  >["isInsideBible"];
  #isActive: NonNullable<
    DataParams<TChild, TPieceInfo, TCreationParams, TPiece>["isActive"]
  >;
  #isHidden: DataParams<
    TChild,
    TPieceInfo,
    TCreationParams,
    TPiece
  >["isHidden"];
  #creationParams: DataParams<
    TChild,
    TPieceInfo,
    TCreationParams,
    TPiece
  >["creationParams"];
  #highlightColor: HighlightColor;
  #lastInteractionSource: LastInteractionSource;
  #isHighlighted: NonNullable<
    DataParams<TChild, TPieceInfo, TCreationParams, TPiece>["isHighlighted"]
  >;
  #isHighlighting: boolean = false;
  #isOnTheGround: boolean = false;
  #isBeingDragged: boolean = false;
  #isHighlightable: boolean = false;
  #isFocused: boolean = false;

  constructor({
    childrenData = [],
    id,
    piece,
    pieceInfo,
    parentDataIds = undefined,
    isInsideBible = true,
    isActive = false,
    isHidden = false,
    creationParams,
    isHighlighted = false,
    type,
  }: DataParams<TChild, TPieceInfo, TCreationParams, TPiece>) {
    super({ childrenData, id });
    this.#piece = piece;
    this.#type = type;
    this.#pieceInfo = pieceInfo;
    this.#parentDataIds = parentDataIds;
    this.#isInsideBible = isInsideBible;
    this.#isHidden = isHidden;
    this.#isActive = isActive;
    this.#creationParams = creationParams;
    this.#highlightColor = undefined;
    this.#lastInteractionSource = undefined;
    this.#isHighlighted = isHighlighted;
  }

  get type() {
    return this.#type;
  }
  resetData() {
    this.#piece = undefined;
    this.#isInsideBible = undefined;
    this.#isActive = false;
  }
  get piece() {
    return this.#piece;
  }
  setPiece(newPiece: Piece<TPiece>) {
    this.#piece = newPiece;
  }
  clearPiece(): Piece<TPiece> | undefined {
    let piece: Piece | undefined;
    if (this.#piece) {
      piece = this.#piece;
      this.#piece = undefined;
    }
    return piece;
  }
  get pieceInfo() {
    return this.#pieceInfo;
  }
  getPieceInfoProperty: <K extends keyof TPieceInfo>(key: K) => TPieceInfo[K] =
    (key) => {
      return this.#pieceInfo[key];
    };
  get parentDataIds() {
    if (this.#parentDataIds) {
      return { ...this.#parentDataIds };
    }
    return undefined;
  }
  getParentId: <K extends keyof ParentDataIds>(
    key: K
  ) => ParentDataIds[K] | undefined = (key) => {
    let result: ParentDataIds[typeof key] | undefined;
    if (this.parentDataIds) {
      result = this.parentDataIds[key];
    }
    return result;
  };
  setParentId: <K extends ParentDataId>(key: K, id: ParentDataIds[K]) => void =
    (key, id) => {
      if (this.#parentDataIds) {
        this.#parentDataIds[key] = id;
      }
    };
  clearParentId(key: ParentDataId) {
    if (this.#parentDataIds) {
      this.#parentDataIds[key] = undefined;
    }
  }
  clearParentIds(keys: ParentDataId[], propagate: boolean = true) {
    if (this.#parentDataIds) {
      for (const key of keys) {
        this.clearParentId(key);
      }
    }
    if (propagate) {
      this.childrenData.forEach((childData) => {
        const childArray = Array.isArray(childData) ? childData : [childData];

        childArray.forEach((currChildData) => {
          if (currChildData instanceof StackPieceData) {
            currChildData.clearParentIds(keys, propagate);
          }
        });
      });
    }
  }
  clearAllParentIds(propagate = true) {
    this.clearParentIds(
      [
        "layoutBookId",
        "layoutId",
        "stackBibleId",
        "stackBookId",
        "stackSectionBookId",
        "stackSectionId",
        "stackTestamentId",
      ],
      propagate
    );
  }
  get creationParams() {
    return this.#creationParams;
  }
  getCreationParam: <K extends keyof TCreationParams>(
    key: K
  ) => TCreationParams[K] = (key) => {
    return this.#creationParams[key];
  };
  get isInsideBible() {
    return this.#isInsideBible;
  }
  attachToBible() {
    this.#isInsideBible = true;
  }
  detachFromBible() {
    this.#isInsideBible = false;
  }
  get isHidden() {
    return this.#isHidden;
  }
  hide() {
    this.#isHidden = true;
  }
  show() {
    this.#isHidden = false;
  }
  get isActive() {
    return this.#isActive;
  }
  activate() {
    this.#isActive = true;
  }
  deactivate() {
    this.#isActive = false;
  }
  get highlightColor() {
    return this.#highlightColor;
  }
  changeHighlightColor(color: HexString) {
    this.#highlightColor = color;
  }
  clearHighlightColor() {
    this.#highlightColor = undefined;
  }
  get lastInteractionSource() {
    return this.#lastInteractionSource;
  }
  changeLastInteractionSource(source: PieceSelectionSource) {
    this.#lastInteractionSource = source;
  }
  clearLastInteractionSource() {
    this.#lastInteractionSource = undefined;
  }
  resetHierarchy(clearPiece: boolean = true): Piece[] {
    const piecesToRelease: Piece[] = [];

    if (this.piece && clearPiece) {
      piecesToRelease.push(this.piece);
      this.clearPiece();
      this.deactivate();
    }

    piecesToRelease.push(...super.resetHierarchy());

    return piecesToRelease;
  }
  isPieceAvailable(): boolean {
    return !!this.#piece;
  }
  highlight() {
    if (!this.#isHighlighted) {
      this.#isHighlighted = true;
    }
  }
  isPieceHighlighted(): boolean {
    return this.#isHighlighted;
  }
  isPieceHighlighting() {
    return this.#isHighlighting;
  }
  beginHighlighting() {
    if (!this.#isHighlighting && !this.#isHighlighted) {
      this.#isHighlighting = true;
    }
  }
  endHighlighting() {
    if (this.#isHighlighting) {
      this.#isHighlighting = false;
      this.highlight();
    }
  }
  placeOnGround() {
    this.#isOnTheGround = true;
  }
  pickFromGround() {
    this.#isOnTheGround = false;
  }
  get isOnTheGround() {
    return this.#isOnTheGround;
  }
  beginDrag() {
    this.#isBeingDragged = true;
  }
  endDrag() {
    this.#isBeingDragged = false;
  }
  get isBeingDragged() {
    return this.#isBeingDragged;
  }
  becomeHighlightable() {
    this.#isHighlightable = true;
  }
  becomeNonHighlightable() {
    this.#isHighlightable = false;
  }
  get isHighlightable() {
    return this.#isHighlightable;
  }
  get isFocused() {
    return this.#isFocused;
  }
  beginFocus() {
    this.#isFocused = true;
  }
  endFocus() {
    this.#isFocused = false;
  }
}
