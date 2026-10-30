import { signal } from "@preact/signals";
import { useI18n } from "../../i18n/I18nManager";
import { MaterialIcon } from "../icons";
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

/**
 * Modal ids whose delete is still running. A second delete of the same thing
 * would fail with "not found" and report a delete that worked, so this is kept
 * by id rather than in the modal: closing the modal with its X and opening it
 * again must not forget the delete that's still in flight.
 */
const deletingIds = signal<ReadonlySet<string>>(new Set());

function setDeleting(id: string, deleting: boolean) {
  const next = new Set(deletingIds.peek());
  if (deleting) {
    next.add(id);
  } else {
    next.delete(id);
  }
  deletingIds.value = next;
}

function ConfirmDeleteModalContent(
  props: Omit<ConfirmDeleteModalOptions, "title"> & {
    onClose: () => void;
  }
) {
  const { id, message, onConfirm, failedMessage, toast, onClose } = props;
  const { t } = useI18n();
  const isDeleting = deletingIds.value.has(id);

  const confirm = async () => {
    if (deletingIds.peek().has(id)) {
      return;
    }
    setDeleting(id, true);
    try {
      await onConfirm();
    } catch (error) {
      console.error("Delete failed:", error);
      toast?.(failedMessage(t));
    } finally {
      setDeleting(id, false);
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
          disabled={isDeleting}
        >
          {t("cancel")}
        </button>
        <button
          type="button"
          className="sb-session-settings-end sb-delete-button"
          onClick={() => void confirm()}
          disabled={isDeleting}
        >
          <MaterialIcon aria-hidden="true">delete</MaterialIcon>
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
        id={id}
        {...contentProps}
        onClose={() => modals.closeModal(id)}
      />
    ),
  });
}
