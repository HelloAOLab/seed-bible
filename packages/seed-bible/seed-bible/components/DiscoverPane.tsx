import type { ComponentChildren } from "preact";
import { useState } from "preact/hooks";
import { useI18n } from "../i18n/I18nManager";
import type { TabsManager, ReaderTab } from "../managers/TabsManager";
import type { Playlist, PlaylistManager } from "../managers/PlaylistManager";
import type { DiscoverReference } from "../managers/DiscoverManager";
import type { TranslationBook } from "../managers/FreeUseBibleAPI";
import { MaterialIcon } from "./icons";

interface DiscoverPaneProps {
  tabs: TabsManager;
  playlists: PlaylistManager;
}

type ReferenceWithBookData = DiscoverReference & { bookData: TranslationBook };

/**
 * Pane content for the "Discover" tool. Shows the user's authored playlists plus
 * discovered cross references, study notes, and content for the currently
 * selected reader tab. Annotations are a placeholder for now (display-only).
 */
export function DiscoverPane(props: DiscoverPaneProps) {
  const { tabs, playlists } = props;
  const { t } = useI18n();
  const { view } = playlists;

  if (view.value === "create_playlist") {
    return <CreatePlaylistForm playlists={playlists} tabs={tabs} />;
  }

  // Reading `.value` during render subscribes the component to updates.
  const userPlaylists = playlists.userPlaylists.value;
  const selectedTab =
    tabs.tabs.value.find((tab) => tab.id === tabs.selectedTabId.value) ?? null;
  const currentChapterData =
    selectedTab?.readingState.chapterData.value ?? null;

  return (
    <div className="sb-discover-pane">
      <div className="sb-discover-header">
        <MaterialIcon className="sb-discover-title-icon">explore</MaterialIcon>
        <h2 className="sb-discover-title">
          {currentChapterData
            ? t("discover-book-chapter", {
                book: currentChapterData.book.name,
                chapter: currentChapterData.chapter.number,
                defaultValue: "Discover {{book}} {{chapter}}",
              })
            : t("discover", { defaultValue: "Discover" })}
        </h2>
        <span className="spacer" />
        <button
          type="button"
          className="sb-discover-create"
          onClick={() => playlists.createNewPlaylist()}
        >
          + {t("create-playlist", { defaultValue: "Create" })}
        </button>
      </div>

      <DiscoverSection title={t("playlists", { defaultValue: "Playlists" })}>
        {userPlaylists.length === 0 ? (
          <DiscoverEmpty
            text={t("discover-playlists-empty", {
              defaultValue: "You haven't created any playlists yet.",
            })}
          />
        ) : (
          <ul className="sb-discover-list">
            {userPlaylists.map((playlist) => (
              <li
                key={playlist.id}
                className="sb-discover-item sb-discover-item--row"
                dir="auto"
              >
                <div className="sb-discover-item-main">
                  <span className="sb-discover-item-title">
                    {playlist.title ??
                      t("untitled-playlist", {
                        defaultValue: "Untitled playlist",
                      })}
                  </span>
                  {playlist.description ? (
                    <span className="sb-discover-item-description">
                      {playlist.description}
                    </span>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="sb-discover-item-edit"
                  aria-label={t("edit-playlist", {
                    defaultValue: "Edit playlist",
                  })}
                  onClick={() => playlists.editPlaylist(playlist)}
                >
                  <MaterialIcon>edit</MaterialIcon>
                </button>
              </li>
            ))}
          </ul>
        )}
      </DiscoverSection>

      <DiscoverSection
        title={t("annotations", { defaultValue: "Annotations" })}
      >
        <DiscoverEmpty
          text={t("discover-annotations-empty", {
            defaultValue: "You have no annotations",
          })}
        />
      </DiscoverSection>

      <CrossReferencesSection tab={selectedTab} />
      <StudyNotesSection tab={selectedTab} />
      <ContentSection tab={selectedTab} />
    </div>
  );
}

interface CreatePlaylistFormProps {
  playlists: PlaylistManager;
  tabs: TabsManager;
}

/** Create-playlist screen shown inside the discover pane. */
function CreatePlaylistForm(props: CreatePlaylistFormProps) {
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

function CrossReferencesSection(props: { tab: ReaderTab | null }) {
  const { tab } = props;
  const { t } = useI18n();
  const title = t("cross-references", { defaultValue: "Cross references" });

  if (!tab) {
    return <DiscoverSection title={title}>{noTabHint(t)}</DiscoverSection>;
  }

  const groups = tab.readingState.discoveredCrossReferences.value;
  const results = groups.flatMap((group) => group.results);

  if (results.length <= 0) {
    return null; // Don't show the section at all if there are no results, since this is a "discover" feature and we don't want to show empty sections for chapters that have no cross references.
  }

  return (
    <DiscoverSection title={title}>
      {results.length === 0 ? (
        <DiscoverEmpty
          text={t("discover-cross-references-empty", {
            defaultValue: "No cross references for this chapter.",
          })}
        />
      ) : (
        <ul className="sb-discover-list">
          {results.map((result, index) => (
            <li key={index} className="sb-discover-item">
              <span className="sb-discover-item-title">
                {formatRef(result.crossReference)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </DiscoverSection>
  );
}

function StudyNotesSection(props: { tab: ReaderTab | null }) {
  const { tab } = props;
  const { t } = useI18n();
  const title = t("study-notes", { defaultValue: "Study notes" });

  if (!tab) {
    return <DiscoverSection title={title}>{noTabHint(t)}</DiscoverSection>;
  }

  const groups = tab.readingState.discoveredStudyNotes.value;
  const results = groups.flatMap((group) => group.results);

  if (results.length <= 0) {
    return null; // Don't show the section at all if there are no results, since this is a "discover" feature and we don't want to show empty sections for chapters that have no cross references.
  }

  return (
    <DiscoverSection title={title}>
      {results.length === 0 ? (
        <DiscoverEmpty
          text={t("discover-study-notes-empty", {
            defaultValue: "No study notes for this chapter.",
          })}
        />
      ) : (
        <ul className="sb-discover-list">
          {results.map((result, index) => (
            <li key={index} className="sb-discover-item">
              <span className="sb-discover-item-title">
                {formatRef(result.reference)}
              </span>
              <div className="sb-discover-item-content">{result.content}</div>
            </li>
          ))}
        </ul>
      )}
    </DiscoverSection>
  );
}

function ContentSection(props: { tab: ReaderTab | null }) {
  const { tab } = props;
  const { t } = useI18n();
  const title = t("content", { defaultValue: "Content" });

  if (!tab) {
    return <DiscoverSection title={title}>{noTabHint(t)}</DiscoverSection>;
  }

  const groups = tab.readingState.discoveredContent.value;
  const results = groups.flatMap((group) => group.results);

  if (results.length <= 0) {
    return null; // Don't show the section at all if there are no results, since this is a "discover" feature and we don't want to show empty sections for chapters that have no cross references.
  }

  return (
    <DiscoverSection title={title}>
      {results.length === 0 ? (
        <DiscoverEmpty
          text={t("discover-content-empty", {
            defaultValue: "No content for this chapter.",
          })}
        />
      ) : (
        <ul className="sb-discover-list">
          {results.map((result, index) => (
            <li key={index} className="sb-discover-item">
              <span className="sb-discover-item-title">{result.title}</span>
              {result.description ? (
                <span className="sb-discover-item-description">
                  {result.description}
                </span>
              ) : null}
              <div className="sb-discover-item-content">{result.content}</div>
            </li>
          ))}
        </ul>
      )}
    </DiscoverSection>
  );
}

function DiscoverSection(props: {
  title: string;
  children: ComponentChildren;
}) {
  return (
    <section className="sb-discover-section">
      <h3 className="sb-discover-section-title">{props.title}</h3>
      {props.children}
    </section>
  );
}

function DiscoverEmpty(props: { text: string }) {
  return <div className="sb-discover-empty">{props.text}</div>;
}

function noTabHint(t: ReturnType<typeof useI18n>["t"]) {
  return (
    <DiscoverEmpty
      text={t("discover-select-tab", {
        defaultValue: "Select a tab to discover related material.",
      })}
    />
  );
}

/** Formats a discovered reference into a human-readable label (e.g. "Genesis 1:1"). */
function formatRef(ref: ReferenceWithBookData): string {
  const book = ref.bookData.commonName ?? ref.bookData.name;
  let label = `${book} ${ref.chapter}`;
  if (ref.verse != null) {
    label += `:${ref.verse}`;
    if (ref.endVerse != null) {
      label += `-${ref.endVerse}`;
    }
  }
  return label;
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
