import { TwitchIcon } from "ext_twitchPub.host.icons";
const { useState, useEffect } = os.appHooks;

const TwitchSettings = (props: {
  setCurrentPage: (
    s: "login" | "authorization" | "interface" | "settings"
  ) => void;
  translationEnabled: boolean;
  highlightEnabled: boolean;
  setTranslationEnabled: (value: boolean) => void;
  setHighlightEnabled: (value: boolean) => void;
  annoucementTimer: number | null;
  setAnnouncementTimer: (value: number | null) => void;
}) => {
  const {
    setCurrentPage,
    translationEnabled,
    highlightEnabled,
    setTranslationEnabled,
    setHighlightEnabled,
    annoucementTimer,
    setAnnouncementTimer,
  } = props;

  const [customTimerFlag, setCustomTimerFlag] = useState<string>(
    masks?.customTimerFlag || ""
  );
  const [customTimer, setCustomTimer] = useState<number | null>(
    masks?.customTimer || null
  );

  useEffect(() => {
    setTagMask(thisBot, "customTimerFlag", customTimerFlag, "local");
    setTagMask(thisBot, "customTimer", customTimer, "local");
  }, [customTimerFlag, customTimer]);

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
          </span>
          <button
            className="icon-btn material-symbols-outlined"
            onClick={() => setCurrentPage("interface")}
          >
            arrow_back
          </button>
        </div>
        <div className="twitchPub-content">
          <div className="twitchPub-settings-item">
            <span>Translation broadcast event</span>
            <ToggleBtn
              toggle={translationEnabled}
              setToggle={setTranslationEnabled}
              id={"translationToggle"}
            />
          </div>
          <div className="twitchPub-settings-item">
            <span>Highlight broadcast event</span>
            <ToggleBtn
              toggle={highlightEnabled}
              setToggle={setHighlightEnabled}
              id={"highlightToggle"}
            />
          </div>
          <div className="twitchPub-settings-item">
            <span>Announcement Timer</span>
            <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
              <select
                value={
                  customTimerFlag === "custom"
                    ? "custom"
                    : annoucementTimer?.toString() || "0"
                }
                onChange={(e) => {
                  e.stopPropagation();
                  console.log("Selected announcement timer:", e.target.value);
                  if (e.target.value === "custom") {
                    setAnnouncementTimer(null);
                    setCustomTimerFlag("custom");
                  } else {
                    setAnnouncementTimer(Number(e.target.value));
                    setCustomTimerFlag("");
                  }
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                className="twitch-select-box"
              >
                <option value={0}>Off</option>
                <option value={300000}>5m</option>
                <option value={600000}>10m</option>
                <option value={900000}>15m</option>
                <option value={1200000}>20m</option>
                <option value="custom">Custom</option>
              </select>
              {customTimerFlag === "custom" && (
                <div
                  style={{
                    position: "relative",
                    display: "inline-flex",
                    alignItems: "center",
                  }}
                >
                  <input
                    type="number"
                    placeholder="0"
                    value={customTimer !== null ? customTimer : ""}
                    onChange={(e) => {
                      const minutes = Number(e.target.value);
                      if (!isNaN(minutes) && minutes >= 0) {
                        setCustomTimer(minutes);
                        setAnnouncementTimer(minutes * 60000);
                      } else {
                        setCustomTimer(null);
                        setAnnouncementTimer(0);
                      }
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    className="twitch-custom-timer-input"
                  />
                  <span
                    style={{
                      position: "absolute",
                      right: 10,
                      fontSize: 14,
                      color: "#888",
                      pointerEvents: "none",
                    }}
                  >
                    m
                  </span>
                </div>
              )}
            </div>
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
