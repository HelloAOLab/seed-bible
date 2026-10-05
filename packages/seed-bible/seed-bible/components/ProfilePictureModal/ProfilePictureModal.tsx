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
 * Whether this browser wires a file input's `capture` attribute to a camera.
 *
 * `capture` is a hint the spec lets a user agent ignore, and desktop engines
 * do ignore it: measured in desktop Chromium, `capture` is absent from
 * `HTMLInputElement.prototype` and such an input opens an ordinary file
 * dialog. Camera hardware makes no difference — the same probe reports it
 * absent with a fake camera attached — because the attribute is
 * unimplemented rather than unsatisfiable. So a laptop webcam being
 * user-facing rather than environment-facing does not change the answer, and
 * neither does having no camera at all.
 *
 * On an engine that implements the attribute but still ignores it, this
 * returns true and "Take a photo" falls back to a file dialog, which is what
 * every platform did before this check existed.
 */
function supportsCameraCapture(): boolean {
  return (
    typeof HTMLInputElement !== "undefined" &&
    "capture" in HTMLInputElement.prototype
  );
}

/**
 * Content for the "Change profile picture" modal, rendered inside the shared
 * {@link ModalHost} chrome. Lets the user take a photo or pick a file from
 * their device, then crop/zoom it before it is uploaded.
 *
 * "Take a photo" is offered only where the camera will actually open (see
 * {@link supportsCameraCapture}); elsewhere it would be a button promising a
 * camera and showing a file dialog. What is left is the device's own file
 * picker — unlike playlist and reading-plan covers, profile pictures
 * deliberately stay out of the shared Recent uploads gallery, so there is
 * nothing in-app to choose from. It is labelled "Upload from device" rather
 * than "gallery" so it does not read as that in-app gallery.
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canTakePhoto = supportsCameraCapture();

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
        {canTakePhoto ? (
          <button
            type="button"
            className="sb-photo-choice-button"
            onClick={() => cameraInputRef.current?.click()}
          >
            <span className="material-symbols-outlined">photo_camera</span>
            <span>{t("take-photo", { defaultValue: "Take a photo" })}</span>
          </button>
        ) : null}
        <button
          type="button"
          className="sb-photo-choice-button"
          onClick={() => fileInputRef.current?.click()}
        >
          <span className="material-symbols-outlined">upload_file</span>
          <span>
            {t("upload-from-device", { defaultValue: "Upload from device" })}
          </span>
        </button>

        {canTakePhoto ? (
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={handleFileSelected}
          />
        ) : null}
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
