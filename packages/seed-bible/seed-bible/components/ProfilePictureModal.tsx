import { useRef } from "preact/hooks";
import { useSignal } from "@preact/signals";
import AvatarEditor, { useAvatarEditor } from "react-avatar-editor";
import { useI18n } from "../i18n/I18nManager";

const EDITOR_SIZE = 256;
const EDITOR_BORDER_RADIUS = EDITOR_SIZE / 2;

/**
 * Content for the "Update picture" modal, rendered inside the shared
 * {@link ModalHost} chrome. Lets the user take a photo, choose one from their
 * gallery, or upload a file, then crop/zoom it before it is uploaded.
 *
 * "Take a photo" relies on the `capture` attribute: it opens the camera on
 * mobile and falls back to a normal file picker on desktop. The cropped result
 * is handed to `onUpload`, which wraps `login.uploadProfilePicture`.
 */
export function ProfilePictureModalContent(props: {
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

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
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
      const file = new File([blob], "profile-picture.png", {
        type: "image/png",
      });
      isUploading.value = true;
      void onUpload(file)
        .then(() => {
          onClose();
        })
        .catch((error) => {
          console.error("Failed to upload profile picture.", error);
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
            onClick={() => cameraInputRef.current?.click()}
          >
            <span className="material-symbols-outlined">photo_camera</span>
            <span>{t("take-photo", { defaultValue: "Take a photo" })}</span>
          </button>
          <button
            type="button"
            className="sb-photo-choice-button"
            onClick={() => galleryInputRef.current?.click()}
          >
            <span className="material-symbols-outlined">photo_library</span>
            <span>
              {t("choose-from-gallery", {
                defaultValue: "Choose from gallery",
              })}
            </span>
          </button>
          <button
            type="button"
            className="sb-photo-choice-button"
            onClick={() => fileInputRef.current?.click()}
          >
            <span className="material-symbols-outlined">upload_file</span>
            <span>{t("upload-a-file", { defaultValue: "Upload a file" })}</span>
          </button>

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={handleFileSelected}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleFileSelected}
          />
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
            {t("crop-your-photo", { defaultValue: "Crop your photo" })}
          </h4>
          {selectedFile.value && (
            <AvatarEditor
              ref={editor.ref}
              className="sb-photo-crop-canvas"
              image={selectedFile.value}
              width={EDITOR_SIZE}
              height={EDITOR_SIZE}
              border={24}
              borderRadius={EDITOR_BORDER_RADIUS}
              color={[0, 0, 0, 0.5]}
              scale={zoom.value}
              rotate={0}
            />
          )}
          <label className="sb-photo-crop-zoom">
            <span className="material-symbols-outlined">zoom_out</span>
            <input
              type="range"
              min={1}
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
                : t("set-picture", { defaultValue: "Set picture" })}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
