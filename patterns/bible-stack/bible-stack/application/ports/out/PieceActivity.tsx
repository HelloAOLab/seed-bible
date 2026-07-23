import type { InfoLabelData } from "../../../domain/entities/InfoLabelData";
import type { SubsetBookInfo } from "../../../domain/models/arrangement";
import type {
  UserIds,
  UserPresence,
  UserPresenceData,
} from "../../../domain/models/userPresence";

import type { HexString, Point2D } from "../../../domain/models/commonTypes";
import type { SubsetBookChapter } from "../../../domain/models/arrangement";
import type { UserReadingInstance } from "../../../domain/models/reading";
import {
  type Piece,
  BiblePieces,
  type ActivityIndicator,
  type ActivityNotification,
} from "../../../domain/models/canvas";
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

export interface DataRegistryPort {
  getDataById: GetPieceDataById;
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

export interface IndicatorsRepositoryPort {
  getIndicatorsByPieceId: (pieceDataId: string) => ActivityIndicator[];
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

export interface UserPresenceServicePort {
  getUserPresence: () => UserPresence;
  getOwnUserPresence: () => UserPresenceData | undefined;
  getOwnUserConfigId: () => string;
}

export interface ReadingInstanceProviderPort {
  getOwnReadingInstances(): UserReadingInstance[];
  getRemotesReadingInstances(): UserReadingInstance[];
}

export type ActivityContainer = InfoLabelData | StackChapterData;

export type NotifiableContainer = StackChapterData;

export type ActivityContainerType = "label" | "piece";

export interface BaseShowIndicatorCommand<
  T extends ActivityIndicator["indicatorType"],
> {
  type: T;
  index: ActivityIndicator["index"];
  indicator: ActivityIndicator | undefined;
}

export interface ShowRegularIndicatorCommand extends BaseShowIndicatorCommand<"regular"> {
  isOwnUserActiveActivity: boolean;
  color: HexString;
}

export interface ShowExtraContentIndicatorCommand extends BaseShowIndicatorCommand<"extraContent"> {
  extraUsers: number;
}

export type ShowExtraBackgroundIndicatorCommand =
  BaseShowIndicatorCommand<"extraBackground">;

export type AnyShowIndicatorCommand =
  | ShowRegularIndicatorCommand
  | ShowExtraContentIndicatorCommand
  | ShowExtraBackgroundIndicatorCommand;

export interface ShowIndicatorsCommand {
  container: ActivityContainer;
  command: AnyShowIndicatorCommand | AnyShowIndicatorCommand[];
}

export interface ActivityIndicatorsAdapterPort {
  showIndicators: (command: ShowIndicatorsCommand) => ActivityIndicator[];
  hideIndicators: (indicators: ActivityIndicator[]) => void;
  hideIndicator: (indicator: ActivityIndicator) => void;
  updateIndicatorsPosition: (container: ActivityContainer) => void;
}

export interface ShowNotificationCommand {
  isOwnUserInPiece: boolean;
  activityCount: number;
  color: HexString;
  direction: Point2D;
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

export interface UserColorStorePort {
  getUserColor: (params: UserIds) => string | undefined;
}
