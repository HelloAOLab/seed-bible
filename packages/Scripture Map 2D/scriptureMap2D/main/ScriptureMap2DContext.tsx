const {
  createContext,
  useRef,
  useState,
  useContext,
  useCallback,
  useMemo,
  useEffect,
} = os.appHooks;

const ScriptureMap2DContext = createContext();

const usersInfo = {
  Gabriel: {
    color: "#aecbff",
    borderColor: "#7caaff",
  },
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
  Gabriel: {
    book: "Genesis",
    chapter: 2,
  },
  Sujan: {
    book: "Genesis",
    chapter: 2,
  },
  Amir: {
    book: "Genesis",
    chapter: 2,
  },
  Craig: {
    book: "Genesis",
    chapter: 5,
  },
  Kushagra: {
    book: "Exodus",
    chapter: 1,
  },
  Mazen: {
    book: "Exodus",
    chapter: 1,
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

const UserPresenceTimeType = {
  Day: "Day",
  Week: "Week",
  Month: "Month",
  Year: "Year",
  Forever: "Forever",
};

const ContentVisualizationType = {
  Gradient: "Gradient",
  Container: "Container",
};

const MIN_SCALE_FACTOR = 0.25;
const MAX_SCALE_FACTOR = 1.5;

const MAX_CHAPTER_HEAT_COUNT = 5;
const CHAPTER_BASE_BACKGROUND_COLOR = "#E3E3E3";

export const ScriptureMap2DProvider = ({
  children,
  parentContext,
  ScriptureMap2DModes,
  ProjectChapterState,
}) => {
  const {
    arrangementIndex,
    initialScaleFactor = 1,
    initialIsReadingHistoryEnabled = false,
  } = parentContext;

  const { hooksBot, sortedTimePeriods, greaterTimePeriodTime } = useMemo(() => {
    const sortedTimePeriods =
      BibleVizUtils.Data.masks.historyTimePeriodsInfo.toSorted(
        (periodInfoA, periodInfoB) => {
          return (
            periodInfoA.GetTimePeriodInMs() - periodInfoB.GetTimePeriodInMs()
          );
        }
      );
    const greaterTimePeriodTime =
      sortedTimePeriods[sortedTimePeriods.length - 1].GetTimePeriodInMs();
    const hooksBot = getBot("system", "app.hooks");

    return { hooksBot, sortedTimePeriods, greaterTimePeriodTime };
  }, []);
  const arrangement = useMemo(() => {
    return BibleVizUtils.Data.vars.fixedArrangementsInfo[arrangementIndex];
  }, [arrangementIndex]);

  const [readingHistory, setReadingHistory] = useState({
    ...hooksBot.vars.tempReadingHistory,
  });
  const [readingHistoryUsersFilters, setReadingHistoryUsersFilters] = useState(
    new Map(
      Object.keys(readingHistory).map((userId) => {
        return [userId, userId === configBot.id ? true : false];
      })
    )
  );
  const [readingHistoryRange, setReadingHistoryRange] = useState(null);

  const tryUpdateReadingHistoryUsersFilters = useCallback(() => {
    const newUsersIds = [];
    Object.keys(readingHistory).forEach((userId) => {
      if (!readingHistoryUsersFilters.has(userId)) {
        newUsersIds.push(userId);
      }
    });
    if (newUsersIds.length > 0) {
      const copy = new Map(readingHistoryUsersFilters);
      newUsersIds.forEach((userId) => {
        copy.set(userId, false);
      });
      setReadingHistoryUsersFilters(copy);
    }
  }, [readingHistoryUsersFilters, readingHistory]);
  const handleReadingHistoryUserSelectorClick = useCallback(
    (key) => {
      const copy = new Map(readingHistoryUsersFilters);
      if (key === "all") {
        Array.from(readingHistoryUsersFilters).forEach(([stateKey]) => {
          copy.set(stateKey, true);
        });
      } else {
        const allSelected = Array.from(readingHistoryUsersFilters).every(
          ([, value]) => {
            return value;
          }
        );
        if (allSelected) {
          Array.from(readingHistoryUsersFilters).forEach(([stateKey]) => {
            copy.set(stateKey, stateKey === key ? true : false);
          });
        } else {
          copy.set(key, !copy.get(key));
        }
      }
      setReadingHistoryUsersFilters(copy);
    },
    [readingHistoryUsersFilters]
  );

  const handleReadingHistoryRangeSelectorClick = useCallback((range) => {
    setReadingHistoryRange(range);
  });

  useEffect(() => {
    tryUpdateReadingHistoryUsersFilters();
  }, [readingHistory]);

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
  const [showLabels, setShowLabels] = useState(true);
  // const [showingAllChapters, setShowingAllChapters] = useState(true);
  const [isUserPresenceEnabled, setIsUserPresenceEnabled] = useState(false);
  const [isReadingHistoryEnabled, setIsReadingHistoryEnabled] = useState(
    initialIsReadingHistoryEnabled
  );
  const [usersStatus, setUsersStatus] = useState(
    new Map(
      Array.from(content).map(([key]) => {
        return [key, true];
      })
    )
  );
  const [modes, setModes] = useState(
    new Map([
      ["Content", false],
      ["Reading", false],
    ])
  );
  const [contentVisualization, setContentVisualization] = useState(
    ContentVisualizationType.Container
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

  const handleContentHeatmapToggle = useCallback(() => {
    setIsUserPresenceEnabled((prev) => !prev);
  }, [isUserPresenceEnabled]);

  const handleZoomIn = useCallback(() => {
    if (scaleFactor < MAX_SCALE_FACTOR) {
      const newValue = Math.min(
        MAX_SCALE_FACTOR,
        scaleFactor + MIN_SCALE_FACTOR
      );
      setScaleFactor(newValue);
    }
  }, [scaleFactor]);

  const handleZoomOut = useCallback(() => {
    if (scaleFactor > MIN_SCALE_FACTOR) {
      const newValue = Math.max(
        MIN_SCALE_FACTOR,
        scaleFactor - MIN_SCALE_FACTOR
      );
      setScaleFactor(newValue);
    }
  }, [scaleFactor]);

  const handleLabelsToggle = useCallback(() => {
    setShowLabels((prev) => !prev);
  }, []);

  // const handleShowAllChaptersToggle = useCallback(() => {
  //     setShowingAllChapters(prev => !prev);
  // }, [])

  useEffect(() => {
    globalThis.scriptureMap2DHistoryUpdate = () => {
      setReadingHistory({ ...hooksBot.vars.tempReadingHistory });
    };
    return () => {
      globalThis.scriptureMap2DHistoryUpdate = null;
    };
  }, []);

  const handleUserButtonClick = useCallback(
    ({ user }) => {
      const copy = new Map(usersStatus);
      copy.set(user, !copy.get(user));
      setUsersStatus(copy);
    },
    [usersStatus]
  );

  const handleModeButtonClick = useCallback(
    ({ mode }) => {
      const copy = new Map(modes);
      copy.set(mode, !copy.get(mode));
      setModes(copy);
    },
    [modes]
  );

  const handleContentVisualizationButtonClick = useCallback((type) => {
    setContentVisualization(type);
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

  const { filteredReadingHistory, filteredReadingHistoryCount } =
    useMemo(() => {
      const filteredReadingHistory = {};
      let filteredReadingHistoryCount = 0;
      readingHistoryUsersFilters.forEach((selected, userId) => {
        if (selected && readingHistory[userId]) {
          filteredReadingHistory[userId] = readingHistory[userId];
          filteredReadingHistoryCount++;
        }
      });
      return { filteredReadingHistory, filteredReadingHistoryCount };
    }, [readingHistory, readingHistoryUsersFilters]);

  const booksWithReadingHistory = useMemo(() => {
    console.log(
      `[Debug] ScriptureMap2DContext booksWithReadingHistory useMemo`
    );

    const booksSet = new Set();
    const lastTimePeriod =
      BibleVizUtils.Data.masks.historyTimePeriodsInfo[
        BibleVizUtils.Data.masks.historyTimePeriodsInfo.length - 1
      ].GetTimePeriodInMs();
    const now = Date.now();
    const lastTimePeriodTime = now - lastTimePeriod;
    const effectiveRange = readingHistoryRange ?? {
      start: lastTimePeriodTime,
      end: now,
    };

    for (const userId in filteredReadingHistory) {
      const userHistory = filteredReadingHistory[userId];
      for (const bookId in userHistory) {
        if (booksSet.has(bookId)) break;

        const bookHistory = userHistory[bookId];
        for (const chapter in bookHistory) {
          if (booksSet.has(bookId)) break;

          const entries = bookHistory[chapter];

          for (const entry of entries) {
            if (DoRangesOverlap(entry, effectiveRange)) {
              booksSet.add(bookId);
              break;
            }
          }
        }
      }
    }

    return booksSet;
  }, [filteredReadingHistory, readingHistoryRange]);

  return (
    <ScriptureMap2DContext.Provider
      value={{
        scaleFactor,
        MIN_SCALE_FACTOR,
        setScaleFactor,
        showLabels,
        handleZoomIn,
        handleZoomOut,
        handleLabelsToggle,
        arrangementIndex,
        arrangement,
        // handleShowAllChaptersToggle,
        // showingAllChapters,
        handleContentHeatmapToggle,
        isUserPresenceEnabled,
        isReadingHistoryEnabled,
        content,
        usersStatus,
        MAX_CHAPTER_HEAT_COUNT,
        handleUserButtonClick,
        modes,
        handleModeButtonClick,
        UserPresenceTimeType,
        usersInfo,
        userPresence,
        bookWidth,
        chapterGap,
        chapterPadding,
        chapterWidth,
        chapterHeight,
        ContentVisualizationType,
        contentVisualization,
        handleContentVisualizationButtonClick,
        handleProjectFilterOptionClick,
        readingHistory,
        upcomingEvents,
        projectFilters,
        ScriptureMap2DModes,
        ProjectChapterState,
        projectStateStyle,

        readingHistoryUsersFilters,
        handleReadingHistoryUserSelectorClick,
        hooksBot,
        readingHistoryRange,
        handleReadingHistoryRangeSelectorClick,
        CHAPTER_BASE_BACKGROUND_COLOR,
        filteredReadingHistory,
        filteredReadingHistoryCount,
        sortedTimePeriods,
        greaterTimePeriodTime,
        booksWithReadingHistory,
        ...parentContext,
      }}
    >
      {children}
    </ScriptureMap2DContext.Provider>
  );
};

export const useScriptureMap2DContext = () => {
  return useContext(ScriptureMap2DContext);
};

function DoRangesOverlap(rangeA, rangeB) {
  const now = os.localTime;
  return (
    rangeA.start <= (rangeB.end ?? now) &&
    (rangeA.end ?? now) >= (rangeB.start ?? now)
  );
}
