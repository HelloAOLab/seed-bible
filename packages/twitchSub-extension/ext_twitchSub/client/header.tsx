import { TwitchIcon } from "./icons";
import { InfoTooltip } from "./TwitchSettings";
import { type TwitchSubInterface } from "./interface";
import { useI18n } from "seed-bible/i18n";

export default function TwitchHeader(props: {
  settingsOpened: TwitchSubInterface["settingsOpened"];
}) {
  const { t } = useI18n();
  return (
    <div className="twitchSub-header">
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
        {t("settingsTitle", {
          ns: "ext_twitchSub",
          defaultValue: "Twitch Settings",
        })}
        <InfoTooltip
          text={t("infoTooltip", {
            ns: "ext_twitchSub",
            defaultValue:
              "Choose which updates you receive when a streamer you follow takes action.",
          })}
        />
      </span>
      <button
        className="icon-btn material-symbols-outlined"
        onClick={() => (props.settingsOpened.value = false)}
      >
        close
      </button>
    </div>
  );
}
