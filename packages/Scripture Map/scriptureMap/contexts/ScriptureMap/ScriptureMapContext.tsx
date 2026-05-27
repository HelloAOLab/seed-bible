import { useScriptureMapProvider } from "scriptureMap.contexts.ScriptureMap.useScriptureMapProvider";
import type { ScriptureMapConfig } from "scriptureMap.components.ScriptureMap";
import type { StateUpdater } from "../../../../../typings/AuxLibraryDefinitions";
import type { ScriptureMapContentValue } from "scriptureMap.models.content";
import { type ProjectChapterStateType } from "scriptureMap.models.project";
import {
  type ProjectStateStyle,
  type ProjectFilters,
} from "scriptureMap.models.project";
import type { ReaderTab } from "seed-bible.managers.TabsManager";
import type { ArrangementInfo } from "bibleVizUtils.domain.models.arrangement";
import type { UserPresence } from "bibleVizUtils.domain.models.userPresence";
import type { UserData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/models/userPresence";

interface ScriptureMapProviderProps {
  children: React.ReactNode;
  config: ScriptureMapConfig;
}

export interface ScriptureMapContextType extends ScriptureMapConfig {
  scaleFactor: number;
  MIN_SCALE_FACTOR: number;
  setScaleFactor: StateUpdater<number>;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  showTestamentLabels: boolean;
  showSectionLabels: boolean;
  handleTestamentLabelsToggle: () => void;
  handleSectionLabelsToggle: () => void;
  handleShowAllChaptersToggle: () => void;
  arrangementIndex: number;
  arrangement?: ArrangementInfo;
  showingAllChapters: boolean;
  setShowingAllChapters: StateUpdater<boolean>;
  isUserPresenceEnabled: boolean;
  setIsUserPresenceEnabled: StateUpdater<boolean>;
  isReadingHistoryEnabled: boolean;
  setIsReadingHistoryEnabled: StateUpdater<boolean>;
  content: Map<string, ScriptureMapContentValue>;
  MAX_CHAPTER_HEAT_COUNT: number;
  bookWidth: number;
  chapterGap: number;
  chapterWidth: number;
  chapterHeight: number;
  handleProjectFilterOptionClick: (
    key: "all" | ProjectChapterStateType
  ) => void;
  upcomingEvents: {
    [user: string]: {
      book: string;
      chapter: number;
      remainingDays: number;
    }[];
  };
  projectFilters: ProjectFilters;
  projectStateStyle: ProjectStateStyle;
  BASE_BACKGROUND_COLOR: string;
  isMobile: boolean;
  showingBooksColors: boolean;
  setShowingBooksColors: StateUpdater<boolean>;
  activeTabId: string;
  usersColors: UserData[];
  userPresence: UserPresence;

  tabs: ReaderTab[];
  activeTab: ReaderTab;
}

const { createContext, useContext } = os.appHooks;

const ScriptureMapContext = createContext<ScriptureMapContextType | undefined>(
  undefined
);

export const ScriptureMapProvider = ({
  children,
  config,
}: ScriptureMapProviderProps) => {
  const value = useScriptureMapProvider(config);

  if (!value.arrangement) return <></>;

  return (
    <ScriptureMapContext.Provider value={value}>
      {children}
    </ScriptureMapContext.Provider>
  );
};

export const useScriptureMapContext = () => {
  const context = useContext(ScriptureMapContext);

  if (!context) {
    throw new Error(
      "useScriptureMapContext must be used within a ScriptureMapContext"
    );
  }

  return context;
};
