import type { ScripturePiecesStateServicePort } from "../ports/experience";

const ARE_PIECES_DRAGGABLE_DEFAULT = false;

export class ScripturePiecesStateService implements ScripturePiecesStateServicePort {
  #arePiecesDraggable: boolean = ARE_PIECES_DRAGGABLE_DEFAULT;

  resetToDefault(): void {
    this.#arePiecesDraggable = ARE_PIECES_DRAGGABLE_DEFAULT;
  }

  makePiecesDraggable() {
    this.#arePiecesDraggable = true;
    // TODO: Call an OnPiecesBecomeDraggable event?
  }

  makePiecesNotDraggable() {
    this.#arePiecesDraggable = false;
    // TODO: Call an OnPiecesBecomeUndraggable event?
  }

  get arePiecesDraggable() {
    return this.#arePiecesDraggable;
  }
}
