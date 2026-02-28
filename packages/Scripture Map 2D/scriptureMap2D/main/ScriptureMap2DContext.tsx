import { useIsMobile } from "scriptureMap2D.main.CustomHooks";
import { useTabsContext } from "app.hooks.tabs";
import { useSideBarContext } from "app.hooks.sideBar";
import {
  ProjectChapterState,
  type ProjectChapterStateType,
} from "scriptureMap2D.main.enums";
import type {
  ScriptureMap2DProviderProps,
  ScriptureMap2DContextType,
} from "scriptureMap2D.main.interfaces";
import type {
  ProjectStateStyle,
  ProjectFilters,
  ScriptureMap2DContentValue,
  UserPresence,
} from "scriptureMap2D.main.types";
import {
  BibleVizDataRepository,
  type ArrangementInfo,
} from "bibleVizUtils.data.BibleVizDataRepository";
import {
  userColorStore,
  type UserData,
} from "bibleVizUtils.services.UserColorStore";
import { bibleVizUtilsEventManager } from "bibleVizUtils.services.EventManager";
const { createContext, useState, useContext, useCallback, useMemo, useEffect } =
  os.appHooks;

const ScriptureMap2DContext = createContext<
  ScriptureMap2DContextType | undefined
>(undefined);

const content: ScriptureMap2DContextType["content"] = new Map<
  string,
  ScriptureMap2DContentValue
>([
  [
    "Gabriel",
    {
      books: {
        Genesis: {
          "1": [true, true],
          "2": [true, true, true],
          "3": [true, true, true, true, true],
        },
        Exodus: {
          "2": [true, true, true],
          "6": [true],
          "10": [true, true, true, true, true, true],
        },
        Mark: {
          "1": [true, true, true, true, true, true, true, true],
          "2": [true, true],
          "13": [true],
        },
      },
    },
  ],
  [
    "Craig",
    {
      books: {
        Genesis: {
          "3": [true],
        },
        Leviticus: {
          "2": [true, true, true, true],
          "3": [true, true, true],
          "8": [true, true, true],
        },
        Mark: {
          "3": [true, true, true, true],
          "5": [true, true],
          "10": [true, true, true, true, true],
        },
      },
    },
  ],
  [
    "Sujan",
    {
      books: {
        Genesis: {
          "1": [true, true, true, true],
          "2": [true, true, true, true, true],
          "3": [true, true, true, true, true, true, true, true],
          "12": [true, true],
          "13": [true, true, true],
        },
        Exodus: {
          "2": [true, true],
          "6": [true, true, true, true, true],
          "10": [true, true],
        },
        Leviticus: {
          "20": [true, true, true, true],
          "21": [true, true],
          "22": [true, true, true, true, true],
        },
      },
    },
  ],
  [
    "Mazen",
    {
      books: {
        Genesis: {
          "3": [true, true],
          "12": [true, true],
          "13": [true, true, true],
        },
        Exodus: {
          "2": [true, true, true],
          "6": [true, true],
          "10": [true],
        },
        Leviticus: {
          "20": [true, true],
          "22": [true],
        },
      },
    },
  ],
  [
    "Amir",
    {
      books: {
        Leviticus: {
          "10": [true, true],
          "11": [true],
        },
      },
    },
  ],
  [
    "Kushagra",
    {
      books: {
        Leviticus: {
          "1": [true, true],
          "2": [true],
        },
      },
    },
  ],
]);

const upcomingEvents = {
  Gabriel: [{ book: "Genesis", chapter: 1, remainingDays: 2 }],
  Craig: [{ book: "Genesis", chapter: 2, remainingDays: 4 }],
  Sujan: [{ book: "Genesis", chapter: 2, remainingDays: 6 }],
  Mazen: [{ book: "Genesis", chapter: 5, remainingDays: 1 }],
  Amir: [{ book: "Genesis", chapter: 5, remainingDays: 1 }],
  Kushagra: [{ book: "Genesis", chapter: 8, remainingDays: 5 }],
};

const MIN_SCALE_FACTOR = 0.25;
const MAX_SCALE_FACTOR = 1.5;
const SCALE_FACTOR_STEP = 0.05;

const MAX_CHAPTER_HEAT_COUNT = 5;

