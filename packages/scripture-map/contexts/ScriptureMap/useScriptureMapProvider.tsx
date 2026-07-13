import type { ScriptureMapContextType } from "./ScriptureMapContext";
import { useIsMobile } from "../../hooks/useIsMobile";
import { ProjectChapterState } from "../../models/project";
import { type ProjectChapterStateType } from "../../models/project";
import {
  type ProjectStateStyle,
  type ProjectFilters,
} from "../../models/project";
import type { ScriptureMapContentValue } from "../../models/content";
import type { ArrangementInfo } from "../../../seed-bible-utils/domain/models/arrangement";
import type { UserPresence } from "../../../seed-bible-utils/domain/models/userPresence";
import type { ScriptureMapConfig } from "../../components/ScriptureMap";
import type { UserData } from "../../../seed-bible-utils/domain/models/userPresence";
import {
  getProfileConfigValue,
  saveProfileConfigValue,
} from "../../../seed-bible/seed-bible/managers/ProfileConfigSync";

import { computed } from "@preact/signals";

import { useState, useCallback, useMemo, useEffect } from "preact/hooks";

const PROFILE_OPEN_BOOK_OVERRIDES = "scriptureMapOpenBooks";

/** Individual books the user has explicitly opened/closed, keyed by book id. Books with no entry fall back to `showingAllChapters`. */
function parseOpenBookOverrides(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const result: Record<string, boolean> = {};
  for (const [bookId, open] of Object.entries(
    value as Record<string, unknown>
  )) {
    if (typeof open === "boolean") {
      result[bookId] = open;
    }
  }
  return result;
}

type UseScriptureMapProvider = (
  config: ScriptureMapConfig
) => ScriptureMapContextType;

const content: ScriptureMapContextType["content"] = new Map<
  string,
  ScriptureMapContentValue
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

