import type {
  ActivityContainerPieceType,
  ActivityIndicator,
  ActivityIndicatorType,
} from "../models/canvas";

interface ActivityIndicatorDataProps {
  id: string;
  index: number;
  indicatorType: ActivityIndicatorType;
  piece: ActivityIndicator;
  containerPieceId: string;
  containerDataId: string;
  containerType: ActivityContainerPieceType;
}

export class ActivityIndicatorData {
  #id: ActivityIndicatorDataProps["id"];
  #index: ActivityIndicatorDataProps["index"];
  #indicatorType: ActivityIndicatorDataProps["indicatorType"];
  #piece: ActivityIndicatorDataProps["piece"];
  #containerPieceId: ActivityIndicatorDataProps["containerPieceId"];
  #containerDataId: ActivityIndicatorDataProps["containerDataId"];
  #containerType: ActivityIndicatorDataProps["containerType"];

  constructor({
    id,
    index,
    indicatorType,
    piece,
    containerPieceId,
    containerDataId,
    containerType,
  }: ActivityIndicatorDataProps) {
    this.#id = id;
    this.#index = index;
    this.#indicatorType = indicatorType;
    this.#piece = piece;
    this.#containerPieceId = containerPieceId;
    this.#containerDataId = containerDataId;
    this.#containerType = containerType;
  }

  get id() {
    return this.#id;
  }
  get index() {
    return this.#index;
  }
  set index(value: ActivityIndicatorDataProps["index"]) {
    this.#index = value;
  }
  get indicatorType() {
    return this.#indicatorType;
  }
  get piece() {
    return this.#piece;
  }
  get containerPieceId() {
    return this.#containerPieceId;
  }
  get containerDataId() {
    return this.#containerDataId;
  }
  get containerType() {
    return this.#containerType;
  }
}
