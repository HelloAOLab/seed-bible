import { useSignal } from "@preact/signals";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import type { ModalManager } from "../../managers/ModalManager";
import type { CasualOSManager } from "../../managers/OsManager";
import type { GalleryPhoto } from "../../managers/UserGalleryManager";
import { MaterialIcon } from "../icons";
import { useI18n } from "../../i18n";
import { download } from "../../app/utils";
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

/** The titles of the covers using a photo, with stand-ins for untitled ones. */
function useCoverTitles(
  state: Pick<SeedBibleState, "playlists" | "readingPlans">,
  url: string
): string[] {
  const { t } = useI18n();
  const usage = findPhotoUsage(state, url);
  return [
    ...usage.playlists.map(
      (title) =>
        title ?? t("untitled-playlist", { defaultValue: "Untitled playlist" })
    ),
    ...usage.readingPlans.map(
      (title) =>
        title ?? t("untitled-reading-plan", { defaultValue: "Untitled plan" })
    ),
  ];
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
  const usedBy = useCoverTitles(state, photo.url);

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
          className="sb-session-settings-end sb-delete-button"
          onClick={() => void confirm()}
          disabled={isDeleting.value}
        >
          <MaterialIcon aria-hidden="true">delete</MaterialIcon>
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
    mobileSheet: true,
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

/**
 * A name for the saved file: the URL's own file name when it has one,
 * otherwise a generic one with an extension for the image's type (`gif`,
 * `webp`, `svg`…), or none for a type that isn't an image.
 */
function photoFileName(url: string, type: string): string {
  try {
    const last = new URL(url, window.location.href).pathname.split("/").pop();
    if (last && /\.\w+$/.test(last)) {
      return decodeURIComponent(last);
    }
  } catch {
    // Not a parseable URL, or a malformed escape; fall through.
  }
  // "image/svg+xml" → "svg"; "image/jpeg" → the more familiar "jpg".
  const subtype = type.startsWith("image/")
    ? type.slice("image/".length).split("+")[0]
    : "";
  const extension = subtype === "jpeg" ? "jpg" : subtype;
  return extension ? `seed-bible-image.${extension}` : "seed-bible-image";
}

/** Fetches an image hosted somewhere other than the records server. */
async function fetchImage(url: string): Promise<Blob> {
  // Skips the cache for the same reason `CasualOSManager.readFile` does.
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.blob();
}

/**
 * Saves the full-size image to disk. It's read rather than linked because a
 * link's `download` attribute is ignored for another origin's file. If it
 * can't be read, the image opens in a new tab instead, where it can still be
 * saved by hand.
 */
async function downloadPhoto(
  os: Pick<CasualOSManager, "readFile">,
  photo: GalleryPhoto
): Promise<void> {
  try {
    const blob =
      (await os.readFile(photo.url)) ?? (await fetchImage(photo.url));
    download(blob, photoFileName(photo.url, blob.type));
  } catch (error) {
    console.warn("Couldn't download the image; opening it instead.", error);
    window.open(photo.url, "_blank", "noopener");
  }
}

/** The image format named by a URL's file extension ("JPEG"), if it has one. */
function photoFormat(url: string): string | null {
  try {
    const name = new URL(url, window.location.href).pathname.split("/").pop();
    const extension = /\.(\w+)$/.exec(name ?? "")?.[1]?.toUpperCase();
    if (!extension) {
      return null;
    }
    return extension === "JPG" ? "JPEG" : extension;
  } catch {
    return null;
  }
}

/** The image's details, under it in the preview. */
function ImagePreviewDetails(props: {
  state: Pick<SeedBibleState, "playlists" | "readingPlans">;
  photo: GalleryPhoto;
  size: { width: number; height: number } | null;
}) {
  const { state, photo, size } = props;
  const { t, language } = useI18n();
  const uploaded = formatUploadDateTime(photo.createdAtMs, language);
  const format = photoFormat(photo.url);
  const coverOf = useCoverTitles(state, photo.url);

  return (
    <dl className="sb-images-preview-details">
      {uploaded ? (
        <div>
          <dt>{t("image-details-uploaded", { defaultValue: "Uploaded" })}</dt>
          <dd>{uploaded}</dd>
        </div>
      ) : null}
      {size ? (
        <div>
          <dt>
            {t("image-details-dimensions", { defaultValue: "Dimensions" })}
          </dt>
          <dd>
            {t("image-details-dimensions-value", {
              width: size.width,
              height: size.height,
              defaultValue: "{{width}} × {{height}} px",
            })}
          </dd>
        </div>
      ) : null}
      {format ? (
        <div>
          <dt>{t("image-details-type", { defaultValue: "Type" })}</dt>
          <dd>{format}</dd>
        </div>
      ) : null}
      <div>
        <dt>{t("image-details-cover-of", { defaultValue: "Cover of" })}</dt>
        <dd>
          {coverOf.length > 0
            ? coverOf.join(", ")
            : t("image-details-not-a-cover", {
                defaultValue: "Not used as a cover",
              })}
        </dd>
      </div>
    </dl>
  );
}

function ImagePreviewModalContent(props: {
  state: Pick<SeedBibleState, "playlists" | "readingPlans">;
  photo: GalleryPhoto;
}) {
  const { t } = useI18n();
  // Read off the image once it has loaded, so it costs no extra request.
  const size = useSignal<{ width: number; height: number } | null>(null);
  return (
    <div className="sb-images-preview">
      <img
        className="sb-images-preview-img"
        src={props.photo.url}
        alt={t("uploaded-image", { defaultValue: "Uploaded image" })}
        onLoad={(event) => {
          const img = event.currentTarget as HTMLImageElement;
          if (img.naturalWidth > 0 && img.naturalHeight > 0) {
            size.value = { width: img.naturalWidth, height: img.naturalHeight };
          }
        }}
      />
      <ImagePreviewDetails
        state={props.state}
        photo={props.photo}
        size={size.value}
      />
    </div>
  );
}

/**
 * The preview's buttons. They're the modal's footer, outside its scrolling
 * area, so a tall image and its details can't push them out of view.
 */
function ImagePreviewActions(props: {
  os: Pick<CasualOSManager, "readFile">;
  photo: GalleryPhoto;
  onDelete: () => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const isDownloading = useSignal(false);
  return (
    <div className="sb-confirm-delete-actions">
      <button
        type="button"
        className="sb-session-settings-cancel sb-images-preview-download"
        disabled={isDownloading.value}
        onClick={async () => {
          isDownloading.value = true;
          try {
            await downloadPhoto(props.os, props.photo);
          } finally {
            isDownloading.value = false;
          }
        }}
      >
        <MaterialIcon aria-hidden="true">download</MaterialIcon>
        {t("download", { defaultValue: "Download" })}
      </button>
      <button
        type="button"
        className="sb-session-settings-cancel"
        onClick={props.onClose}
      >
        {t("close", { defaultValue: "Close" })}
      </button>
      <button
        type="button"
        className="sb-session-settings-end sb-delete-button"
        onClick={props.onDelete}
      >
        <MaterialIcon aria-hidden="true">delete</MaterialIcon>
        {t("delete", { defaultValue: "Delete" })}
      </button>
    </div>
  );
}

/**
 * Shows one image at full size with its details, and ways to download it and
 * to delete it from there.
 */
export function openImagePreview(
  modals: ModalManager,
  state: Pick<SeedBibleState, "os" | "playlists" | "readingPlans">,
  photo: GalleryPhoto,
  onDelete: () => void
): string {
  const modalId = `image-preview-${photo.id}`;
  modals.openModal({
    id: modalId,
    title: { key: "uploaded-image", defaultValue: "Uploaded image" },
    mobileSheet: true,
    content: () => <ImagePreviewModalContent state={state} photo={photo} />,
    footer: () => (
      <ImagePreviewActions
        os={state.os}
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

/** "Sunday, November 2, 2025 at 3:14 PM"; empty for no usable timestamp. */
function formatUploadDateTime(ms: number, language: string): string {
  if (!Number.isFinite(ms) || ms <= 0) {
    return "";
  }
  return new Date(ms).toLocaleString(language, {
    dateStyle: "full",
    timeStyle: "short",
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
              openImagePreview(modals, state, photo, () => requestDelete(photo))
            }
            aria-label={t("view-image", { defaultValue: "View image" })}
          >
            <img src={photo.url} alt="" loading="lazy" />
          </button>
          <span className="sb-images-date">
            {formatUploadDate(photo.createdAtMs, language)}
          </span>
        </li>
      ))}
    </ul>
  );
}
