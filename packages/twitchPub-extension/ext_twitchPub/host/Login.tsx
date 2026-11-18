import { type TwitchPubState } from "./interface";
import { Button } from "seed-bible/components";
import { useI18n } from "seed-bible/i18n";

const Login = (props: { state: TwitchPubState }) => {
  const { twitchConfig, getDeviceAuthUrl, loading } = props.state;
  const { t } = useI18n();
  return (
    <div className="twitchPub-page">
      <div className="twitchPub-content">
        <div
          onMouseDown={(e) => e.stopPropagation()}
          className="twitchPub-inputGroup"
        >
          <Button
            className="twitchBtn"
            variant="primary"
            size="lg"
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
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Login;
