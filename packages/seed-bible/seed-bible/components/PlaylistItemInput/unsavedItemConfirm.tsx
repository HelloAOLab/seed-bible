import { useI18n } from "../../i18n/I18nManager";
import type { ModalManager } from "../../managers/ModalManager";

export const UNSAVED_ITEM_CONFIRM_MODAL_ID = "playlist-unsaved-item-confirm";

export interface UnsavedItemConfirmOptions {
  /**
   * What is unsaved: a new item typed into the "Add item" box but not added,
   * or changes to an item that is open for editing.
   */
  kind: "add" | "edit";
  /**
   * What the user was doing: saving the whole playlist or plan, or closing
   * the open item (to open another one, or fold it away).
   */
  then: "save" | "close";
  /** Goes ahead without the unsaved input. */
  onDiscard: () => void;
  /** Adds or saves the item first, then goes ahead. */
  onKeep: () => void;
}

function UnsavedItemConfirmModalContent(props: {
  kind: "add" | "edit";
  then: "save" | "close";
  onGoBack: () => void;
  onDiscard: () => void;
  onKeep: () => void;
}) {
  const { kind, then, onGoBack, onDiscard, onKeep } = props;
  const { t } = useI18n();

  const message =
    kind === "add"
      ? t("unsaved-item-confirm-message", {
          defaultValue:
            "You've started adding an item that hasn't been added to the playlist yet. What would you like to do?",
        })
      : t("unsaved-item-edit-confirm-message", {
          defaultValue:
            "You've changed this item but haven't saved those changes yet. What would you like to do?",
        });

  const discardLabel =
    then === "save"
      ? t("discard-and-save", { defaultValue: "Discard and save" })
      : t("discard-changes", { defaultValue: "Discard changes" });

  const keepLabel =
    then === "close"
      ? t("playlist-save-item", { defaultValue: "Save changes" })
      : kind === "add"
        ? t("add-and-save", { defaultValue: "Add and save" })
        : t("keep-changes-and-save", {
            defaultValue: "Keep changes and save",
          });

  return (
    <div className="sb-confirm-delete">
      <p className="sb-confirm-delete-message">{message}</p>
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
          onClick={onDiscard}
        >
          {discardLabel}
        </button>
        <button
          type="button"
          className="sb-session-settings-end"
          onClick={onKeep}
        >
          {keepLabel}
        </button>
      </div>
    </div>
  );
}

/**
 * Asks what to do with item input that isn't in the list yet before it would
 * be lost: a new item not yet added, or edits to an open item not yet saved.
 * "Back" leaves everything as it is; the other two choices call `onDiscard`
 * or `onKeep`. Shared by the playlist and reading plan editors, which both
 * edit items with `PlaylistItemInput`.
 */
export function openUnsavedItemConfirm(
  modals: ModalManager,
  options: UnsavedItemConfirmOptions
) {
  const { kind, then, onDiscard, onKeep } = options;
  modals.openModal({
    id: UNSAVED_ITEM_CONFIRM_MODAL_ID,
    title:
      kind === "add"
        ? { key: "unsaved-item-confirm-title", defaultValue: "Unsaved item" }
        : {
            key: "unsaved-item-edit-confirm-title",
            defaultValue: "Unsaved item changes",
          },
    content: () => (
      <UnsavedItemConfirmModalContent
        kind={kind}
        then={then}
        onGoBack={() => modals.closeModal(UNSAVED_ITEM_CONFIRM_MODAL_ID)}
        onDiscard={() => {
          modals.closeModal(UNSAVED_ITEM_CONFIRM_MODAL_ID);
          onDiscard();
        }}
        onKeep={() => {
          modals.closeModal(UNSAVED_ITEM_CONFIRM_MODAL_ID);
          onKeep();
        }}
      />
    ),
  });
}
