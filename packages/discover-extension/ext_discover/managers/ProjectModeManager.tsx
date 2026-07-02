// import { ScriptureMap2D, ScriptureMap2DModes, ProjectChapterState } from "interactiveBible.managers.MapsManager.ScriptureMap2D"

import type { ComponentType } from "preact";
import { computed, signal } from "@preact/signals";
import { areKeysEqual } from "ext_discover.hooks.areKeysEqual";
import { getKeysInRange } from "ext_discover.hooks.getKeysInRange";
import type { ChapterKey } from "ext_discover.hooks.areKeysEqual";
import type {
  ProjectModeManager,
  ProjectModeManagerInit,
} from "ext_discover.interfaces.managers.ProjectModeManager";

let ScriptureMap2D: ComponentType<Record<string, unknown>> | null = null;
let ScriptureMap2DModes: Record<string, unknown> = {};
let ProjectChapterState: Record<string, unknown> = {};

try {
  const scriptureMap2DModule =
    await import("scriptureMap2D.components.ScriptureMap2D");
  ({ ScriptureMap2D } = scriptureMap2DModule as {
    ScriptureMap2D: ComponentType<Record<string, unknown>>;
  });
  const enums = await import("scriptureMap2D.main.enums");
  ({ ScriptureMap2DModes, ProjectChapterState } = enums as {
    ScriptureMap2DModes: Record<string, unknown>;
    ProjectChapterState: Record<string, unknown>;
  });
} catch (error) {
  console.warn(
    "Could not find modules ScriptureMap2D, ScriptureMap2DModes and ProjectChapterState",
    { error }
  );
  ScriptureMap2DModes = {};
  ProjectChapterState = {};
}

const G = globalThis as Record<string, any>;

function getOverlayPosition(): Record<string, unknown> {
  const getPosition = G.getPosition as
    | (() => Record<string, unknown>)
    | undefined;
  return getPosition ? getPosition() : {};
}

function getArrangement() {
  const arrangementIndex = 0;
  return G.BibleVizUtils?.Data?.vars?.fixedArrangementsInfo?.[arrangementIndex];
}

function buildNewProject(
  arrangement: any,
  projectChapterState: Record<string, unknown>
) {
  return {
    name: "",
    structure: arrangement
      ? Object.fromEntries(
          arrangement.testaments.map((params: any) => {
            const { name: testamentName, sections } = params;
            return [
              testamentName,
              Object.fromEntries(
                sections.map((params: any) => {
                  const { name: sectionName, books } = params;
                  return [
                    sectionName,
                    Object.fromEntries(
                      books.map((params: any) => {
                        const { commonName } = params;
                        return [
                          commonName,
                          G.BibleVizUtils.Data.tags.booksStaticInfo[
                            commonName
                          ].chaptersInfo.map(() => projectChapterState?.Unset),
                        ];
                      })
                    ),
                  ];
                })
              ),
            ];
          })
        )
      : {},
  };
}

function buildEmptySelection(arrangement: any) {
  return arrangement
    ? Object.fromEntries(
        arrangement.testaments.map((params: any) => {
          const { name: testamentName, sections } = params;
          return [
            testamentName,
            Object.fromEntries(
              sections.map((params: any) => {
                const { name: sectionName, books } = params;
                return [
                  sectionName,
                  Object.fromEntries(
                    books.map((params: any) => {
                      const { commonName } = params;
                      return [
                        commonName,
                        G.BibleVizUtils.Data.tags.booksStaticInfo[
                          commonName
                        ].chaptersInfo.map(() => false),
                      ];
                    })
                  ),
                ];
              })
            ),
          ];
        })
      )
    : {};
}

let projectModeManagerSingleton: ProjectModeManager | undefined;

