import { StackTestamentData } from "bibleVizUtils.models.entities.StackTestamentData";
import { StackData } from "bibleVizUtils.models.entities.StackData";
import type { Bot } from "../../../../../typings/AuxLibraryDefinitions";

export class StackBibleData extends StackData<StackTestamentData> {
  #staticBiblePieces: Record<string, Bot> | undefined;
  #bibleType: "Default";
  #currentCrossPosition: "TOP" | "Middle";
  #currentStackVizState: "Regular" | "Expanded";
  #hasBeenSetUp: boolean = false;
  #currentState = null;
  #arrangementIndex: number;

  constructor({
    childrenData = [],
    id,
    currentCrossPosition,
    currentStackVizState,
    staticBiblePieces,
    arrangementIndex,
    bibleType,
  }: {
    childrenData: StackTestamentData[];
    id: string;
    currentCrossPosition: "TOP" | "Middle"; // TODO: Implement actual enum for CrossPosition.json
    currentStackVizState: "Regular" | "Expanded"; // TODO: Implement actual enum for BibleVisualizationState.json
    staticBiblePieces: Record<string, Bot> | undefined;
    arrangementIndex: number;
    bibleType: "Default"; // TODO: Implement actual enum for BibleType.json
  }) {
    super({ childrenData, id });
    this.#currentCrossPosition = currentCrossPosition;
    this.#currentStackVizState = currentStackVizState;
    this.#staticBiblePieces = staticBiblePieces;
    this.#arrangementIndex = arrangementIndex;
    this.#bibleType = bibleType;
  }

  get staticBiblePieces() {
    return this.#staticBiblePieces;
  }
  get bibleType() {
    return this.#bibleType;
  }
  get currentCrossPosition() {
    return this.#currentCrossPosition;
  }
  set currentCrossPosition(value) {
    this.#currentCrossPosition = value;
  }
  get currentStackVizState() {
    return this.#currentStackVizState;
  }
  set currentStackVizState(value) {
    this.#currentStackVizState = value;
  }
  get hasBeenSetUp() {
    return this.#hasBeenSetUp;
  }
  set hasBeenSetUp(value) {
    this.#hasBeenSetUp = value;
  }
  get currentState() {
    return this.#currentState;
  }
  set currentState(value) {
    this.#currentState = value;
  }
  get arrangementIndex() {
    return this.#arrangementIndex;
  }
  set arrangementIndex(value) {
    this.#arrangementIndex = value;
  }
}
