import { useScriptureMap2DProvider } from "scriptureMap2D.contexts.ScriptureMap2D.useScriptureMap2DProvider";
import type { ScriptureMap2DConfig } from "scriptureMap2D.components.ScriptureMap2D";
import type { StateUpdater } from "../../../../../typings/AuxLibraryDefinitions";
import type { ArrangementInfo } from "bibleVizUtils.data.BibleVizDataRepository";
import type { ScriptureMap2DContentValue } from "scriptureMap2D.models.content";
import { type ProjectChapterStateType } from "scriptureMap2D.models.project";
import type { UserPresence } from "bibleVizUtils.models.userPresence";
import { type UserData } from "bibleVizUtils.services.UserColorStore";
import {
  type ProjectStateStyle,
  type ProjectFilters,
} from "scriptureMap2D.models.project";

interface ScriptureMap2DProviderProps {
  children: React.ReactNode;
  config: ScriptureMap2DConfig;
}

export interface ScriptureMap2DContextType extends ScriptureMap2DConfig {
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
  content: Map<string, ScriptureMap2DContentValue>;
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

  tabs: unknown;
  activeTab: {
    data: {
      bookId: string;
      chapter: number;
    };
  };
}

const { createContext, useContext } = os.appHooks;

const ScriptureMap2DContext = createContext<
  ScriptureMap2DContextType | undefined
>(undefined);

export const ScriptureMap2DProvider = ({
  children,
  config,
}: ScriptureMap2DProviderProps) => {
  const value = useScriptureMap2DProvider(config);

  if (!value.arrangement) return <></>;

  return (
    <ScriptureMap2DContext.Provider value={value}>
      {children}
    </ScriptureMap2DContext.Provider>
  );
};

export const useScriptureMap2DContext = () => {
  const context = useContext(ScriptureMap2DContext);

  if (!context) {
    throw new Error(
      "useScriptureMap2DContext must be used within a ScriptureMap2DContext"
    );
  }

  return context;
};
