import { StackData } from "./StackData";
import type {
  BiblePiece,
  Piece,
  StackAncestor,
  StackAncestorType,
} from "../models/canvas";
import type {
  ParentDataId,
  ParentDataIds,
  PieceSelectionSource,
} from "../models/canvas";
import type { HexString } from "../models/commonTypes";
import {
  type HighlightState,
  type HighlightEvent,
  HighlightStates,
} from "../models/highlight";
import {
  type SelectionState,
  type SelectionEvent,
  type SelectionFSM,
  SelectionStates,
  standardSelectionFSM,
} from "../models/selection";
import type { LabelTranslucencyMode } from "../models/label";

const highlightFSM: Record<
  HighlightState,
  Partial<Record<HighlightEvent, HighlightState>>
> = {
  Idle: {
    RequestHighlight: HighlightStates.Highlighting,
  },
  Highlighting: {
    SequenceComplete: HighlightStates.Highlighted,
    RequestUnhighlight: HighlightStates.Unhighlighting,
  },
  Unhighlighting: {
    SequenceComplete: HighlightStates.Idle,
    RequestHighlight: HighlightStates.Highlighting,
  },
  Highlighted: {
    RequestUnhighlight: HighlightStates.Unhighlighting,
  },
};

export interface StackPieceDataParams<
  TChild,
  TPieceInfo,
  TCreationParams,
  TPiece extends BiblePiece,
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
  selectionFSM?: SelectionFSM;
}
type HighlightColor = undefined | HexString;
type LastInteractionSource = PieceSelectionSource | undefined;

export class StackPieceData<
  TChild,
  TPieceInfo,
  TCreationParams,
  TPiece extends BiblePiece = BiblePiece,
