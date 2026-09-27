import type { InfoLabelData } from "../../../domain/entities/InfoLabelData";
import type { ActivityIndicatorData } from "../../../domain/entities/ActivityIndicatorData";
import type { Piece, PieceDataMap } from "../../../domain/models/canvas";
import type {
  LabelPosition,
  LabelTranslucencyMode,
  ShowSequencePacing,
} from "../../../domain/models/label";
import type { StackLabelableBiblePiece } from "../../../domain/models/pieceLifecycle";
import type { ActivityContainer } from "../../../domain/models/activity";
import type { ShowIndicatorsCommand } from "./ActivityIndicators";
import type { SpawnLabel, DespawnLabel } from "./Label";

export interface LabelAdapterPort {
  spawnLabel: SpawnLabel;
  despawnLabel: DespawnLabel;
  locateLabel(params: {
    positioning: LabelPosition;
    piece: Piece<StackLabelableBiblePiece>;
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

export interface IdGeneratorPort {
  getId: () => string;
}

export interface ActivityIndicatorsAdapterPort {
  showIndicators: (command: ShowIndicatorsCommand) => void;
  hideIndicators: (indicators: ActivityIndicatorData[]) => void;
  hideIndicator: (indicator: ActivityIndicatorData) => void;
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

export interface PieceDataRepositoryPort {
  getPieceData<K extends keyof PieceDataMap>(
    piece: Piece<K>
  ): PieceDataMap[K] | undefined;

  getDataById: <K extends keyof PieceDataMap>(params: {
    type: K;
    id: PieceDataMap[K]["id"];
  }) => PieceDataMap[K] | undefined;
}
