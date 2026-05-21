import { Loading, TwitchIcon } from "ext_twitchPub.host.icons";
import { useI18n } from "seed-bible.i18n.I18nManager";

const Authorization = () => {
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
          {t("authorization", {
            ns: "ext_twitchPub",
            defaultValue: "Authenticating with Twitch",
          })}
        </span>
        <button
          className="icon-btn"
          onClick={() => whisper(thisBot, "closeInterface")}
        >
          <span className="material-symbols-outlined">close</span>
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
          {t("waitingForAuthorization", {
            ns: "ext_twitchPub",
            defaultValue: "Waiting for Authorization",
          })}
        </span>
        <span style={{ fontSize: "14px", textAlign: "center" }}>
          {t("authorizationInstructions", {
            ns: "ext_twitchPub",
            defaultValue:
              "Please complete the authorization process in the opened Twitch page.",
          })}
        </span>
      </div>
    </div>
  );
};

export default Authorization;
