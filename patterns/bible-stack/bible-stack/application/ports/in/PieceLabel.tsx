import type { InfoLabelData } from "../../../domain/entities/InfoLabelData";
import type { Piece, BiblePiece } from "../../../domain/models/canvas";
import type {
  LabelTranslucencyMode,
  ShowSequencePacing,
} from "../../../domain/models/label";

export interface PieceLabelServicePort<T extends BiblePiece> {
  showLabel: (params: {
    piece: Piece<T>;
    translucencyMode: LabelTranslucencyMode;
    pacing?: ShowSequencePacing;
  }) => void;
  hideLabel: (piece: Piece<T>, pacing?: ShowSequencePacing) => Promise<void>;
  changeIntensity: (
    piece: Piece<T>,
    translucencyMode: LabelTranslucencyMode,
    pacing?: ShowSequencePacing
  ) => Promise<void>;
  updateLabelPosition(piece: Piece<T>): void;
  getPieceLabel(piece: Piece<T>): InfoLabelData | undefined;
}
