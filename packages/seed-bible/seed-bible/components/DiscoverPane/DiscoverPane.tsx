import "./DiscoverPane.css";
import "./DiscoverShared.css";
import { useSignal } from "@preact/signals";
import { useEffect, useRef } from "preact/hooks";
import { useI18n } from "../../i18n/I18nManager";
import type { TabsManager, ReaderTab } from "../../managers/TabsManager";
import type { Playlist, PlaylistManager } from "../../managers/PlaylistManager";
import type { DiscoverReference } from "../../managers/DiscoverManager";
import type { TranslationBook } from "../../managers/FreeUseBibleAPI";
import type { ModalManager } from "../../managers/ModalManager";
import type { LoginManager } from "../../managers/LoginManager";
import {
  annotationVerseNumbers,
  formatAnnotationVerseNumbers,
  groupAnnotationsByVerseRange,
  type Annotation,
  type AnnotationGroup,
  type AnnotationsManager,
} from "../../managers/AnnotationsManager";
import { setSafeHtml } from "../../managers/Sanitization";
import { getUserAnimalVisual } from "../../managers/SessionsManager";
import { MaterialIcon } from "../icons";
import {
  ContextMenuWithButton,
  ContextMenuItem,
} from "../ContextMenu/ContextMenu";
import { CreatePlaylistForm } from "../CreatePlaylistForm/CreatePlaylistForm";
import { CreateAnnotationForm } from "../CreateAnnotationForm/CreateAnnotationForm";
import { PlayPlaylistView } from "../PlayPlaylistView/PlayPlaylistView";
import { DiscoverSection, DiscoverEmpty } from "./DiscoverSection";
import { Avatar } from "../Avatar/Avatar";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import { emphasizeVerses } from "../../managers";
import type { BookId } from "../../managers/BibleDataManager";

interface DiscoverPaneProps {
  tabs: TabsManager;
  playlists: PlaylistManager;
  annotations: AnnotationsManager;
  modals: ModalManager;
  state: SeedBibleState;
  toast: SeedBibleState["app"]["toast"];
}

type ReferenceWithBookData = DiscoverReference & { bookData: TranslationBook };

/**
 * Header actions rendered in the pane's `PaneHeader` slot (see how the Discover
 * side pane is opened in `SeedBibleStateManager`). Only the discover sub-view
 * offers "create", so the button hides itself during the create/play
 * sub-views. Reads the `actualView` signal, so it stays reactive and resets
 * alongside the pane body when the active tab stops playing.
 */
export function DiscoverPaneHeader(props: {
  playlists: PlaylistManager;
  annotations: AnnotationsManager;
}) {
  const { playlists, annotations } = props;
  const { t } = useI18n();

  if (playlists.actualView.value !== "discover") {
    return null;
  }

  return (
    <ContextMenuWithButton
      buttonClassName="sb-discover-create"
      aria-label={t("create-menu", { defaultValue: "Create" })}
      icon={<>+ {t("create-playlist", { defaultValue: "Create" })}</>}
    >
      <ContextMenuItem onClick={() => void annotations.createNewAnnotation()}>
        <MaterialIcon className="sb-context-menu-item-icon">
          edit_note
        </MaterialIcon>
        {t("create-annotation-menu-item", { defaultValue: "Annotation" })}
      </ContextMenuItem>
      <ContextMenuItem onClick={() => void playlists.createNewPlaylist()}>
        <MaterialIcon className="sb-context-menu-item-icon">
          queue_music
        </MaterialIcon>
        {t("create-playlist-menu-item", { defaultValue: "Playlist" })}
      </ContextMenuItem>
    </ContextMenuWithButton>
  );
}

/**
 * Title rendered in the pane's `PaneHeader` (passed as the pane's `title`
 * render function, see `SeedBibleStateManager`). In the discover sub-view it's
 * just the "Discover" label; while viewing or editing a playlist it becomes a
 * back button plus the playlist title (an editable input when editing), so
 * those controls live in the pane header rather than below it. Reads the
 * `actualView`/`playing`/`editingPlaylist` signals, so it stays reactive and
 * resets alongside the pane body when the active tab stops playing.
 */
