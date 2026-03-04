// import { ScriptureMap2D, ScriptureMap2DModes, ProjectChapterState } from "interactiveBible.managers.MapsManager.ScriptureMap2D"

let ScriptureMap2D: any;
let ScriptureMap2DModes: any;
let ProjectChapterState: any;

try {
  const scriptureMap2DModule =
    await import("scriptureMap2D.main.ScriptureMap2D");
  ({ ScriptureMap2D } = scriptureMap2DModule);
  const enums = await import("scriptureMap2D.main.enums");
  ({ ScriptureMap2DModes, ProjectChapterState } = enums);
} catch (error) {
  console.warn(
    "Could not find modules ScriptureMap2D, ScriptureMap2DModes and ProjectChapterState",
    { error }
  );
  ScriptureMap2DModes = {};
  ProjectChapterState = {};
}

const { useState, useLayoutEffect, useRef, useMemo, useCallback } = os.appHooks;
import { useProjectMenu } from "playlist.playlistMode.useProjectContext";
const G = globalThis;
const isMobile =
  (window?.innerWidth || gridPortalBot.tags.pixelWidth) <
  G.MOBILE_VIEWPORT_THRESHOLD;
const { Chips, Checkbox, Button, Tooltip } = G.Components;

const ChecklistGIf =
  "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/90e85308635064b3d0fdaa9c220b8547a9467a10affe3cf22f06ad6b26fbf0a1.gif";

const requiredParentContext = {};

const menuItems = [
  {
    label: "Hide headings",
    value: "hideHeadings",
    icon: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/0204f2dddf1829862226e8dbc8eba67af725c558e4cb178cadba1845ba0461ae.svg",
  },
  {
    label: "Close all books",
    value: "areBooksClosed",
    icon: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/25ecc4b8e3d6c1cff940a50916700cec880aa61f711d0aba0e322ac65eb8b9a6.svg",
  },
  {
    label: "Project settings",
    value: "projectSettings",
    icon: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/7243ffa90945dbd018d082a6c0be8f5424d8a521fe764185a30393e2e93d4401.svg",
  },
  {
    label: "Show version History",
    value: "showVersionHistory",
    icon: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/ff32aa3f0cc2c96d07ab9308631bc835dec9dc11f0102950593e5d14a698840b.svg",
  },
];

