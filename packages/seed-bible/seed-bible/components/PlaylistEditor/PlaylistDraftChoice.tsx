import { useI18n } from "../../i18n/I18nManager";

/**
 * Asks, on going to edit a playlist with unsaved edits kept from before,
 * whether to carry on from them or throw them away.
 */
export function PlaylistDraftChoice(props: {
  onContinue: () => void;
  onDiscard: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="sb-confirm-delete">
      <p className="sb-confirm-delete-message">
        {t("playlist-editor-draft-found-message", {
          defaultValue:
            "You have unsaved changes to this playlist from before. Continue from your draft, or discard it?",
        })}
      </p>
      <div className="sb-confirm-delete-actions sb-unsaved-changes-actions sb-pe-draft-choice-actions">
        <button
          type="button"
          className="sb-photo-modal-button"
          onClick={props.onDiscard}
        >
          {t("playlist-editor-discard-draft", {
            defaultValue: "Discard Draft",
          })}
        </button>
        <button
          type="button"
          className="sb-photo-modal-button sb-photo-modal-button-primary"
          onClick={props.onContinue}
        >
          {t("playlist-editor-continue-draft", {
            defaultValue: "Continue from Draft",
          })}
        </button>
      </div>
    </div>
  );
}