export function DiscoverPaneTitle(props: {
  playlists: PlaylistManager;
  annotations: AnnotationsManager;
  tabs: TabsManager;
}) {
  const { playlists, annotations, tabs } = props;
  const { t } = useI18n();
  const view = playlists.actualView.value;

  if (view === "create_annotation") {
    const editing = annotations.editingAnnotation.value;
    const location = editing ? annotationLocationLabel(editing, tabs) : null;
    return (
      <div className="sb-discover-title-row">
        <button
          type="button"
          className="sb-reading-plans-back"
          aria-label={t("back", { defaultValue: "Back" })}
          onClick={() => annotations.cancelEditingAnnotation()}
        >
          <MaterialIcon>arrow_back</MaterialIcon>
        </button>
        <span className="sb-discover-title" dir="auto">
          {t("annotate-title", {
            location: location ?? "",
            defaultValue: "Annotate {{location}}",
          })}
        </span>
      </div>
    );
  }

  if (view === "play_playlist") {
    const playing = playlists.playing.value;
    const title =
      playing?.playlists.value[0]?.title ??
      t("untitled-playlist", { defaultValue: "Untitled playlist" });
    return (
      <div className="sb-discover-title-row">
        <button
          type="button"
          className="sb-reading-plans-back"
          aria-label={t("back", { defaultValue: "Back" })}
          onClick={() => playlists.goBackFromPlayingView()}
        >
          <MaterialIcon>arrow_back</MaterialIcon>
        </button>
        <span className="sb-discover-title" dir="auto">
          {title}
        </span>
      </div>
    );
  }

  if (view === "create_playlist") {
    const editing = playlists.editingPlaylist.value;
    return (
      <div className="sb-discover-title-row">
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
    );
  }

  return <>{t("discover", { defaultValue: "Discover" })}</>;
}

/**
 * Pane content for the "Discover" tool. Shows the user's authored playlists and
 * annotations plus discovered cross references, study notes, and content for
 * the currently selected reader tab.
 *
 * Rendered inside the managed side pane (`SidePane`), so the pane shell supplies
 * the surrounding chrome — the title/close (`PaneHeader`), the docking layout,
 * and the mobile-fullscreen behavior. This component just renders the content.
 */
export function DiscoverPane(props: DiscoverPaneProps) {
  const { tabs, playlists, annotations, modals } = props;
  const { actualView } = playlists;

  if (actualView.value === "create_playlist") {
    return (
      <CreatePlaylistForm playlists={playlists} tabs={tabs} modals={modals} />
    );
  }

  if (actualView.value === "create_annotation") {
    return <CreateAnnotationForm annotations={annotations} />;
  }

  if (actualView.value === "play_playlist") {
    return (
      <PlayPlaylistView
        state={props.state}
        playlists={playlists}
        tabs={tabs}
        modals={modals}
      />
    );
  }

  // Reading `.value` during render subscribes the component to updates.
  const userPlaylists = playlists.userPlaylists.value;
  const selectedTab =
    tabs.tabs.value.find((tab) => tab.id === tabs.selectedTabId.value) ?? null;

  return (
    <div className="sb-discover-pane">
      <PlaylistSection
        userPlaylists={userPlaylists}
        playlists={playlists}
        modals={modals}
        toast={props.toast}
      />

      <AnnotationsSection
        tab={selectedTab}
        annotations={annotations}
        modals={modals}
        toast={props.toast}
        login={props.state.login}
        tabs={tabs}
      />

      <CrossReferencesSection tab={selectedTab} />
      <StudyNotesSection tab={selectedTab} />
      <ContentSection tab={selectedTab} />
    </div>
  );
}

