export interface ScripturePiecesStateServicePort {
  readonly arePiecesDraggable: boolean;
  readonly shouldShowLabelDates: boolean;
  resetToDefault(): void;
  makePiecesDraggable(): void;
  makePiecesNotDraggable(): void;
  enableLabelDates(): void;
  disableLabelDates(): void;
}
