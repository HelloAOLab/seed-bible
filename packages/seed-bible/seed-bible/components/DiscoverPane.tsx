import { useI18n } from "../i18n/I18nManager";
import type { TabsManager, ReaderTab } from "../managers/TabsManager";
import type { Playlist, PlaylistManager } from "../managers/PlaylistManager";
import type { DiscoverReference } from "../managers/DiscoverManager";
import type { TranslationBook } from "../managers/FreeUseBibleAPI";
import { MaterialIcon } from "./icons";
import { CreatePlaylistForm } from "./CreatePlaylistForm";
import { PlayPlaylistView } from "./PlayPlaylistView";
import { DiscoverSection, DiscoverEmpty } from "./DiscoverSection";

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

  if (view.value === "play_playlist") {
    return <PlayPlaylistView playlists={playlists} tabs={tabs} />;
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

      <PlaylistSection userPlaylists={userPlaylists} playlists={playlists} />

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

function PlaylistSection({
  userPlaylists,
  playlists,
}: {
  userPlaylists: Playlist[];
  playlists: PlaylistManager;
}) {
  const { t } = useI18n();
  return (
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
              className="sb-discover-item sb-discover-item--row sb-playlist-item"
              dir="auto"
              onClick={() => playlists.startPlaying(playlist)}
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
                className="sb-discover-item-play"
                aria-label={t("play-playlist", {
                  defaultValue: "Play playlist",
                })}
                onClick={() => playlists.startPlaying(playlist)}
              >
                <MaterialIcon>play_arrow</MaterialIcon>
              </button>
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
