import { type TwitchPubState } from "./interface";
import { TwitchIcon, SettingsIcon } from "./icons";
import { useI18n } from "seed-bible/i18n";
import { computed } from "@preact/signals";
function TwitchHeader(props: { state: TwitchPubState }) {
  const { currentPage, interfaceEnabled } = props.state;
  const { t } = useI18n();

  const headerTools = computed(() => {
    switch (currentPage.value) {
      case "login":
        return [
          {
            icon: <span className="material-symbols-outlined">close</span>,
            onClick: () => {
              interfaceEnabled.value = false;
            },
          },
        ];
      case "authorization":
        return [
          {
            icon: <span className="material-symbols-outlined">arrow_back</span>,
            onClick: () => {
              currentPage.value = "login";
            },
          },
        ];
      case "interface":
        return [
          {
            icon: <SettingsIcon width={18} height={18} />,
            onClick: () => {
              currentPage.value = "settings";
            },
          },
          {
            icon: <span className="material-symbols-outlined">close</span>,
            onClick: () => {
              interfaceEnabled.value = false;
            },
          },
        ];
      case "settings":
        return [
          {
            icon: <span className="material-symbols-outlined">arrow_back</span>,
            onClick: () => {
              currentPage.value = "interface";
            },
          },
        ];
    }
  });
  return (
    <>
      <span className="twitchPub-title">
        <TwitchIcon style={{ width: "24px", height: "24px" }} />
        {t("twitch", { ns: "ext_twitchPub", defaultValue: "Twitch" })}
      </span>
      <div className="twitchPub-header-tools">
        {headerTools.value.map(({ icon, onClick }) => (
          <button
            className="twitch-icon-btn"
            onClick={onClick}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {icon}
          </button>
        ))}
      </div>
    </>
  );
}

export default TwitchHeader;
