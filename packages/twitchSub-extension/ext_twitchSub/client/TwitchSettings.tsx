import { TwitchIcon } from "ext_twitchSub.client.icons";
import { useI18n } from "seed-bible.i18n.I18nManager";
import { type TwitchSubInterface } from "ext_twitchSub.client.interface";

const TwitchSettings = (props: {
  settings: TwitchSubInterface["settings"];
  wsPaused: TwitchSubInterface["wsPaused"];
  settingsOpened: TwitchSubInterface["settingsOpened"];
}) => {
  const { t } = useI18n();

  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "fit-content",
          width: "100%",
        }}
      >
        <div className="twitchSub-header">
          <span
            style={{
              margin: 0,
              fontSize: "16px",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              gap: "2px",
            }}
          >
            <TwitchIcon style={{ width: "24px", height: "24px" }} />
            {t("ext_twitchSub.title", { defaultValue: "Twitch Settings" })}
            <button
              className="icon-btn material-symbols-outlined"
              style={{ fontSize: "20px", opacity: 0.7 }}
              title={t("ext_twitchSub.infoTooltip", {
                defaultValue:
                  "Choose which updates you receive when a streamer you follow takes action.",
              })}
            >
              info
            </button>
          </span>
          <button
            className="icon-btn material-symbols-outlined"
            onClick={() => (props.settingsOpened.value = false)}
          >
            close
          </button>
        </div>
        <div className="twitchSub-content">
          <div className="twitchSub-settings-item">
            <span>
              {t("ext_twitchSub.followTranslationEvent", {
                defaultValue: "Follow translation event",
              })}
            </span>
            <ToggleBtn
              toggle={props.settings.value.translationEnabled.value}
              setToggle={(value) =>
                (props.settings.value.translationEnabled.value = value)
              }
              id={"translationToggle"}
            />
          </div>
          <div className="twitchSub-settings-item">
            <span>
              {t("ext_twitchSub.followHighlightEvent", {
                defaultValue: "Follow highlight event",
              })}
            </span>
            <ToggleBtn
              toggle={props.settings.value.highlightEnabled.value}
              setToggle={(value) =>
                (props.settings.value.highlightEnabled.value = value)
              }
              id={"highlightToggle"}
            />
          </div>
          <div className="twitchSub-settings-item">
            <span>
              {t("ext_twitchSub.followChapterEvent", {
                defaultValue: "Follow chapter event",
              })}
            </span>
            <ToggleBtn
              toggle={props.settings.value.chapterFollowEnabled.value}
              setToggle={(value) =>
                (props.settings.value.chapterFollowEnabled.value = value)
              }
              id={"chapterFollowToggle"}
            />
          </div>
          <div
            style={{
              width: "100%",
              height: "1px",
              backgroundColor: "var(--text1)",
            }}
          ></div>
          <div className="twitchSub-settings-item">
            <div></div>
            <button
              className={`session-btn ${props.wsPaused.value ? "rejoin-session-btn" : "leave-session-btn"}`}
              onClick={() => (props.wsPaused.value = !props.wsPaused.value)}
            >
              <span className="material-symbols-outlined">
                {props.wsPaused.value ? "link" : "link_off"}
              </span>
              {props.wsPaused.value
                ? t("ext_twitchSub.rejoinSession", {
                    defaultValue: "Rejoin session",
                  })
                : t("ext_twitchSub.leaveSession", {
                    defaultValue: "Leave session",
                  })}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

const ToggleBtn = ({
  toggle,
  setToggle,
  id,
}: {
  toggle: boolean;
  setToggle: (value: boolean) => void;
  id: string;
}) => {
  return (
    <>
      <style>
        {toggle
          ? `
            .track-${id} {
                background: var(--sb-primary-color);
                }
            .thumb-${id} {
                transform: translateX(23px);
            }
        `
          : ``}
      </style>
      <div
        className="toggle-wrapper"
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <label className="toggle">
          <input
            type="checkbox"
            checked={toggle}
            id={id}
            onChange={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setToggle(!toggle);
            }}
          />
          <span className={`track-${id} track`}></span>
          <span className={`thumb-${id} thumb`}></span>
        </label>
      </div>
    </>
  );
};
export default TwitchSettings;
