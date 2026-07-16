import { type TwitchPubState } from "./interface";
import { SettingsIcon } from "./icons";
import { computed } from "@preact/signals";
function TwitchHeader(props: { state: TwitchPubState }) {
  const { currentPage } = props.state;

  const headerTools = computed(() => {
    switch (currentPage.value) {
      case "login":
        return [];
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
