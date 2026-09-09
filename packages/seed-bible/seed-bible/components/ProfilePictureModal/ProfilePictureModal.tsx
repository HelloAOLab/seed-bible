import "./ProfilePictureModal.css";
import { useRef } from "preact/hooks";
import { useSignal } from "@preact/signals";
import { useI18n } from "../../i18n/I18nManager";
import { PhotoCropModalContent } from "../PhotoCropModal/PhotoCropModal";
import type { PhotoCropTarget } from "../PhotoCropModal/photoCrop";

/**
 * A square avatar, stored lossless because it is small and re-encoding a face
 * at low quality shows. The circular mask is the editor's only; the stored
 * file is square, and the round avatar comes from CSS.
 */
const PROFILE_PICTURE_TARGET: PhotoCropTarget = {
  width: 256,
  height: 256,
  previewWidth: 256,
  previewHeight: 256,
  borderRadius: 128,
  mimeType: "image/png",
  fileName: "profile-picture.png",
};

/**
 * Content for the "Update picture" modal, rendered inside the shared
 * {@link ModalHost} chrome. Lets the user take a photo, choose one from their
 * device, or upload a file, then crop/zoom it before it is uploaded.
 *
 * "Take a photo" relies on the `capture` attribute: it opens the camera on
 * mobile and falls back to a normal file picker on desktop. Note that these
 * are the device's own pickers — unlike playlist and reading-plan covers,
 * profile pictures deliberately stay out of the shared Recent uploads
 * gallery, so there is nothing in-app to choose from.
 *
 * The crop step itself is {@link PhotoCropModalContent}, shared with covers.
 * The cropped result is handed to `onUpload`, which wraps
 * `login.uploadProfilePicture`.
 */
export function ProfilePictureModalContent(props: {
  onUpload: (file: File) => Promise<void>;
  onClose: () => void;
}) {
  const { onUpload, onClose } = props;
  const { t } = useI18n();

  const step = useSignal<"choose" | "crop">("choose");
  const selectedFile = useSignal<File | null>(null);

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
    step.value = "crop";
  };

  const backToChoose = () => {
    selectedFile.value = null;
    step.value = "choose";
  };

  if (step.value === "crop" && selectedFile.value) {
    return (
      <PhotoCropModalContent
        image={selectedFile.value}
        target={PROFILE_PICTURE_TARGET}
        title={t("crop-your-photo", { defaultValue: "Crop your photo" })}
        confirmLabel={t("set-picture", { defaultValue: "Set picture" })}
        onUpload={onUpload}
        onClose={onClose}
        onBack={backToChoose}
      />
    );
  }

  return (
    <div className="sb-photo-modal">
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
    </div>
  );
}
