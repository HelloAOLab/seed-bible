import QRCodeComponent from "./QRCode";
import { type TwitchPubState } from "./interface";
import { useI18n } from "seed-bible/i18n";
import { fmtRef } from "@seed-bible/ai-transcript-extension/highlight";
import { useEffect, useRef } from "preact/hooks";

const TwitchInterface = (props: { state: TwitchPubState }) => {
  const { uiHidden, qrValue, navigatingRef, hideUI, showUI, toast } =
    props.state;

  const qrContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const shell = qrContainer.current?.closest(".sb-pane-shell");
    if (!shell) return undefined;

    const handleMouseDown = () => showUI();
    const handleMouseLeave = () => hideUI();

    shell.addEventListener("mousedown", handleMouseDown);
    shell.addEventListener("mouseleave", handleMouseLeave);
    hideUI();
    return () => {
      shell.removeEventListener("mousedown", handleMouseDown);
      shell.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  const { t } = useI18n();

  return (
    <>
      <div
        className={`twitchPub-page${
          uiHidden.value ? " twitchPub-chrome-hidden" : ""
        }`}
      >
        <div className="twitchPub-content">
          <div
            ref={qrContainer}
            className={uiHidden.value ? "" : "qr-container"}
          >
            <QRCodeComponent
              value={qrValue.value}
              size={150}
              uiHidden={uiHidden.value}
              onClick={() => {
                navigator.clipboard.writeText(qrValue.value);
                toast("Link copied to clipboard!");
              }}
              state={props.state}
            />
          </div>
          {navigatingRef.value && (
            <span key={navigatingRef.value} className="twitchPub-nav-notice">
              {t("twitchInterface.navigatingTo", {
                ns: "ext_twitchPub",
                defaultValue: "Navigating to {{ref}}",
                ref: fmtRef(navigatingRef.value),
              })}
            </span>
          )}

          <span
            className={`twitchPub-qr-title ${
              uiHidden.value ? "twitchPub-hidden" : ""
            }`}
          >
            {t("twitchInterface.shareQRCode", {
              ns: "ext_twitchPub",
              defaultValue: "Share this QR code",
            })}
          </span>
          <span
            className={`twitchPub-subtitle ${
              uiHidden.value ? "twitchPub-hidden" : ""
            }`}
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
