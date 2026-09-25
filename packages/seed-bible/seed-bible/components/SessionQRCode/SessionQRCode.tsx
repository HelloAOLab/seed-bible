import "./SessionQRCode.css";
import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import QRCode from "qrcode";
import { useI18n } from "../../i18n/I18nManager";

const QR_RENDER_SIZE = 512;
const QR_FILE_NAME = "seed-bible-session-qr.png";

/**
 * Card that shows a scannable QR code for a session link, so people reading
 * together in person can join without typing or sending the URL.
 */
export function SessionQRCode(props: { url: string }) {
  const { url } = props;
  const { t } = useI18n();
  const dataUrl = useSignal<string | null>(null);
  const failed = useSignal(false);

  useEffect(() => {
    let cancelled = false;
    // Always dark-on-white regardless of theme: many scanners can't read an
    // inverted (light-on-dark) code.
    QRCode.toDataURL(url, {
      width: QR_RENDER_SIZE,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#000000", light: "#ffffff" },
    })
      .then((result) => {
        if (cancelled) return;
        dataUrl.value = result;
        failed.value = false;
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.error("Failed to generate session QR code.", error);
        failed.value = true;
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  const saveImage = async () => {
    const image = dataUrl.value;
    if (!image) return;
    try {
      const blob = await (await fetch(image)).blob();
      const file = new File([blob], QR_FILE_NAME, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
        return;
      }
    } catch (error) {
      // The user dismissing the share sheet isn't a failure worth a download.
      if (error instanceof DOMException && error.name === "AbortError") return;
      console.error("Failed to share session QR code.", error);
    }
    const link = document.createElement("a");
    link.href = image;
    link.download = QR_FILE_NAME;
    link.click();
  };

  if (failed.value) return null;

  return (
    <div className="sb-session-qr">
      <div className="sb-session-qr-heading">
        <span className="sb-session-qr-title">
          {t("session-qr-title", { defaultValue: "Share via QR" })}
        </span>
        <span className="sb-session-qr-subtitle">
          {t("session-qr-subtitle", {
            defaultValue: "Let others scan to join this session.",
          })}
        </span>
      </div>
      <div className="sb-session-qr-card">
        <div className="sb-session-qr-code">
          {dataUrl.value && (
            <img
              src={dataUrl.value}
              alt={t("session-qr-alt", {
                defaultValue: "QR code to join this session",
              })}
            />
          )}
        </div>
        <div className="sb-session-qr-info">
          <span className="sb-session-qr-card-title">
            {t("session-qr-scan-to-join", { defaultValue: "Scan to join" })}
          </span>
          <span className="sb-session-qr-card-description">
            {t("session-qr-scan-description", {
              defaultValue:
                "Opens this passage, in this session, on their phone.",
            })}
          </span>
          <button
            type="button"
            className="sb-session-qr-save"
            onClick={() => void saveImage()}
            disabled={!dataUrl.value}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              ios_share
            </span>
            {t("session-qr-save-image", { defaultValue: "Save image" })}
          </button>
        </div>
      </div>
    </div>
  );
}
