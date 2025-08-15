const { createContext, useRef, useState, useContext, useCallback, useEffect, useMemo } = os.appHooks;

const BibleLayout2DContext = createContext();

const usersInfo = {
    Gabriel: {
        color: "#aecbff",
        borderColor: "#7caaff"
    },
    Craig: {
        color: "#ffb0d8",
        borderColor: "#ff62b2"
    },
    Sujan: {
        color: "#d3a3ff",
        borderColor: "#8a2be2"
    },
    Mazen: {
        color: "#bcf3f5",
        borderColor: "#34d0d5"
    },
    Amir: {
        color: "#DCDCDC",
        borderColor: "#a8a8a8"
    },
    Kushagra: {
        color: "#90eae6",
        borderColor: "#2caca6"
    }
}

const content = new Map([
    [
        "Gabriel", 
        {
            books: {
                Genesis: {
                    "1": [true, true],
                    "2": [true, true, true],
                    "3": [true, true, true, true, true]
                },
                Exodus: {
                    "2": [true, true, true],
                    "6": [true],
                    "10": [true, true, true, true, true, true]
                },
                Mark: {
                    "1": [true, true, true, true, true, true, true, true],
                    "2": [true, true],
                    "13": [true]
                }
            }
        }
    ],
    [
        "Craig",
        {
            books: {
                Genesis: {
                    "3": [true]
                },
                Leviticus: {
                    "2": [true, true, true, true],
                    "3": [true, true, true],
                    "8": [true, true, true]
                },
                Mark: {
                    "3": [true, true, true, true],
                    "5": [true, true],
                    "10": [true, true, true, true, true,]
                }
            }
        }
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
                    "13": [true, true, true]
                },
                Exodus: {
                    "2": [true, true],
                    "6": [true, true, true, true, true],
                    "10": [true, true]
                },
                Leviticus: {
                    "20": [true, true, true, true],
                    "21": [true, true],
                    "22": [true, true, true, true, true,]
                }
            }
        }
    ],
    [
        "Mazen",
        {
            books: {
                Genesis: {
                    "3": [true, true],
                    "12": [true, true],
                    "13": [true, true, true]
                },
                Exodus: {
                    "2": [true, true, true],
                    "6": [true, true],
                    "10": [true]
                },
                Leviticus: {
                    "20": [true, true],
                    "22": [true]
                }
            }
        }
    ],
    [
        "Amir",
        {
            books: {
                Leviticus: {
                    "10": [true, true],
                    "11": [true]
                }
            }
        }
    ],
    [
        "Kushagra",
        {
            books: {
                Leviticus: {
                    "1": [true, true],
                    "2": [true]
                }
            }
        }
    ]
]);

const userPresence = {
    Gabriel: {
        book: "Genesis",
        chapter: 2
    },
    Sujan: {
        book: "Genesis",
        chapter: 2
    },
    Amir: {
        book: "Genesis",
        chapter: 2
    },
    Craig: {
        book: "Genesis",
        chapter: 5
    },
    Kushagra: {
        book: "Exodus",
        chapter: 1
    },
    Mazen: {
        book: "Exodus",
        chapter: 1
    }
}

const readingHistory = {
    Gabriel: [
        {book: "Genesis", chapter: 1, daysAgo: 2}
    ],
    Craig: [
        {book: "Genesis", chapter: 1, daysAgo: 4}
    ],
    Sujan: [
        {book: "Genesis", chapter: 1, daysAgo: 6}
    ],
    Mazen: [
        {book: "Genesis", chapter: 7, daysAgo: 1}
    ],
    Amir: [
        {book: "Genesis", chapter: 7, daysAgo: 1}
    ],
    Kushagra: [
        {book: "Genesis", chapter: 5, daysAgo: 5}
    ]
}

const upcomingEvents = {
    Gabriel: [
        {book: "Genesis", chapter: 1, remainingDays: 2}
    ],
    Craig: [
        {book: "Genesis", chapter: 2, remainingDays: 4}
    ],
    Sujan: [
        {book: "Genesis", chapter: 2, remainingDays: 6}
    ],
    Mazen: [
        {book: "Genesis", chapter: 5, remainingDays: 1}
    ],
    Amir: [
        {book: "Genesis", chapter: 5, remainingDays: 1}
    ],
    Kushagra: [
        {book: "Genesis", chapter: 8, remainingDays: 5}
    ]
}

