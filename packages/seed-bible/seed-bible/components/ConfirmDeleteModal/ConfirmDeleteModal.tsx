import { useI18n } from "../../i18n/I18nManager";
import type {
  ModalContentProps,
  ModalManager,
} from "../../managers/ModalManager";
import type { TranslatableTitle } from "../../managers/BibleToolsManager";

type Translate = ModalContentProps["t"];

export interface ConfirmDeleteModalOptions {
  id: string;
  title: TranslatableTitle;
  /** Built when the modal renders, so it can name the thing being deleted. */
  message: (t: Translate) => string;
  /** Erases the thing. A rejection is reported with `failedMessage`. */
  onConfirm: () => Promise<void>;
  failedMessage: (t: Translate) => string;
  toast?: (message: string) => void;
}

function ConfirmDeleteModalContent(
  props: Omit<ConfirmDeleteModalOptions, "id" | "title"> & {
    onClose: () => void;
  }
) {
  const { message, onConfirm, failedMessage, toast, onClose } = props;
  const { t } = useI18n();

  const confirm = async () => {
    try {
      await onConfirm();
    } catch (error) {
      console.error("Delete failed:", error);
      toast?.(failedMessage(t));
    }
    onClose();
  };

  return (
    <div className="sb-confirm-delete">
      <p className="sb-confirm-delete-message">{message(t)}</p>
      <div className="sb-confirm-delete-actions">
        <button
          type="button"
          className="sb-session-settings-cancel"
          onClick={onClose}
        >
          {t("cancel")}
        </button>
        <button
          type="button"
          className="sb-session-settings-end"
          onClick={() => void confirm()}
        >
          {t("delete")}
        </button>
      </div>
    </div>
  );
}

/**
 * Asks before something is erased for good, with Cancel and Delete buttons.
 * The modal closes once the delete settles, whether or not it worked.
 */
export function openConfirmDeleteModal(
  modals: ModalManager,
  options: ConfirmDeleteModalOptions
) {
  const { id, title, ...contentProps } = options;
  modals.openModal({
    id,
    title,
    content: () => (
      <ConfirmDeleteModalContent
        {...contentProps}
        onClose={() => modals.closeModal(id)}
      />
    ),
  });
}