export const useScriptureMapProvider: UseScriptureMapProvider = (config) => {
  const {
    arrangementService,
    arrangementIndex = arrangementService.getCurrentArrangementIndex(),
    initialScaleFactor = 1,
    initialIsReadingHistoryEnabled = false,
    initialShowingAllChapters = false,
    initialShowTestamentLabels = true,
    initialShowSectionLabels = true,
    seedBibleState,
    seedBibleUtilsEventManager: bibleVizUtilsEventManager,
    userColorStore,
    userPresenceService,
  } = config;

  const currentTheme = seedBibleState.theme.currentTheme.value;

  const [usersColors, setUsersColors] = useState<UserData[]>(() =>
    userColorStore.listUsers()
  );

  const BASE_BACKGROUND_COLOR = useMemo<string>(() => {
    return (
      currentTheme.variables.readerToolbarFloatingButtonBackground ?? "#dfdede"
    );
  }, [currentTheme]);

  const isMobile = useIsMobile(768);
  const tabs = seedBibleState.tabs.tabs.value;
  const activeTabId = seedBibleState.tabs.selectedTabId.value;
  const activeTab = computed(() => {
    return tabs.find((tab) => {
      return tab.id === activeTabId;
    })!;
  });

  const [userPresence, setUserPresence] = useState<UserPresence>(() =>
    userPresenceService.getUserPresence()
  );

  const arrangement = useMemo<ArrangementInfo | undefined>(() => {
    return arrangementService.getArrangementByIndex(arrangementIndex);
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
  }, []);

  const [scaleFactor, setScaleFactor] = useState<number>(initialScaleFactor);
  const [showingAllChapters, setShowingAllChapters] = useState<boolean>(
    initialShowingAllChapters
  );
  const [openBookOverrides, setOpenBookOverrides] = useState<
    Record<string, boolean>
  >(() =>
    parseOpenBookOverrides(
      getProfileConfigValue(
        seedBibleState.login.profile.value,
        PROFILE_OPEN_BOOK_OVERRIDES
      )
    )
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
    setScaleFactor((prev) => {
      return prev < MAX_SCALE_FACTOR
        ? Math.min(MAX_SCALE_FACTOR, prev + SCALE_FACTOR_STEP)
        : prev;
    });
  }, []);

  const handleZoomOut = useCallback<() => void>(() => {
    setScaleFactor((prev) => {
      return prev > MIN_SCALE_FACTOR
        ? Math.max(MIN_SCALE_FACTOR, prev - SCALE_FACTOR_STEP)
        : prev;
    });
  }, []);

  const handleTestamentLabelsToggle = useCallback<() => void>(() => {
    setShowTestamentLabels((prev) => !prev);
  }, []);

  const handleSectionLabelsToggle = useCallback<() => void>(() => {
    setShowSectionLabels((prev) => !prev);
  }, []);

  // Re-derive from the profile once it finishes its async load (or on
  // login/logout), so a slow profile fetch doesn't leave books stuck on the
  // pre-login default.
  useEffect(() => {
    setOpenBookOverrides(
      parseOpenBookOverrides(
        getProfileConfigValue(
          seedBibleState.login.profile.value,
          PROFILE_OPEN_BOOK_OVERRIDES
        )
      )
    );
  }, [seedBibleState.login.profile.value]);

  const setBookOpen = useCallback<(bookId: string, open: boolean) => void>(
    (bookId, open) => {
      setOpenBookOverrides((prev) => {
        if (prev[bookId] === open) return prev;
        const next = { ...prev, [bookId]: open };
        saveProfileConfigValue(
          seedBibleState.login,
          PROFILE_OPEN_BOOK_OVERRIDES,
          next
        );
        return next;
      });
    },
    [seedBibleState.login]
  );

  const handleShowAllChaptersToggle = useCallback<() => void>(() => {
    setShowingAllChapters((prev) => !prev);
    // A bulk open/close-all replaces any per-book overrides, matching what
    // already happens in-session (each Book resyncs to showingAllChapters).
    setOpenBookOverrides({});
    saveProfileConfigValue(
      seedBibleState.login,
      PROFILE_OPEN_BOOK_OVERRIDES,
      {}
    );
  }, [seedBibleState.login]);

  const handleProjectFilterOptionClick = useCallback<
    (key: "all" | ProjectChapterStateType) => void
  >((key) => {
    setProjectFilters((prev) => {
      const copy = new Map(prev);
      if (key === "all") {
        Array.from(prev).forEach(([stateKey]) => {
          copy.set(stateKey, true);
        });
      } else {
        const allSelected = Array.from(prev).every(([, value]) => {
          return value;
        });
        if (allSelected) {
          Array.from(prev).forEach(([stateKey]) => {
            copy.set(stateKey, stateKey === key ? true : false);
          });
        } else {
          copy.set(key, !copy.get(key));
        }
      }
      return copy;
    });
  }, []);

  const updateUserColors = useCallback<() => void>(() => {
    setUsersColors(userColorStore.listUsers());
  }, []);
  const updateUserPresence = useCallback(() => {
    setUserPresence(userPresenceService.getUserPresence());
  }, []);

  useEffect(() => {
    const updateUserColorsUnsubscribe = bibleVizUtilsEventManager.subscribe(
      "UserColorStoreChanged",
      updateUserColors
    );
    const updateUserPresenceUnsubscribe = bibleVizUtilsEventManager.subscribe(
      "OnUserPresenceUpdate",
      updateUserPresence
    );

    updateUserColors();

    return () => {
      updateUserColorsUnsubscribe();
      updateUserPresenceUnsubscribe();
    };
  }, []);

  const value = useMemo<ScriptureMapContextType>(() => {
    const value: ScriptureMapContextType = {
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
      openBookOverrides,
      setBookOpen,
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
      activeTab: activeTab.value,
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
    openBookOverrides,
    setBookOpen,
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
  return value;
};
