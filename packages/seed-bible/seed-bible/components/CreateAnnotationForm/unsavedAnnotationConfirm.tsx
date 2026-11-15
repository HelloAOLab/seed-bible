import { useI18n } from "../../i18n/I18nManager";
import type { ModalManager } from "../../managers/ModalManager";
import { Button } from "../Button/Button";

export const UNSAVED_ANNOTATION_CONFIRM_MODAL_ID =
  "annotation-unsaved-changes-confirm";

/**
 * Confirmation body shown when something would leave the annotation editor
 * while it still has typed text that hasn't been saved.
 */
function UnsavedAnnotationConfirmModalContent(props: {
  onKeepEditing: () => void;
  onDiscard: () => void;
}) {
  const { onKeepEditing, onDiscard } = props;
  const { t } = useI18n();

  return (
    <div className="sb-confirm-delete">
      <p className="sb-confirm-delete-message">
        {t("unsaved-annotation-confirm-message", {
          defaultValue:
            "You have an unsaved note. Discard it, or keep editing?",
        })}
      </p>
      <div className="sb-confirm-delete-actions">
        <Button onClick={onKeepEditing}>
          {t("keep-editing", { defaultValue: "Keep editing" })}
        </Button>
        <Button variant="ghost" tone="danger" onClick={onDiscard}>
          {t("discard-note", { defaultValue: "Discard note" })}
        </Button>
      </div>
    </div>
  );
}

/**
 * Asks before leaving the annotation editor with unsaved text. Keep editing
 * closes the modal and leaves the draft alone; Discard runs `onDiscard`.
 */
export function openUnsavedAnnotationConfirm(
  modals: ModalManager,
  onDiscard: () => void
): void {
  modals.openModal({
    id: UNSAVED_ANNOTATION_CONFIRM_MODAL_ID,
    title: {
      key: "unsaved-annotation-confirm-title",
      defaultValue: "Discard your note?",
    },
    content: () => (
      <UnsavedAnnotationConfirmModalContent
        onKeepEditing={() =>
          modals.closeModal(UNSAVED_ANNOTATION_CONFIRM_MODAL_ID)
        }
        onDiscard={() => {
          modals.closeModal(UNSAVED_ANNOTATION_CONFIRM_MODAL_ID);
          onDiscard();
        }}
      />
    ),
  });
}

/** Drops the discard prompt if it's still open (e.g. after a successful save). */
export function closeUnsavedAnnotationConfirm(modals: ModalManager): void {
  modals.closeModal(UNSAVED_ANNOTATION_CONFIRM_MODAL_ID);
}
