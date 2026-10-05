import { useSignal } from "@preact/signals";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import type { ModalManager } from "../../managers/ModalManager";
import type { GalleryPhoto } from "../../managers/UserGalleryManager";
import { MaterialIcon } from "../icons";
import { useI18n } from "../../i18n";
import "./YourContentPane.css";

/** The parts of the app a delete touches: the gallery and the two cover users. */
type DeleteState = Pick<
  SeedBibleState,
  "gallery" | "playlists" | "readingPlans"
>;

/** Titles of the playlists and reading plans showing a photo as their cover. */
export interface PhotoUsage {
  playlists: (string | null)[];
  readingPlans: (string | null)[];
}

export function findPhotoUsage(
  state: Pick<SeedBibleState, "playlists" | "readingPlans">,
  url: string
): PhotoUsage {
  return {
    playlists: state.playlists.userPlaylists.value
      .filter((playlist) => playlist.heroImageUrl === url)
      .map((playlist) => playlist.title),
    readingPlans: state.readingPlans.userReadingPlans.value
      .filter((plan) => plan.heroImageUrl === url)
      .map((plan) => plan.title),
  };
}

/**
 * Deletes a gallery photo everywhere it appears. The covers go first, so
 * nothing is left pointing at a file that is about to disappear; a cover that
 * cannot be cleared stops the delete, and the photo stays in the gallery.
 */
export async function deleteGalleryPhotoEverywhere(
  state: DeleteState,
  photo: GalleryPhoto
): Promise<void> {
  await Promise.all([
    state.playlists.clearHeroImage(photo.url),
    state.readingPlans.clearHeroImage(photo.url),
  ]);
  await state.gallery.deletePhoto(photo);
}

function ConfirmDeleteImageModalContent(props: {
  state: DeleteState;
  photo: GalleryPhoto;
  toast: (message: string) => void;
  onClose: () => void;
}) {
  const { state, photo, toast, onClose } = props;
  const { t } = useI18n();
  const isDeleting = useSignal(false);

  const usage = findPhotoUsage(state, photo.url);
  const usedBy = [
    ...usage.playlists.map(
      (title) =>
        title ?? t("untitled-playlist", { defaultValue: "Untitled playlist" })
    ),
    ...usage.readingPlans.map(
      (title) =>
        title ?? t("untitled-reading-plan", { defaultValue: "Untitled plan" })
    ),
  ];

  const confirm = async () => {
    isDeleting.value = true;
    try {
      await deleteGalleryPhotoEverywhere(state, photo);
      onClose();
    } catch (error) {
      console.error("Failed to delete image:", error);
      isDeleting.value = false;
      toast(
        t("delete-image-failed", { defaultValue: "Couldn't delete the image." })
      );
    }
  };

  return (
    <div className="sb-confirm-delete">
      <img className="sb-images-confirm-thumb" src={photo.url} alt="" />
      <p className="sb-confirm-delete-message">
        {t("delete-image-confirm-message", {
          defaultValue: "Delete this image? This can't be undone.",
        })}
      </p>
      <p className="sb-confirm-delete-message">
        {t("delete-image-usage-warning", {
          defaultValue:
            "If you've used it as the cover of a playlist or reading plan, it will be removed from there too.",
        })}
      </p>
      {usedBy.length > 0 ? (
        <>
          <p className="sb-confirm-delete-message">
            {t("delete-image-used-by", {
              defaultValue: "It's currently the cover of:",
            })}
          </p>
          <ul className="sb-images-usage-list">
            {usedBy.map((title, index) => (
              <li key={index}>{title}</li>
            ))}
          </ul>
        </>
      ) : null}
      <div className="sb-confirm-delete-actions">
        <button
          type="button"
          className="sb-session-settings-cancel"
          onClick={onClose}
          disabled={isDeleting.value}
        >
          {t("cancel", { defaultValue: "Cancel" })}
        </button>
        <button
          type="button"
          className="sb-session-settings-end"
          onClick={() => void confirm()}
          disabled={isDeleting.value}
        >
          {t("delete", { defaultValue: "Delete" })}
        </button>
      </div>
    </div>
  );
}

