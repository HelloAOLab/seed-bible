import { useI18n } from "../../i18n/I18nManager";
import type { ModalManager } from "../../managers/ModalManager";

const UNSAVED_ITEM_CONFIRM_MODAL_ID = "playlist-unsaved-item-confirm";

/**
 * Confirmation body shown when Save is clicked while the item section has
 * input that isn't in the list yet — a new item not yet added, or changes to
 * an existing item not yet saved — so it isn't silently discarded.
 */
function UnsavedItemConfirmModalContent(props: {
  editing: boolean;
  onGoBack: () => void;
  onDiscardAndSave: () => void;
  onAddAndSave: () => void;
}) {
  const { editing, onGoBack, onDiscardAndSave, onAddAndSave } = props;
  const { t } = useI18n();

  return (
    <div className="sb-confirm-delete">
      <p className="sb-confirm-delete-message">
        {editing
          ? t("unsaved-item-edit-confirm-message", {
              defaultValue:
                "You've changed an item but haven't saved those changes yet. What would you like to do?",
            })
          : t("unsaved-item-confirm-message", {
              defaultValue:
                "You've started adding an item that hasn't been added to the playlist yet. What would you like to do?",
            })}
      </p>
      <div className="sb-confirm-delete-actions">
        <button
          type="button"
          className="sb-session-settings-cancel"
          onClick={onGoBack}
        >
          {t("back", { defaultValue: "Back" })}
        </button>
        <button
          type="button"
          className="sb-session-settings-cancel"
          onClick={onDiscardAndSave}
        >
          {t("discard-and-save", { defaultValue: "Discard and save" })}
        </button>
        <button
          type="button"
          className="sb-session-settings-end"
          onClick={onAddAndSave}
        >
          {editing
            ? t("keep-changes-and-save", {
                defaultValue: "Keep changes and save",
              })
            : t("add-and-save", { defaultValue: "Add and save" })}
        </button>
      </div>
    </div>
  );
}

/**
 * Opens the unsaved-item confirmation modal. `editing` words it for changes to
 * an existing item rather than a new one; either way, the last choice commits
 * the item (adding or saving it) and then saves. Used by the playlist and reading
 * plan editors, which both edit items with `PlaylistItemInput`.
 */
export function openUnsavedItemConfirm(
  modals: ModalManager,
  editing: boolean,
  onDiscardAndSave: () => void,
  onAddAndSave: () => void
) {
  modals.openModal({
    id: UNSAVED_ITEM_CONFIRM_MODAL_ID,
    title: editing
      ? {
          key: "unsaved-item-edit-confirm-title",
          defaultValue: "Unsaved item changes",
        }
      : {
          key: "unsaved-item-confirm-title",
          defaultValue: "Unsaved item",
        },
    content: () => (
      <UnsavedItemConfirmModalContent
        editing={editing}
        onGoBack={() => modals.closeModal(UNSAVED_ITEM_CONFIRM_MODAL_ID)}
        onDiscardAndSave={() => {
          modals.closeModal(UNSAVED_ITEM_CONFIRM_MODAL_ID);
          onDiscardAndSave();
        }}
        onAddAndSave={() => {
          modals.closeModal(UNSAVED_ITEM_CONFIRM_MODAL_ID);
          onAddAndSave();
        }}
      />
    ),
  });
}
