import { TwitchIcon } from "ext_twitchPub.client.icons";
const { useState, useEffect } = os.appHooks;

const TwitchSettings = (props: {
  translationEnabled: boolean;
  highlightEnabled: boolean;
  setTranslationEnabled: (value: boolean) => void;
  setHighlightEnabled: (value: boolean) => void;
  chapterFollowEnabled: boolean;
  setChapterFollowEnabled: (value: boolean) => void;
}) => {
  const {
    translationEnabled,
    highlightEnabled,
    setTranslationEnabled,
    setHighlightEnabled,
    chapterFollowEnabled,
    setChapterFollowEnabled,
  } = props;

  const [websocketPaused, setWebsocketPaused] = useState(
    globalThis?.twitchWebsocketClientPaused || false
  );

  useEffect(() => {
    globalThis.twitchWebsocketClientPaused = websocketPaused;
    const existingIcon = document.getElementById("twitch-extension-icon");
    if (existingIcon) {
      if (websocketPaused) {
        existingIcon.style.boxShadow = "0px 1px 14px 0px rgba(0,0,0,0.1)";
      } else {
        existingIcon.style.boxShadow =
          "0px 1px 14px 0px color-mix(in srgb, var(--secondaryColor) 25%, transparent)";
      }
    }
    console.log(
      "WebSocket paused state changed:",
      websocketPaused,
      existingIcon
    );
  }, [websocketPaused]);

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
        <div className="twitchPub-header">
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
            Twitch Settings
            <button
              className="icon-btn material-symbols-outlined"
              style={{ fontSize: "20px", opacity: 0.7 }}
              title="Choose which updates you receive when a streamer you follow takes action."
            >
              info
            </button>
          </span>
          <button
            className="icon-btn material-symbols-outlined"
            onClick={() => thisBot.toggleInterface()}
          >
            close
          </button>
        </div>
        <div className="twitchPub-content">
          <div className="twitchPub-settings-item">
            <span>Follow translation event</span>
            <ToggleBtn
              toggle={translationEnabled}
              setToggle={setTranslationEnabled}
              id={"translationToggle"}
            />
          </div>
          <div className="twitchPub-settings-item">
            <span>Follow highlight event</span>
            <ToggleBtn
              toggle={highlightEnabled}
              setToggle={setHighlightEnabled}
              id={"highlightToggle"}
            />
          </div>
          <div className="twitchPub-settings-item">
            <span>Follow chapter event</span>
            <ToggleBtn
              toggle={chapterFollowEnabled}
              setToggle={setChapterFollowEnabled}
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
          <div className="twitchPub-settings-item">
            <div></div>
            <button
              className={`session-btn ${websocketPaused ? "rejoin-session-btn" : "leave-session-btn"}`}
              onClick={() => setWebsocketPaused(!websocketPaused)}
            >
              <span className="material-symbols-outlined">
                {websocketPaused ? "link" : "link_off"}
              </span>
              {websocketPaused ? "Rejoin session" : "Leave session"}
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
                background: var(--secondaryColor);
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
