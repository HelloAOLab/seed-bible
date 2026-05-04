import { StackTestamentData } from "bibleVizUtils.domain.entities.StackTestamentData";
import { StackData } from "bibleVizUtils.domain.entities.StackData";
import {
  type CrossPositionType,
  type BibleVisualizationStateType,
  type BibleTypeType,
  type BibleStateType,
  type ExplodeStackCommand,
  ExplodeStackActions,
} from "bibleVizUtils.domain.models.canvas";
import type {
  StackCover,
  StackCrossLine,
  StackShadow,
  StackTransformer,
} from "bibleStack.domain.models.pieces";

export interface StaticBiblePieces {
  bibleTransformer: StackTransformer;
  upperCover: StackCover;
  leftCover: StackCover;
  lowerCover: StackCover;
  crossVerticalLine: StackCrossLine;
  crossHorizontalLine: StackCrossLine;
  bibleShadow: StackShadow;
}

interface DataParams {
  childrenData?: StackTestamentData[];
  id: string;
  currentCrossPosition: CrossPositionType;
  currentStackVizState: BibleVisualizationStateType;
  staticBiblePieces?: StaticBiblePieces;
  arrangementIndex: number;
  bibleType: BibleTypeType;
}

export class StackBibleData extends StackData<StackTestamentData> {
  #staticBiblePieces: DataParams["staticBiblePieces"];
  #bibleType: DataParams["bibleType"];
  #currentCrossPosition: DataParams["currentCrossPosition"];
  #currentStackVizState: DataParams["currentStackVizState"];
  #hasBeenSetUp: boolean = false;
  #currentState: undefined | BibleStateType;
  #arrangementIndex: DataParams["arrangementIndex"];

  constructor({
    childrenData = [],
    id,
    currentCrossPosition,
    currentStackVizState,
    staticBiblePieces,
    arrangementIndex,
    bibleType,
  }: DataParams) {
    super({ childrenData, id });
    this.#currentCrossPosition = currentCrossPosition;
    this.#currentStackVizState = currentStackVizState;
    this.#staticBiblePieces = staticBiblePieces;
    this.#arrangementIndex = arrangementIndex;
    this.#bibleType = bibleType;
  }

  get staticBiblePieces() {
    if (this.#staticBiblePieces) {
      return { ...this.#staticBiblePieces };
    }
    return undefined;
  }
  setStaticBiblePieces(staticPieces: StaticBiblePieces) {
    this.#staticBiblePieces = staticPieces;
  }
  clearStaticBiblePieces():
    | StaticBiblePieces[keyof StaticBiblePieces][]
    | undefined {
    if (this.#staticBiblePieces) {
      const releasedPieces = Object.values(this.#staticBiblePieces);
      this.#staticBiblePieces = undefined;
      return releasedPieces;
    }
    return undefined;
  }
  getStaticPiece<K extends keyof StaticBiblePieces>(
    key: K
  ): StaticBiblePieces[K] | undefined {
    if (!this.#staticBiblePieces) return undefined;

    return this.#staticBiblePieces[key];
  }
  getStaticPieceId<K extends keyof StaticBiblePieces>(
    key: K
  ): StaticBiblePieces[K]["id"] | undefined {
    return this.getStaticPiece(key)?.id;
  }
  get bibleType() {
    return this.#bibleType;
  }
  get currentCrossPosition() {
    return this.#currentCrossPosition;
  }
  changeCrossPosition(position: DataParams["currentCrossPosition"]) {
    this.#currentCrossPosition = position;
  }
  get currentStackVizState() {
    return this.#currentStackVizState;
  }
  changeVizState(state: DataParams["currentStackVizState"]) {
    this.#currentStackVizState = state;
  }
  get hasBeenSetUp() {
    return this.#hasBeenSetUp;
  }
  handleSetup() {
    this.#hasBeenSetUp = true;
  }
  get currentState() {
    return this.#currentState;
  }
  changeState(state: BibleStateType) {
    this.#currentState = state;
  }
  get arrangementIndex() {
    return this.#arrangementIndex;
  }
  getTestamentWithExplodedSection(): StackTestamentData | undefined {
    return this.childrenData.find((testament) =>
      testament.hasExplodedSection()
    );
  }
  tryExplodeSplitSections(): boolean {
    return this.childrenData.some((testament) => {
      return testament.tryExplodeSplitSections();
    });
  }
  getExplodeAnimationPlan(): ExplodeStackCommand[] {
    const plan: ExplodeStackCommand[] = [];

    for (const testament of this.getReversedChildren()) {
      if (testament.isSplittable() && testament.piece) {
        plan.push({
          action: ExplodeStackActions.SelectTestament,
          piece: testament.piece,
        });
      }

      plan.push(...testament.getExplodeAnimationCommands());
    }

    return plan;
  }
  implodeAllSections() {
    this.childrenData.forEach((testament) => {
      testament.implodeSections();
    });
  }
  areAllTestamentsSplit(): boolean {
    return this.childrenData.every((testamentData) => {
      return testamentData.isSplitIntoSections;
    });
  }
  isEmpty(): boolean {
    const result = this.childrenData.every((testamentData) => {
      return testamentData.isEmpty();
    });
    return result;
  }
}
