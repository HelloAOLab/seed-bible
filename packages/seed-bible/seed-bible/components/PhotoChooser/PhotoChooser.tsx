import "./PhotoChooser.css";
import "../ProfilePictureModal/ProfilePictureModal.css";
import { useRef } from "preact/hooks";
import { useSignal } from "@preact/signals";
import { useI18n } from "../../i18n/I18nManager";
import type { ModalManager } from "../../managers/ModalManager";
import {
  MAX_RECENT_GALLERY_PHOTOS,
  type UserGalleryManager,
} from "../../managers/UserGalleryManager";
import { MaterialIcon } from "../icons";

export type PhotoChooserPhoto = { id: string; url: string };

/** A snapshot list, or a signal so Recent uploads stays current after a save. */
export type PhotoChooserPhotos =
  | readonly PhotoChooserPhoto[]
  | { readonly value: readonly PhotoChooserPhoto[] };

export function readPhotoChooserPhotos(
  photos?: PhotoChooserPhotos | null
): readonly PhotoChooserPhoto[] {
  if (!photos) {
    return [];
  }
  return Array.isArray(photos) ? photos : photos.value;
}

/**
 * Two-option image picker used by features that need a photo: reuse one from
 * Recent uploads, or upload a new file. Call {@link openPhotoChooser} to show
 * it in a modal. Any feature can use this; the gallery is not cover-specific.
 */
export function PhotoChooserContent(props: {
  photos?: PhotoChooserPhotos;
  gallery?: Pick<UserGalleryManager, "photos">;
  currentUrl?: string | null;
  onSelectPhoto?: (url: string) => void;
  onFileChosen: (file: File) => void;
}) {
  const { currentUrl, onSelectPhoto, onFileChosen, gallery } = props;
  const { t } = useI18n();
  const step = useSignal<"source" | "gallery">("source");
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Read `.value` here (not in the parent) so Recent uploads re-renders when
  // a common upload path prepends a photo while this dialog is open.
  const photos = gallery
    ? gallery.photos.value
    : readPhotoChooserPhotos(props.photos);

  const handleFileSelected = (event: Event) => {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = "";
    if (!file) {
      return;
    }
    onFileChosen(file);
  };

  const recent = photos.slice(0, MAX_RECENT_GALLERY_PHOTOS);

  return (
    <div className="sb-photo-chooser">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={handleFileSelected}
      />
      {step.value === "gallery" ? (
        <>
          <h3 className="sb-photo-chooser-heading">
            {t("recent-uploads", { defaultValue: "Recent uploads" })}
          </h3>
          {recent.length === 0 ? (
            <p className="sb-photo-chooser-empty">
              {t("no-photos-yet", {
                defaultValue: "No photos yet. Upload a picture to get started.",
              })}
            </p>
          ) : (
            <div className="sb-photo-gallery-grid">
              {recent.map((photo) => (
                <button
                  key={photo.id}
                  type="button"
                  className={
                    "sb-photo-gallery-item" +
                    (photo.url === currentUrl
                      ? " sb-photo-gallery-item--current"
                      : "")
                  }
                  onClick={() => onSelectPhoto?.(photo.url)}
                  disabled={!onSelectPhoto}
                  aria-label={t("choose-from-gallery", {
                    defaultValue: "Choose from gallery",
                  })}
                  aria-pressed={photo.url === currentUrl}
                >
                  <img src={photo.url} alt="" />
                </button>
              ))}
            </div>
          )}
          <div className="sb-photo-modal-actions">
            <button
              type="button"
              className="sb-photo-modal-button"
              onClick={() => {
                step.value = "source";
              }}
            >
              {t("back", { defaultValue: "Back" })}
            </button>
          </div>
        </>
      ) : (
        <div className="sb-photo-choice-list">
          <button
            type="button"
            className="sb-photo-choice-button"
            onClick={() => {
              step.value = "gallery";
            }}
          >
            <MaterialIcon>photo_library</MaterialIcon>
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
            <MaterialIcon>upload_file</MaterialIcon>
            <span>
              {t("upload-a-picture", { defaultValue: "Upload a picture" })}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

/** Opens the shared gallery-or-upload picker in a modal. */
export function openPhotoChooser(
  modals: ModalManager,
  options: {
    photos?: PhotoChooserPhotos;
    gallery?: Pick<UserGalleryManager, "photos">;
    currentUrl?: string | null;
    onSelectPhoto?: (url: string) => void;
    onFileChosen: (file: File) => void;
    title?: { key: string; defaultValue: string };
  }
): string {
  const modalId = modals.openModal({
    title: options.title ?? {
      key: "recent-uploads",
      defaultValue: "Recent uploads",
    },
    content: () => (
      <PhotoChooserContent
        photos={options.photos}
        gallery={options.gallery}
        currentUrl={options.currentUrl}
        onSelectPhoto={
          options.onSelectPhoto
            ? (url) => {
                options.onSelectPhoto?.(url);
                modals.closeModal(modalId);
              }
            : undefined
        }
        onFileChosen={(file) => {
          modals.closeModal(modalId);
          options.onFileChosen(file);
        }}
      />
    ),
  });
  return modalId;
}
