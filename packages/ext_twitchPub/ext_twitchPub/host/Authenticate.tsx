import { Loading } from "ext_twitchPub.host.icons";
import { TwitchIcon } from "ext_twitchPub.host.icons";

const Authorization = () => {
  return (
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
          Authenticating with Twitch
        </span>
        <button
          className="icon-btn material-symbols-outlined"
          onClick={() => whisper(thisBot, "closeInterface")}
        >
          close
        </button>
      </div>
      <div className="twitchPub-content">
        <Loading />
        <span
          style={{
            fontSize: "20px",
            fontWeight: "bold",
            marginTop: "16px",
            textAlign: "center",
          }}
        >
          Waiting for Authorization
        </span>
        <span style={{ fontSize: "14px", textAlign: "center" }}>
          Please complete the authorization process in the opened Twitch page.
        </span>
      </div>
    </div>
  );
};

export default Authorization;
