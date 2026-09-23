import "./HeroImage.css";
import { lazy, Suspense } from "preact/compat";
import { useSignal } from "@preact/signals";
import { useI18n } from "../../i18n/I18nManager";
import type { ModalManager } from "../../managers/ModalManager";
import { MaterialIcon } from "../icons";
import type { UserGalleryManager } from "../../managers/UserGalleryManager";
import {
  openPhotoChooser,
  type PhotoChooserPhotos,
} from "../PhotoChooser/PhotoChooser";
import { Skeleton, SkeletonContainer } from "../Skeleton/Skeleton";
import type { PhotoCropTarget } from "../PhotoCropModal/photoCrop";

// Deferred because it pulls in `react-avatar-editor`, which is only needed
// once the user actually picks a file to crop.
const PhotoCropModalContent = lazy(() =>
  import("../PhotoCropModal/PhotoCropModal").then((m) => ({
    default: m.PhotoCropModalContent,
  }))
);

/**
 * A 4:3 landscape cover, matching the YouVersion-style hero. Stored as JPEG:
 * covers are photographic and 1024x768 of lossless PNG is far larger than the
 * quality difference is worth.
 */
const COVER_IMAGE_TARGET: PhotoCropTarget = {
  width: 1024,
  height: 768,
  previewWidth: 288,
  previewHeight: 216,
  borderRadius: 8,
  mimeType: "image/jpeg",
  quality: 0.85,
  fileName: "hero-image.jpg",
};

function heroClassName(base: string, extra?: string): string {
  return extra ? `${base} ${extra}` : base;
}

/** Square thumbnail for list rows. Decorative next to the title. */
export function HeroImageThumb(props: {
  url?: string | null;
  className?: string;
}) {
  const { t } = useI18n();
  if (props.url) {
    return (
      <img
        className={heroClassName("sb-hero-thumb", props.className)}
        src={props.url}
        alt=""
        aria-hidden="true"
      />
    );
  }
  return (
    <span
      className={heroClassName(
        "sb-hero-thumb sb-hero-thumb--empty",
        props.className
      )}
      aria-hidden="true"
    >
      <MaterialIcon>hide_image</MaterialIcon>
      <span className="sb-hero-thumb-empty-label">
        {t("no-hero-image", { defaultValue: "No image" })}
      </span>
    </span>
  );
}

/** 4:3 landscape banner for detail and play views. */
export function HeroImageBanner(props: {
  url?: string | null;
  alt: string;
  className?: string;
}) {
  const { t } = useI18n();
  if (props.url) {
    return (
      <div className={heroClassName("sb-hero-banner", props.className)}>
        <img src={props.url} alt={props.alt} />
      </div>
    );
  }
  return (
    <div
      className={heroClassName(
        "sb-hero-banner sb-hero-banner--empty",
        props.className
      )}
      role="img"
      aria-label={t("no-hero-image", { defaultValue: "No image" })}
    >
      <MaterialIcon>hide_image</MaterialIcon>
      <span>{t("no-hero-image", { defaultValue: "No image" })}</span>
    </div>
  );
}

/**
 * Add / change / remove a cover. Clicking the image opens Recent uploads
 * (shared across features) or a new upload. A new file still goes through
 * the 4:3 crop modal, then `onUpload`, which should return the stored URL
 * so it can be saved into the gallery automatically.
 */
export function HeroImageField(props: {
  imageUrl: string | null | undefined;
  onUpload: (file: File) => Promise<void | string>;
  onRemove: () => void;
  onSelectPhoto?: (url: string) => void;
  photos?: PhotoChooserPhotos;
  gallery?: Pick<UserGalleryManager, "photos" | "rememberPhoto">;
  modals: ModalManager;
  disabled?: boolean;
}) {
  const {
    imageUrl,
    onUpload,
    onRemove,
    onSelectPhoto,
    gallery,
    modals,
    disabled,
  } = props;
  const photos = gallery?.photos ?? props.photos;
  const { t } = useI18n();
  const isUploading = useSignal(false);

  const openCropModal = (file: File) => {
    const modalId = modals.openModal({
      title: { key: "set-hero-image", defaultValue: "Set cover image" },
      content: () => (
        <Suspense
          fallback={
            <SkeletonContainer
              label={t("loading-picture-editor", {
                defaultValue: "Loading the picture editor…",
              })}
            >
              <Skeleton width="100%" height="16rem" radius="0.625rem" />
            </SkeletonContainer>
          }
        >
          <PhotoCropModalContent
            image={file}
            target={COVER_IMAGE_TARGET}
            title={t("crop-hero-image", { defaultValue: "Crop your image" })}
            confirmLabel={t("set-hero-image", {
              defaultValue: "Set cover image",
            })}
            onClose={() => modals.closeModal(modalId)}
            onUpload={async (cropped) => {
              isUploading.value = true;
              try {
                const url = await onUpload(cropped);
                if (typeof url === "string") {
                  await gallery?.rememberPhoto(url);
                }
              } catch (error) {
                console.error("Failed to upload cover image.", error);
                throw error;
              } finally {
                isUploading.value = false;
              }
            }}
          />
        </Suspense>
      ),
    });
  };

  const openPicker = () => {
    if (disabled || isUploading.value) {
      return;
    }
    openPhotoChooser(modals, {
      gallery,
      photos,
      currentUrl: imageUrl,
      onSelectPhoto,
      onFileChosen: openCropModal,
      title: { key: "recent-uploads", defaultValue: "Recent uploads" },
    });
  };

  const busy = disabled || isUploading.value;

  return (
    <div className="sb-hero-field">
      {imageUrl ? (
        <div className="sb-hero-field-preview-wrap">
          <button
            type="button"
            className="sb-hero-field-preview"
            onClick={openPicker}
            disabled={busy}
            aria-label={t("change-hero-image", {
              defaultValue: "Change cover image",
            })}
          >
            <img
              src={imageUrl}
              alt={t("hero-image", { defaultValue: "Cover image" })}
            />
          </button>
          <button
            type="button"
            className="sb-hero-field-clear"
            onClick={onRemove}
            disabled={busy}
            aria-label={t("remove-hero-image", {
              defaultValue: "Remove cover image",
            })}
          >
            <MaterialIcon>close</MaterialIcon>
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="sb-hero-field-placeholder"
          onClick={openPicker}
          disabled={busy}
          aria-label={t("add-hero-image", { defaultValue: "Add cover image" })}
        >
          <MaterialIcon>add_photo_alternate</MaterialIcon>
          <span>
            {t("add-hero-image", { defaultValue: "Add cover image" })}
          </span>
        </button>
      )}
      <p className="sb-hero-field-hint">
        {t("hero-image-hint", {
          defaultValue: "Optional. Recommended size: 1024×768",
        })}
      </p>
    </div>
  );
}
