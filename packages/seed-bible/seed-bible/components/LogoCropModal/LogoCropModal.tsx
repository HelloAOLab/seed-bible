import "../ProfilePictureModal/ProfilePictureModal.css";
import { useRef } from "preact/hooks";
import { useSignal } from "@preact/signals";
import AvatarEditor, { useAvatarEditor } from "react-avatar-editor";
import { useI18n } from "../../i18n/I18nManager";

const EDITOR_SIZE = 256;

/**
 * Content for the "Upload logo" modal, rendered inside the shared
 * {@link ModalHost} chrome. Lets the user choose an image file, then crop it
 * to a 1:1 square (no rounded/circular mask, unlike the profile picture
 * editor) before it is uploaded.
 */
export function LogoCropModalContent(props: {
  onUpload: (file: File) => Promise<void>;
  onClose: () => void;
}) {
  const { onUpload, onClose } = props;
  const { t } = useI18n();

  const step = useSignal<"choose" | "crop">("choose");
  const selectedFile = useSignal<File | null>(null);
  const zoom = useSignal(1.2);
  const isUploading = useSignal(false);

  const editor = useAvatarEditor();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelected = (event: Event) => {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    // Reset so picking the same file again still fires onChange.
    input.value = "";
    if (!file) {
      return;
    }
    selectedFile.value = file;
    zoom.value = 1.2;
    step.value = "crop";
  };

  const backToChoose = () => {
    selectedFile.value = null;
    step.value = "choose";
  };

  const handleConfirm = () => {
    if (isUploading.value) {
      return;
    }
    const canvas = editor.getImageScaledToCanvas();
    if (!canvas) {
      return;
    }
    canvas.toBlob((blob) => {
      if (!blob) {
        return;
      }
      const file = new File([blob], "logo.png", { type: "image/png" });
      isUploading.value = true;
      void onUpload(file)
        .then(() => {
          onClose();
        })
        .catch((error) => {
          console.error("Failed to upload logo.", error);
        })
        .finally(() => {
          isUploading.value = false;
        });
    }, "image/png");
  };

  return (
    <div className="sb-photo-modal">
      {step.value === "choose" ? (
        <div className="sb-photo-choice-list">
          <button
            type="button"
            className="sb-photo-choice-button"
            onClick={() => fileInputRef.current?.click()}
          >
            <span className="material-symbols-outlined">upload_file</span>
            <span>
              {t("choose-image", { defaultValue: "Choose an image" })}
            </span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleFileSelected}
          />
        </div>
      ) : (
        <div className="sb-photo-crop">
          <h4 className="sb-photo-crop-title">
            {t("crop-your-logo", { defaultValue: "Crop your logo" })}
          </h4>
          {selectedFile.value && (
            <AvatarEditor
              ref={editor.ref}
              className="sb-photo-crop-canvas"
              image={selectedFile.value}
              width={EDITOR_SIZE}
              height={EDITOR_SIZE}
              border={24}
              borderRadius={0}
              color={[0, 0, 0, 0.5]}
              scale={zoom.value}
              rotate={0}
            />
          )}
          <label className="sb-photo-crop-zoom">
            <span className="material-symbols-outlined">zoom_out</span>
            <input
              type="range"
              min={0.25}
              max={3}
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
            <button
              type="button"
              className="sb-photo-modal-button"
              onClick={backToChoose}
              disabled={isUploading.value}
            >
              {t("back", { defaultValue: "Back" })}
            </button>
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
                : t("set-logo", { defaultValue: "Set logo" })}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
