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
import { DiscoverSection, DiscoverEmpty } from "../Discover/DiscoverSection";
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
import {
  PlaylistItemInlinePreview,
  type ScriptureChapterLoader,
} from "../PlaylistItemInlinePreview/PlaylistItemInlinePreview";
import type { BibleDataManager } from "../../managers/BibleDataManager";
import type { ChatsManager } from "../../managers/ChatsManager";
import { translateTitle } from "../../app/utils";
import { v4 as uuid } from "uuid";
import {
  ContextMenuWithButton,
  ContextMenuItem,
} from "../ContextMenu/ContextMenu";
import { DiscoverPanelLayout } from "../Discover/DiscoverPanelHeader";

interface CreatePlaylistFormProps {
  playlists: PlaylistManager;
  tabs: TabsManager;
  modals: ModalManager;
  chats: ChatsManager;
  openChatPanel: () => void;
  onClose: () => void;
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
 * Leaves the playlist editor. If the name, description, cover, items, or an
 * in-progress add-item draft changed, asks first instead of discarding.
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
 * The form's header title: a back button, the playlist title as an editable
 * input, and an AI button when an agent that can call tools is installed.
 */
function CreatePlaylistTitle(props: {
  playlists: PlaylistManager;
  modals: ModalManager;
  chats: ChatsManager;
  openChatPanel: () => void;
  isItemDraftDirty: () => boolean;
}) {
  const { playlists, modals, chats, openChatPanel, isItemDraftDirty } = props;
  const { t } = useI18n();
  const editing = playlists.editingPlaylist.value;
  const providers = chats.providers.value.filter((p) => p.supportsToolCalling);
  const singleProvider = providers.length === 1 ? providers[0] : undefined;

  // Opens the chat panel on a fresh local chat, seeded with a prompt
  // message inviting the user to describe what they want changed, with
  // the given AI provider already added as a participant.
  // `PlaylistManager` already exposes the playlist-editing tools to every
  // chat while a playlist is being edited, so replying here lets the AI
  // add/update/remove items and edit the title/description.
  const startAiChat = (providerId: string) => {
    let chat = chats.chats.value.find(
      (c) =>
        c.participants.value.every((p) => !p.isRemote) &&
        c.participants.value.some((p) => p.isAI && p.providerId === providerId)
    );
    if (!chat) {
      chat = chats.createLocalSession({
        messages: [
          {
            id: uuid(),
            authors: [providerId],
            timeMs: Date.now(),
            targets: [],
            type: "text",
            text: t("ai-playlist-chat-prompt", {
              defaultValue: "What do you want to add/change?",
            }),
          },
        ],
        providerIds: [],
      });
    }
    chat.addParticipant(providerId);
    chats.selectChat(chat.id);
    openChatPanel();
  };
  const aiButtonLabel = t("ai", { defaultValue: "AI" });
  const aiButtonAriaLabel = t("ai-edit-playlist", {
    defaultValue: "Edit playlist with AI",
  });

  return (
    <div className="sb-discover-title-row">
      <button
        type="button"
        className="sb-reading-plans-back"
        aria-label={t("back", { defaultValue: "Back" })}
        onClick={() =>
          requestCancelPlaylistEditor(playlists, modals, isItemDraftDirty())
        }
      >
        <MaterialIcon>arrow_back</MaterialIcon>
      </button>
      <input
        className="sb-settings-text-input sb-playlist-input"
        type="text"
        value={editing?.title ?? ""}
        dir="auto"
        onInput={(event: Event) => {
          const value = (event.currentTarget as HTMLInputElement).value;
          playlists.updateEditingPlaylistMetadata({
            title: value.trim() ? value : null,
          });
        }}
        placeholder={t("playlist-title_placeholder", {
          defaultValue: "Playlist title",
        })}
      />
      {providers.length > 1 ? (
        // Multiple providers: let the user pick which one starts the chat.
        <ContextMenuWithButton
          buttonClassName="sb-discover-title-ai"
          aria-label={aiButtonAriaLabel}
          title={aiButtonLabel}
          icon={<MaterialIcon>auto_awesome</MaterialIcon>}
        >
          {providers.map((provider) => (
            <ContextMenuItem
              key={provider.id}
              onClick={() => startAiChat(provider.id)}
            >
              {translateTitle(t, provider.name)}
            </ContextMenuItem>
          ))}
        </ContextMenuWithButton>
      ) : (
        singleProvider && (
          <button
            type="button"
            className="sb-discover-title-ai"
            aria-label={aiButtonAriaLabel}
            title={aiButtonLabel}
            onClick={() => startAiChat(singleProvider.id)}
          >
            <MaterialIcon>auto_awesome</MaterialIcon>
          </button>
        )
      )}
    </div>
  );
}

/** Create-playlist screen shown inside the discover pane. */
export function CreatePlaylistForm(props: CreatePlaylistFormProps) {
  const {
    playlists,
    tabs,
    modals,
    chats,
    openChatPanel,
    onClose,
    bibleData,
    os,
    login,
    gallery,
  } = props;
  const { t } = useI18n();
  const [saving, setSaving] = useState(false);
  // Index of the item currently open for editing in the input section below, or
  // null when the section is adding a new item.
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const inputRef = useRef<PlaylistItemInputHandle>(null);
  // Index of the item whose preview is expanded beneath it, if any. Only one
  // is open at a time.
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

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

  // The item currently open for editing, resolved from the selected index. Null
  // when adding a new item or when the index no longer points at an item.
  const editingItem =
    editingIndex !== null ? (editing?.items[editingIndex] ?? null) : null;

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
      setExpandedIndex(null);
      // Keep the edit target pointed at the same logical item, mirroring the
      // arithmetic `reorderQueue` already applies to `currentIndex`.
      setEditingIndex((current) => {
        if (current === null) return null;
        if (current === from) return to;
        if (from < current && to >= current) return current - 1;
        if (from > current && to <= current) return current + 1;
        return current;
      });
    },
  });

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
    // Covers both a new item not yet added and changes to an item opened for
    // editing but not yet saved — either would otherwise be silently lost.
    if (inputRef.current?.isDirty()) {
      openUnsavedItemConfirm(
        modals,
        editingIndex !== null,
        () => void doSave(),
        () => {
          void (async () => {
            const added = await inputRef.current?.commit();
            if (added) {
              await doSave();
            }
            // If commit() failed (e.g. invalid input), leave the user in the
            // form with their draft and its inline error still visible.
          })();
        }
      );
      return;
    }
    void doSave();
  };

  return (
    <DiscoverPanelLayout
      title={
        <CreatePlaylistTitle
          playlists={playlists}
          modals={modals}
          chats={chats}
          openChatPanel={openChatPanel}
          isItemDraftDirty={() => inputRef.current?.isDirty() ?? false}
        />
      }
      onClose={onClose}
    >
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
            {editing.items.map((item, index) => (
              <li
                key={index}
                className={
                  "sb-discover-item sb-discover-item--row sb-playlist-editor-item" +
                  (index === editingIndex ? " sb-discover-item--editing" : "") +
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
                  aria-current={index === editingIndex}
                  aria-expanded={index === expandedIndex}
                  onClick={() => {
                    setEditingIndex(index);
                    setExpandedIndex((current) =>
                      current === index ? null : index
                    );
                  }}
                >
                  <MaterialIcon className="sb-discover-item-icon">
                    {playlistItemIcon(item)}
                  </MaterialIcon>
                  <span className="sb-discover-item-title" dir="auto">
                    {playlistItemLabel(item, t, resolveBookName)}
                    <PlaylistItemNoteTag item={item} showUntitled />
                  </span>
                </button>
                <button
                  type="button"
                  className="sb-discover-item-delete"
                  aria-label={t("remove-playlist-item", {
                    defaultValue: "Remove item",
                  })}
                  onClick={() => {
                    playlists.removeEditingPlaylistItem(index);
                    setExpandedIndex(null);
                    // Keep the edit target pointed at the same item, or drop out
                    // of editing when the edited item itself was removed.
                    setEditingIndex((current) => {
                      if (current === null) return null;
                      if (current === index) return null;
                      return current > index ? current - 1 : current;
                    });
                  }}
                >
                  <MaterialIcon>delete</MaterialIcon>
                </button>
                {index === expandedIndex ? (
                  <PlaylistItemInlinePreview
                    item={item}
                    loadChapter={loadChapter}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </DiscoverSection>

      <PlaylistItemInput
        ref={inputRef}
        // Remount when the edit target changes so the sub-inputs seed fresh
        // values from the newly-selected item (or reset for adding).
        key={editingItem ? `edit-${editingIndex}` : "add"}
        books={books}
        onAdd={(item) => playlists.addEditingPlaylistItem(item)}
        editItem={editingItem ?? undefined}
        editScriptureText={
          editingItem?.type === "bible-verse"
            ? playlistItemLabel(editingItem, t, resolveBookName)
            : undefined
        }
        onUpdate={(item) => {
          if (editingIndex !== null) {
            playlists.updateEditingPlaylistItem(editingIndex, item);
          }
          setEditingIndex(null);
        }}
        onCancelEdit={() => setEditingIndex(null)}
      />

      <div className="sb-discover-actions">
        <button
          type="button"
          className="sb-reading-plans-back"
          onClick={() =>
            requestCancelPlaylistEditor(
              playlists,
              modals,
              inputRef.current?.isDirty() ?? false
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
    </DiscoverPanelLayout>
  );
}
