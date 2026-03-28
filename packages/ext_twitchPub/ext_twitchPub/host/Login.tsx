import { TwitchIcon } from "ext_twitchPub.host.icons";

const Login = (props: {
  clientId: string;
  setClientId: (clientId: string) => void;
  getDeviceAuthUrl: () => void;
  loading: boolean;
}) => {
  const { clientId, setClientId, getDeviceAuthUrl } = props;
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
          Login with Twitch
        </span>
        <button
          className="icon-btn"
          onClick={() => whisper(thisBot, "closeInterface")}
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
      <div className="twitchPub-content">
        <div
          onMouseDown={(e) => e.stopPropagation()}
          className="twitchPub-inputGroup"
        >
          <span
            style={{ fontSize: "14px", fontWeight: "bold" }}
            htmlFor="clientId"
          >
            Enter client ID
          </span>
          <input
            type="text"
            id="clientId"
            value={clientId}
            onChange={(e: any) => setClientId(e.target.value)}
            placeholder="Client ID"
            disabled={props.loading}
          />
          <button
            className="twitchBtn"
            onClick={getDeviceAuthUrl}
            disabled={!clientId || props.loading}
          >
            {props.loading ? "Loading..." : "Login"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
