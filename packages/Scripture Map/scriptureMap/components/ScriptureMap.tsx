import { TimeProvider } from "scriptureMap.contexts.Time.TimeContext";
import { ScriptureMapProvider } from "scriptureMap.contexts.ScriptureMap.ScriptureMapContext";
import { ScriptureMapWrapper } from "scriptureMap.components.containers.ScriptureMapWrapper";
import { ReadingHistoryProvider } from "scriptureMap.contexts.ReadingHistory.ReadingHistoryContext";
import type { ChapterKey, BookKey } from "scriptureMap.models.arrangement";
import { type ProjectChapterStateType } from "scriptureMap.models.project";
import {
  ScriptureMapModes,
  type ScriptureMapModesType,
} from "scriptureMap.models.scriptureMap";
import type { SeedBibleState } from "seed-bible.managers.SeedBibleStateManager";
import type { BaseEventManager } from "bibleVizUtils.application.services.BaseEventManager";
import type { BibleVizUtilsEvents } from "bibleVizUtils.domain.models.events";
import type { ScriptureMapEvents } from "scriptureMap.models.events";
import type { ScriptureService } from "bibleVizUtils.application.services.ScriptureService";
import type { UserColorStore } from "bibleVizUtils.infrastructure.adapters.userPresence.UserColorStore";
import type { UserPresenceService } from "@packages/Bible Visualization Utils/bibleVizUtils/application/services/UserPresenceService";
import type { ArrangementService } from "@packages/Bible Visualization Utils/bibleVizUtils/application/services/ArrangementService";
import type {
  GetDayRangeSecondsType,
  GetPastDateInfoType,
} from "bibleVizUtils.domain.functions.time";
import type { CapitalizeFirstLetterType } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/functions/string";
import type { BibleVizDataRepository } from "bibleVizUtils.infrastructure.data.BibleVizDataRepository";
import type { ReadingHistoryService } from "@packages/Bible Visualization Utils/bibleVizUtils/application/services/ReadingHistoryService";
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
} from "@packages/Bible Visualization Utils/bibleVizUtils/domain/functions/colors";
import type { IsValueBetweenType } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/functions/math";
import type { ScriptureMap3DConfigProvider } from "bibleVizUtils.infrastructure.config.scriptureMap3D.ScriptureMap3DConfigProvider";
import type { ReadingHistoryConfigProvider } from "bibleVizUtils.infrastructure.config.readingHistory.ReadingHistoryConfigProvider";
import type { SectionInfoMapper } from "@packages/Bible Visualization Utils/bibleVizUtils/infrastructure/mappers/SectionInfoMapper";
import type { SessionProvider } from "@packages/Bible Visualization Utils/bibleVizUtils/infrastructure/adapters/session/SessionProvider";
import type { Signal } from "@preact/signals";

const { memo } = os.appCompat;

export interface ScriptureMapConfig {
  arrangementIndex?: number;
  mode: ScriptureMapModesType;
  onChapterClick: (
    event: PointerEvent,
    key: ChapterKey,
    checked: boolean
  ) => void;
  onChapterClickDependencies?: unknown[];
  onChapterClickAndHold?: (
    event: PointerEvent,
    key: ChapterKey,
    checked: boolean
  ) => void;
  onBookNameClickAndHold?: (
    showChapters: boolean,
    key: BookKey,
    checked: boolean | undefined
  ) => void;
  onBookNameClickAndHoldDependencies?: unknown[];
  initialShowingAllChapters?: boolean;
  initialShowTestamentLabels?: boolean;
  initialShowSectionLabels?: boolean;
  initialScaleFactor?: number;
  initialIsReadingHistoryEnabled?: boolean;
  extensionId: string;
  translate: (
    key: string,
    options?: Record<string, unknown> | undefined
  ) => string;
  isInSelectionMode?: boolean;
  selection?: {
    [testament: string]: {
      [section: string]: {
        [book: string]: boolean[];
      };
    };
  };
  project?: {
    name: string;
    structure: {
      [testament: string]: {
        [section: string]: {
          [book: string]: ProjectChapterStateType[];
        };
      };
    };
  };
  onSelectionModeCheckboxClick?: () => void;
  onSelectionModeDoneButtonClick?: () => void;
  onStateSetterOptionClick?: (state: ProjectChapterStateType) => void;
  onSelectionModeClearSelectionButtonClick?: () => void;
  seedBibleState: SeedBibleState;
  bibleVizUtilsEventManager: BaseEventManager<BibleVizUtilsEvents>;
  scriptureMapEventManager: BaseEventManager<ScriptureMapEvents>;
  scriptureService: ScriptureService;
  userColorStore: UserColorStore;
  userPresenceService: UserPresenceService;
  arrangementService: ArrangementService;
  getDayRangeSeconds: GetDayRangeSecondsType;
  bibleVizDataRepository: BibleVizDataRepository;
  readingHistoryService: ReadingHistoryService;
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
  sectionInfoMapper: SectionInfoMapper;
  language: string;
  sessionProvider: SessionProvider;
  bookNames: Signal<Map<string, string>>;
  MaterialIcon: (props: {
    children: string;
    className?: string;
  }) => preact.JSX.Element;
}

type ScriptureMapProps = {
  config: ScriptureMapConfig;
  customCSS?: string;
};

export const ScriptureMap = memo<
  (args: ScriptureMapProps) => preact.JSX.Element | null
>(({ config, customCSS }) => {
  const { mode, project } = config;

  if (mode === ScriptureMapModes.Project && !project) return null;

  return (
    <>
      {customCSS && <style>{customCSS}</style>}
      <TimeProvider>
        <ScriptureMapProvider config={config}>
          <ReadingHistoryProvider>
            <ScriptureMapWrapper />
          </ReadingHistoryProvider>
        </ScriptureMapProvider>
      </TimeProvider>
    </>
  );
});
