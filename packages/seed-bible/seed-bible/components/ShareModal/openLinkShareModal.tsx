import type { ModalManager } from "../../managers/ModalManager";
import type { AppState } from "../../managers/SeedBibleStateManager";
import type { BibleReadingSession } from "../../managers/SessionsManager";
import type { QRCodeKind } from "../SessionQRCode/SessionQRCode";
import { ShareModal } from "./shareModal";

/**
 * Opens the reader's share sheet for something that has its own page, such as
 * a playlist or a reading plan: copy its link, the device share sheet, a QR
 * code of the link, and starting a new live session.
 */
export function openLinkShareModal(options: {
  id: string;
  modals: ModalManager;
  app: AppState;
  url: string;
  /** Title handed to the device share sheet. */
  title: string;
  kind: QRCodeKind;
  copiedMessage: string;
  copyFailedMessage: string;
  /** Runs once a session started from the sheet exists and is selected. */
  onSessionStarted?: (session: BibleReadingSession) => void;
}) {
  const { id, modals, app, url } = options;
  const close = () => modals.closeModal(id);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch (error) {
      // Also covers no clipboard at all (an insecure origin, some webviews).
      console.error("Failed to copy the share link.", error);
      app.toast(options.copyFailedMessage);
      return;
    }
    app.toast(options.copiedMessage);
  };

  modals.openModal({
    id,
    title: { key: "share-sheet-title", defaultValue: "Share" },
    mobileSheet: true,
    content: () => (
      <ShareModal
        app={app}
        modals={modals}
        // A new session is always started rather than offering the current
        // one, so sharing never switches what an existing session is reading.
        session={null}
        linkQRCode={{ url, kind: options.kind }}
        onSessionStarted={options.onSessionStarted}
        onClose={close}
        onShareLink={() => {
          close();
          void copyLink();
        }}
        onShareVia={() => {
          close();
          void navigator
            .share?.({ title: options.title, url })
            .catch((error: unknown) => {
              if ((error as Error)?.name === "AbortError") return;
              console.error("Failed to open the share sheet.", error);
            });
        }}
      />
    ),
  });
}
