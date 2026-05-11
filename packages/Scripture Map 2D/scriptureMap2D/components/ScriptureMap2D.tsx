import { TimeProvider } from "scriptureMap2D.contexts.Time.TimeContext";
import { ScriptureMap2DProvider } from "scriptureMap2D.contexts.ScriptureMap2D.ScriptureMap2DContext";
import { ScriptureMap2DWrapper } from "scriptureMap2D.components.containers.ScriptureMap2DWrapper";
import { ReadingHistoryProvider } from "scriptureMap2D.contexts.ReadingHistory.ReadingHistoryContext";
import type { ChapterKey, BookKey } from "scriptureMap2D.models.arrangement";
import { type ProjectChapterStateType } from "scriptureMap2D.models.project";
import {
  ScriptureMap2DModes,
  type ScriptureMap2DModesType,
} from "scriptureMap2D.models.scriptureMap";
import type { SeedBibleState } from "seed-bible.managers.SeedBibleStateManager";
import type { BaseEventManager } from "bibleVizUtils.application.services.BaseEventManager";
import type { BibleVizUtilsEvents } from "bibleVizUtils.domain.models.events";
import type { ScriptureMap2DEvents } from "scriptureMap2D.models.events";
import type { ScriptureService } from "bibleVizUtils.application.services.ScriptureService";

const { memo } = os.appCompat;

export interface ScriptureMap2DConfig {
  arrangementIndex?: number;
  mode: ScriptureMap2DModesType;
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
  appId: string;
  extensionId: string;
  translate?: (
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
  scriptureMap2DEventManager: BaseEventManager<ScriptureMap2DEvents>;
  scriptureService: ScriptureService;
}

type ScriptureMap2DProps = {
  config: ScriptureMap2DConfig;
  customCSS?: string;
};

export const ScriptureMap2D = memo<
  (args: ScriptureMap2DProps) => preact.JSX.Element | null
>(({ config, customCSS }) => {
  const { mode, project } = config;

  if (mode === ScriptureMap2DModes.Project && !project) return null;

  return (
    <>
      {customCSS && <style>{customCSS}</style>}
      <TimeProvider>
        <ScriptureMap2DProvider config={config}>
          <ReadingHistoryProvider>
            <ScriptureMap2DWrapper />
          </ReadingHistoryProvider>
        </ScriptureMap2DProvider>
      </TimeProvider>
    </>
  );
});