const UserPresenceTimeType = {
    Day: "Day",
    Week: "Week",
    Month: "Month",
    Year: "Year",
    Forever: "Forever"
}

const ContentVisualizationType = {
    Gradient: "Gradient",
    Container: "Container"
}

const SIZE_RATIO = {
    "0.25": 0.02085,
    "0.5": 0.0417,
    "0.75": 0.06255,
    "1": 0.0834,
    "2": 0.1667,
    "3": 0.2502,
    "4": 0.334,
    "8": 0.667,
    "10": 0.834,
    "12": 1,
    "20": 1.667,
    "48": 4
}
const MIN_SCALE_FACTOR = 12;
const MAX_SCALE_FACTOR = 72;

export const BibleLayout2DProvider = ({
        children,
        parentContext,
        BibleLayout2DModes, 
        ProjectChapterState
    }) => {

    const projectStateStyle = useMemo(() => {
        return {
            [ProjectChapterState.Unset]: {backgroundColor: "rgb(227, 227, 227)", borderColor: "rgb(227, 227, 227)", borderStyle: "solid"},
            [ProjectChapterState.NotStarted]: {backgroundColor: "rgb(227, 227, 227)", borderColor: "grey", borderStyle: "dashed"},
            [ProjectChapterState.InProgress]: {backgroundColor: "#ffeaa7", borderColor: "#D8A90F", borderStyle: "dashed"},
            [ProjectChapterState.NeedsReview]: {backgroundColor: "#ffb3a3", borderColor: "#B82A0D", borderStyle: "dashed"},
            [ProjectChapterState.Completed]: {backgroundColor: "#87eb72", borderColor: "#87eb72", borderStyle: "solid"},
        }
    }, [ProjectChapterState])

    const { arrangementIndex } = parentContext;

    const [scaleFactor, setScaleFactor] = useState(24)
    const [showLabels, setShowLabels] = useState(true);
    // const [showingAllChapters, setShowingAllChapters] = useState(true);
    const arrangement = useMemo(() => {return InteractiveBibleData.vars.fixedArrangementsInfo[arrangementIndex]}, [arrangementIndex]);
    const [isUserPresenceEnabled, setIsUserPresenceEnabled] = useState(false);
    const [usersStatus, setUsersStatus] = useState(new Map(Array.from(content).map(([key]) => {return [key, true]})))
    const [modes, setModes] = useState(new Map([
        ["Content", false],
        ["Reading", false]
    ]))
    const [contentVisualization, setContentVisualization] = useState(ContentVisualizationType.Container);
    
    const [projectFilters, setProjectFilters] = useState(new Map([
        [ProjectChapterState.NotStarted, true],
        [ProjectChapterState.InProgress, true],
        [ProjectChapterState.NeedsReview, true],
        [ProjectChapterState.Completed, true]
    ]))

    const getRawSizeByRatio = useCallback((ratio) => {
        return Math.round(ratio * scaleFactor)
    }, [scaleFactor])
    const getFixedSizeByRatio = useCallback((ratio) => {
        return `${getRawSizeByRatio(ratio)}px`
    }, [scaleFactor])

    const { fixedSize, bookWidth, chapterGap, chapterWidth, chapterHeight } = useMemo(() => {
        const fixedSize = {
            "0.25": getFixedSizeByRatio(SIZE_RATIO["0.25"]),
            "0.5": getFixedSizeByRatio(SIZE_RATIO["0.5"]),
            "0.75": getFixedSizeByRatio(SIZE_RATIO["0.75"]),
            "1": getFixedSizeByRatio(SIZE_RATIO[1]),
            "2": getFixedSizeByRatio(SIZE_RATIO[2]),
            "3": getFixedSizeByRatio(SIZE_RATIO[3]),
            "4": getFixedSizeByRatio(SIZE_RATIO[4]),
            "8": getFixedSizeByRatio(SIZE_RATIO[8]),
            "10": getFixedSizeByRatio(SIZE_RATIO[10]),
            "12": getFixedSizeByRatio(SIZE_RATIO[12]),
            "20": getFixedSizeByRatio(SIZE_RATIO[20]),
            "48": getFixedSizeByRatio(SIZE_RATIO[48])
        }
        const bookWidth = getFixedSizeByRatio(InteractiveBibleData.tags.BibleLayoutMeasurements.Book2DScaleX);
        const chapterGap = getFixedSizeByRatio(InteractiveBibleData.tags.BibleLayoutMeasurements.Chapter2DGap);
        const chapterWidth = getFixedSizeByRatio(InteractiveBibleData.tags.BibleLayoutMeasurements.Chapter2DWidth);
        const chapterHeight = getFixedSizeByRatio(InteractiveBibleData.tags.BibleLayoutMeasurements.Chapter2DHeight);

        return {fixedSize, bookWidth, chapterGap, chapterWidth, chapterHeight}
    }, [scaleFactor, getFixedSizeByRatio])


    const handleContentHeatmapToggle = useCallback(() => {
        setIsUserPresenceEnabled(prev => !prev);
    }, [isUserPresenceEnabled])

    const historyUpdateListeners = useRef(new Set());
    const unsubscribeFromHistoryUpdate = useCallback((callback) => {
        historyUpdateListeners.current.delete(callback);
    }, [])
    const subscribeToHistoryUpdate = useCallback((callback) => {
        historyUpdateListeners.current.add(callback);
    }, [])
    globalThis.mapPanelHistoryUpdate = useCallback(() => {
        historyUpdateListeners.current.forEach((currFunction) => {currFunction?.()});
    }, [])

    const handleZoomIn = useCallback(() => {
        if(scaleFactor < MAX_SCALE_FACTOR)
        {
            const newValue = Math.min(MAX_SCALE_FACTOR, scaleFactor + 4)
            setScaleFactor(newValue)
        }
    }, [scaleFactor])

    const handleZoomOut = useCallback(() => {
        if(scaleFactor > MIN_SCALE_FACTOR)
        {
            const newValue = Math.max(MIN_SCALE_FACTOR, scaleFactor - 4);
            setScaleFactor(newValue)
        }
    }, [scaleFactor])

    const handleLabelsToggle = useCallback(() => {
        setShowLabels(prev => !prev);
    }, [])

    // const handleShowAllChaptersToggle = useCallback(() => {
    //     setShowingAllChapters(prev => !prev);
    // }, [])

    const maxChapterHeatCount = useMemo(() => {return 5}, []);

    // useEffect(() => {
    //     return () => {globalThis.mapPanelHistoryUpdate = null}
    // }, [])

    const handleUserButtonClick = useCallback(({user}) => {
        const copy = new Map(usersStatus);
        copy.set(user, !copy.get(user));
        setUsersStatus(copy);
    }, [usersStatus])

    const handleModeButtonClick = useCallback(({mode}) => {
        const copy = new Map(modes);
        copy.set(mode, !copy.get(mode));
        setModes(copy);
    }, [modes])

    const handleContentVisualizationButtonClick = useCallback((type) => {
        setContentVisualization(type)
    }, [])

    const handleProjectFilterOptionClick = useCallback((key) => {
        const copy = new Map(projectFilters)
        if(key === "all")
        {
            Array.from(projectFilters).forEach(([stateKey]) => {
                copy.set(stateKey, true)
            })
        }
        else
        {
            const allSelected = Array.from(projectFilters).every(([, value]) => { return value });
            if(allSelected)
            {
                Array.from(projectFilters).forEach(([stateKey]) => {
                    copy.set(stateKey, stateKey === key ? true : false)
                })
            }
            else
            {
                copy.set(key, !copy.get(key));
            }
        }
        setProjectFilters(copy);
    }, [projectFilters])

    return (
        <BibleLayout2DContext.Provider value={{ 
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
            unsubscribeFromHistoryUpdate,
            subscribeToHistoryUpdate,
            handleContentHeatmapToggle,
            isUserPresenceEnabled,
            content,
            usersStatus,
            maxChapterHeatCount,
            handleUserButtonClick,
            modes,
            handleModeButtonClick,
            UserPresenceTimeType,
            usersInfo,
            userPresence,
            fixedSize,
            SIZE_RATIO,
            bookWidth,
            chapterGap,
            chapterWidth,
            chapterHeight,
            ContentVisualizationType,
            contentVisualization,
            handleContentVisualizationButtonClick,
            handleProjectFilterOptionClick,
            readingHistory,
            upcomingEvents,
            getRawSizeByRatio,
            projectFilters,
            BibleLayout2DModes,
            ProjectChapterState,
            projectStateStyle,
            ...parentContext
        }} >
            {children}
        </BibleLayout2DContext.Provider>
    );
}

export const useBibleLayout2DContext = () => {
    return useContext(BibleLayout2DContext);
}