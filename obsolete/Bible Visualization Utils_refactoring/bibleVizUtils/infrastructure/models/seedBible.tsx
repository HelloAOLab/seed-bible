import type { BibleVizDataRepository } from "bibleVizUtils.infrastructure.data.BibleVizDataRepository";
import type { PieceMapper } from "bibleVizUtils.infrastructure.mappers.PieceMapper";
import type { ScriptureService } from "bibleVizUtils.application.services.ScriptureService";
import { ReadingHistoryService } from "bibleVizUtils.application.services.ReadingHistoryService";
import { PieceActivityService } from "bibleVizUtils.application.services.PieceActivityService";
import { LabelDateService } from "bibleVizUtils.application.services.LabelDateService";
import type { PieceLabelServiceParams } from "bibleVizUtils.domain.ports.label";
import { type BiblePieceType } from "bibleVizUtils.domain.models.canvas";
import { PieceLabelService } from "bibleVizUtils.application.services.PieceLabelService";
import { BaseEventManager } from "bibleVizUtils.application.services.BaseEventManager";
import type {
  PieceBotTags,
  TypedBot,
} from "bibleVizUtils.infrastructure.models.casualos";
import {
  ObjectPooler,
  type ObjectPoolerConfig,
  type DimensionGetter as ObjectPoolerDimensionGetter,
} from "bibleVizUtils.infrastructure.adapters.casualos.ObjectPooler";
import type { BibleVizUtilsEvents } from "bibleVizUtils.domain.models.events";
import type { UserColorStore } from "bibleVizUtils.infrastructure.adapters.userPresence.UserColorStore";
import type { UserPresenceService } from "../../application/services/UserPresenceService";
import type { ArrangementService } from "../../application/services/ArrangementService";
import type {
  GetDayRangeSecondsType,
  GetPastDateInfoType,
} from "bibleVizUtils.domain.functions.time";
import type {
  ComputeLinearGradientType,
  ComputeRawGradientColorsType,
  GetTextColorBasedOnBackgroundType,
  HexToRgbType,
  RgbToHexType,
  GetChildrenLevelColorsType,
  GetColorTypeType,
  RGBStringToArrayType,
  HexLongToShortType,
  HexShortToLongType,
  ColorParserType,
} from "../../domain/functions/colors";
import type { IsValueBetweenType } from "../../domain/functions/math";
import type { CapitalizeFirstLetterType } from "../../domain/functions/string";
import type { ScriptureMap3DConfigProvider } from "bibleVizUtils.infrastructure.config.scriptureMap3D.ScriptureMap3DConfigProvider";
import type { ReadingHistoryConfigProvider } from "bibleVizUtils.infrastructure.config.readingHistory.ReadingHistoryConfigProvider";
import type { SectionInfoMapper } from "../../infrastructure/mappers/SectionInfoMapper";
import type { SessionProvider } from "../adapters/session/SessionProvider";
import type { UseHorizontalScroll } from "../presentation/hooks/useHorizontalScroll";
import type { Signal } from "@preact/signals";
import type { ConnectedSessionUser } from "@packages/seed-bible/seed-bible/managers/SessionsManager";
import type {
  ReadingHistoryTimelineComponent,
  ReadingHistoryContentData,
  ReadingHistoryItemData,
  ReadingHistoryLabelData,
  ReadingHistoryItemProps,
  ReadingHistoryLabelProps,
  ReadingHistoryTimelineProps,
  ReadingHistoryTimelineFooterData,
  ReadingHistoryLegendSquareData,
  ReadingHistoryYearSelectorOptionData,
  ReadingHistoryTooltip,
  TooltipAnchor,
  Range as ReadingHistoryRange,
} from "bibleVizUtils.infrastructure.presentation.components.ui.ReadingHistoryTimeline";
import type { StackConfigProvider } from "../config/stacks/StackConfigProvider";

export type {
  ReadingHistoryTimelineComponent,
  ReadingHistoryContentData,
  ReadingHistoryItemData,
  ReadingHistoryLabelData,
  ReadingHistoryItemProps,
  ReadingHistoryLabelProps,
  ReadingHistoryTimelineProps,
  ReadingHistoryTimelineFooterData,
  ReadingHistoryLegendSquareData,
  ReadingHistoryYearSelectorOptionData,
  ReadingHistoryTooltip,
  TooltipAnchor,
  ReadingHistoryRange,
};

export interface BibleVizAPI {
  ReadingHistoryTimeline: ReadingHistoryTimelineComponent;
  readingHistoryTimelineStyles: string;
  bibleVizDataRepository: BibleVizDataRepository;
  scriptureService: ScriptureService;
  readingHistoryService: ReadingHistoryService;
  pieceActivityService: PieceActivityService;
  labelDateService: LabelDateService;
  createPieceLabelService: <T extends BiblePieceType>(
    labelPropertiesStrategies: PieceLabelServiceParams<T>["labelPropertiesStrategies"]
  ) => PieceLabelService<T>;
  createEventManager: <
    // eslint-disable-next-line
    TEventMap extends Record<string, any>,
  >() => BaseEventManager<TEventMap>;
  createObjectPooler: <P extends Record<keyof P, TypedBot<PieceBotTags>>>({
    poolsData,
    dimensionGetter,
  }: {
    poolsData: ObjectPoolerConfig<P>;
    dimensionGetter: ObjectPoolerDimensionGetter;
  }) => ObjectPooler<P>;
  bibleVizUtilsEventManager: BaseEventManager<BibleVizUtilsEvents>;
  userColorStore: UserColorStore;
  userPresenceService: UserPresenceService;
  arrangementService: ArrangementService;
  getDayRangeSeconds: GetDayRangeSecondsType;
  GetTextColorBasedOnBackground: GetTextColorBasedOnBackgroundType;
  IsValueBetween: IsValueBetweenType;
  ComputeRawGradientColors: ComputeRawGradientColorsType;
  ComputeLinearGradient: ComputeLinearGradientType;
  HexToRgb: HexToRgbType;
  RgbToHex: RgbToHexType;
  GetChildrenLevelColors: GetChildrenLevelColorsType;
  GetColorType: GetColorTypeType;
  RGBStringToArray: RGBStringToArrayType;
  HexLongToShort: HexLongToShortType;
  HexShortToLong: HexShortToLongType;
  ColorParser: ColorParserType;
  CapitalizeFirstLetter: CapitalizeFirstLetterType;
  GetPastDateInfo: GetPastDateInfoType;
  scriptureMap3DConfigProvider: ScriptureMap3DConfigProvider;
  readingHistoryConfigProvider: ReadingHistoryConfigProvider;
  stackConfigProvider: StackConfigProvider;
  sectionInfoMapper: SectionInfoMapper;
  pieceMapper: PieceMapper;
  sessionProvider: SessionProvider;
  bookNames: Signal<Map<string, string>>;
  connectedUsers: Signal<ConnectedSessionUser[]>;
  useHorizontalScroll: UseHorizontalScroll;
}
