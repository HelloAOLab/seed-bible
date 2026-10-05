// The crop chrome (`sb-photo-modal`, `sb-photo-crop*`, the actions row) is
// still defined in ProfilePictureModal.css, which is also what PhotoChooser
// imports it from. Moving those rules into a neutral file is worth doing, but
// it is a CSS-ownership change with no test to catch a visual regression, so
// it is left for its own pass.
import "../ProfilePictureModal/ProfilePictureModal.css";
import { useSignal } from "@preact/signals";
import AvatarEditor, { useAvatarEditor } from "react-avatar-editor";
import { useI18n } from "../../i18n/I18nManager";
import { cropToFile, type PhotoCropTarget } from "./photoCrop";

export type { PhotoCropTarget };

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;
const INITIAL_ZOOM = 1.2;
/** Dimmed padding around the crop window, so the user can see what is cut. */
const EDITOR_BORDER = 24;

/**
 * The crop step for any image the user has already picked: a zoomable preview
 * masked to the target's shape, then the cropped file handed to `onUpload`.
 * Shared by the profile picture and by playlist / reading-plan covers, which
 * differ only in the {@link PhotoCropTarget} they pass.
 *
 * `title` and `confirmLabel` arrive already translated, so each feature keeps
 * its own wording (and its own translation keys, which the i18n lint rule can
 * only see through a bare `t`). The labels this owns — Cancel, Back, Zoom,
 * Uploading — are translated here.
 */
export function PhotoCropModalContent(props: {
  image: File;
  target: PhotoCropTarget;
  /** Already-translated heading, e.g. "Crop your photo". */
  title: string;
  /** Already-translated confirm label, e.g. "Set picture". */
  confirmLabel: string;
  onUpload: (file: File) => Promise<void>;
  onClose: () => void;
  /** Supplied when there is a step behind this one; renders a Back button. */
  onBack?: () => void;
}) {
  const { image, target, title, confirmLabel, onUpload, onClose, onBack } =
    props;
  const { t } = useI18n();

  const zoom = useSignal(INITIAL_ZOOM);
  const isUploading = useSignal(false);
  const editor = useAvatarEditor();

  const handleConfirm = () => {
    if (isUploading.value) {
      return;
    }
    const source = editor.getImage() ?? editor.getImageScaledToCanvas();
    if (!source) {
      return;
    }
    isUploading.value = true;
    // `getImage` is the crop at the source image's own resolution; the
    // fallback covers the window before the image resource has loaded, where
    // the library types it as nullable.
    void cropToFile(source, target)
      .then(onUpload)
      .then(() => {
        onClose();
      })
      .catch((error) => {
        // The caller's `onUpload` already logs what it was uploading; this
        // keeps the rejection from going unhandled and leaves the modal open
        // so the user can retry.
        console.error("Failed to upload the cropped image.", error);
      })
      .finally(() => {
        isUploading.value = false;
      });
  };

  return (
    <div className="sb-photo-modal">
      <div className="sb-photo-crop">
        <h4 className="sb-photo-crop-title">{title}</h4>
        <AvatarEditor
          ref={editor.ref}
          className="sb-photo-crop-canvas"
          image={image}
          width={target.previewWidth}
          height={target.previewHeight}
          border={EDITOR_BORDER}
          borderRadius={target.borderRadius}
          color={[0, 0, 0, 0.5]}
          scale={zoom.value}
          rotate={0}
        />
        <label className="sb-photo-crop-zoom">
          <span className="material-symbols-outlined">zoom_out</span>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom.value}
            aria-label={t("zoom", { defaultValue: "Zoom" })}
            onInput={(event: Event) => {
              zoom.value = Number(
                (event.currentTarget as HTMLInputElement).value
              );
            }}
          />
          <span className="material-symbols-outlined">zoom_in</span>
        </label>

        <div className="sb-photo-modal-actions">
          {onBack ? (
            <button
              type="button"
              className="sb-photo-modal-button"
              onClick={onBack}
              disabled={isUploading.value}
            >
              {t("back", { defaultValue: "Back" })}
            </button>
          ) : null}
          <button
            type="button"
            className="sb-photo-modal-button"
            onClick={onClose}
            disabled={isUploading.value}
          >
            {t("cancel", { defaultValue: "Cancel" })}
          </button>
          <button
            type="button"
            className="sb-photo-modal-button sb-photo-modal-button-primary"
            onClick={handleConfirm}
            disabled={isUploading.value}
          >
            {isUploading.value
              ? t("uploading", { defaultValue: "Uploading..." })
              : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
