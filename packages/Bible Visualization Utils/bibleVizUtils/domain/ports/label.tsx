import type {
  ActivityIndicator,
  BiblePieceType,
  Piece,
} from "bibleVizUtils.domain.models.canvas";
import type { HexString } from "bibleVizUtils.domain.models.commonTypes";
import type {
  LabelDateFormatType,
  LabelPositionType,
  LabelTranslucencyMode,
} from "bibleVizUtils.domain.models.label";
import type { InfoLabelData } from "bibleVizUtils.domain.entities.InfoLabelData";
import type { LabelDataStorePort } from "./piece";
import type { ActivityIndicatorsAdapterPort } from "bibleVizUtils.domain.ports.pieceActivity";

export type SpawnLabel = (params: {
  piece: Piece;
  label: string;
  date?: string;
  color: HexString;
  labelColor: HexString;
  labelPositioning: LabelPositionType;
  translucencyMode: LabelTranslucencyMode;
  isInteractable?: boolean;
  dateFormat: LabelDateFormatType;
}) => {
  transformer: Piece<"InfoLabelTransformer">;
  tail: Piece<"InfoLabelTail">;
  label: Piece<"InfoLabelText">;
  date?: Piece<"InfoLabelDate">;
};

export type DespawnLabel = (data: InfoLabelData) => void;

export interface LabelAdapterPort {
  spawnLabel: SpawnLabel;
  despawnLabel: DespawnLabel;
}

export interface PieceActivityServicePort {
  updateIndicators: (container: InfoLabelData) => ActivityIndicator[];
}

export interface LabelDateFormatServicePort {
  dateFormat: LabelDateFormatType;
}

export interface IdGeneratorPort {
  getId: () => string;
}

export interface LabelStrategy<P extends Piece> {
  getLabel: (piece: P) => string;
  getDate: (piece: P) => string | undefined;
  getColor: (piece: P) => string;
  getLabelColor: (piece: P) => string;
  labelPositioning: LabelPositionType;
  isInteractable: boolean;
}

export type LabelPropertiesStrategies<T extends BiblePieceType> = {
  [K in T]: LabelStrategy<Piece<K>>;
};

export interface LabelAnimationAdapterPort {
  displayShakeAnimation: (data: InfoLabelData) => void;
  stopShakeAnimation: (data: InfoLabelData) => void;
}

export interface PieceLabelServiceParams<T extends BiblePieceType> {
  labelAdapterPort: LabelAdapterPort;
  labelDataStorePort: LabelDataStorePort;
  pieceActivityServicePort: PieceActivityServicePort;
  labelPropertiesStrategies: LabelPropertiesStrategies<T>;
  labelDateFormatServicePort: LabelDateFormatServicePort;
  idGeneratorPort: IdGeneratorPort;
  activityIndicatorsAdapterPort: ActivityIndicatorsAdapterPort;
  labelAnimationAdapterPort: LabelAnimationAdapterPort;
}
