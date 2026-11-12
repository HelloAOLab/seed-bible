import { useI18n } from "../../i18n/I18nManager";
import { getAnnotationUpdatedTimeFormatter } from "../Discover/AnnotationsSection";

/**
 * Asks, on going to edit a playlist with unsaved edits kept from before,
 * whether to carry on from them or throw them away.
 */
export function PlaylistDraftChoice(props: {
  /** When the draft was last edited, when that's known. */
  editedAtMs: number | null;
  onContinue: () => void;
  onDiscard: () => void;
}) {
  const { t, language } = useI18n();
  return (
    <div className="sb-confirm-delete">
      <p className="sb-confirm-delete-message">
        {props.editedAtMs != null
          ? t("playlist-editor-draft-found-message-when", {
              when: getAnnotationUpdatedTimeFormatter(language).format(
                new Date(props.editedAtMs)
              ),
              defaultValue:
                "You have unsaved changes to this playlist, last edited {{when}}. Continue from your draft, or discard it?",
            })
          : t("playlist-editor-draft-found-message", {
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
