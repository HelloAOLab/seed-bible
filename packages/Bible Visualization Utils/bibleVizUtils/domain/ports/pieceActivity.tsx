import type {
  ArrangementInfo,
  TestamentInfo,
  SectionInfo,
  SubsetBookInfo,
} from "bibleVizUtils.domain.models.arrangement";
// import type { DividedPsalm } from "bibleVizUtils.application.services.ScriptureService";
import type {
  TestamentPathIndices,
  SectionPathIndices,
} from "bibleVizUtils.application.services.ArrangementService";
import type {
  GetAllPiecesDataByType,
  GetPieceData,
} from "bibleVizUtils.domain.models.pieceData";
import {
  type ActivityIndicator,
  type ActivityNotification,
} from "bibleVizUtils.domain.models.canvas";
import type {
  UserIds,
  UserPresence,
  UserPresenceData,
} from "bibleVizUtils.domain.models.userPresence";
import type { InfoLabelData } from "bibleVizUtils.domain.entities.InfoLabelData";
import type { StackChapterData } from "bibleVizUtils.domain.entities.StackChapterData";
import type { LayoutBookData } from "bibleVizUtils.domain.entities.LayoutBookData";
import type { LayoutChapterData } from "bibleVizUtils.domain.entities.LayoutChapterData";
import type { HexString, Point2D } from "../models/commonTypes";
import type { SubsetBookChapter } from "../../application/services/ScriptureService";

export interface DataRegistryPort {
  getPieceData: GetPieceData;
  getAllPiecesDataByType: GetAllPiecesDataByType;
}

export interface IndicatorsRepositoryPort {
  getIndicatorsByPieceId: (pieceDataId: string) => ActivityIndicator[];
}

export interface ArrangementServicePort {
  getCurrentArrangementIndex: () => number;
  getArrangementByIndex: (index: number) => ArrangementInfo | undefined;
  getTestamentByIndices: (
    path: TestamentPathIndices
  ) => TestamentInfo | undefined;
  getSectionByIndices: (path: SectionPathIndices) => SectionInfo | undefined;
  getBookInfoPathById: (params: {
    id: string;
    arrangementIndex?: number | undefined;
  }) => {
    found: boolean;
    arrangementIndex: number;
    testamentIndex: number | undefined;
    sectionIndex: number | undefined;
    bookIndex: number | undefined;
  };
  getBookSubsetByCompleteId({
    id,
    chapterNumber,
    arrangementIndex,
  }: {
    id: string;
    chapterNumber: number;
    arrangementIndex?: number | undefined;
  }): SubsetBookInfo | undefined;
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

export type ActivityContainer =
  | InfoLabelData
  | StackChapterData
  | LayoutBookData
  | LayoutChapterData;

export type NotifiableContainer = StackChapterData | LayoutChapterData;

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
  notification: ActivityNotification | undefined;
  container: NotifiableContainer;
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
