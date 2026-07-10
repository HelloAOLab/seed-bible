import type { Piece, VerseCreationParams } from "../models/canvas";

interface DataParams {
  id: string;
  piece?: Piece<"Verse">;
  creationParams: VerseCreationParams;
}

export class VerseData {
  #id: DataParams["id"];
  #piece: DataParams["piece"];
  #creationParams: DataParams["creationParams"];

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
  getCreationParam<K extends keyof VerseCreationParams>(
    key: K
  ): VerseCreationParams[K] {
    return this.#creationParams[key];
  }
}