function PlaylistSection({
  userPlaylists,
  playlists,
  modals,
  toast,
}: {
  userPlaylists: Playlist[];
  playlists: PlaylistManager;
  modals: ModalManager;
  toast: SeedBibleState["app"]["toast"];
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
                onClick={(e) => {
                  e.stopPropagation();
                  playlists.startPlaying(playlist);
                }}
              >
                <MaterialIcon>play_arrow</MaterialIcon>
              </button>
              <ContextMenuWithButton
                buttonClassName="sb-discover-item-menu"
                aria-label={t("playlist-options", {
                  defaultValue: "Playlist options",
                })}
                onClick={(e) => e.stopPropagation()}
              >
                <ContextMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    const url = playlists.getPlaylistUrl(playlist);
                    navigator.clipboard.writeText(url);
                    toast(
                      t("playlist-url-copied", {
                        defaultValue: "Playlist URL copied to clipboard",
                      })
                    );
                  }}
                >
                  <MaterialIcon className="sb-context-menu-item-icon">
                    share
                  </MaterialIcon>
                  {t("share-playlist", { defaultValue: "Share playlist" })}
                </ContextMenuItem>
                <ContextMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    playlists.editPlaylist(playlist);
                  }}
                >
                  <MaterialIcon className="sb-context-menu-item-icon">
                    edit
                  </MaterialIcon>
                  {t("edit-playlist", { defaultValue: "Edit playlist" })}
                </ContextMenuItem>
                <ContextMenuItem
                  className="sb-context-menu-item--danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    openDeletePlaylistConfirm(
                      modals,
                      playlists,
                      playlist,
                      toast
                    );
                  }}
                >
                  <MaterialIcon className="sb-context-menu-item-icon">
                    delete
                  </MaterialIcon>
                  {t("delete-playlist", { defaultValue: "Delete" })}
                </ContextMenuItem>
              </ContextMenuWithButton>
            </li>
          ))}
        </ul>
      )}
    </DiscoverSection>
  );
}

/**
 * Confirmation body shown before permanently deleting a playlist. Confirming
 * erases the playlist and closes the modal; on failure it surfaces a toast but
 * still closes.
 */
function ConfirmDeletePlaylistModalContent(props: {
  playlists: PlaylistManager;
  playlist: Playlist;
  toast: SeedBibleState["app"]["toast"];
  onClose: () => void;
}) {
  const { playlists, playlist, toast, onClose } = props;
  const { t } = useI18n();

  const confirm = async () => {
    try {
      await playlists.deletePlaylist(playlist);
    } catch {
      toast(
        t("delete-playlist-failed", {
          defaultValue: "Couldn't delete the playlist.",
        })
      );
    }
    onClose();
  };

  return (
    <div className="sb-confirm-delete">
      <p className="sb-confirm-delete-message">
        {t("delete-playlist-confirm-message", {
          title:
            playlist.title ??
            t("untitled-playlist", { defaultValue: "Untitled playlist" }),
          defaultValue: 'Delete "{{title}}"? This can\'t be undone.',
        })}
      </p>
      <div className="sb-confirm-delete-actions">
        <button
          type="button"
          className="sb-session-settings-cancel"
          onClick={onClose}
        >
          {t("cancel")}
        </button>
        <button
          type="button"
          className="sb-session-settings-end"
          onClick={confirm}
        >
          {t("delete")}
        </button>
      </div>
    </div>
  );
}

/** Opens the delete-playlist confirmation modal. */
function openDeletePlaylistConfirm(
  modals: ModalManager,
  playlists: PlaylistManager,
  playlist: Playlist,
  toast: SeedBibleState["app"]["toast"]
) {
  const modalId = `delete-playlist-confirm-${playlist.id}`;
  modals.openModal({
    id: modalId,
    title: {
      key: "delete-playlist-confirm-title",
      defaultValue: "Delete playlist?",
    },
    content: () => (
      <ConfirmDeletePlaylistModalContent
        playlists={playlists}
        playlist={playlist}
        toast={toast}
        onClose={() => modals.closeModal(modalId)}
      />
    ),
  });
}

