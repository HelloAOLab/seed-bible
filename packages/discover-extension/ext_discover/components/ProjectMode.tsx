import { PROJECT_MODE_MENU_ITEMS } from "ext_discover.models.projectModeMenuItems";
import { getProjectModeManager } from "ext_discover.managers.ProjectModeManager";
import { useProjectMenu } from "ext_discover.contexts.ProjectContext";
import type { ProjectModeProps } from "ext_discover.interfaces.components.ProjectMode";
import { Button } from "ext_discover.features.components.Button";
import { Tooltip } from "ext_discover.features.components.Tooltip";

const G = globalThis as Record<string, any>;
const PlaylistModeTypes = G.PlaylistModeTypes as Record<string, string>;

export function ProjectMode({
  setMode,
  showPlaylistSettings,
  setShowPlaylistSettings,
  onReset,
  manager,
}: ProjectModeProps) {
  const m =
    manager ??
    getProjectModeManager({
      setMode,
      showPlaylistSettings,
      setShowPlaylistSettings,
      onReset,
    });
  m.syncInit({
    setMode,
    showPlaylistSettings,
    setShowPlaylistSettings,
    onReset,
  });

  const { menuState, setMenuValue } = useProjectMenu();
  const ScriptureMap2D = m.scriptureMap2D;

  return (
    <>
      {showPlaylistSettings && (
        <>
          <div className="backdrop" onClick={m.closeShowPlaylistSettings} />
          <div
            style={{
              ...m.showPlaylistPosition.current,
              width: "206px",
              padding: "1rem",
            }}
            className="overlay linked-item-custom"
          >
            <div className="more-menu-items">
              <div
                className="align-center"
                onClick={() => {
                  m.setMode(PlaylistModeTypes.annotations);
                  m.setShowPlaylistSettings(false);
                }}
              >
                <span
                  style={{ fontSize: "20px" }}
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
                  m.setMode(PlaylistModeTypes.playlist);
                  m.setShowPlaylistSettings(false);
                }}
              >
                <span
                  style={{ fontSize: "20px" }}
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
                  m.setMode(PlaylistModeTypes.project);
                }}
              >
                <span
                  style={{ fontSize: "20px" }}
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
      {m.showMoreOptions.value && (
        <>
          <div
            className="backdrop"
            onClick={() => m.setShowMoreOptions(false)}
          />
          <div
            style={{
              ...m.showMorePosition.current,
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
            {PROJECT_MODE_MENU_ITEMS.map(({ icon, label, value }, i) => {
              return (
                <>
                  <div
                    className="more-menu-items"
                    onClick={() => {
                      setMenuValue(
                        !(menuState.value as Record<string, boolean>)[value],
                        value
                      );
                    }}
                  >
                    <img style={{ height: "18px" }} src={icon} />
                    <p style={{ fontWeight: "400" }}>{label}</p>
                    {(menuState.value as Record<string, boolean>)[value] ? (
                      <span
                        style={{ fontSize: "20px" }}
                        class="material-symbols-outlined unfollow"
                      >
                        check_box
                      </span>
                    ) : (
                      <span
                        style={{ fontSize: "20px" }}
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
        <div
          className="align-center justify-between"
          style={{ padding: "0.5rem 0 ", justifyContent: "space-between" }}
        >
          <div className="align-center" style={{ gap: "0.5rem" }}>
            <div
              className="publish-setting"
              onClick={m.openShowPlaylistSettings}
            >
              <span class="material-symbols-outlined">team_dashboard</span>
            </div>
            <p>Project Mode</p>
          </div>
          <div className="publish-setting" onClick={m.openShowMoreOptions}>
            <img src={G.Settings_Icon} alt="Settings_Icon" />
          </div>
        </div>

        {ScriptureMap2D && (
          <ScriptureMap2D
            parentContext={{
              mode: m.mapMode.value,
              arrangementIndex: m.arrangementIndex,
              selection: m.selection.value,
              isInSelectionMode: m.isInSelectionMode.value,
              onChapterClick: m.handleChapterClick,
              onChapterClickDependencies: m.getOnChapterClickDependencies(),
              onChapterClickAndHold: m.handleChapterClickAndHold,
              onBookNameClickAndHold: m.handleBookNameClickAndHold,
              onBookNameClickAndHoldDependencies:
                m.getOnBookNameClickAndHoldDependencies(),
              project: m.project.value,
              selectedChaptersKeys: m.selectedChaptersKeys.value,
              onSelectionModeCheckboxClick: m.handleSelectionModeCheckboxClick,
              onSelectionModeDoneButtonClick:
                m.handleSelectionModeDoneButtonClick,
              onStateSetterOptionClick: m.handleStateSetterOptionClick,
              onSelectionModeClearSelectionButtonClick: m.clearSelection,
              showingAllChapters: !menuState.value.areBooksClosed,
              showLabels: !menuState.value.hideHeadings,
            }}
          />
        )}

        <div style={{ padding: "1rem 0 " }}>
          <div className="add-playlist-actions">
            <Button onClick={() => {}} secondary loading={m.loading.value}>
              Save
            </Button>
            <Button
              onClick={() => {
                if (onReset) {
                  onReset();
                }
              }}
              secondaryAlt
              loading={m.loading.value}
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
