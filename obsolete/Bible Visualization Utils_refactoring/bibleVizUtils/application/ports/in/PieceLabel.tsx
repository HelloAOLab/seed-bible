import type {
  BiblePieceType,
  Piece,
} from "@packages/Bible Visualization Utils/bibleVizUtils/domain/models/canvas";
import type {
  LabelTranslucencyMode,
  ShowSequencePacing,
} from "@packages/Bible Visualization Utils/bibleVizUtils/domain/models/label";

export interface PieceLabelServicePort<T extends BiblePieceType> {
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
}
