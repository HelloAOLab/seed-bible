import { useState } from "preact/hooks";
import { useI18n } from "../i18n/I18nManager";
import type { TabsManager } from "../managers/TabsManager";
import type { Playlist, PlaylistManager } from "../managers/PlaylistManager";
import { MaterialIcon } from "./icons";
import { DiscoverSection, DiscoverEmpty } from "./DiscoverSection";

interface CreatePlaylistFormProps {
  playlists: PlaylistManager;
  tabs: TabsManager;
}

/** Create-playlist screen shown inside the discover pane. */
export function CreatePlaylistForm(props: CreatePlaylistFormProps) {
  const { playlists, tabs } = props;
  const { t } = useI18n();
  const [saving, setSaving] = useState(false);

  // The playlist being edited is owned by the manager; edits update the signal.
  const editing = playlists.editingPlaylist.value;

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
        <MaterialIcon className="sb-discover-title-icon">explore</MaterialIcon>
        <input
          className="sb-discover-title-input"
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
                className="sb-discover-item sb-discover-item--row"
              >
                <span className="sb-discover-item-title">
                  {playlistItemLabel(item, t, resolveBookName)}
                </span>
                <button
                  type="button"
                  className="sb-discover-item-delete"
                  aria-label={t("remove-playlist-item", {
                    defaultValue: "Remove item",
                  })}
                  onClick={() => playlists.removeEditingPlaylistItem(index)}
                >
                  <MaterialIcon>delete</MaterialIcon>
                </button>
              </li>
            ))}
          </ul>
        )}
      </DiscoverSection>

      <div className="sb-settings-actions">
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

/** Renders a single playlist item as a plain-text label for the editor list. */
function playlistItemLabel(
  item: Playlist["items"][number],
  t: ReturnType<typeof useI18n>["t"],
  resolveBookName: (bookId: string) => string
): string {
  switch (item.type) {
    case "bible-verse": {
      const { bookId, chapter, verse, endVerse } = item.ref;
      const book = resolveBookName(bookId);
      return endVerse
        ? `${book} ${chapter}:${verse}-${endVerse}`
        : `${book} ${chapter}:${verse}`;
    }
    case "link":
      return item.url;
    case "html":
      return t("playlist-item-html", { defaultValue: "HTML snippet" });
  }
}