export function getProjectModeManager(
  init: ProjectModeManagerInit
): ProjectModeManager {
  if (!projectModeManagerSingleton) {
    projectModeManagerSingleton = createProjectModeManager(init);
    return projectModeManagerSingleton;
  }
  projectModeManagerSingleton.syncInit(init);
  return projectModeManagerSingleton;
}

function createProjectModeManager(
  init: ProjectModeManagerInit
): ProjectModeManager {
  const arrangementIndex = 0;
  const arrangement = getArrangement();

  const showMoreOptions = signal(false);
  const publishAccess = signal("public");
  const loading = signal(false);
  const mapMode = signal(ScriptureMap2DModes?.Project);
  const project = signal(buildNewProject(arrangement, ProjectChapterState));
  const selection = signal(buildEmptySelection(arrangement));
  const isInSelectionMode = signal(false);
  const lastChapterCheckedKey = { current: null as ChapterKey | null };
  const showMorePosition = { current: getOverlayPosition() };
  const showPlaylistPosition = { current: getOverlayPosition() };

  const setModeRef = { current: init.setMode };
  const setShowPlaylistSettingsRef = {
    current: init.setShowPlaylistSettings,
  };

  const selectedChaptersKeys = computed(() => {
    const keys: ChapterKey[] = [];
    const currentSelection = selection.value;
    Object.keys(currentSelection).forEach((testamentName) => {
      const testament = currentSelection[testamentName];
      Object.keys(testament).forEach((sectionName) => {
        const section = testament[sectionName];
        Object.keys(section).forEach((bookName) => {
          const chapters = section[bookName];
          chapters.forEach((chapter: boolean, chapterIndex: number) => {
            if (chapter) {
              keys.push({ testamentName, sectionName, bookName, chapterIndex });
            }
          });
        });
      });
    });
    return keys;
  });

  const clearSelection = () => {
    selection.value = buildEmptySelection(arrangement);
  };

  const toggleChapterCheckbox = (
    info:
      | { key: ChapterKey; value: boolean }
      | { key: ChapterKey; value: boolean }[]
  ) => {
    if (!Array.isArray(info) && info.value) {
      lastChapterCheckedKey.current = info.key;
    } else {
      lastChapterCheckedKey.current = null;
    }

    const fixedInfo = Array.isArray(info) ? info : [info];
    const newSelection = JSON.parse(JSON.stringify(selection.value));
    fixedInfo.forEach(({ key, value }) => {
      const { testamentName, sectionName, bookName, chapterIndex } = key;
      newSelection[testamentName][sectionName][bookName][chapterIndex] = value;
    });
    selection.value = newSelection;
  };

  const setChapterState = (
    info:
      | { key: ChapterKey; state: unknown }
      | { key: ChapterKey; state: unknown }[]
  ) => {
    const fixedInfo = Array.isArray(info) ? info : [info];
    const copy = JSON.parse(JSON.stringify(project.value));
    fixedInfo.forEach((currInfo) => {
      const { key, state } = currInfo;
      const { testamentName, sectionName, bookName, chapterIndex } = key;
      copy.structure[testamentName][sectionName][bookName][chapterIndex] =
        state;
    });
    project.value = copy;
  };

  const handleChapterShiftClick = (props: {
    key: ChapterKey;
    value: boolean;
  }) => {
    const { key, value } = props;
    if (
      lastChapterCheckedKey.current &&
      !areKeysEqual(lastChapterCheckedKey.current, key)
    ) {
      const keys = getKeysInRange({
        selection: selection.value,
        keyA: lastChapterCheckedKey.current,
        keyB: key,
      });
      toggleChapterCheckbox(keys.map((rangeKey) => ({ key: rangeKey, value })));
    } else {
      toggleChapterCheckbox({ key, value });
    }
  };

  const handleChapterClick = (e: any, key: ChapterKey, checked: boolean) => {
    const info = { key, value: !checked };

    if (project.value && isInSelectionMode.value) {
      if (e.shiftKey && !checked) {
        handleChapterShiftClick(info);
      } else {
        toggleChapterCheckbox(info);
      }
    }
  };

  const handleChapterClickAndHold = (
    e: any,
    key: ChapterKey,
    checked: boolean
  ) => {
    if (project.value) {
      if (isInSelectionMode.value) {
        toggleChapterCheckbox({ key, value: !checked });
      } else {
        toggleChapterCheckbox({ key, value: true });
        isInSelectionMode.value = true;
      }
    }
  };

  const handleBookNameClickAndHold = (
    showChapters: boolean,
    key: Omit<ChapterKey, "chapterIndex">,
    checked: boolean
  ) => {
    if (showChapters) {
      const { testamentName, sectionName, bookName } = key;
      const info = selection.value[testamentName][sectionName][bookName].map(
        (_: boolean, chapterIndex: number) => ({
          key: { testamentName, sectionName, bookName, chapterIndex },
          value: !checked,
        })
      );
      toggleChapterCheckbox(info);
      if (!isInSelectionMode.value) {
        isInSelectionMode.value = true;
      }
    }
  };

  const handleSelectionModeCheckboxClick = () => {
    clearSelection();
    isInSelectionMode.value = !isInSelectionMode.value;
  };

  const handleSelectionModeDoneButtonClick = () => {
    clearSelection();
    isInSelectionMode.value = false;
  };

  const handleStateSetterOptionClick = (state: unknown) => {
    const info = selectedChaptersKeys.value.map((key) => ({ key, state }));
    setChapterState(info);
    clearSelection();
  };

  const openShowPlaylistSettings = (e: any) => {
    const rect = e.currentTarget.getBoundingClientRect();
    G.LastClickX = rect.left;
    G.LastClickY = rect.bottom;
    showPlaylistPosition.current = { ...getOverlayPosition() };
    setShowPlaylistSettingsRef.current(true);
  };

  const openShowMoreOptions = (e: any) => {
    const rect = e.currentTarget.getBoundingClientRect();
    G.LastClickX = rect.left;
    G.LastClickY = rect.bottom;
    showMorePosition.current = { ...getOverlayPosition() };
    showMoreOptions.value = true;
  };

  const closeShowPlaylistSettings = (e: any) => {
    const rect = e.currentTarget.getBoundingClientRect();
    G.LastClickX = rect.left;
    G.LastClickY = rect.bottom;
    setShowPlaylistSettingsRef.current(false);
  };

  const syncInit = (next: ProjectModeManagerInit) => {
    setModeRef.current = next.setMode;
    setShowPlaylistSettingsRef.current = next.setShowPlaylistSettings;
  };

  return {
    showMoreOptions,
    publishAccess,
    loading,
    arrangementIndex,
    mapMode,
    project,
    selection,
    isInSelectionMode,
    selectedChaptersKeys,
    showMorePosition,
    showPlaylistPosition,
    scriptureMap2D: ScriptureMap2D,
    setShowMoreOptions: (value: boolean) => {
      showMoreOptions.value = value;
    },
    setShowPlaylistSettings: (value: boolean) => {
      setShowPlaylistSettingsRef.current(value);
    },
    setMode: (mode: string) => {
      setModeRef.current(mode);
    },
    clearSelection,
    handleChapterClick,
    handleChapterClickAndHold,
    handleBookNameClickAndHold,
    handleSelectionModeCheckboxClick,
    handleSelectionModeDoneButtonClick,
    handleStateSetterOptionClick,
    getOnChapterClickDependencies: () => [
      project.value,
      isInSelectionMode.value,
      selection.value,
    ],
    getOnBookNameClickAndHoldDependencies: () => [
      selection.value,
      isInSelectionMode.value,
    ],
    openShowPlaylistSettings,
    openShowMoreOptions,
    closeShowPlaylistSettings,
    syncInit,
  };
}

export { ScriptureMap2D, ScriptureMap2DModes, ProjectChapterState };
