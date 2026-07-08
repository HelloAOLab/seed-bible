import "./CreatePlaylistForm.css";
import { useState } from "preact/hooks";
import { useI18n } from "../../i18n/I18nManager";
import type { TabsManager } from "../../managers/TabsManager";
import type { PlaylistManager } from "../../managers/PlaylistManager";
import { MaterialIcon } from "../icons";
import {
  DiscoverSection,
  DiscoverEmpty,
} from "../DiscoverPane/DiscoverSection";
import { PlaylistItemInput } from "../PlaylistItemInput/PlaylistItemInput";
import { playlistItemLabel } from "../playlistItemLabel";

interface CreatePlaylistFormProps {
  playlists: PlaylistManager;
  tabs: TabsManager;
}

/** Create-playlist screen shown inside the discover pane. */
export function CreatePlaylistForm(props: CreatePlaylistFormProps) {
  const { playlists, tabs } = props;
  const { t } = useI18n();
  const [saving, setSaving] = useState(false);
  // Index of the item currently open for editing in the input section below, or
  // null when the section is adding a new item.
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // The playlist being edited is owned by the manager; edits update the signal.
  const editing = playlists.editingPlaylist.value;

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

  const handleSave = async () => {
    if (saving) {
      return;
    }
    setSaving(true);
    try {
      await playlists.saveEditingPlaylist();
    } catch (error) {
      console.error("Failed to save playlist:", error);
      setSaving(false);
    }
  };

  return (
    <div className="sb-discover-pane">
      <div className="sb-discover-header">
        <button
          type="button"
          className="sb-reading-plans-back"
          aria-label={t("back", { defaultValue: "Back" })}
          onClick={() => playlists.cancelEditingPlaylist()}
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
            if (editing) {
              playlists.editingPlaylist.value = {
                ...editing,
                title: value.trim() ? value : null,
              };
            }
          }}
          placeholder={t("playlist-title_placeholder", {
            defaultValue: "Playlist title",
          })}
        />
      </div>

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
                  "sb-discover-item sb-discover-item--row" +
                  (index === editingIndex ? " sb-discover-item--editing" : "")
                }
              >
                <button
                  type="button"
                  className="sb-discover-item-button"
                  aria-label={t("edit-playlist-item", {
                    defaultValue: "Edit item",
                  })}
                  aria-current={index === editingIndex}
                  onClick={() => setEditingIndex(index)}
                >
                  <span className="sb-discover-item-title" dir="auto">
                    {playlistItemLabel(item, t, resolveBookName)}
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
              </li>
            ))}
          </ul>
        )}
      </DiscoverSection>

      <PlaylistItemInput
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

      <div>
        <button
          type="button"
          className="sb-reading-plans-back"
          onClick={() => playlists.cancelEditingPlaylist()}
        >
          {t("cancel", { defaultValue: "Cancel" })}
        </button>
        <button
          type="button"
          className="sb-settings-save-button"
          onClick={() => void handleSave()}
          disabled={saving}
        >
          {t("save", { defaultValue: "Save" })}
        </button>
      </div>
    </div>
  );
}
