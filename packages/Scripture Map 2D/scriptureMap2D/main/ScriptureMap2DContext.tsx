import { useIsMobile } from "scriptureMap2D.main.CustomHooks";
import { useTabsContext } from "app.hooks.tabs";

const { createContext, useState, useContext, useCallback, useMemo } =
  os.appHooks;

const ScriptureMap2DContext = createContext();

const usersInfo = {
  Craig: {
    color: "#ffb0d8",
    borderColor: "#ff62b2",
  },
  Sujan: {
    color: "#d3a3ff",
    borderColor: "#8a2be2",
  },
  Mazen: {
    color: "#bcf3f5",
    borderColor: "#34d0d5",
  },
  Amir: {
    color: "#DCDCDC",
    borderColor: "#a8a8a8",
  },
  Kushagra: {
    color: "#90eae6",
    borderColor: "#2caca6",
  },
  Guest_1: {
    borderColor: "#20ca58ff",
  },
  Guest_2: {
    borderColor: "#b6ca20ff",
  },
  Guest_3: {
    borderColor: "#ca2020ff",
  },
};

const content = new Map([
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

const userPresence = {
  Sujan: {
    bookId: "GEN",
    chapter: 1,
  },
  Amir: {
    bookId: "GEN",
    chapter: 2,
  },
  Craig: {
    bookId: "GEN",
    chapter: 5,
  },
  Kushagra: {
    bookId: "EXO",
    chapter: 1,
  },
  Mazen: {
    bookId: "EXO",
    chapter: 1,
  },
  Guest_1: {
    bookId: "EXO",
    chapter: 4,
  },
  Guest_2: {
    bookId: "EXO",
    chapter: 4,
  },
  Guest_3: {
    bookId: "EXO",
    chapter: 4,
  },
};

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
const BASE_BACKGROUND_COLOR = "#E3E3E3";

export const ScriptureMap2DProvider = ({
  children,
  parentContext,
  ScriptureMap2DModes,
  ProjectChapterState,
}) => {
  const {
    arrangementIndex = BibleVizUtils.Functions.GetCurrentArrangementIndex(),
    initialScaleFactor = 1,
    initialIsReadingHistoryEnabled = false,
    initialShowingAllChapters = false,
    initialShowLabels = true,
  } = parentContext;

  const isMobile = useIsMobile(768);
  const { tabs, activeTab: activeTabId } = useTabsContext();
  const activeTab = useMemo(() => {
    return tabs.find((tab) => {
      return tab.id === activeTabId;
    });
  }, [tabs, activeTabId]);

  const arrangement = useMemo(() => {
    return BibleVizUtils.Functions.GetArrangementByIndex({
      index: arrangementIndex,
    });
  }, [arrangementIndex]);

  const projectStateStyle = useMemo(() => {
    return {
      [ProjectChapterState.None]: {
        backgroundColor: "rgb(227, 227, 227)",
        borderColor: "rgb(227, 227, 227)",
        borderStyle: "solid",
      },
      [ProjectChapterState.Assigned]: {
        backgroundColor: "rgb(227, 227, 227)",
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

  const [scaleFactor, setScaleFactor] = useState(initialScaleFactor);
  const [showingAllChapters, setShowingAllChapters] = useState(
    initialShowingAllChapters
  );
  const [showingBooksColors, setShowingBooksColors] = useState(true);
  const [showLabels, setShowLabels] = useState(initialShowLabels);
  const [isUserPresenceEnabled, setIsUserPresenceEnabled] = useState(false);
  const [isReadingHistoryEnabled, setIsReadingHistoryEnabled] = useState(
    initialIsReadingHistoryEnabled
  );

  const [projectFilters, setProjectFilters] = useState(
    new Map([
      [ProjectChapterState.Assigned, true],
      [ProjectChapterState.InProgress, true],
      [ProjectChapterState.NeedsReview, true],
      [ProjectChapterState.Completed, true],
    ])
  );

  const { bookWidth, chapterGap, chapterWidth, chapterHeight, chapterPadding } =
    useMemo(() => {
      const bookWidth = scaleFactor * 150;
      const chapterGap = scaleFactor * 5;
      const chapterPadding = scaleFactor * 5;
      const chapterWidth = scaleFactor * 24;
      const chapterHeight = scaleFactor * 24;

      return {
        bookWidth,
        chapterGap,
        chapterWidth,
        chapterHeight,
        chapterPadding,
      };
    }, [scaleFactor]);

  const handleZoomIn = useCallback(() => {
    if (scaleFactor < MAX_SCALE_FACTOR) {
      const newValue = Math.min(
        MAX_SCALE_FACTOR,
        scaleFactor + SCALE_FACTOR_STEP
      );
      setScaleFactor(newValue);
    }
  }, [scaleFactor]);

  const handleZoomOut = useCallback(() => {
    if (scaleFactor > MIN_SCALE_FACTOR) {
      const newValue = Math.max(
        MIN_SCALE_FACTOR,
        scaleFactor - SCALE_FACTOR_STEP
      );
      setScaleFactor(newValue);
    }
  }, [scaleFactor]);

  const handleLabelsToggle = useCallback(() => {
    setShowLabels((prev) => !prev);
  }, []);

  const handleShowAllChaptersToggle = useCallback(() => {
    setShowingAllChapters((prev) => !prev);
  }, []);

  const handleProjectFilterOptionClick = useCallback(
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

  return (
    <ScriptureMap2DContext.Provider
      value={{
        ...parentContext,
        scaleFactor,
        MIN_SCALE_FACTOR,
        setScaleFactor,
        handleZoomIn,
        handleZoomOut,
        showLabels,
        handleLabelsToggle,
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
        usersInfo,
        userPresence,
        bookWidth,
        chapterGap,
        chapterPadding,
        chapterWidth,
        chapterHeight,
        handleProjectFilterOptionClick,
        upcomingEvents,
        projectFilters,
        ScriptureMap2DModes,
        ProjectChapterState,
        projectStateStyle,
        BASE_BACKGROUND_COLOR,
        isMobile,
        showingBooksColors,
        setShowingBooksColors,
        tabs,
        activeTabId,
        activeTab,
      }}
    >
      {children}
    </ScriptureMap2DContext.Provider>
  );
};

export const useScriptureMap2DContext = () => {
  return useContext(ScriptureMap2DContext);
};
