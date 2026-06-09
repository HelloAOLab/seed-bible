import { closeInterface } from "./closeInterface";
import { TwitchIcon } from "./icons";
import { type TwitchPubState } from "./interface";
import { useI18n } from "seed-bible/i18n";

const Login = (props: { state: TwitchPubState }) => {
  const { twitchConfig, getDeviceAuthUrl, loading } = props.state;
  const { t } = useI18n();
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
          {t("twitchHost", {
            ns: "ext_twitchPub",
            defaultValue: "Twitch Host",
          })}
        </span>
        <button className="icon-btn" onClick={() => closeInterface()}>
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
      <div className="twitchPub-content">
        <div
          onMouseDown={(e) => e.stopPropagation()}
          className="twitchPub-inputGroup"
        >
          <button
            className="twitchBtn"
            onClick={() => getDeviceAuthUrl(props.state)}
            disabled={!twitchConfig.value.clientId.value || loading.value}
          >
            {loading.value
              ? t("loading", {
                  ns: "ext_twitchPub",
                  defaultValue: "Loading...",
                })
              : t("loginWithTwitch", {
                  ns: "ext_twitchPub",
                  defaultValue: "Login with Twitch",
                })}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
