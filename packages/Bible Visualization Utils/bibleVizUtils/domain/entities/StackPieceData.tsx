import { StackData } from "bibleVizUtils.domain.entities.StackData";
import type { Piece } from "bibleVizUtils.domain.models.canvas";
import type {
  ParentDataId,
  ParentDataIds,
  PieceSelectionSource,
} from "bibleVizUtils.domain.models.canvas";
import type { HexString } from "bibleVizUtils.domain.models.commonTypes";

interface DataParams<TChild, TPieceInfo, TCreationParams> {
  childrenData?: TChild[];
  id: string;
  piece?: Piece;
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
> extends StackData<TChild> {
  #piece: DataParams<TChild, TPieceInfo, TCreationParams>["piece"];
  #pieceInfo: DataParams<TChild, TPieceInfo, TCreationParams>["pieceInfo"];
  #parentDataIds: DataParams<
    TChild,
    TPieceInfo,
    TCreationParams
  >["parentDataIds"];
  #isInsideBible: DataParams<
    TChild,
    TPieceInfo,
    TCreationParams
  >["isInsideBible"];
  #isActive: NonNullable<
    DataParams<TChild, TPieceInfo, TCreationParams>["isActive"]
  >;
  #isHidden: DataParams<TChild, TPieceInfo, TCreationParams>["isHidden"];
  #creationParams: DataParams<
    TChild,
    TPieceInfo,
    TCreationParams
  >["creationParams"];
  #highlightColor: HighlightColor;
  #lastInteractionSource: LastInteractionSource;
  #isHighlighted: NonNullable<
    DataParams<TChild, TPieceInfo, TCreationParams>["isHighlighted"]
  >;
  #isHighlighting: boolean = false;

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
  }: DataParams<TChild, TPieceInfo, TCreationParams>) {
    super({ childrenData, id });
    this.#piece = piece;
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

  resetData() {
    this.#piece = undefined;
    this.#isInsideBible = undefined;
    this.#isActive = false;
  }
  get piece() {
    return this.#piece;
  }
  setPiece(newPiece: Piece) {
    this.#piece = newPiece;
  }
  clearPiece(): Piece | undefined {
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
}
