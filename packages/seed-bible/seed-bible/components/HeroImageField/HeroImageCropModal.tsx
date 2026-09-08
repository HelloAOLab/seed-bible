import "../ProfilePictureModal/ProfilePictureModal.css";
import { useSignal } from "@preact/signals";
import AvatarEditor, { useAvatarEditor } from "react-avatar-editor";
import { useI18n } from "../../i18n/I18nManager";

/** Stored cover size (4:3 landscape), matching the YouVersion-style hero. */
const HERO_IMAGE_WIDTH = 1024;
const HERO_IMAGE_HEIGHT = 768;
/** Crop-editor preview size. Same 4:3 ratio as the stored image. */
const EDITOR_WIDTH = 288;
const EDITOR_HEIGHT = 216;

function canvasToHeroBlob(source: HTMLCanvasElement): Promise<Blob> {
  const dest = document.createElement("canvas");
  dest.width = HERO_IMAGE_WIDTH;
  dest.height = HERO_IMAGE_HEIGHT;
  const ctx = dest.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to create cover image");
  }
  ctx.drawImage(source, 0, 0, HERO_IMAGE_WIDTH, HERO_IMAGE_HEIGHT);
  return new Promise((resolve, reject) => {
    dest.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to encode cover image"));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      0.85
    );
  });
}

/**
 * Crop modal for a cover image the user already picked. The native file
 * picker is what chooses the file — this screen is only the 4:3 crop.
 */
export function HeroImageCropModalContent(props: {
  image: File;
  onUpload: (file: File) => Promise<void>;
  onClose: () => void;
}) {
  const { image, onUpload, onClose } = props;
  const { t } = useI18n();

  const zoom = useSignal(1.2);
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
    void canvasToHeroBlob(source)
      .then((blob) => {
        const file = new File([blob], "hero-image.jpg", {
          type: "image/jpeg",
        });
        return onUpload(file);
      })
      .then(() => {
        onClose();
      })
      .catch((error) => {
        console.error("Failed to upload cover image.", error);
      })
      .finally(() => {
        isUploading.value = false;
      });
  };

  return (
    <div className="sb-photo-modal">
      <div className="sb-photo-crop">
        <h4 className="sb-photo-crop-title">
          {t("crop-hero-image", { defaultValue: "Crop your image" })}
        </h4>
        <AvatarEditor
          ref={editor.ref}
          className="sb-photo-crop-canvas"
          image={image}
          width={EDITOR_WIDTH}
          height={EDITOR_HEIGHT}
          border={24}
          borderRadius={8}
          color={[0, 0, 0, 0.5]}
          scale={zoom.value}
          rotate={0}
        />
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
              : t("set-hero-image", { defaultValue: "Set cover image" })}
          </button>
        </div>
      </div>
    </div>
  );
}