/** Opens the delete-image confirmation, with the warning about covers. */
export function openDeleteImageConfirm(
  modals: ModalManager,
  state: DeleteState,
  photo: GalleryPhoto,
  toast: (message: string) => void
): string {
  const modalId = `delete-image-confirm-${photo.id}`;
  modals.openModal({
    id: modalId,
    title: {
      key: "delete-image-confirm-title",
      defaultValue: "Delete image?",
    },
    content: () => (
      <ConfirmDeleteImageModalContent
        state={state}
        photo={photo}
        toast={toast}
        onClose={() => modals.closeModal(modalId)}
      />
    ),
  });
  return modalId;
}

function ImagePreviewModalContent(props: {
  photo: GalleryPhoto;
  onDelete: () => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="sb-images-preview">
      <img
        className="sb-images-preview-img"
        src={props.photo.url}
        alt={t("uploaded-image", { defaultValue: "Uploaded image" })}
      />
      <div className="sb-confirm-delete-actions">
        <button
          type="button"
          className="sb-session-settings-cancel"
          onClick={props.onClose}
        >
          {t("close", { defaultValue: "Close" })}
        </button>
        <button
          type="button"
          className="sb-session-settings-end"
          onClick={props.onDelete}
        >
          {t("delete", { defaultValue: "Delete" })}
        </button>
      </div>
    </div>
  );
}

/** Shows one image at full size, with a way to delete it from there. */
export function openImagePreview(
  modals: ModalManager,
  photo: GalleryPhoto,
  onDelete: () => void
): string {
  const modalId = `image-preview-${photo.id}`;
  modals.openModal({
    id: modalId,
    title: { key: "uploaded-image", defaultValue: "Uploaded image" },
    content: () => (
      <ImagePreviewModalContent
        photo={photo}
        onClose={() => modals.closeModal(modalId)}
        onDelete={() => {
          modals.closeModal(modalId);
          onDelete();
        }}
      />
    ),
  });
  return modalId;
}

/** "Nov 02, 2025"; an empty string for a photo with no usable timestamp. */
function formatUploadDate(ms: number, language: string): string {
  if (!Number.isFinite(ms) || ms <= 0) {
    return "";
  }
  return new Date(ms).toLocaleDateString(language, {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

/**
 * Tiles for the images the user has uploaded (issue #1748), each of which can
 * be viewed at full size or deleted. "Your content" decides which photos to
 * pass: its first few, or all of them under the Images chip.
 */
export function UserImagesGrid(props: {
  state: SeedBibleState;
  photos: GalleryPhoto[];
}) {
  const { state, photos } = props;
  const { modals } = state;
  const { t, language } = useI18n();

  const requestDelete = (photo: GalleryPhoto) =>
    openDeleteImageConfirm(modals, state, photo, state.app.toast);

  return (
    <ul className="sb-images-grid">
      {photos.map((photo) => (
        <li key={photo.id} className="sb-images-item">
          <button
            type="button"
            className="sb-images-tile"
            onClick={() =>
              openImagePreview(modals, photo, () => requestDelete(photo))
            }
            aria-label={t("view-image", { defaultValue: "View image" })}
          >
            <img src={photo.url} alt="" loading="lazy" />
          </button>
          <button
            type="button"
            className="sb-images-delete"
            onClick={() => requestDelete(photo)}
            aria-label={t("delete-image", { defaultValue: "Delete image" })}
            title={t("delete-image", { defaultValue: "Delete image" })}
          >
            <MaterialIcon>delete</MaterialIcon>
          </button>
          <span className="sb-images-date">
            {formatUploadDate(photo.createdAtMs, language)}
          </span>
        </li>
      ))}
    </ul>
  );
}
