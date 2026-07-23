import type { ScripturePiecesStateServicePort } from "../ports/in/ScripturePiecesState";

const ARE_PIECES_DRAGGABLE_DEFAULT = false;
const SHOULD_SHOW_LABELS_DEFAULT = false;

interface ServiceParams {
  arePiecesDraggable?: boolean;
  shouldShowLabelDates?: boolean;
}

export class ScripturePiecesStateService implements ScripturePiecesStateServicePort {
  #arePiecesDraggable: NonNullable<ServiceParams["arePiecesDraggable"]>;
  #shouldShowLabelDates: NonNullable<ServiceParams["shouldShowLabelDates"]>;

  constructor(params?: ServiceParams) {
    const {
      arePiecesDraggable = ARE_PIECES_DRAGGABLE_DEFAULT,
      shouldShowLabelDates = SHOULD_SHOW_LABELS_DEFAULT,
    } = params ?? {};
    this.#arePiecesDraggable = arePiecesDraggable;
    this.#shouldShowLabelDates = shouldShowLabelDates;
  }

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

  enableLabelDates() {
    this.#shouldShowLabelDates = true;
  }

  disableLabelDates() {
    this.#shouldShowLabelDates = true;
  }

  get shouldShowLabelDates() {
    return this.#shouldShowLabelDates;
  }
}
