import { TwitchIcon } from "ext_twitchPub.client.icons";

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
            onClick={() => thisBot.toggleInterface()}
          >
            <span className="material-symbols-outlined">close</span>
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
