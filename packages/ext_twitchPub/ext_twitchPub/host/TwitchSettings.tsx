import { TwitchIcon, SettingsIcon } from "ext_twitchPub.host.icons";

const { useState, useEffect } = os.appHooks;
const TwitchSettings = (props: {
  setCurrentPage: (
    s: "login" | "authorization" | "interface" | "settings"
  ) => void;
  translationEnabled: boolean;
  highlightEnabled: boolean;
  setTranslationEnabled: (value: boolean) => void;
  setHighlightEnabled: (value: boolean) => void;
}) => {
  const {
    setCurrentPage,
    translationEnabled,
    highlightEnabled,
    setTranslationEnabled,
    setHighlightEnabled,
  } = props;

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
            className="icon-btn"
            onClick={() => setCurrentPage("interface")}
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
        </div>
        <div className="twitchPub-content">
          <div className="twitchPub-settings-item">
            <span>Translation Seeding</span>
            <ToggleBtn
              toggle={translationEnabled}
              setToggle={setTranslationEnabled}
              id={"translationToggle"}
            />
          </div>
          <div className="twitchPub-settings-item">
            <span>Highlight Seeding</span>
            <ToggleBtn
              toggle={highlightEnabled}
              setToggle={setHighlightEnabled}
              id={"highlightToggle"}
            />
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
                transform: translateX(18px);
            }
        `
          : ``}
      </style>
      <div className="toggle-wrapper">
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