const ProjectMode = (props: any) => {
  const {
    setMode,
    showPlaylistSettings,
    setShowPlaylistSettings,
    setTab,
    onReset,
  } = props;
  const { menuState, setMenuValue } = useProjectMenu();

  // const [showingAllChapters, setShowingAllChapters] = useState(true);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [publishAccess, setPublishAccess] = useState("public");

  const [loading, setLoading] = useState(false);

  const arrangementIndex = useMemo(() => {
    return 0;
  }, []);
  const arrangement = useMemo(() => {
    return G.BibleVizUtils.Data.vars.fixedArrangementsInfo?.[arrangementIndex];
  }, []);
  const getNewProject = useCallback(() => {
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
                            ].chaptersInfo.map((_: any) => {
                              return ProjectChapterState?.Unset;
                            }),
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
  }, [arrangement]);
  const getEmptySelection = useCallback(() => {
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
                          ].chaptersInfo.map((_: any) => {
                            return false;
                          }),
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
  }, []);
  const [mapMode, setMapMode] = useState(ScriptureMap2DModes?.Project);
  const [project, setProject] = useState(getNewProject());
  const [selection, setSelection] = useState(getEmptySelection());
  const [isInSelectionMode, setIsInSelectionMode] = useState(false);
  const selectedChaptersKeys = useMemo(() => {
    const keys: any[] = [];
    Object.keys(selection).forEach((testamentName) => {
      const testament = selection[testamentName];
      return Object.keys(testament).forEach((sectionName) => {
        const section = testament[sectionName];
        return Object.keys(section).forEach((bookName) => {
          const chapters = section[bookName];
          return chapters.forEach((chapter: any, chapterIndex: number) => {
            if (chapter)
              keys.push({ testamentName, sectionName, bookName, chapterIndex });
          });
        });
      });
    });
    return keys;
  }, [selection]);
  const lastChapterCheckedKey = useRef(null);

  const clearSelection = useCallback(() => {
    setSelection(getEmptySelection());
  }, []);

  const toggleChapterCheckbox = useCallback(
    (info: any) => {
      if (!Array.isArray(info) && info.value)
        lastChapterCheckedKey.current = info.key;
      else lastChapterCheckedKey.current = null;

      const fixedInfo = Array.isArray(info) ? info : [info];
      const newSelection = JSON.parse(JSON.stringify(selection));
      fixedInfo.forEach(({ key, value }) => {
        const { testamentName, sectionName, bookName, chapterIndex } = key;
        newSelection[testamentName][sectionName][bookName][chapterIndex] =
          value;
      });
      setSelection(newSelection);
    },
    [selection]
  );

  const setChapterState = useCallback(
    (info: any) => {
      const fixedInfo = Array.isArray(info) ? info : [info];
      const copy = JSON.parse(JSON.stringify(project));
      fixedInfo.forEach((currInfo) => {
        const { key, state } = currInfo;
        const { testamentName, sectionName, bookName, chapterIndex } = key;
        copy.structure[testamentName][sectionName][bookName][chapterIndex] =
          state;
      });
      setProject(copy);
    },
    [project]
  );

  const handleChapterShiftClick = useCallback(
    (props: any) => {
      const { key, value } = props;
      if (
        lastChapterCheckedKey.current &&
        !AreKeysEqual(lastChapterCheckedKey.current, key)
      ) {
        const keys = GetKeysInRange({
          selection,
          keyA: lastChapterCheckedKey.current,
          keyB: key,
        });
        const info = keys.map((key) => {
          return { key, value };
        });
        toggleChapterCheckbox(info);
      } else toggleChapterCheckbox({ key, value });
    },
    [selection]
  );

  const onChapterClickDependencies = [project, isInSelectionMode, selection];

  const handleChapterClick = useCallback(
    (e: any, key: any, checked: boolean) => {
      const info = {
        key,
        value: !checked,
      };

      if (project && isInSelectionMode) {
        if (e.shiftKey && !checked) {
          handleChapterShiftClick(info);
        } else {
          toggleChapterCheckbox(info);
        }
      }
    },
    onChapterClickDependencies
  );

  const handleChapterClickAndHold = useCallback(
    (e: any, key: any, checked: boolean) => {
      if (project) {
        const info: any = { key };
        if (isInSelectionMode) {
          info.value = !checked;
          toggleChapterCheckbox(info);
        } else {
          info.value = true;
          toggleChapterCheckbox(info);
          setIsInSelectionMode(true);
        }
      }
    },
    onChapterClickDependencies
  );

  const onBookNameClickAndHoldDependencies = [selection, isInSelectionMode];

  const handleBookNameClickAndHold = useCallback(
    (showChapters: boolean, key: any, checked: boolean) => {
      if (showChapters) {
        const { testamentName, sectionName, bookName } = key;
        const info = selection[testamentName][sectionName][bookName].map(
          (_: any, chapterIndex: number) => {
            return {
              key: { testamentName, sectionName, bookName, chapterIndex },
              value: !checked,
            };
          }
        );
        toggleChapterCheckbox(info);
        if (!isInSelectionMode) {
          setIsInSelectionMode(true);
        }
      }
    },
    onBookNameClickAndHoldDependencies
  );

  const handleSelectionModeCheckboxClick = useCallback(() => {
    clearSelection();
    setIsInSelectionMode((prev) => !prev);
  }, []);

  const handleSelectionModeDoneButtonClick = useCallback(() => {
    clearSelection();
    setIsInSelectionMode(false);
  }, []);

  const handleStateSetterOptionClick = useCallback(
    (state: any) => {
      const info = selectedChaptersKeys.map((key) => {
        return { key, state };
      });
      setChapterState(info);
      clearSelection();
    },
    [selectedChaptersKeys]
  );

  const showMorePosition = useRef({ ...getPosition() });

  const showPlaylistPosition = useRef({ ...getPosition() });

  return (
    <>
      {showPlaylistSettings && (
        <>
          <div
            className="backdrop"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();

              const x = rect.left; // X position where the element starts (from left of screen)
              const y = rect.bottom; // Y position where the element ends (bottom of element from top of screen)

              G.LastClickX = x;
              G.LastClickY = y;
              setShowPlaylistSettings(false);
            }}
          />
          <div
            style={{
              ...showPlaylistPosition.current,
              width: "206px",
              padding: "1rem",
            }}
            className="overlay linked-item-custom"
          >
            <div className="more-menu-items">
              <div
                className="align-center"
                onClick={() => {
                  setMode(PlaylistModeTypes.annotations);
                  setShowPlaylistSettings(false);
                }}
              >
                <span
                  style={{ fontSize: "20px", color: "white" }}
                  class="material-symbols-outlined"
                >
                  team_dashboard
                </span>
                <label
                  style={{
                    fontSize: "12px",
                    fontWeight: "600",
                    marginLeft: "4px",
                  }}
                  for="playlistInclude"
                >
                  {t("annotationMode")}
                </label>
              </div>
              <Tooltip forRight={true} text={t("annotationModeInfo")}>
                <p
                  className="what-this center"
                  style={{ margin: "0 0 0 0.5rem" }}
                >
                  <span
                    style={{ fontSize: "24px" }}
                    class="material-symbols-outlined unfollow"
                  >
                    info
                  </span>
                </p>
              </Tooltip>
            </div>
            <div className="more-menu-items">
              <div
                className="align-center"
                onClick={() => {
                  setMode(PlaylistModeTypes.playlist);
                  setShowPlaylistSettings(false);
                }}
              >
                <span
                  style={{ fontSize: "20px", color: "white" }}
                  class="material-symbols-outlined"
                >
                  playlist_play
                </span>
                <label
                  style={{
                    fontSize: "12px",
                    fontWeight: "600",
                    marginLeft: "4px",
                  }}
                  for="playlistInclude"
                >
                  {t("playlistMode")}
                </label>
              </div>
              <Tooltip forRight={true} text={t("playlistModeInfo")}>
                <p
                  className="what-this center"
                  style={{ margin: "0 0 0 0.5rem" }}
                >
                  <span
                    style={{ fontSize: "24px" }}
                    class="material-symbols-outlined unfollow"
                  >
                    info
                  </span>
                </p>
              </Tooltip>
            </div>
            <div className="more-menu-items active">
              <div
                className="align-center"
                onClick={() => {
                  setMode(PlaylistModeTypes.project);
                }}
              >
                <span
                  style={{ fontSize: "20px", color: "white" }}
                  class="material-symbols-outlined"
                >
                  team_dashboard
                </span>
                <label
                  style={{
                    fontSize: "12px",
                    fontWeight: "600",
                    marginLeft: "4px",
                  }}
                  for="playlistInclude"
                >
                  {t("projectMode")}
                </label>
              </div>
              <Tooltip forRight={true} text={t("projectModeInfo")}>
                <p
                  className="what-this center"
                  style={{ margin: "0 0 0 0.5rem" }}
                >
                  <span
                    style={{ fontSize: "24px" }}
                    class="material-symbols-outlined unfollow"
                  >
                    info
                  </span>
                </p>
              </Tooltip>
            </div>
          </div>
        </>
      )}
      {showMoreOptions && (
        <>
          <div className="backdrop" onClick={() => setShowMoreOptions(false)} />
          <div
            // onClick={() => setShowMoreOptions(false)}
            style={{
              ...showMorePosition.current,
              left: "none",
              right: "4rem",
              width: "250px",
              padding: "1rem",
              top: "5rem",
            }}
            className="overlay linked-item-custom"
          >
            <p>
              <b>{t("viewOptions")} </b>
            </p>
            <span style={{ fontSize: "10px" }}>{t("viewOptionsInfo")}</span>
            {menuItems.map(({ icon, label, value }, i) => {
              return (
                <>
                  <div
                    className="more-menu-items"
                    onClick={() => {
                      setMenuValue(!menuState[value], value);
                    }}
                  >
                    <img style={{ height: "18px" }} src={icon} />
                    <p style={{ fontWeight: "400" }}>{label}</p>
                    {menuState[value] ? (
                      <span
                        style={{ fontSize: "20px", color: "white" }}
                        class="material-symbols-outlined unfollow"
                      >
                        check_box
                      </span>
                    ) : (
                      <span
                        style={{ fontSize: "20px", color: "white" }}
                        class="material-symbols-outlined unfollow"
                      >
                        check_box_outline_blank
                      </span>
                    )}
                  </div>
                  {i === 100 && (
                    <div
                      style={{
                        backGroundColor: "FFFFFF",
                        height: "1px",
                        width: "100%",
                      }}
                    />
                  )}
                </>
              );
            })}
          </div>
        </>
      )}
      <div
        style={{
          flexGrow: "1",
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
      >
        {false && (
          <div
            className="align-center justify-between"
            style={{ padding: "0.5rem 0 ", justifyContent: "space-between" }}
          >
            <div
              className="back-button"
              onClick={() => {
                if (setTab) setTab("discover");
              }}
            >
              <span class="material-symbols-outlined">keyboard_backspace</span>
              <span>Back to Create</span>
            </div>
          </div>
        )}
        <div
          className="align-center justify-between"
          style={{ padding: "0.5rem 0 ", justifyContent: "space-between" }}
        >
          <div className="align-center" style={{ gap: "0.5rem" }}>
            <div
              className="publish-setting"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();

                const x = rect.left; // X position where the element starts (from left of screen)
                const y = rect.bottom; // Y position where the element ends (bottom of element from top of screen)

                G.LastClickX = x;
                G.LastClickY = y;
                showPlaylistPosition.current = { ...getPosition() };
                setShowPlaylistSettings(true);
              }}
            >
              <span class="material-symbols-outlined">team_dashboard</span>
            </div>
            <p>Project Mode</p>
          </div>
          <div
            className="publish-setting"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();

              const x = rect.left; // X position where the element starts (from left of screen)
              const y = rect.bottom; // Y position where the element ends (bottom of element from top of screen)

              G.LastClickX = x;
              G.LastClickY = y;
              showMorePosition.current = { ...getPosition() };
              setShowMoreOptions(true);
            }}
          >
            <img src={G.Settings_Icon} alt="Settings_Icon" />
          </div>
        </div>

        {ScriptureMap2D && (
          <ScriptureMap2D
            parentContext={{
              mode: mapMode,
              arrangementIndex,
              selection,
              isInSelectionMode,
              onChapterClick: handleChapterClick,
              onChapterClickDependencies,
              onChapterClickAndHold: handleChapterClickAndHold,
              onBookNameClickAndHold: handleBookNameClickAndHold,
              onBookNameClickAndHoldDependencies,
              project,
              selectedChaptersKeys,
              onSelectionModeCheckboxClick: handleSelectionModeCheckboxClick,
              onSelectionModeDoneButtonClick:
                handleSelectionModeDoneButtonClick,
              onStateSetterOptionClick: handleStateSetterOptionClick,
              onSelectionModeClearSelectionButtonClick: clearSelection,
              showingAllChapters: !menuState.areBooksClosed,
              showLabels: !menuState.hideHeadings,
            }}
          />
        )}

        <div style={{ padding: "1rem 0 " }}>
          <div className="add-playlist-actions">
            <Button onClick={() => {}} secondary loading={loading}>
              Save
            </Button>
            <Button
              onClick={() => {
                if (onReset) {
                  onReset();
                }
              }}
              secondaryAlt
              loading={loading}
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

