import type { DataRepository } from "../data/DataRepository";
import type { ScriptureService } from "../../application/services/ScriptureService";
import { ReadingHistoryService } from "../../application/services/ReadingHistoryService";
import { BaseEventManager } from "../../application/services/BaseEventManager";
import type { SeedBibleUtilsEvents } from "@packages/seed-bible-utils/domain/models/events";
import type { UserColorStore } from "../adapters/userPresence/UserColorStore";
import type { UserPresenceService } from "../../application/services/UserPresenceService";
import type { ArrangementService } from "../../application/services/ArrangementService";
import type {
  GetDayRangeSecondsType,
  GetPastDateInfoType,
} from "../../domain/functions/time";
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
import type { ReadingHistoryConfigProvider } from "../config/readingHistory/ReadingHistoryConfigProvider";
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
} from "../presentation/components/ui/ReadingHistoryTimeline";

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

export interface UtilsAPI {
  ReadingHistoryTimeline: ReadingHistoryTimelineComponent;
  dataRepository: DataRepository;
  scriptureService: ScriptureService;
  readingHistoryService: ReadingHistoryService;
  createEventManager: <
    // eslint-disable-next-line
    TEventMap extends Record<string, any>,
  >() => BaseEventManager<TEventMap>;
  seedBibleUtilsEventManager: BaseEventManager<SeedBibleUtilsEvents>;
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
  readingHistoryConfigProvider: ReadingHistoryConfigProvider;
  sectionInfoMapper: SectionInfoMapper;
  sessionProvider: SessionProvider;
  bookNames: Signal<Map<string, string>>;
  connectedUsers: Signal<ConnectedSessionUser[]>;
  useHorizontalScroll: UseHorizontalScroll;
}
