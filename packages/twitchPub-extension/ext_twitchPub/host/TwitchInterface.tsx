import { effect } from "@preact/signals";
import QRCodeComponent from "./QRCode";
import { TwitchIcon, SettingsIcon } from "./icons";
import { type TwitchPubState } from "./interface";
import { useI18n } from "seed-bible/i18n";

const TwitchInterface = (props: { state: TwitchPubState }) => {
  const { uiHidden, qrValue, setCurrentPage, hideUI, showUI } = props.state;

  effect(() => {
    const draggableElement = document.getElementById("draggable-container");
    if (!draggableElement) return;

    draggableElement.addEventListener("mousedown", showUI);
    draggableElement.addEventListener("mouseleave", hideUI);
    hideUI();
    return () => {
      draggableElement.removeEventListener("mousedown", showUI);
      draggableElement.removeEventListener("mouseleave", hideUI);
    };
  });

  const { t } = useI18n();

  return (
    <>
      {uiHidden.value && (
        <style>{`
        .twitchPub-container {
          background: transparent;
          box-shadow: none;
        }
      `}</style>
      )}
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
        <div
          className="twitchPub-header"
          style={
            uiHidden.value
              ? {
                  opacity: 0,
                  pointerEvents: "none",
                  transition: "opacity 0.3s ease",
                }
              : { transition: "opacity 0.3s ease" }
          }
        >
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
            {t("twitch", { ns: "ext_twitchPub", defaultValue: "Twitch" })}
          </span>
          <div
            style={{
              display: "flex",
              gap: "5px",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
            }}
          >
            <button
              className="icon-btn"
              style={{ width: "fit-content", height: "fit-content" }}
              onClick={() => setCurrentPage("settings")}
            >
              <SettingsIcon width={18} height={18} />
            </button>
            <button
              className="icon-btn"
              onClick={() => whisper(thisBot, "closeInterface")}
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>
        <div className="twitchPub-content">
          <div className={uiHidden.value ? "" : "qr-container"}>
            <QRCodeComponent
              value={qrValue.value}
              size={150}
              uiHidden={uiHidden.value}
            />
          </div>

          <span
            style={
              uiHidden.value
                ? {
                    opacity: 0,
                    pointerEvents: "none",
                    transition: "opacity 0.3s ease",
                  }
                : {
                    fontSize: "20px",
                    fontWeight: "bold",
                    textAlign: "center",
                    transition: "opacity 0.3s ease",
                  }
            }
          >
            {t("twitchInterface.shareQRCode", {
              ns: "ext_twitchPub",
              defaultValue: "Share this QR code",
            })}
          </span>
          <span
            style={
              uiHidden.value
                ? {
                    opacity: 0,
                    pointerEvents: "none",
                    transition: "opacity 0.3s ease",
                  }
                : {
                    fontSize: "14px",
                    textAlign: "center",
                    transition: "opacity 0.3s ease",
                  }
            }
          >
            {t("twitchInterface.qrCodeInstructions", {
              ns: "ext_twitchPub",
              defaultValue:
                "Your viewers can scan this to follow you on Seed Bible",
            })}
          </span>
        </div>
      </div>
    </>
  );
};
export default TwitchInterface;
