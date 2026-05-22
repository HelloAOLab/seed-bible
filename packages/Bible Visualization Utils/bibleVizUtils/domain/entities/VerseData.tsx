import type { Piece } from "bibleVizUtils.domain.models.canvas";

interface DataParams {
  id: string;
  piece?: Piece<"Verse">;
}

export class VerseData {
  #id: DataParams["id"];
  #piece: DataParams["piece"];

  constructor({ id, piece }: DataParams) {
    this.#id = id;
    this.#piece = piece;
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
}
