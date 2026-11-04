import "./playlistEditorFields.css";
import "../ProfilePictureModal/ProfilePictureModal.css";
import { useEffect } from "preact/hooks";
import { useI18n } from "../../i18n/I18nManager";
import type { PlaylistManager } from "../../managers/PlaylistManager";
import type { ModalManager } from "../../managers/ModalManager";
import type { CasualOSManager } from "../../managers/OsManager";
import type { LoginManager } from "../../managers/LoginManager";
import {
  uploadPhotoToGallery,
  type UserGalleryManager,
} from "../../managers/UserGalleryManager";
import { HeroImageField } from "../HeroImageField/HeroImageField";

const UNSAVED_CHANGES_CONFIRM_MODAL_ID = "playlist-unsaved-changes-confirm";

function UnsavedChangesConfirmModalContent(props: {
  onConfirm: () => void;
  onGoBack: () => void;
  onSaveAndExit: () => void;
}) {
  const { onConfirm, onGoBack, onSaveAndExit } = props;
  const { t } = useI18n();

  return (
    <div className="sb-confirm-delete">
      <p className="sb-confirm-delete-message">
        {t("unsaved-changes-message", {
          defaultValue: "You have unsaved changes. What would you like to do?",
        })}
      </p>
      <div className="sb-confirm-delete-actions sb-unsaved-changes-actions">
        <button
          type="button"
          className="sb-photo-modal-button"
          onClick={onConfirm}
        >
          {t("confirm", { defaultValue: "Confirm" })}
        </button>
        <button
          type="button"
          className="sb-photo-modal-button"
          onClick={onGoBack}
        >
          {t("go-back", { defaultValue: "Go back" })}
        </button>
        <button
          type="button"
          className="sb-photo-modal-button sb-photo-modal-button-primary"
          onClick={onSaveAndExit}
        >
          {t("save-and-exit", { defaultValue: "Save & exit" })}
        </button>
      </div>
    </div>
  );
}

/**
 * Leaves the playlist editor. If the name, description, cover, items, or an
 * open step's edits changed, asks first instead of discarding; `onStay` runs
 * when the author goes back to editing or dismisses the prompt.
 */
export function requestCancelPlaylistEditor(
  playlists: PlaylistManager,
  modals: ModalManager,
  extraDirty = false,
  options: { onStay?: () => void } = {}
): void {
  if (!playlists.isEditingPlaylistDirty() && !extraDirty) {
    playlists.cancelEditingPlaylist();
    return;
  }
  modals.openModal({
    id: UNSAVED_CHANGES_CONFIRM_MODAL_ID,
    title: {
      key: "unsaved-changes",
      defaultValue: "Unsaved changes",
    },
    onDismiss: options.onStay,
    content: () => (
      <UnsavedChangesConfirmModalContent
        onConfirm={() => {
          modals.closeModal(UNSAVED_CHANGES_CONFIRM_MODAL_ID);
          playlists.cancelEditingPlaylist();
        }}
        onGoBack={() => {
          modals.closeModal(UNSAVED_CHANGES_CONFIRM_MODAL_ID);
          options.onStay?.();
        }}
        onSaveAndExit={() => {
          modals.closeModal(UNSAVED_CHANGES_CONFIRM_MODAL_ID);
          void playlists.saveEditingPlaylist();
        }}
      />
    ),
  });
}

/**
 * The cover image field. Remembers a cover the draft already has in the
 * gallery so the picker can show it.
 */
export function PlaylistCoverField(props: {
  playlists: PlaylistManager;
  modals: ModalManager;
  os?: Pick<CasualOSManager, "recordFile" | "recordData">;
  login?: Pick<LoginManager, "userId">;
  gallery?: Pick<UserGalleryManager, "photos" | "savePhoto" | "rememberPhoto">;
}) {
  const { playlists, modals, os, login, gallery } = props;
  const editing = playlists.editingPlaylist.value;

  useEffect(() => {
    const url = editing?.heroImageUrl;
    if (!url || !gallery) {
      return;
    }
    if (gallery.photos.peek().some((photo) => photo.url === url)) {
      return;
    }
    void gallery.rememberPhoto?.(url);
  }, [editing?.heroImageUrl, gallery]);

  return (
    <HeroImageField
      imageUrl={editing?.heroImageUrl}
      modals={modals}
      gallery={gallery}
      photos={gallery?.photos}
      onUpload={async (file) => {
        const url = await uploadPhotoToGallery(file, {
          gallery,
          os,
          userId: login?.userId.value,
          fallbackUpload: playlists.uploadHeroImage,
        });
        playlists.updateEditingPlaylistMetadata({ heroImageUrl: url });
        return url;
      }}
      onSelectPhoto={(url) => {
        playlists.updateEditingPlaylistMetadata({ heroImageUrl: url });
        void gallery?.rememberPhoto(url);
      }}
      onRemove={() =>
        playlists.updateEditingPlaylistMetadata({ heroImageUrl: null })
      }
    />
  );
}

/** The playlist's title field. */
export function PlaylistTitleField(props: {
  playlists: PlaylistManager;
  className?: string;
  autoFocus?: boolean;
}) {
  const { playlists, className, autoFocus } = props;
  const { t } = useI18n();
  const editing = playlists.editingPlaylist.value;
  return (
    <input
      className={className}
      type="text"
      value={editing?.title ?? ""}
      dir="auto"
      autoFocus={autoFocus}
      aria-label={t("playlist-title_placeholder", {
        defaultValue: "Playlist title",
      })}
      placeholder={t("playlist-title_placeholder", {
        defaultValue: "Playlist title",
      })}
      onInput={(event: Event) => {
        const value = (event.currentTarget as HTMLInputElement).value;
        playlists.updateEditingPlaylistMetadata({
          title: value.trim() ? value : null,
        });
      }}
    />
  );
}

/** The playlist's description field. */
export function PlaylistDescriptionField(props: {
  playlists: PlaylistManager;
  className?: string;
  rows?: number;
}) {
  const { playlists, className, rows = 3 } = props;
  const { t } = useI18n();
  const editing = playlists.editingPlaylist.value;
  return (
    <textarea
      className={
        className ??
        "sb-settings-text-input sb-playlist-input sb-playlist-description-input"
      }
      rows={rows}
      value={editing?.description ?? ""}
      dir="auto"
      onInput={(event: Event) => {
        const value = (event.currentTarget as HTMLTextAreaElement).value;
        playlists.updateEditingPlaylistMetadata({
          description: value.trim() ? value : null,
        });
      }}
      placeholder={t("playlist-description_placeholder", {
        defaultValue: "What is this playlist about?",
      })}
      aria-label={t("description", { defaultValue: "Description" })}
    />
  );
}
