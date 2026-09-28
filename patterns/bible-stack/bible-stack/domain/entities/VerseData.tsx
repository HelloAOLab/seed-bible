import type { Piece, VerseCreationParams } from "../models/canvas";
import type { HexString } from "../models/commonTypes";

interface DataParams {
  id: string;
  piece?: Piece<"Verse">;
  creationParams: VerseCreationParams;
}

export class VerseData {
  #id: DataParams["id"];
  #piece: DataParams["piece"];
  #creationParams: DataParams["creationParams"];
  #paintColor: HexString | undefined;

  constructor({ id, piece, creationParams }: DataParams) {
    this.#id = id;
    this.#piece = piece;
    this.#creationParams = creationParams;
  }

  get id() {
    return this.#id;
  }
  get piece() {
    return this.#piece;
  }
  clearPiece() {
    const piece = this.#piece;
    this.#piece = undefined;
    return piece;
  }
  setPiece(piece: Piece<"Verse">) {
    this.#piece = piece;
  }
  get paintColor() {
    return this.#paintColor;
  }
  paint(color: HexString) {
    this.#paintColor = color;
  }
  unpaint() {
    this.#paintColor = undefined;
  }
  getCreationParam<K extends keyof VerseCreationParams>(
    key: K
  ): VerseCreationParams[K] {
    return this.#creationParams[key];
  }
}
