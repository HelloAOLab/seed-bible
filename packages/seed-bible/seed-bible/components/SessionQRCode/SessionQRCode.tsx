import "./SessionQRCode.css";
import { useSignal, type Signal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import QRCode from "qrcode";
import { useI18n } from "../../i18n/I18nManager";
import { download } from "../../app/utils";
import type { ModalManager } from "../../managers/ModalManager";

const QR_RENDER_SIZE = 512;
const QR_FILE_NAME = "seed-bible-session-qr.png";

/**
 * Generates a PNG data URL for the given link. `dataUrl` stays null until
 * generation finishes; `failed` flips on if the link can't be encoded.
 */
function useQRCodeDataUrl(url: string): {
  dataUrl: Signal<string | null>;
  failed: Signal<boolean>;
} {
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

  return { dataUrl, failed };
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header = "", base64 = ""] = dataUrl.split(",");
  const type = /^data:([^;]+)/.exec(header)?.[1] ?? "image/png";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type });
}

async function saveQRCodeImage(dataUrl: string) {
  const blob = dataUrlToBlob(dataUrl);
  try {
    const file = new File([blob], QR_FILE_NAME, { type: blob.type });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file] });
      return;
    }
  } catch (error) {
    // The user dismissing the share sheet isn't a failure worth a download.
    if (error instanceof DOMException && error.name === "AbortError") return;
    console.error("Failed to share session QR code.", error);
  }
  download(blob, QR_FILE_NAME);
}

function SaveQRCodeButton(props: { dataUrl: string | null }) {
  const { t } = useI18n();
  const { dataUrl } = props;
  return (
    <button
      type="button"
      className="sb-session-qr-save"
      onClick={() => {
        if (dataUrl) void saveQRCodeImage(dataUrl);
      }}
      disabled={!dataUrl}
    >
      <span className="material-symbols-outlined" aria-hidden="true">
        ios_share
      </span>
      {t("session-qr-save-image", { defaultValue: "Save image" })}
    </button>
  );
}

function QRCodeErrorMessage() {
  const { t } = useI18n();
  return (
    <span className="sb-session-qr-error" role="status">
      {t("session-qr-error", {
        defaultValue:
          "Couldn't generate a QR code. Copy the session link to share it instead.",
      })}
    </span>
  );
}

/**
 * Opens a modal with a large version of the session QR code, for when the
 * small one is hard to scan from across a room.
 */
export function openSessionQRCodeModal(modals: ModalManager, url: string) {
  modals.openModal({
    id: `session-qr-${url}`,
    title: { key: "session-qr-modal-title", defaultValue: "Scan to join" },
    content: () => <SessionQRCodeLarge url={url} />,
  });
}

function SessionQRCodeLarge(props: { url: string }) {
  const { t } = useI18n();
  const { dataUrl, failed } = useQRCodeDataUrl(props.url);

  if (failed.value) {
    return <QRCodeErrorMessage />;
  }

  return (
    <div className="sb-session-qr-large">
      <div className="sb-session-qr-large-code">
        {dataUrl.value && (
          <img
            src={dataUrl.value}
            alt={t("session-qr-alt", {
              defaultValue: "QR code to join this session",
            })}
          />
        )}
      </div>
      <span className="sb-session-qr-card-description">
        {t("session-qr-scan-description", {
          defaultValue: "Opens this passage, in this session, on their phone.",
        })}
      </span>
      <SaveQRCodeButton dataUrl={dataUrl.value} />
    </div>
  );
}

/**
 * Card that shows a scannable QR code for a session link, so people reading
 * together in person can join without typing or sending the URL. Tapping the
 * code opens a large version of it.
 */
export function SessionQRCode(props: { url: string; modals: ModalManager }) {
  const { url, modals } = props;
  const { t } = useI18n();
  const { dataUrl, failed } = useQRCodeDataUrl(url);

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
      {failed.value ? (
        <QRCodeErrorMessage />
      ) : (
        <div className="sb-session-qr-card">
          <button
            type="button"
            className="sb-session-qr-code"
            onClick={() => openSessionQRCodeModal(modals, url)}
            disabled={!dataUrl.value}
            aria-label={t("session-qr-enlarge", {
              defaultValue: "Show a larger QR code",
            })}
          >
            {dataUrl.value && (
              <img
                src={dataUrl.value}
                alt={t("session-qr-alt", {
                  defaultValue: "QR code to join this session",
                })}
              />
            )}
            <span
              className="sb-session-qr-enlarge-icon material-symbols-outlined"
              aria-hidden="true"
            >
              open_in_full
            </span>
          </button>
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
            <SaveQRCodeButton dataUrl={dataUrl.value} />
          </div>
        </div>
      )}
    </div>
  );
}
