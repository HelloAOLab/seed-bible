import "./CreatePlaylistForm.css";
import "../ProfilePictureModal/ProfilePictureModal.css";
import { useEffect, useRef, useState } from "preact/hooks";
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
import {
  PlaylistItemInput,
  type PlaylistItemInputHandle,
} from "../PlaylistItemInput/PlaylistItemInput";
import { openUnsavedItemConfirm } from "../PlaylistItemInput/unsavedItemConfirm";
import { playlistItemLabel } from "../playlistItemLabel";
import { PlaylistItemNoteTag } from "../PlaylistItemNoteTag/PlaylistItemNoteTag";
import { playlistItemIcon } from "../playlistItemIcon";
import { useDragReorder } from "../useDragReorder";
import { HeroImageField } from "../HeroImageField/HeroImageField";
import type { ScriptureChapterLoader } from "../PlaylistItemInlinePreview/PlaylistItemInlinePreview";
import type { BibleDataManager } from "../../managers/BibleDataManager";

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

/** Create-playlist screen shown inside the discover pane. */
export function CreatePlaylistForm(props: CreatePlaylistFormProps) {
  const { playlists, tabs, modals, bibleData, os, login, gallery } = props;
  const { t } = useI18n();
  const [saving, setSaving] = useState(false);
  // Index of the item open for editing inside its own row, or null when none
  // is. Only one item is open at a time; opening another closes it.
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  // The "Add item" box at the bottom of the list.
  const addInputRef = useRef<PlaylistItemInputHandle>(null);
  // The editor inside the open item's row.
  const editInputRef = useRef<PlaylistItemInputHandle>(null);

  // The playlist being edited is owned by the manager; edits update the signal.
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

  // The item currently open, resolved from its index. Null when none is open
  // or when the index no longer points at an item.
  const openItem =
    openIndex !== null ? (editing?.items[openIndex] ?? null) : null;

  // Resolve verse book IDs to full book names using the selected tab's loaded
  // translation, when available. Falls back to the raw book ID otherwise.
  const selectedTab =
    tabs.tabs.value.find((tab) => tab.id === tabs.selectedTabId.value) ?? null;
  const books = selectedTab?.readingState.translationBooks.value?.books ?? [];
  const resolveBookName = (bookId: string): string => {
    const book = books.find((b) => b.id === bookId);
    return book?.name ?? book?.commonName ?? bookId;
  };

  // Scripture without a pinned translation previews in the one being read.
  const loadChapter: ScriptureChapterLoader | undefined = bibleData
    ? async (translationId, bookId, chapter) => {
        const translation =
          translationId ?? selectedTab?.readingState.translationId.peek();
        if (!translation) {
          throw new Error("No translation to preview scripture in.");
        }
        return bibleData.getTranslationBookChapter(
          translation,
          bookId,
          chapter
        );
      }
    : undefined;

  const { getRowClassName, getHandleProps } = useDragReorder({
    itemCount: editing?.items.length ?? 0,
    onReorder: (from, to) => {
      playlists.reorderEditingPlaylistItem(from, to);
      // Keep the open item pointed at the same logical item, mirroring the
      // arithmetic `reorderQueue` already applies to `currentIndex`.
      setOpenIndex((current) => {
        if (current === null) return null;
        if (current === from) return to;
        if (from < current && to >= current) return current - 1;
        if (from > current && to <= current) return current + 1;
        return current;
      });
    },
  });

  /** Commits the open item's edits. Resolves to whether they were saved. */
  const saveOpenItem = async (): Promise<boolean> =>
    (await editInputRef.current?.commit()) ?? false;

  /**
   * Closes the open item, or opens `index` instead of it, asking first when
   * the open item has edits that haven't been saved. Saving an invalid edit
   * (say, an unknown reference) leaves the item open with its error showing.
   */
  const requestOpen = (index: number | null) => {
    if (index === openIndex) {
      return;
    }
    if (openIndex !== null && editInputRef.current?.isDirty()) {
      openUnsavedItemConfirm(modals, {
        kind: "edit",
        then: "close",
        onDiscard: () => setOpenIndex(index),
        onKeep: () => {
          void saveOpenItem().then((saved) => {
            if (saved) {
              setOpenIndex(index);
            }
          });
        },
      });
      return;
    }
    setOpenIndex(index);
  };

  const doSave = async () => {
    setSaving(true);
    try {
      await playlists.saveEditingPlaylist();
    } catch (error) {
      console.error("Failed to save playlist:", error);
      setSaving(false);
    }
  };

  const handleSave = () => {
    if (saving) {
      return;
    }
    // Either an open item's unsaved edits or a new item not yet added would
    // otherwise be silently lost by saving the playlist.
    const editDirty = openItem !== null && !!editInputRef.current?.isDirty();
    const addDirty = !!addInputRef.current?.isDirty();
    if (editDirty || addDirty) {
      const input = editDirty ? editInputRef : addInputRef;
      openUnsavedItemConfirm(modals, {
        kind: editDirty ? "edit" : "add",
        then: "save",
        onDiscard: () => void doSave(),
        onKeep: () => {
          void (async () => {
            const committed = await input.current?.commit();
            if (committed) {
              await doSave();
            }
            // If commit() failed (e.g. invalid input), leave the user in the
            // form with their draft and its inline error still visible.
          })();
        },
      });
      return;
    }
    void doSave();
  };

  return (
    <div className="sb-discover-pane">
      <DiscoverSection title={t("hero-image", { defaultValue: "Cover image" })}>
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
      </DiscoverSection>

      <DiscoverSection
        title={t("description", { defaultValue: "Description" })}
      >
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
      </DiscoverSection>

      <DiscoverSection title={t("items", { defaultValue: "Items" })}>
        {!editing?.items.length ? (
          <DiscoverEmpty
            text={t("playlist-items-empty", { defaultValue: "No items yet." })}
          />
        ) : (
          <ul className="sb-discover-list">
            {editing.items.map((item, index) => {
              const isOpen = index === openIndex;
              const editorId = `sb-playlist-item-editor-${index}`;
              return (
                <li
                  key={index}
                  className={
                    "sb-discover-item sb-discover-item--row sb-playlist-editor-item" +
                    (isOpen ? " sb-discover-item--editing" : "") +
                    getRowClassName(index)
                  }
                >
                  <button
                    type="button"
                    className="sb-discover-item-drag-handle"
                    aria-label={t("drag-to-reorder-playlist-item", {
                      defaultValue: "Drag to reorder",
                    })}
                    {...getHandleProps(index)}
                  >
                    <MaterialIcon>drag_indicator</MaterialIcon>
                  </button>
                  <button
                    type="button"
                    className="sb-discover-item-button"
                    aria-label={t("edit-playlist-item", {
                      defaultValue: "Edit item",
                    })}
                    aria-current={isOpen}
                    aria-expanded={isOpen}
                    aria-controls={isOpen ? editorId : undefined}
                    onClick={() => requestOpen(isOpen ? null : index)}
                  >
                    <MaterialIcon className="sb-discover-item-icon">
                      {playlistItemIcon(item)}
                    </MaterialIcon>
                    <span className="sb-discover-item-title" dir="auto">
                      {playlistItemLabel(item, t, resolveBookName)}
                      <PlaylistItemNoteTag item={item} showUntitled />
                    </span>
                    <MaterialIcon className="sb-discover-item-caret">
                      {isOpen ? "expand_less" : "expand_more"}
                    </MaterialIcon>
                  </button>
                  <button
                    type="button"
                    className="sb-discover-item-delete"
                    aria-label={t("remove-playlist-item", {
                      defaultValue: "Remove item",
                    })}
                    onClick={() => {
                      playlists.removeEditingPlaylistItem(index);
                      // Keep the open item pointed at the same item, or close
                      // the editor when the open item itself was removed.
                      setOpenIndex((current) => {
                        if (current === null) return null;
                        if (current === index) return null;
                        return current > index ? current - 1 : current;
                      });
                    }}
                  >
                    <MaterialIcon>delete</MaterialIcon>
                  </button>
                  {isOpen ? (
                    <PlaylistItemInput
                      ref={editInputRef}
                      // Remount when the open item changes so the sub-inputs
                      // seed fresh values from it.
                      key={`edit-${index}`}
                      id={editorId}
                      books={books}
                      onAdd={(added) => playlists.addEditingPlaylistItem(added)}
                      editItem={item}
                      editScriptureText={
                        item.type === "bible-verse"
                          ? playlistItemLabel(item, t, resolveBookName)
                          : undefined
                      }
                      loadChapter={loadChapter}
                      onUpdate={(updated) => {
                        playlists.updateEditingPlaylistItem(index, updated);
                        setOpenIndex(null);
                      }}
                      onCancelEdit={() => setOpenIndex(null)}
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </DiscoverSection>

      <PlaylistItemInput
        ref={addInputRef}
        books={books}
        onAdd={(item) => playlists.addEditingPlaylistItem(item)}
      />

      <div className="sb-discover-actions">
        <button
          type="button"
          className="sb-reading-plans-back"
          onClick={() =>
            requestCancelPlaylistEditor(
              playlists,
              modals,
              (addInputRef.current?.isDirty() ?? false) ||
                (openItem !== null &&
                  (editInputRef.current?.isDirty() ?? false))
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