export const ScriptureMap2DProvider: (
  args: ScriptureMap2DProviderProps
) => React.JSX.Element = ({ children, config }) => {
  const {
    arrangementIndex = BibleVizDataRepository.getCurrentArrangementIndex(),
    initialScaleFactor = 1,
    initialIsReadingHistoryEnabled = false,
    initialShowingAllChapters = false,
    initialShowTestamentLabels = true,
    initialShowSectionLabels = true,
  } = config;
  const { themeColors } = useSideBarContext();

  const [usersColors, setUsersColors] = useState<UserData[]>(() =>
    userColorStore.listUsers()
  );
  const [onlineUsers, setOnlineUsers] = useState<UserPresence>(new Map());

  const BASE_BACKGROUND_COLOR = useMemo<string>(() => {
    return themeColors?.["1"]?.firstToolbarbutton ?? "#dfdede";
  }, [themeColors]);

  const isMobile = useIsMobile(768);
  const { tabs, activeTab: activeTabId } = useTabsContext();
  const activeTab = useMemo(() => {
    return tabs.find((tab) => {
      return tab.id === activeTabId;
    });
  }, [tabs, activeTabId]);

  const userPresence = useMemo<UserPresence>(() => {
    const { bookId, book, chapter } = activeTab.data;
    const newUserPresence: UserPresence = new Map();

    newUserPresence.set(configBot.id, { bookId, book, chapter });
    onlineUsers.forEach((data, userId) => {
      newUserPresence.set(userId, data);
    });

    return newUserPresence;
  }, [onlineUsers, activeTab]);

  // useEffect(() => {
  //   console.log(`[Debug] ScriptureMap2DContext`, { usersColors });
  // }, [usersColors]);

  // useEffect(() => {
  //   console.log(`[Debug] ScriptureMap2DContext`, { userPresence });
  // }, [userPresence]);

  const arrangement = useMemo<ArrangementInfo>(() => {
    return BibleVizDataRepository.getArrangementByIndex({
      index: arrangementIndex,
    });
  }, [arrangementIndex]);

  const projectStateStyle = useMemo<ProjectStateStyle>(() => {
    return {
      [ProjectChapterState.None]: {
        backgroundColor: "var(--whitegray-color)",
        borderColor: "var(--whitegray-color)",
        borderStyle: "solid",
      },
      [ProjectChapterState.Assigned]: {
        backgroundColor: "var(--whitegray-color)",
        borderColor: "grey",
        borderStyle: "dashed",
      },
      [ProjectChapterState.InProgress]: {
        backgroundColor: "#ffeaa7",
        borderColor: "#D8A90F",
        borderStyle: "dashed",
      },
      [ProjectChapterState.NeedsReview]: {
        backgroundColor: "#ffb3a3",
        borderColor: "#B82A0D",
        borderStyle: "dashed",
      },
      [ProjectChapterState.Completed]: {
        backgroundColor: "#87eb72",
        borderColor: "#87eb72",
        borderStyle: "solid",
      },
    };
  }, [ProjectChapterState]);

  const [scaleFactor, setScaleFactor] = useState<number>(initialScaleFactor);
  const [showingAllChapters, setShowingAllChapters] = useState<boolean>(
    initialShowingAllChapters
  );
  const [showingBooksColors, setShowingBooksColors] = useState<boolean>(true);
  const [showTestamentLabels, setShowTestamentLabels] = useState<boolean>(
    initialShowTestamentLabels
  );
  const [showSectionLabels, setShowSectionLabels] = useState<boolean>(
    initialShowSectionLabels
  );
  const [isUserPresenceEnabled, setIsUserPresenceEnabled] =
    useState<boolean>(false);
  const [isReadingHistoryEnabled, setIsReadingHistoryEnabled] =
    useState<boolean>(initialIsReadingHistoryEnabled);

  const [projectFilters, setProjectFilters] = useState<ProjectFilters>(
    new Map([
      [ProjectChapterState.Assigned, true],
      [ProjectChapterState.InProgress, true],
      [ProjectChapterState.NeedsReview, true],
      [ProjectChapterState.Completed, true],
    ])
  );

  const { bookWidth, chapterGap, chapterWidth, chapterHeight } = useMemo<{
    bookWidth: number;
    chapterGap: number;
    chapterWidth: number;
    chapterHeight: number;
  }>(() => {
    const bookWidth = scaleFactor * 150;
    const chapterGap = scaleFactor * 3;
    // const chapterPadding = scaleFactor * 5;
    const chapterWidth = scaleFactor * 32;
    const chapterHeight = scaleFactor * 32;

    return {
      bookWidth,
      chapterGap,
      chapterWidth,
      chapterHeight,
    };
  }, [scaleFactor]);

  const handleZoomIn = useCallback<() => void>(() => {
    if (scaleFactor < MAX_SCALE_FACTOR) {
      const newValue = Math.min(
        MAX_SCALE_FACTOR,
        scaleFactor + SCALE_FACTOR_STEP
      );
      setScaleFactor(newValue);
    }
  }, [scaleFactor]);

  const handleZoomOut = useCallback<() => void>(() => {
    if (scaleFactor > MIN_SCALE_FACTOR) {
      const newValue = Math.max(
        MIN_SCALE_FACTOR,
        scaleFactor - SCALE_FACTOR_STEP
      );
      setScaleFactor(newValue);
    }
  }, [scaleFactor]);

  const handleTestamentLabelsToggle = useCallback<() => void>(() => {
    setShowTestamentLabels((prev) => !prev);
  }, []);

  const handleSectionLabelsToggle = useCallback<() => void>(() => {
    setShowSectionLabels((prev) => !prev);
  }, []);

  const handleShowAllChaptersToggle = useCallback<() => void>(() => {
    setShowingAllChapters((prev) => !prev);
  }, []);

  const handleProjectFilterOptionClick = useCallback<
    (key: "all" | ProjectChapterStateType) => void
  >(
    (key) => {
      const copy = new Map(projectFilters);
      if (key === "all") {
        Array.from(projectFilters).forEach(([stateKey]) => {
          copy.set(stateKey, true);
        });
      } else {
        const allSelected = Array.from(projectFilters).every(([, value]) => {
          return value;
        });
        if (allSelected) {
          Array.from(projectFilters).forEach(([stateKey]) => {
            copy.set(stateKey, stateKey === key ? true : false);
          });
        } else {
          copy.set(key, !copy.get(key));
        }
      }
      setProjectFilters(copy);
    },
    [projectFilters]
  );

  const updateUserColors = useCallback<() => void>(() => {
    setUsersColors(userColorStore.listUsers());
  }, []);

  const updateOnlineUsers = useCallback<(onlineUsers: UserPresence) => void>(
    (data) => {
      setOnlineUsers(data);
    },
    []
  );

  useEffect(() => {
    const updateUserColorsUnsubscribe = bibleVizUtilsEventManager.subscribe(
      "UserColorStoreChanged",
      updateUserColors
    );
    const updateOnlineUsersUnsubscribe = bibleVizUtilsEventManager.subscribe(
      "OnlineUsersChanged",
      updateOnlineUsers
    );

    updateUserColors();

    return () => {
      updateUserColorsUnsubscribe();
      updateOnlineUsersUnsubscribe();
    };
  }, []);

  const value = useMemo<ScriptureMap2DContextType>(() => {
    const value: ScriptureMap2DContextType = {
      ...config,
      scaleFactor,
      MIN_SCALE_FACTOR,
      setScaleFactor,
      handleZoomIn,
      handleZoomOut,
      showTestamentLabels,
      showSectionLabels,
      handleTestamentLabelsToggle,
      handleSectionLabelsToggle,
      handleShowAllChaptersToggle,
      arrangementIndex,
      arrangement,
      showingAllChapters,
      setShowingAllChapters,
      isUserPresenceEnabled,
      setIsUserPresenceEnabled,
      isReadingHistoryEnabled,
      setIsReadingHistoryEnabled,
      content,
      MAX_CHAPTER_HEAT_COUNT,
      bookWidth,
      chapterGap,
      chapterWidth,
      chapterHeight,
      handleProjectFilterOptionClick,
      upcomingEvents,
      projectFilters,
      projectStateStyle,
      BASE_BACKGROUND_COLOR,
      isMobile,
      showingBooksColors,
      setShowingBooksColors,
      tabs,
      activeTabId,
      activeTab,
      usersColors,
      userPresence,
    };
    return value;
  }, [
    config,
    scaleFactor,
    MIN_SCALE_FACTOR,
    setScaleFactor,
    handleZoomIn,
    handleZoomOut,
    showTestamentLabels,
    showSectionLabels,
    handleTestamentLabelsToggle,
    handleSectionLabelsToggle,
    handleShowAllChaptersToggle,
    arrangementIndex,
    arrangement,
    showingAllChapters,
    setShowingAllChapters,
    isUserPresenceEnabled,
    setIsUserPresenceEnabled,
    isReadingHistoryEnabled,
    setIsReadingHistoryEnabled,
    content,
    MAX_CHAPTER_HEAT_COUNT,
    bookWidth,
    chapterGap,
    chapterWidth,
    chapterHeight,
    handleProjectFilterOptionClick,
    upcomingEvents,
    projectFilters,
    projectStateStyle,
    BASE_BACKGROUND_COLOR,
    isMobile,
    showingBooksColors,
    setShowingBooksColors,
    tabs,
    activeTabId,
    activeTab,
    usersColors,
    userPresence,
  ]);

  return (
    <ScriptureMap2DContext.Provider value={value}>
      {children}
    </ScriptureMap2DContext.Provider>
  );
};

export const useScriptureMap2DContext: () => ScriptureMap2DContextType = () => {
  const context = useContext(ScriptureMap2DContext);

  if (!context) {
    throw new Error(
      "useScriptureMap2DContext must be used within a ScriptureMap2DContext"
    );
  }

  return context as ScriptureMap2DContextType;
};
