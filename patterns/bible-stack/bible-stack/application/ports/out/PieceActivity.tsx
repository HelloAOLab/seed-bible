import type { InfoLabelData } from "../../../domain/entities/InfoLabelData";
import type { SubsetBookInfo } from "../../../domain/models/arrangement";

import type { HexString } from "../../../domain/models/commonTypes";
import type { SubsetBookChapter } from "../../../domain/models/arrangement";
import {
  type Piece,
  BiblePieces,
  type ActivityIndicator,
  type ActivityIndicatorType,
  type ActivityNotification,
} from "../../../domain/models/canvas";
import type { ActivityIndicatorData } from "../../../domain/entities/ActivityIndicatorData";
import type { StackBookData } from "../../../domain/entities/StackBookData";
import type { StackChapterData } from "../../../domain/entities/StackChapterData";
import type { StackSectionData } from "../../../domain/entities/StackSectionData";
import type { StackSectionBookData } from "../../../domain/entities/StackSectionBookData";
import type { StackTestamentData } from "../../../domain/entities/StackTestamentData";

export interface PieceDataMap {
  [BiblePieces.StackBook]: StackBookData;
  [BiblePieces.StackChapter]: StackChapterData;
  [BiblePieces.StackSection]: StackSectionData;
  [BiblePieces.StackSectionBook]: StackSectionBookData;
  [BiblePieces.StackTestament]: StackTestamentData;
  // [BiblePieces.StackSectionShadow]: StackSectionData;
}

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

export interface ScriptureServicePort {
  mapCompleteToSubsetBook({
    chapter,
    subsets,
  }: {
    chapter: number;
    subsets: readonly SubsetBookInfo[];
  }): SubsetBookChapter;
}

export type ActivityContainer = InfoLabelData | StackChapterData;

export type NotifiableContainer = StackChapterData;

export type ActivityContainerType = "label" | "piece";

export interface BaseShowIndicatorCommand<T extends ActivityIndicatorType> {
  type: T;
  index: number;
  indicator: ActivityIndicatorData;
}

export interface ShowRegularIndicatorCommand extends BaseShowIndicatorCommand<"regular"> {
  isSelected: boolean;
  isOwnUser: boolean;
  color: HexString;
  pictureUrl?: string | null | undefined;
  icon: string;
}

export interface ShowExtraContentIndicatorCommand extends BaseShowIndicatorCommand<"extraContent"> {
  extraUsers: number;
}

export type AnyShowIndicatorCommand =
  | ShowRegularIndicatorCommand
  | ShowExtraContentIndicatorCommand;

export interface ShowIndicatorsCommand {
  container: ActivityContainer;
  command: AnyShowIndicatorCommand | AnyShowIndicatorCommand[];
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

export interface ShowNotificationCommand {
  isOwnUserInPiece: boolean;
  activityCount: number;
  color: HexString;
  notification?: ActivityNotification | undefined;
  container: NotifiableContainer;
  offset?: number;
  scales?: { x: number; y: number };
}

export interface ActivityNotificationAdapterPort {
  hideNotification: (notification: ActivityNotification) => void;
  showNotification: (command: ShowNotificationCommand) => ActivityNotification;
  updateNotificationPosition: (container: NotifiableContainer) => void;
  updateNotificationDirection: (container: NotifiableContainer) => void;
}
