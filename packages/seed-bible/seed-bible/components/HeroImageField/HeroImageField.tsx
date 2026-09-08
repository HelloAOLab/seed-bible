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

const HeroImageCropModalContent = lazy(() =>
  import("./HeroImageCropModal").then((m) => ({
    default: m.HeroImageCropModalContent,
  }))
);

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
          <HeroImageCropModalContent
            image={file}
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
            className="sb-hero-field-delete"
            onClick={onRemove}
            disabled={busy}
            aria-label={t("delete", { defaultValue: "Delete" })}
          >
            <MaterialIcon>delete</MaterialIcon>
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
