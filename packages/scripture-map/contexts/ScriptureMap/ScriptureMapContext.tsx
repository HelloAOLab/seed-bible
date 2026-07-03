import { useScriptureMapProvider } from "./useScriptureMapProvider";
import type { ScriptureMapConfig } from "../../components/ScriptureMap";
import type { Dispatch, StateUpdater } from "preact/hooks";
import type { ScriptureMapContentValue } from "../../models/content";
import { type ProjectChapterStateType } from "../../models/project";
import {
  type ProjectStateStyle,
  type ProjectFilters,
} from "../../models/project";
import type { ReaderTab } from "../../../seed-bible/seed-bible/managers/TabsManager";
import type { ArrangementInfo } from "../../../seed-bible-utils/domain/models/arrangement";
import type { UserPresence } from "../../../seed-bible-utils/domain/models/userPresence";
import type { UserData } from "../../../seed-bible-utils/domain/models/userPresence";

interface ScriptureMapProviderProps {
  children: React.ReactNode;
  config: ScriptureMapConfig;
}

export interface ScriptureMapContextType extends ScriptureMapConfig {
  scaleFactor: number;
  MIN_SCALE_FACTOR: number;
  setScaleFactor: Dispatch<StateUpdater<number>>;
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
  setShowingAllChapters: Dispatch<StateUpdater<boolean>>;
  isUserPresenceEnabled: boolean;
  setIsUserPresenceEnabled: Dispatch<StateUpdater<boolean>>;
  isReadingHistoryEnabled: boolean;
  setIsReadingHistoryEnabled: Dispatch<StateUpdater<boolean>>;
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
  setShowingBooksColors: Dispatch<StateUpdater<boolean>>;
  activeTabId: string;
  usersColors: UserData[];
  userPresence: UserPresence;

  tabs: ReaderTab[];
  activeTab: ReaderTab;
}

import { createContext } from "preact";
import { useContext } from "preact/hooks";

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