return ProjectMode;

function GetProjectFromSelection(selection: any) {
  const project = JSON.parse(JSON.stringify(selection));
  for (const testamentName of Object.keys(project)) {
    const testament = project[testamentName];
    for (const sectionName of Object.keys(testament)) {
      const section = testament[sectionName];
      for (const bookName of Object.keys(section)) {
        const chapters = section[bookName];

        section[bookName] = chapters.map((value: any) => {
          return value
            ? ProjectChapterState?.NotStarted
            : ProjectChapterState?.Unset;
        });
      }
    }
  }
  return project;
}

function AreKeysEqual(keyA: any, keyB: any) {
  return (
    keyA.testamentName === keyB.testamentName &&
    keyA.sectionName === keyB.sectionName &&
    keyA.bookName === keyB.bookName &&
    keyA.chapterIndex === keyB.chapterIndex
  );
}

function GetKeysInRange(props: any) {
  const { selection, keyA, keyB } = props;
  const allKeys = [];

  for (const testamentName of Object.keys(selection).toReversed()) {
    const testament = selection[testamentName];
    for (const sectionName of Object.keys(testament).toReversed()) {
      const section = testament[sectionName];
      for (const bookName of Object.keys(section).toReversed()) {
        const chapters = section[bookName];
        for (
          let chapterIndex = 0;
          chapterIndex < chapters.length;
          chapterIndex++
        ) {
          allKeys.push({ testamentName, sectionName, bookName, chapterIndex });
        }
      }
    }
  }

  const indexA = allKeys.findIndex((currentKey) => {
    return AreKeysEqual(currentKey, keyA);
  });
  const indexB = allKeys.findIndex((currentKey) => {
    return AreKeysEqual(currentKey, keyB);
  });

  const start = Math.min(indexA, indexB);
  const end = Math.max(indexA, indexB);

  const keys = allKeys.slice(start, end + 1);

  return keys;
}
