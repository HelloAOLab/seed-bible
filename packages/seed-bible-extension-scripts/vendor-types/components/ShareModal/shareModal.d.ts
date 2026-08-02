import "./shareModal.css";
import type { AppState } from "../../managers/SeedBibleStateManager";
import { type BibleReadingSession } from "../../managers/SessionsManager";
export interface ShareModalProps {
  /** Called when the sheet should close (Cancel or Escape). */
  onClose?: () => void;
  /** Copy a shareable link to the clipboard. */
  onShareLink?: () => void;
  /** Open the device's native share sheet. */
  onShareVia?: () => void;
  app: AppState;
  hideShareLink?: boolean;
  /** The session to share, or null. */
  session: BibleReadingSession | null;
}
export declare const ShareModal: (
  props: ShareModalProps
) => import("preact").JSX.Element;
