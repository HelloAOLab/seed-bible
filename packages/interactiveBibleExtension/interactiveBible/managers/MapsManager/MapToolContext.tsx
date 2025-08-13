const { createContext, useRef, useState, useContext, useCallback, useEffect, useMemo } = os.appHooks;

const MapToolContext = createContext();

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

const SIZE_RATIO_POINT_TWO_FIVE = 0.02085;
const SIZE_RATIO_POINT_FIVE = 0.0417;
const SIZE_RATIO_POINT_SEVEN_FIVE = 0.06255;
const SIZE_RATIO_1 = 0.0834;
const SIZE_RATIO_2 = 0.1667;
const SIZE_RATIO_3 = 0.2502;
const SIZE_RATIO_4 = 0.334;
const SIZE_RATIO_8 = 0.667;
const SIZE_RATIO_10 = 0.834;
const SIZE_RATIO_12 = 1;
const SIZE_RATIO_20 = 1.667;
const SIZE_RATIO_48 = 4;

export const MapToolProvider = ({
        children,
        parentContext,
        MapToolModes, 
        ProjectChapterState
    }) => {

    const ProjectStateStyle = useMemo(() => {
        return {
            [ProjectChapterState.Unset]: {backgroundColor: "rgb(227, 227, 227)", borderColor: "rgb(227, 227, 227)", borderStyle: "solid"},
            [ProjectChapterState.NotStarted]: {backgroundColor: "rgb(227, 227, 227)", borderColor: "grey", borderStyle: "dashed"},
            [ProjectChapterState.InProgress]: {backgroundColor: "#ffeaa7", borderColor: "#D8A90F", borderStyle: "dashed"},
            [ProjectChapterState.NeedsReview]: {backgroundColor: "#ffb3a3", borderColor: "#B82A0D", borderStyle: "dashed"},
            [ProjectChapterState.Completed]: {backgroundColor: "#87eb72", borderColor: "#87eb72", borderStyle: "solid"},
        }
    }, [ProjectChapterState])

    const { arrangementIndex } = parentContext;

    const minScaleFactor = useRef(12);
    const maxScaleFactor = useRef(72);
    const [scaleFactor, setScaleFactor] = useState(24)
    const [showLabels, setShowLabels] = useState(true);
    // const [showingAllChapters, setShowingAllChapters] = useState(true);
    const arrangement = useMemo(() => {return InstanceManager.vars.fixedArrangementsInfo[arrangementIndex]}, [arrangementIndex]);
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
    const FIXED_SIZE_POINT_TWO_FIVE = useMemo(() => { return getFixedSizeByRatio(SIZE_RATIO_POINT_TWO_FIVE) }, [scaleFactor])
    const FIXED_SIZE_POINT_FIVE = useMemo(() => { return getFixedSizeByRatio(SIZE_RATIO_POINT_FIVE) }, [scaleFactor])
    const FIXED_SIZE_POINT_SEVEN_FIVE = useMemo(() => { return getFixedSizeByRatio(SIZE_RATIO_POINT_SEVEN_FIVE) }, [scaleFactor])
    const FIXED_SIZE_1 = useMemo(() => { return getFixedSizeByRatio(SIZE_RATIO_1) }, [scaleFactor])
    const FIXED_SIZE_2 = useMemo(() => { return getFixedSizeByRatio(SIZE_RATIO_2) }, [scaleFactor])
    const FIXED_SIZE_3 = useMemo(() => { return getFixedSizeByRatio(SIZE_RATIO_3) }, [scaleFactor])
    const FIXED_SIZE_4 = useMemo(() => { return getFixedSizeByRatio(SIZE_RATIO_4) }, [scaleFactor])
    const FIXED_SIZE_8 = useMemo(() => { return getFixedSizeByRatio(SIZE_RATIO_8) }, [scaleFactor])
    const FIXED_SIZE_10 = useMemo(() => { return getFixedSizeByRatio(SIZE_RATIO_10) }, [scaleFactor])
    const FIXED_SIZE_12 = useMemo(() => { return getFixedSizeByRatio(SIZE_RATIO_12) }, [scaleFactor])
    const FIXED_SIZE_20 = useMemo(() => { return getFixedSizeByRatio(SIZE_RATIO_20) }, [scaleFactor])
    const FIXED_SIZE_48 = useMemo(() => { return getFixedSizeByRatio(SIZE_RATIO_48) }, [scaleFactor])

    const bookWidth = useMemo(() => { return getFixedSizeByRatio(MapElementMeasurements.BookScaleX) }, [scaleFactor])
    const chapterGap = useMemo(() => { return getFixedSizeByRatio(MapElementMeasurements.ChapterGap) }, [scaleFactor])
    const chapterWidth = useMemo(() => { return getFixedSizeByRatio(MapElementMeasurements.ChapterWidth) }, [scaleFactor])
    const chapterHeight = useMemo(() => { return getFixedSizeByRatio(MapElementMeasurements.ChapterHeight) }, [scaleFactor])

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
        if(scaleFactor < maxScaleFactor.current)
        {
            const newValue = Math.min(maxScaleFactor.current, scaleFactor + 4)
            setScaleFactor(newValue)
        }
    }, [scaleFactor])

    const handleZoomOut = useCallback(() => {
        if(scaleFactor > minScaleFactor.current)
        {
            const newValue = Math.max(minScaleFactor.current, scaleFactor - 4);
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

    useEffect(() => {
        return () => {globalThis.mapPanelHistoryUpdate = null}
    }, [])

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
        <MapToolContext.Provider value={{ 
            scaleFactor,
            minScaleFactor,
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
            FIXED_SIZE_POINT_TWO_FIVE,
            FIXED_SIZE_POINT_FIVE,
            FIXED_SIZE_POINT_SEVEN_FIVE,
            FIXED_SIZE_1,
            FIXED_SIZE_2,
            FIXED_SIZE_3,
            FIXED_SIZE_4,
            FIXED_SIZE_8,
            FIXED_SIZE_10,
            FIXED_SIZE_12, 
            FIXED_SIZE_20,
            FIXED_SIZE_48,
            SIZE_RATIO_POINT_FIVE,
            SIZE_RATIO_1,
            SIZE_RATIO_2,
            SIZE_RATIO_4,
            SIZE_RATIO_48,
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
            MapToolModes,
            ProjectChapterState,
            ProjectStateStyle,
            ...parentContext
        }} >
            {children}
        </MapToolContext.Provider>
    );
}

export const useMapToolContext = () => {
    return useContext(MapToolContext);
}