/**
 * Resolves the display name of the book an annotation targets, using
 * whichever open tab currently has that chapter loaded. Falls back to the
 * raw book id when no open tab has it loaded (e.g. a note for a chapter no
 * longer open).
 */
function annotationBookName(
  annotation: Pick<Annotation, "bookId" | "chapterNumber">,
  tabs: TabsManager
): string {
  const chapter = tabs.tabs.value
    .map((tab) => tab.readingState.chapterData.value)
    .find(
      (c) =>
        c?.book.id === annotation.bookId &&
        c?.chapter.number === annotation.chapterNumber
    );
  return chapter?.book.name ?? chapter?.book.commonName ?? annotation.bookId;
}

/** Formats an annotation's book/chapter/verse targeting, e.g. "Genesis 3:3-5,7". */
function annotationLocationLabel(
  annotation: Annotation,
  tabs: TabsManager
): string {
  const book = annotationBookName(annotation, tabs);
  const base = `${book} ${annotation.chapterNumber}`;
  const verseNumbers = annotationVerseNumbers(annotation);
  if (verseNumbers.length === 0) {
    return base;
  }
  return `${base}:${formatAnnotationVerseNumbers(verseNumbers)}`;
}

/** Renders an annotation's sanitized HTML body as a preview snippet. */
export function AnnotationPreview({ html }: { html: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (ref.current) {
      void setSafeHtml(html, ref.current);
    }
  }, [html]);
  return <span ref={ref} className="sb-annotation-item-preview" dir="auto" />;
}

// Shared across every `AnnotationAuthor` instance so authors of multiple
// comments (or comments re-rendered across chapters) resolve their profile
// once per session instead of once per row. `LoginManager.getUserProfile`
// has no built-in cache of its own for arbitrary user ids (only for the
// signed-in account), so this mirrors the per-id cache already used in
// `SessionsManager.tsx`.
const annotationAuthorProfileCache = new Map<
  string,
  ReturnType<LoginManager["getUserProfile"]>
>();

/**
 * Shows a comment annotation's author avatar and name, resolved live from
 * their profile by user id.
 */
