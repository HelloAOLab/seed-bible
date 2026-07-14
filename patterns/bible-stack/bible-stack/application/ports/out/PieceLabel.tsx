import type { InfoLabelData } from "../../../domain/entities/InfoLabelData";
import type { ActivityIndicator, Piece } from "../../../domain/models/canvas";
import type { HexString } from "../../../domain/models/commonTypes";
import type {
  LabelDateFormat,
  LabelPosition,
  LabelTranslucencyMode,
  ShowSequencePacing,
} from "../../../domain/models/label";
import type { ActivityContainer, ShowIndicatorsCommand } from "./PieceActivity";

export type SpawnLabel = (params: {
  piece: Piece;
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

export interface LabelAdapterPort {
  spawnLabel: SpawnLabel;
  despawnLabel: DespawnLabel;
  locateLabel(params: {
    positioning: LabelPosition;
    piece: Piece;
    infoLabelTransformer: Piece<"InfoLabelTransformer">;
  }): void;
}

export interface LabelDataStorePort {
  getDataByTransformerId: (
    id: InfoLabelData["transformer"]["id"]
  ) => InfoLabelData | undefined;
  getDataByTailId: (
    id: InfoLabelData["tail"]["id"]
  ) => InfoLabelData | undefined;
  getDataByTextId: (
    id: InfoLabelData["label"]["id"]
  ) => InfoLabelData | undefined;
  addLabelData: (data: InfoLabelData) => void;
  removeLabelData: (data: InfoLabelData) => void;
  getAllLabelsData: () => InfoLabelData[];
  getDataByOwnerId: (id: string) => InfoLabelData | undefined;
}

export interface IndicatorsUpdaterPort {
  updateIndicators: (container: InfoLabelData) => ActivityIndicator[];
}

export interface IdGeneratorPort {
  getId: () => string;
}

export interface ActivityIndicatorsAdapterPort {
  showIndicators: (command: ShowIndicatorsCommand) => ActivityIndicator[];
  hideIndicators: (indicators: ActivityIndicator[]) => void;
  hideIndicator: (indicator: ActivityIndicator) => void;
  updateIndicatorsPosition: (container: ActivityContainer) => void;
}

export interface LabelFeedbackAdapterPort {
  displayAttentionFeedback: (data: InfoLabelData) => void;
  stopAttentionFeedback: (data: InfoLabelData) => void;
  displayShowFeedback: ({
    data,
    pacing,
  }: {
    data: InfoLabelData;
    pacing: ShowSequencePacing;
  }) => Promise<void>;
  displayHideFeedback({
    data,
    pacing,
  }: {
    data: InfoLabelData;
    pacing: ShowSequencePacing;
  }): Promise<void>;
  displayChangedIntensityFeedback({
    data,
    translucencyMode,
    pacing,
  }: {
    data: InfoLabelData;
    translucencyMode: LabelTranslucencyMode;
    pacing: ShowSequencePacing;
  }): Promise<void>;
}
