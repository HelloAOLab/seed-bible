import "./CreatePlaylistForm.css";
import "../ProfilePictureModal/ProfilePictureModal.css";
import { useEffect } from "preact/hooks";
import { useI18n } from "../../i18n/I18nManager";
import type { TabsManager } from "../../managers/TabsManager";
import type { PlaylistManager } from "../../managers/PlaylistManager";
import type { ModalManager } from "../../managers/ModalManager";
import type { CasualOSManager } from "../../managers/OsManager";
import type { LoginManager } from "../../managers/LoginManager";
import {
  uploadPhotoToGallery,
  type UserGalleryManager,
} from "../../managers/UserGalleryManager";
import { MaterialIcon } from "../icons";
import {
  DiscoverSection,
  DiscoverEmpty,
} from "../DiscoverPane/DiscoverSection";
import { PlaylistItemInput } from "../PlaylistItemInput/PlaylistItemInput";
import { playlistItemLabel } from "../playlistItemLabel";
import { HeroImageField } from "../HeroImageField/HeroImageField";
import type { BibleDataManager } from "../../managers/BibleDataManager";
import { usePlaylistEditor } from "../PlaylistEditor/usePlaylistEditor";
import { PlaylistEditorStepList } from "../PlaylistEditor/PlaylistEditorStepList";

interface CreatePlaylistFormProps {
  playlists: PlaylistManager;
  tabs: TabsManager;
  modals: ModalManager;
  /** Loads chapter text for the inline scripture previews. */
  bibleData?: Pick<BibleDataManager, "getTranslationBookChapter">;
  os?: Pick<CasualOSManager, "recordFile" | "recordData">;
  login?: Pick<LoginManager, "userId">;
  gallery?: Pick<UserGalleryManager, "photos" | "savePhoto" | "rememberPhoto">;
}

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
 * Leaves the playlist editor. If the name, description, cover, items, an
 * in-progress add-item draft, or an open item's edits changed, asks first
 * instead of discarding.
 */
export function requestCancelPlaylistEditor(
  playlists: PlaylistManager,
  modals: ModalManager,
  extraDirty = false
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
    content: () => (
      <UnsavedChangesConfirmModalContent
        onConfirm={() => {
          modals.closeModal(UNSAVED_CHANGES_CONFIRM_MODAL_ID);
          playlists.cancelEditingPlaylist();
        }}
        onGoBack={() => modals.closeModal(UNSAVED_CHANGES_CONFIRM_MODAL_ID)}
        onSaveAndExit={() => {
          modals.closeModal(UNSAVED_CHANGES_CONFIRM_MODAL_ID);
          void playlists.saveEditingPlaylist();
        }}
      />
    ),
  });
}

/**
 * The cover image field, shared by both editor layouts. Remembers a cover the
 * draft already has in the gallery so the picker can show it.
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

/** The description field, shared by both editor layouts. */
export function PlaylistDescriptionField(props: {
  playlists: PlaylistManager;
}) {
  const { playlists } = props;
  const { t } = useI18n();
  const editing = playlists.editingPlaylist.value;
  return (
    <textarea
      className="sb-settings-text-input sb-playlist-input sb-playlist-description-input"
      rows={3}
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

/**
 * Create-playlist screen shown inside the discover pane: one column, with
 * each step's editor opening inside its own row. Phones get this layout;
 * wider screens get `PlaylistEditorScreen`.
 */
export function CreatePlaylistForm(props: CreatePlaylistFormProps) {
  const { playlists, tabs, modals, bibleData, os, login, gallery } = props;
  const { t } = useI18n();
  const editor = usePlaylistEditor({ playlists, tabs, modals, bibleData });
  const {
    editing,
    saving,
    addOpen,
    setAddOpen,
    addInputRef,
    editInputRef,
    books,
    resolveBookName,
    loadChapter,
    setOpenIndex,
    requestCloseAdd,
    stepCount,
    stepLinkTargets,
    addScene,
    handleSave,
    hasUnsavedItemInput,
  } = editor;

  return (
    <div className="sb-discover-pane">
      <DiscoverSection title={t("hero-image", { defaultValue: "Cover image" })}>
        <PlaylistCoverField
          playlists={playlists}
          modals={modals}
          os={os}
          login={login}
          gallery={gallery}
        />
      </DiscoverSection>

      <DiscoverSection
        title={t("description", { defaultValue: "Description" })}
      >
        <PlaylistDescriptionField playlists={playlists} />
      </DiscoverSection>

      <DiscoverSection
        title={t("items", { defaultValue: "Items" })}
        count={stepCount || undefined}
      >
        {!editing?.items.length ? (
          <DiscoverEmpty
            text={t("playlist-items-empty", { defaultValue: "No items yet." })}
          />
        ) : (
          <PlaylistEditorStepList
            editor={editor}
            renderEditor={(item, index) => (
              <PlaylistItemInput
                ref={editInputRef}
                // Remount when the open item changes so the sub-inputs
                // seed fresh values from it.
                key={`edit-${index}`}
                id={`sb-playlist-item-editor-${index}`}
                books={books}
                onAdd={(added) => playlists.addEditingPlaylistItem(added)}
                editItem={item}
                editScriptureText={
                  item.type === "bible-verse"
                    ? playlistItemLabel(item, t, resolveBookName)
                    : undefined
                }
                loadChapter={loadChapter}
                steps={stepLinkTargets}
                onUpdate={(updated) => {
                  playlists.updateEditingPlaylistItem(index, updated);
                  setOpenIndex(null);
                }}
                onCancelEdit={() => setOpenIndex(null)}
              />
            )}
          />
        )}
      </DiscoverSection>

      {addOpen ? (
        <>
          <PlaylistItemInput
            ref={addInputRef}
            books={books}
            steps={stepLinkTargets}
            onAdd={(item) => playlists.addEditingPlaylistItem(item)}
          />
          <button
            type="button"
            className="sb-reading-plans-back sb-playlist-add-done"
            onClick={requestCloseAdd}
          >
            {t("done", { defaultValue: "Done" })}
          </button>
        </>
      ) : (
        <button
          type="button"
          className="sb-playlist-add-toggle"
          onClick={() => setAddOpen(true)}
        >
          <MaterialIcon>add</MaterialIcon>
          {t("playlist-add-item", { defaultValue: "Add item" })}
        </button>
      )}
      <button
        type="button"
        className="sb-playlist-add-scene"
        onClick={addScene}
      >
        <MaterialIcon>add</MaterialIcon>
        {t("playlist-add-scene", { defaultValue: "Add scene" })}
      </button>

      <div className="sb-discover-actions">
        <button
          type="button"
          className="sb-reading-plans-back"
          onClick={() =>
            requestCancelPlaylistEditor(
              playlists,
              modals,
              hasUnsavedItemInput()
            )
          }
        >
          {t("cancel", { defaultValue: "Cancel" })}
        </button>
        <button
          type="button"
          className="sb-settings-save-button"
          onClick={handleSave}
          disabled={saving}
        >
          {saving
            ? t("saving", { defaultValue: "Saving…" })
            : t("save", { defaultValue: "Save" })}
        </button>
      </div>
    </div>
  );
}