function AnnotationAuthor(props: {
  userId: string | null | undefined;
  login: LoginManager;
}) {
  const { userId, login } = props;
  const name = useSignal("");
  const pictureUrl = useSignal<string | null>(null);
  const isSelf = userId === login.userId.value;

  useEffect(() => {
    if (!userId) {
      return;
    }
    let cancelled = false;
    let promise = annotationAuthorProfileCache.get(userId);
    if (!promise) {
      promise = login.getUserProfile(userId);
      annotationAuthorProfileCache.set(userId, promise);
    }
    promise
      .then((profile) => {
        if (cancelled) {
          return;
        }
        if (profile.name) {
          name.value = profile.name;
        }
        if (profile.pictureUrl) {
          pictureUrl.value = profile.pictureUrl;
        }
      })
      .catch(() => {
        // No profile available; author renders with no name/picture.
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!userId) {
    return null;
  }

  const { t } = useI18n();

  return (
    <span className="sb-annotation-comment-author">
      <Avatar
        imageUrl={pictureUrl.value}
        visual={getUserAnimalVisual(userId)}
        title={name.value}
      />
      {isSelf || name.value ? (
        <span className="sb-annotation-comment-author-name">
          {isSelf ? t("you", { defaultValue: "You" }) : name.value}
        </span>
      ) : null}
    </span>
  );
}

const annotationUpdatedTimeFormatterCache = new Map<
  string,
  Intl.DateTimeFormat
>();

function getAnnotationUpdatedTimeFormatter(
  language: string
): Intl.DateTimeFormat {
  let formatter = annotationUpdatedTimeFormatterCache.get(language);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(language, {
      dateStyle: "medium",
      timeStyle: "short",
    });
    annotationUpdatedTimeFormatterCache.set(language, formatter);
  }
  return formatter;
}

/** A comment annotation's author name plus its last-updated time. */
export function AnnotationCommentMeta(props: {
  annotation: Annotation;
  login: LoginManager;
  t: ReturnType<typeof useI18n>["t"];
  language: string;
}) {
  const { annotation, login, language } = props;
  if (annotation.data.type !== "comment") {
    return null;
  }

  const updatedAtMs =
    annotation.data.updatedAtMs ?? annotation.data.createdAtMs;

  return (
    <span className="sb-annotation-comment-meta">
      <AnnotationAuthor userId={annotation.data.userId} login={login} />
      {updatedAtMs != null ? (
        <span className="sb-annotation-comment-updated">
          |{" "}
          {getAnnotationUpdatedTimeFormatter(language).format(
            new Date(updatedAtMs)
          )}
        </span>
      ) : null}
    </span>
  );
}

/**
 * One verse-range group of annotations: a collapsible header showing the
 * shared verse label, and (while expanded) the annotation rows themselves.
 * Starts expanded.
 */
function AnnotationGroupSection(props: {
  group: AnnotationGroup;
  annotations: AnnotationsManager;
  modals: ModalManager;
  toast: SeedBibleState["app"]["toast"];
  login: LoginManager;
  tabs: TabsManager;
}) {
  const { group, annotations, modals, toast, login, tabs } = props;
  const { t, language } = useI18n();
  const expanded = useSignal(true);
  const label = annotationLocationLabel(group.annotations[0]!, tabs);

  return (
    <div className="sb-annotation-group">
      <button
        type="button"
        className="sb-annotation-group-header"
        aria-expanded={expanded.value}
        aria-label={
          expanded.value
            ? t("annotation-group-collapse", {
                defaultValue: "Collapse group",
              })
            : t("annotation-group-expand", { defaultValue: "Expand group" })
        }
        onClick={() => (expanded.value = !expanded.value)}
      >
        <span className="sb-annotation-group-header-title">{label}</span>
        <MaterialIcon
          className={`sb-annotation-group-header-icon${
            expanded.value ? "" : " sb-annotation-group-header-icon--collapsed"
          }`}
        >
          expand_more
        </MaterialIcon>
      </button>
      {expanded.value ? (
        <ul className="sb-annotation-group-list">
          {group.annotations.map((annotation) => (
            <li
              key={annotation.id}
              className="sb-annotation-item"
              dir="auto"
              onClick={async () => {
                if (!annotation.verseNumber) {
                  return;
                }
                const tab = tabs.tabs.value.find(
                  (t) => t.id === tabs.selectedTabId.value
                );
                if (!tab) {
                  return;
                }

                // `translationId` is optional on the item; fall back to the tab's current
                // translation. `.peek()` avoids re-navigating when the tab changes it.
                await tab.readingState.selectTranslationAndChapter(
                  tab.readingState.translationId.peek(),
                  annotation.bookId,
                  annotation.chapterNumber,
                  { scrollToVerse: annotation.verseNumber }
                );

                emphasizeVerses(tab.readingState, {
                  book: annotation.bookId as BookId,
                  chapter: annotation.chapterNumber,
                  verse: annotation.verseNumber,
                  endVerse: annotation.endVerseNumber ?? undefined,
                });
              }}
            >
              <div className="sb-annotation-item-main">
                <AnnotationPreview html={annotation.data.html} />
                <AnnotationCommentMeta
                  annotation={annotation}
                  login={login}
                  t={t}
                  language={language}
                />
              </div>
              <ContextMenuWithButton
                buttonClassName="sb-annotation-item-menu"
                aria-label={t("annotation-options", {
                  defaultValue: "Annotation options",
                })}
                onClick={(e) => e.stopPropagation()}
              >
                <ContextMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    annotations.editAnnotation(annotation);
                  }}
                >
                  <MaterialIcon className="sb-context-menu-item-icon">
                    edit
                  </MaterialIcon>
                  {t("edit-annotation", { defaultValue: "Edit" })}
                </ContextMenuItem>
                <ContextMenuItem
                  className="sb-context-menu-item--danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    openDeleteAnnotationConfirm(
                      modals,
                      annotations,
                      annotation,
                      toast
                    );
                  }}
                >
                  <MaterialIcon className="sb-context-menu-item-icon">
                    delete
                  </MaterialIcon>
                  {t("delete-annotation", { defaultValue: "Delete" })}
                </ContextMenuItem>
              </ContextMenuWithButton>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function AnnotationsSection(props: {
  tab: ReaderTab | null;
  annotations: AnnotationsManager;
  modals: ModalManager;
  toast: SeedBibleState["app"]["toast"];
  login: LoginManager;
  tabs: TabsManager;
}) {
  const { tab, annotations, modals, toast, login, tabs } = props;
  const { t } = useI18n();
  const title = t("notes", { defaultValue: "Notes" });

  if (!tab) {
    return <DiscoverSection title={title}>{noTabHint(t)}</DiscoverSection>;
  }

  const bookId = tab.readingState.bookId.value;
  const chapterNumber = tab.readingState.chapterNumber.value;
  if (!bookId || !chapterNumber) {
    return <DiscoverSection title={title}>{noTabHint(t)}</DiscoverSection>;
  }

  const chapterAnnotations = annotations.getAnnotationsForChapter(
    bookId,
    chapterNumber
  ).value;
  const groups = groupAnnotationsByVerseRange(chapterAnnotations);

  return (
    <DiscoverSection title={title}>
      {groups.length === 0 ? (
        <DiscoverEmpty
          text={t("discover-annotations-empty", {
            defaultValue: "You have no annotations",
          })}
        />
      ) : (
        groups.map((group) => (
          <AnnotationGroupSection
            key={`${group.startVerseNumber ?? "chapter"}-${
              group.endVerseNumber ?? "chapter"
            }`}
            group={group}
            annotations={annotations}
            modals={modals}
            toast={toast}
            login={login}
            tabs={tabs}
          />
        ))
      )}
    </DiscoverSection>
  );
}

/**
 * Confirmation body shown before permanently deleting an annotation.
 * Confirming erases the annotation and closes the modal; on failure it
 * surfaces a toast but still closes.
 */
function ConfirmDeleteAnnotationModalContent(props: {
  annotations: AnnotationsManager;
  annotation: Annotation;
  toast: SeedBibleState["app"]["toast"];
  onClose: () => void;
}) {
  const { annotations, annotation, toast, onClose } = props;
  const { t } = useI18n();

  const confirm = async () => {
    try {
      await annotations.deleteAnnotationAndRefresh(annotation);
    } catch {
      toast(
        t("delete-annotation-failed", {
          defaultValue: "Couldn't delete the annotation.",
        })
      );
    }
    onClose();
  };

  return (
    <div className="sb-confirm-delete">
      <p className="sb-confirm-delete-message">
        {t("delete-annotation-confirm-message", {
          defaultValue: "Delete this annotation? This can't be undone.",
        })}
      </p>
      <div className="sb-confirm-delete-actions">
        <button
          type="button"
          className="sb-session-settings-cancel"
          onClick={onClose}
        >
          {t("cancel")}
        </button>
        <button
          type="button"
          className="sb-session-settings-end"
          onClick={confirm}
        >
          {t("delete")}
        </button>
      </div>
    </div>
  );
}

/** Opens the delete-annotation confirmation modal. */
function openDeleteAnnotationConfirm(
  modals: ModalManager,
  annotations: AnnotationsManager,
  annotation: Annotation,
  toast: SeedBibleState["app"]["toast"]
) {
  const modalId = `delete-annotation-confirm-${annotation.id}`;
  modals.openModal({
    id: modalId,
    title: {
      key: "delete-annotation-confirm-title",
      defaultValue: "Delete annotation?",
    },
    content: () => (
      <ConfirmDeleteAnnotationModalContent
        annotations={annotations}
        annotation={annotation}
        toast={toast}
        onClose={() => modals.closeModal(modalId)}
      />
    ),
  });
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