> extends StackData<TChild> {
  #piece: StackPieceDataParams<
    TChild,
    TPieceInfo,
    TCreationParams,
    TPiece
  >["piece"];
  #type: StackPieceDataParams<
    TChild,
    TPieceInfo,
    TCreationParams,
    TPiece
  >["type"];
  #pieceInfo: StackPieceDataParams<
    TChild,
    TPieceInfo,
    TCreationParams,
    TPiece
  >["pieceInfo"];
  #parentDataIds: StackPieceDataParams<
    TChild,
    TPieceInfo,
    TCreationParams,
    TPiece
  >["parentDataIds"];
  #isInsideBible: StackPieceDataParams<
    TChild,
    TPieceInfo,
    TCreationParams,
    TPiece
  >["isInsideBible"];
  #isActive: NonNullable<
    StackPieceDataParams<
      TChild,
      TPieceInfo,
      TCreationParams,
      TPiece
    >["isActive"]
  >;
  #isHidden: StackPieceDataParams<
    TChild,
    TPieceInfo,
    TCreationParams,
    TPiece
  >["isHidden"];
  #creationParams: StackPieceDataParams<
    TChild,
    TPieceInfo,
    TCreationParams,
    TPiece
  >["creationParams"];
  #highlightColor: HighlightColor;
  #lastInteractionSource: LastInteractionSource;
  // #isHighlighted: NonNullable<
  //   StackPieceDataParams<TChild, TPieceInfo, TCreationParams, TPiece>["isHighlighted"]
  // >;
  // #isHighlighting: boolean = false;
  // #isUnhighlighting: boolean = false;
  #isOnTheGround: boolean = false;
  #isBeingDragged: boolean = false;
  #isHighlightable: boolean = false;
  #isFocused: boolean = false;
  #highlightState: HighlightState = HighlightStates.Idle;
  #highlightIntensity: LabelTranslucencyMode = "Solid";
  #selectionState: SelectionState = SelectionStates.Idle;
  #selectionFSM: SelectionFSM;

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
    // isHighlighted = false,
    type,
    selectionFSM = standardSelectionFSM,
  }: StackPieceDataParams<TChild, TPieceInfo, TCreationParams, TPiece>) {
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
    this.#selectionFSM = selectionFSM;
    // this.#isHighlighted = isHighlighted;
  }

  changeChildrenSelectionState(event: SelectionEvent) {
    for (const child of this.childrenData) {
      if (child instanceof StackPieceData) {
        child.changeSelectionState(event);
      }
    }
  }
  changeSelectionState(event: SelectionEvent): boolean {
    const prevState = this.#selectionState;
    const newState = this.#selectionFSM[prevState][event];
    if (!newState) return false;
    this.#selectionState = newState;
    return prevState !== this.#selectionState;
  }
  get selectionState() {
    return this.#selectionState;
  }
  resetSelectionState() {
    this.#selectionState = SelectionStates.Idle;
  }

  changeHighlightState(event: HighlightEvent): boolean {
    const prevState = this.#highlightState;
    const newState = highlightFSM[prevState][event];
    if (!newState) {
      return false;
    }
    this.#highlightState = newState;
    return prevState !== this.#highlightState;
  }
  get highlightState() {
    return this.#highlightState;
  }
  get highlightIntensity() {
    return this.#highlightIntensity;
  }
  changeHighlightIntensity(newIntensity: LabelTranslucencyMode): boolean {
    if (this.#highlightState === HighlightStates.Idle) return false;
    if (this.#highlightIntensity !== newIntensity) {
      this.#highlightIntensity = newIntensity;
      return true;
    }
    return false;
  }
  get type() {
    return this.#type;
  }
  resetData() {
    this.#piece = undefined;
    this.#isInsideBible = undefined;
    this.#isActive = false;
    this.resetSelectionState();
  }
  get piece() {
    return this.#piece;
  }
  setPiece(newPiece: Piece<TPiece>) {
    this.#piece = newPiece;
  }
  clearPiece(): Piece<TPiece> | undefined {
    let piece: Piece<TPiece> | undefined = undefined;
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
        "stackBibleId",
        "stackBookId",
        "stackSectionBookId",
        "stackSectionId",
        "stackTestamentId",
      ],
      propagate
    );
  }

  /**
   * Resolves the oldest (top-most) stack ancestor referenced by a piece's
   * parentDataIds — e.g. a book deep inside a bible resolves to that bible.
   * Returns `undefined` when the piece has no stack ancestor (it is itself a
   * stack root). Layout ancestors are intentionally ignored.
   */
  getOldestAncestor(): StackAncestor | undefined {
    const precedence: { key: keyof ParentDataIds; type: StackAncestorType }[] =
      [
        { key: "stackBibleId", type: "StackBible" },
        { key: "stackTestamentId", type: "StackTestament" },
        { key: "stackSectionId", type: "StackSection" },
        { key: "stackSectionBookId", type: "StackSectionBook" },
        { key: "stackBookId", type: "StackBook" },
      ];

    for (const { key, type } of precedence) {
      const id = this.#parentDataIds?.[key];
      if (id) {
        return { id, type };
      }
    }

    return undefined;
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
  override resetHierarchy(clearPiece: boolean = true): Piece[] {
    const piecesToRelease: Piece[] = [];

    if (this.piece && clearPiece) {
      piecesToRelease.push(this.piece);
      this.clearPiece();
      this.deactivate();
    }

    piecesToRelease.push(...super.resetHierarchy());

    return piecesToRelease;
  }
  /**
   * Collects the visible pieces (`piece && isActive && !isHidden`) of this node
   * and its whole descendant hierarchy. It does NOT prune: a non-visible node
   * still contributes its visible descendants (e.g. an exploded section whose
   * own piece is hidden but whose books are visible). Children that are not
   * stack pieces (verse bundles / verses) fall outside this hierarchy and are
   * skipped, so chapters are the deepest collected level.
   */
  getHierarchyVisiblePieces(): Piece[] {
    const pieces: Piece[] = [];
    this.collectVisiblePieces(pieces);
    return pieces;
  }
  protected collectVisiblePieces(pieces: Piece[]): void {
    if (this.piece && this.isActive && !this.isHidden) {
      pieces.push(this.piece);
    }
    for (const child of this.childrenData.flat()) {
      if (child instanceof StackPieceData) {
        child.collectVisiblePieces(pieces);
      }
    }
  }
  isPieceAvailable(): boolean {
    return !!this.#piece && this.#selectionState === SelectionStates.Idle;
  }
  // highlight() {
  //   if (!this.#isHighlighted) {
  //     this.#isHighlighted = true;
  //   }
  // }
  // unhighlight() {
  //   if (this.#isHighlighted) {
  //     this.#isHighlighted = false;
  //   }
  // }
  // isPieceHighlighted(): boolean {
  //   return this.#isHighlighted;
  // }
  // isPieceHighlighting() {
  //   return this.#isHighlighting;
  // }
  // beginHighlight() {
  //   if (!this.#isHighlighting) {
  //     this.#isHighlighting = true;
  //     this.#isUnhighlighting = false;
  //   }
  // }
  // endHighlight() {
  //   if (this.#isHighlighting) {
  //     this.#isHighlighting = false;
  //     this.highlight();
  //   }
  // }
  // isPieceUnhighlighting() {
  //   return this.#isUnhighlighting;
  // }
  // beginUnhighlight() {
  //   if (!this.#isUnhighlighting) {
  //     this.#isUnhighlighting = true;
  //     this.#isHighlighting = false;
  //   }
  // }
  // endUnhighlight() {
  //   if (this.#isUnhighlighting) {
  //     this.#isUnhighlighting = false;
  //     this.unhighlight();
  //   }
  // }

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
