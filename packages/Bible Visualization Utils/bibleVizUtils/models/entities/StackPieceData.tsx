import { StackData } from "bibleVizUtils.models.entities.StackData";
import type { Bot } from "../../../../../typings/AuxLibraryDefinitions";
import type { ParentDataIds } from "bibleVizUtils.models.canvas.models";
import type { HexString } from "bibleVizUtils.models.common.types";

export class StackPieceData<TChild> extends StackData<TChild> {
  #piece: Bot | undefined;
  #pieceInfo: any;
  #parentDataIds: ParentDataIds | undefined;
  #isInsideBible: boolean | undefined;
  #creationInfo: any;
  #isHidden: boolean | undefined;
  #isActive: boolean | undefined;
  #highlightColor: undefined | HexString;
  #lastInteractionSource: any; // TODO: Define this

  constructor({
    childrenData = [],
    id,
    piece,
    pieceInfo,
    parentDataIds = undefined,
    isInsideBible = true,
    isActive = false,
    isHidden = false,
    creationInfo,
  }: {
    childrenData?: TChild[];
    id: string;
    piece: Bot;
    pieceInfo: any; // TODO: Define this
    parentDataIds: ParentDataIds | undefined;
    isInsideBible?: boolean;
    isActive: boolean;
    isHidden: boolean;
    creationInfo: any; // TODO: Define this
  }) {
    super({ childrenData, id });
    this.#piece = piece;
    this.#pieceInfo = pieceInfo;
    this.#parentDataIds = parentDataIds;
    this.#isInsideBible = isInsideBible;
    this.#isHidden = isHidden;
    this.#isActive = isActive;
    this.#creationInfo = creationInfo;
    this.#highlightColor = undefined;
    this.#lastInteractionSource = null;
  }

  ResetData() {
    this.#piece = undefined;
    this.#isInsideBible = undefined;
    this.#isActive = false;
  }

  get piece() {
    return this.#piece;
  }

  get pieceInfo() {
    return this.#pieceInfo;
  }

  get parentDataIds() {
    return this.#parentDataIds;
  }

  get creationInfo() {
    return this.#creationInfo;
  }

  get isInsideBible() {
    return this.#isInsideBible;
  }

  set isInsideBible(value) {
    this.#isInsideBible = value;
  }

  get isHidden() {
    return this.#isHidden;
  }

  set isHidden(value) {
    this.#isHidden = value;
  }

  get isActive() {
    return this.#isActive;
  }

  set isActive(value) {
    this.#isActive = value;
  }

  get highlightColor() {
    return this.#highlightColor;
  }

  set highlightColor(value) {
    this.#highlightColor = value;
  }

  get lastInteractionSource() {
    return this.#lastInteractionSource;
  }

  set lastInteractionSource(value) {
    this.#lastInteractionSource = value;
  }
}
