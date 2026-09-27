import type { InfoLabelData } from "../../../domain/entities/InfoLabelData";
import {
  type Piece,
  type ActivityIndicator,
  type ActivityNotification,
} from "../../../domain/models/canvas";
import type { ActivityIndicatorData } from "../../../domain/entities/ActivityIndicatorData";
import type { PieceDataMap } from "../../../domain/models/canvas";
import type {
  ActivityContainer,
  NotifiableContainer,
} from "../../../domain/models/activity";
import type { ShowIndicatorsCommand } from "./ActivityIndicators";
import type { ShowNotificationCommand } from "./ActivityNotification";

export type GetPieceDataById = <T extends keyof PieceDataMap>(params: {
  type: T;
  id: Piece["id"];
}) => PieceDataMap[T] | undefined;

export type GetAllPiecesDataByType = <T extends keyof PieceDataMap>(
  type: T
) => PieceDataMap[T][];

export type GetPieceData = <T extends keyof PieceDataMap>(
  piece: Piece<T>
) => PieceDataMap[T] | undefined;

export interface DataRegistryPort {
  getDataById: GetPieceDataById;
  getPieceData: GetPieceData;
  getAllPiecesDataByType: GetAllPiecesDataByType;
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

export interface ActivityIndicatorsAdapterPort {
  showIndicators: (command: ShowIndicatorsCommand) => void;
  hideIndicators: (indicators: ActivityIndicatorData[]) => void;
  hideIndicator: (indicator: ActivityIndicatorData) => void;
  updateIndicatorsPosition: (container: ActivityContainer) => void;
}

export interface ActivityIndicatorLifecyclePort {
  spawnActivityIndicatorDomain: (dataId: string) => ActivityIndicator;
}

export interface IdGeneratorPort {
  getId: () => string;
}

export interface ActivityNotificationAdapterPort {
  hideNotification: (notification: ActivityNotification) => void;
  showNotification: (command: ShowNotificationCommand) => ActivityNotification;
  updateNotificationPosition: (container: NotifiableContainer) => void;
  updateNotificationDirection: (container: NotifiableContainer) => void;
}
