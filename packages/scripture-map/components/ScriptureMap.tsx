import { TimeProvider } from "../contexts/Time/TimeContext";
import { ScriptureMapProvider } from "../contexts/ScriptureMap/ScriptureMapContext";
import { ScriptureMapWrapper } from "./containers/ScriptureMapWrapper";
import { ReadingHistoryProvider } from "../contexts/ReadingHistory/ReadingHistoryContext";
import type { ChapterKey, BookKey } from "../models/arrangement";
import { type ProjectChapterStateType } from "../models/project";
import {
  ScriptureMapModes,
  type ScriptureMapModesType,
} from "../models/scriptureMap";
import type { SeedBibleState } from "../../seed-bible/seed-bible/managers/SeedBibleStateManager";
import type { BaseEventManager } from "../../seed-bible-utils/application/services/BaseEventManager";
import type { SeedBibleUtilsEvents } from "../../seed-bible-utils/domain/models/events";
import type { ScriptureMapEvents } from "../models/events";
import type { ScriptureService } from "../../seed-bible-utils/application/services/ScriptureService";
import type { UserColorStore } from "../../seed-bible-utils/infrastructure/adapters/userPresence/UserColorStore";
import type { UserPresenceService } from "../../seed-bible-utils/application/services/UserPresenceService";
import type { ArrangementService } from "../../seed-bible-utils/application/services/ArrangementService";
import type {
  GetDayRangeSecondsType,
  GetPastDateInfoType,
} from "../../seed-bible-utils/domain/functions/time";
import type { CapitalizeFirstLetterType } from "../../seed-bible-utils/domain/functions/string";
import type { DataRepository as SeedBibleDataRepository } from "@packages/seed-bible-utils/infrastructure/data/DataRepository";
import type { ReadingHistoryService } from "../../seed-bible-utils/application/services/ReadingHistoryService";
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
} from "../../seed-bible-utils/domain/functions/colors";
import type { IsValueBetweenType } from "../../seed-bible-utils/domain/functions/math";
import type { LayoutConfigProvider } from "../config/LayoutConfigProvider";
import type { ReadingHistoryConfigProvider } from "../../seed-bible-utils/infrastructure/config/readingHistory/ReadingHistoryConfigProvider";
import type { SectionInfoMapper } from "../../seed-bible-utils/infrastructure/mappers/SectionInfoMapper";
import type { SessionProvider } from "../../seed-bible-utils/infrastructure/adapters/session/SessionProvider";
import type { Signal } from "@preact/signals";
import type { ReadingHistoryTimelineComponent } from "../../seed-bible-utils/infrastructure/models/seedBible";
import "./../styles/styles.css";
import { memo } from "preact/compat";

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
  seedBibleUtilsEventManager: BaseEventManager<SeedBibleUtilsEvents>;
  scriptureMapEventManager: BaseEventManager<ScriptureMapEvents>;
  scriptureService: ScriptureService;
  userColorStore: UserColorStore;
  userPresenceService: UserPresenceService;
  arrangementService: ArrangementService;
  getDayRangeSeconds: GetDayRangeSecondsType;
  seedBibleDataRepository: SeedBibleDataRepository;
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
  layoutConfigProvider: LayoutConfigProvider;
  readingHistoryConfigProvider: ReadingHistoryConfigProvider;
  sectionInfoMapper: SectionInfoMapper;
  language: string;
  sessionProvider: SessionProvider;
  bookNames: Signal<Map<string, string>>;
  MaterialIcon: (props: {
    children: string;
    className?: string;
  }) => preact.JSX.Element;
  ReadingHistoryTimeline: ReadingHistoryTimelineComponent;
  userId: string | undefined;
  /**
   * DOM node rendered by the pane's `header` slot (see `PanesManager.openPane`)
   * that the settings button portals into, so the button keeps this
   * context's state while its DOM output renders in the pane header instead
   * of the settings panel.
   */
  settingsHeaderSlot: Signal<HTMLElement | null>;
}

type ScriptureMapProps = {
  config: ScriptureMapConfig;
};

export const ScriptureMap = memo<
  (args: ScriptureMapProps) => preact.JSX.Element | null
>(({ config }) => {
  const { mode, project } = config;

  if (mode === ScriptureMapModes.Project && !project) return null;

  return (
    <>
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
