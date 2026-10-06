import type { InfoLabelData } from "../../../domain/entities/InfoLabelData";
import type { Piece } from "../../../domain/models/canvas";
import type {
  LabelPosition,
  LabelTranslucencyMode,
  LabelDateFormat,
} from "../../../domain/models/label";
import type { StackLabelableBiblePiece } from "../../../domain/models/pieceLifecycle";
import type { HexString } from "../../../domain/models/commonTypes";

export type SpawnLabel = (params: {
  piece: Piece<StackLabelableBiblePiece>;
  label: string;
  date?: string;
  color: HexString;
  labelColor: HexString;
  labelPositioning: LabelPosition;
  translucencyMode: LabelTranslucencyMode;
  isInteractable?: boolean;
  dateFormat: LabelDateFormat;
  makesAttentionFeedback: boolean;
}) => {
  transformer: Piece<"InfoLabelTransformer">;
  tail: Piece<"InfoLabelTail">;
  label: Piece<"InfoLabelText">;
  date?: Piece<"InfoLabelDate">;
};

export type DespawnLabel = (data: InfoLabelData) => void;

export interface LabelPort {
  spawnLabel: SpawnLabel;
  locateLabel(params: {
    positioning: LabelPosition;
    piece: Piece;
    infoLabelTransformer: Piece<"InfoLabelTransformer">;
  }): void;
  despawnLabel: DespawnLabel;
}
