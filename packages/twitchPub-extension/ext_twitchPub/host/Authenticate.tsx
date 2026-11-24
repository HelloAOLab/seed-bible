import { Spinner } from "seed-bible/components";
import { useI18n } from "seed-bible/i18n";

const Authorization = () => {
  const { t } = useI18n();
  return (
    <div className="twitchPub-page">
      <div className="twitchPub-content">
        <Spinner size="3.5rem" />
        <span className="twitchPub-auth-title">
          {t("waitingForAuthorization", {
            ns: "ext_twitchPub",
            defaultValue: "Waiting for Authorization",
          })}
        </span>
        <span className="twitchPub-subtitle">
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
