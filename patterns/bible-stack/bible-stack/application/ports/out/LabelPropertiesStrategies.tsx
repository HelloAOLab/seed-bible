import type { Piece } from "../../../domain/models/canvas";
import type { StackLabelableBiblePiece } from "../../../domain/models/pieceLifecycle";
import type { LabelPosition } from "../../../domain/models/label";

export interface LabelStrategy<P extends Piece<StackLabelableBiblePiece>> {
  getLabel: (piece: P) => string;
  getDate?: undefined | ((piece: P) => string | undefined);
  getColor: (piece: P) => string;
  getLabelColor: (piece: P) => string;
  getLabelPositioning: (piece: P) => LabelPosition;
  isInteractable: (piece: P) => boolean;
  makesAttentionFeedback: (piece: P) => boolean;
}

export type LabelPropertiesStrategies<T extends StackLabelableBiblePiece> = {
  [K in T]: LabelStrategy<Piece<K>>;
};
