import "./PlaylistEditor.css";
import type { ComponentChildren } from "preact";
import { useLayoutEffect, useRef, useState } from "preact/hooks";
import { useI18n } from "../../i18n/I18nManager";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import type { ReaderTab } from "../../managers/TabsManager";
import type {
  PlaylistItemData,
  PlaylistManager,
} from "../../managers/PlaylistManager";
import { uploadPhotoToGallery } from "../../managers/UserGalleryManager";
import { HeroImageField } from "../HeroImageField/HeroImageField";
import type { ScriptureChapterLoader } from "../PlaylistItemInlinePreview/PlaylistItemInlinePreview";
import { PeIcon, StepSettings } from "./editorControls";
import {
  ContextMenuItem,
  ContextMenuWithButton,
} from "../ContextMenu/ContextMenu";
import {
  AddStepMenu,
  AddStepToggle,
  PlaylistEditorBackButton,
  PlaylistStepsSummary,
  usePlaylistDraftStatus,
  useResolveBookName,
} from "./PlaylistEditorPanel";
import { PlaylistStepCard, type StepCardContext } from "./PlaylistStepCard";
import {
  formatVerseRef,
  playlistStepKind,
  playlistStepKindName,
  playlistStepLabel,
  playlistTotalMinutes,
} from "./playlistSteps";

type ScriptureItem = Extract<PlaylistItemData, { type: "bible-verse" }>;

/** Whether the playlist editor takes over this reader tab. */
export function isPlaylistEditorTab(
  state: SeedBibleState,
  tab: ReaderTab | null | undefined
): boolean {
  const { playlists } = state;
  return (
    !!tab &&
    playlists.view.value === "create_playlist" &&
    !!playlists.editingPlaylist.value &&
    state.tabs.selectedTabId.value === tab.id
  );
}

/**
 * The open step when it's plain scripture shown over this tab's reader, with
 * its index, or null. Compare steps have their own card instead.
 */
export function playlistEditorScriptureStep(
  state: SeedBibleState,
  tab: ReaderTab | null | undefined
): { index: number; item: ScriptureItem } | null {
  if (!isPlaylistEditorTab(state, tab)) {
    return null;
  }
  const index = state.playlists.editorStepIndex.value;
  const item = state.playlists.editingPlaylist.value?.items[index];
  return item?.type === "bible-verse" && !item.compare ? { index, item } : null;
}

/** Loads chapters for previews, defaulting to the translation being read. */
function useChapterLoader(state: SeedBibleState): ScriptureChapterLoader {
  const tab =
    state.tabs.tabs.value.find(
      (t) => t.id === state.tabs.selectedTabId.value
    ) ?? null;
  return async (translationId, bookId, chapter) => {
    const translation =
      translationId ?? tab?.readingState.translationId.peek() ?? undefined;
    if (!translation) {
      throw new Error("No translation to preview scripture in.");
    }
    return state.bibleData.getTranslationBookChapter(
      translation,
      bookId,
      chapter
    );
  };
}

/**
 * Duplicate and Delete for the open step. On a phone (`square`), its title
 * bar's Add button, which inserts a new step after it, and a menu with the
 * step's settings and Delete.
 */
function StepActions(props: {
  playlists: PlaylistManager;
  index: number;
  square?: boolean;
}) {
  const { playlists, index, square } = props;
  const { t } = useI18n();
  const duplicate = t("playlist-editor-duplicate", {
    defaultValue: "Duplicate",
  });
  const remove = t("playlist-editor-delete", { defaultValue: "Delete" });
  if (square) {
    const more = t("more", { defaultValue: "More" });
    return (
      <div className="sb-pe-mobile-header-actions">
        <AddStepToggle playlists={playlists} />
        <ContextMenuWithButton
          buttonClassName="sb-pe-square-button sb-pe-step-menu"
          aria-label={more}
          title={more}
        >
          <ContextMenuItem
            onClick={() => (playlists.editorStepSettingsOpen.value = true)}
          >
            <PeIcon name="settings" />
            {t("playlist-editor-item-settings", {
              defaultValue: "Item settings",
            })}
          </ContextMenuItem>
          <ContextMenuItem
            className="sb-pe-step-menu-delete"
            onClick={() => playlists.removeEditingPlaylistItem(index)}
          >
            <PeIcon name="trash" />
            {remove}
          </ContextMenuItem>
        </ContextMenuWithButton>
      </div>
    );
  }
  return (
    <div className="sb-pe-toolbar-actions">
      <button
        type="button"
        className="sb-pe-toolbar-action"
        onClick={() => playlists.duplicateEditingPlaylistItem(index)}
      >
        <PeIcon name="copy" />
        {duplicate}
      </button>
      <button
        type="button"
        className="sb-pe-toolbar-action sb-pe-toolbar-action--danger"
        onClick={() => playlists.removeEditingPlaylistItem(index)}
      >
        <PeIcon name="trash" />
        {remove}
      </button>
    </div>
  );
}

/**
 * Shown in the reader right after the open scripture step's verses: the
 * step's number beside the passage. Its note is in a sheet on the reader's
 * toolbar (`PlaylistStepNoteSheet`).
 */
export function PlaylistScriptureStepSlot(props: {
  state: SeedBibleState;
  index: number;
  firstVerse: number;
}) {
  const { state, index, firstVerse } = props;
  const { t } = useI18n();
  const count = state.playlists.editingPlaylist.value?.items.length ?? 0;
  const slotRef = useRef<HTMLDivElement>(null);
  const [markerTop, setMarkerTop] = useState<number | null>(null);

  // The step number sits in the margin beside the passage's first line.
  useLayoutEffect(() => {
    const measure = () => {
      const content = slotRef.current?.closest(".sb-chapter-content");
      const verse = content?.querySelector<HTMLElement>(
        `.sb-verse[data-verse-number="${firstVerse}"]`
      );
      if (!content || !verse) {
        setMarkerTop(null);
        return;
      }
      const top =
        verse.getBoundingClientRect().top - content.getBoundingClientRect().top;
      setMarkerTop(Math.round(top) + 5);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  });

  return (
    <div ref={slotRef} className="sb-pe sb-pe-step-slot">
      {markerTop !== null ? (
        <span className="sb-pe-step-marker" style={{ top: `${markerTop}px` }}>
          {t("playlist-editor-step-of", {
            step: index + 1,
            count,
            defaultValue: "{{step}}/{{count}}",
          })}
        </span>
      ) : null}
    </div>
  );
}

/** The hint the reader's header shows while a scripture step is open. */
export function PlaylistReaderHint() {
  const { t } = useI18n();
  return (
    <span className="sb-pe sb-pe-reader-hint">
      <PeIcon name="info" />
      {t("playlist-editor-reader-hint-text", {
        defaultValue:
          "Tap the first word, then the last, to highlight or comment.",
      })}
    </span>
  );
}

/**
 * The playlist's title, description and cover image, edited in place: in the
 * Review & publish dialog, and in the phone's details sheet.
 */
function PlaylistDetailsFields(props: {
  state: SeedBibleState;
  /** Keeps the fields' ids unique when two sets could be on screen. */
  idPrefix: string;
}) {
  const { state, idPrefix } = props;
  const { playlists, modals } = state;
  const { t } = useI18n();
  const editing = playlists.editingPlaylist.value;
  if (!editing) {
    return null;
  }
  const gallery = state.gallery;

  return (
    <>
      <div className="sb-pe-field">
        <label className="sb-pe-field-label" htmlFor={`${idPrefix}-title`}>
          {t("playlist-editor-title", { defaultValue: "Title" })}
        </label>
        <input
          id={`${idPrefix}-title`}
          className="sb-pe-input"
          type="text"
          dir="auto"
          value={editing.title ?? ""}
          placeholder={t("untitled-playlist", {
            defaultValue: "Untitled playlist",
          })}
          onInput={(event) => {
            const value = event.currentTarget.value;
            playlists.updateEditingPlaylistMetadata({
              title: value.trim() ? value : null,
            });
          }}
        />
      </div>
      <div className="sb-pe-field">
        <label
          className="sb-pe-field-label"
          htmlFor={`${idPrefix}-description`}
        >
          {t("description", { defaultValue: "Description" })}
        </label>
        <textarea
          id={`${idPrefix}-description`}
          className="sb-pe-textarea"
          dir="auto"
          rows={3}
          value={editing.description ?? ""}
          placeholder={t("playlist-description_placeholder", {
            defaultValue: "What is this playlist about?",
          })}
          onInput={(event) => {
            const value = event.currentTarget.value;
            playlists.updateEditingPlaylistMetadata({
              description: value.trim() ? value : null,
            });
          }}
        />
      </div>
      <div className="sb-pe-field">
        <span className="sb-pe-field-label">
          {t("hero-image", { defaultValue: "Cover image" })}
        </span>
        <HeroImageField
          imageUrl={editing.heroImageUrl}
          modals={modals}
          gallery={gallery}
          photos={gallery?.photos}
          onUpload={async (file) => {
            const url = await uploadPhotoToGallery(file, {
              gallery,
              os: state.os,
              userId: state.login.userId.value,
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
      </div>
    </>
  );
}

/**
 * Phone only: the sheet the playlist's title opens, for its title,
 * description and cover image.
 */
function PlaylistDetailsSheet(props: { state: SeedBibleState }) {
  const { state } = props;
  const { playlists } = state;
  const { t } = useI18n();
  const close = () => (playlists.editorDetailsSheetOpen.value = false);
  const heading = t("playlist-editor-details", {
    defaultValue: "Playlist details",
  });

  return (
    <>
      <div className="sb-pe-sheet-scrim" onClick={close} />
      <div
        className="sb-pe sb-pe-sheet sb-pe-details-sheet"
        role="dialog"
        aria-label={heading}
      >
        <div className="sb-pe-sheet-handle" />
        <div className="sb-pe-details-sheet-header">
          <h3 className="sb-pe-details-sheet-title">{heading}</h3>
          <button
            type="button"
            className="sb-pe-panel-close"
            aria-label={t("close", { defaultValue: "Close" })}
            onClick={close}
          >
            <PeIcon name="close" />
          </button>
        </div>
        <div className="sb-pe-details-sheet-body">
          <PlaylistDetailsFields state={state} idPrefix="sb-pe-details" />
        </div>
      </div>
    </>
  );
}

/** Phone only: the open step's settings, from its title bar's menu. */
function PlaylistStepSettingsSheet(props: {
  state: SeedBibleState;
  index: number;
  item: PlaylistItemData;
}) {
  const { state, index, item } = props;
  const { playlists } = state;
  const { t } = useI18n();
  const close = () => (playlists.editorStepSettingsOpen.value = false);
  const heading = t("playlist-editor-item-settings", {
    defaultValue: "Item settings",
  });

  return (
    <>
      <div className="sb-pe-sheet-scrim" onClick={close} />
      <div
        className="sb-pe sb-pe-sheet sb-pe-details-sheet sb-pe-settings-sheet"
        role="dialog"
        aria-label={heading}
      >
        <div className="sb-pe-sheet-handle" />
        <div className="sb-pe-details-sheet-header">
          <h3 className="sb-pe-details-sheet-title">{heading}</h3>
          <button
            type="button"
            className="sb-pe-panel-close"
            aria-label={t("close", { defaultValue: "Close" })}
            onClick={close}
          >
            <PeIcon name="close" />
          </button>
        </div>
        <div className="sb-pe-details-sheet-body">
          <StepSettings playlists={playlists} index={index} item={item} />
        </div>
      </div>
    </>
  );
}

const REVIEW_MODAL_ID = "playlist-review-publish";

function PlaylistReviewContent(props: { state: SeedBibleState }) {
  const { state } = props;
  const { playlists, modals } = state;
  const { t } = useI18n();
  const resolveBookName = useResolveBookName(state.tabs);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editing = playlists.editingPlaylist.value;
  if (!editing) {
    return null;
  }
  const invalid = playlists.editingPlaylistInvalidSteps();

  return (
    <div className="sb-pe sb-pe-review">
      <PlaylistDetailsFields state={state} idPrefix="sb-pe-review" />
      <p className="sb-pe-step-count">
        {t("playlist-editor-step-count", {
          steps: editing.items.length,
          minutes: playlistTotalMinutes(editing.items),
          defaultValue: "{{steps}} steps · ~{{minutes}} min",
        })}
      </p>
      {invalid.length > 0 ? (
        <div className="sb-pe-review-problems" role="alert">
          {t("playlist-editor-incomplete-steps", {
            defaultValue: "These steps need finishing before you publish:",
          })}
          <ul>
            {invalid.map((index) => (
              <li key={index}>
                <button
                  type="button"
                  onClick={() => {
                    modals.closeModal(REVIEW_MODAL_ID);
                    playlists.selectEditorStep(index);
                  }}
                >
                  {t("playlist-editor-step-link-text", {
                    step: index + 1,
                    label: playlistStepLabel(
                      editing.items[index]!,
                      t,
                      resolveBookName
                    ),
                    defaultValue: "Step {{step}}: {{label}}",
                  })}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {error ? (
        <p className="sb-pe-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="sb-pe-review-actions">
        <button
          type="button"
          className="sb-pe-review-back"
          onClick={() => modals.closeModal(REVIEW_MODAL_ID)}
        >
          {t("playlist-editor-keep-editing", { defaultValue: "Keep editing" })}
        </button>
        <button
          type="button"
          className="sb-pe-publish"
          disabled={publishing || invalid.length > 0}
          onClick={() => {
            setPublishing(true);
            setError(null);
            playlists
              .saveEditingPlaylist()
              .then(() => modals.closeModal(REVIEW_MODAL_ID))
              .catch((cause: unknown) => {
                console.error("Failed to save playlist:", cause);
                setError(
                  t("playlist-editor-publish-failed", {
                    defaultValue:
                      "The playlist couldn't be published. Try again.",
                  })
                );
                setPublishing(false);
              });
          }}
        >
          {publishing
            ? t("saving", { defaultValue: "Saving…" })
            : t("playlist-editor-publish", { defaultValue: "Publish" })}
        </button>
      </div>
    </div>
  );
}

/** Opens the last check before publishing: name, description, cover. */
export function openPlaylistReview(state: SeedBibleState) {
  state.modals.openModal({
    id: REVIEW_MODAL_ID,
    title: {
      key: "playlist-editor-review-and-publish",
      defaultValue: "Review & publish",
    },
    mobileSheet: true,
    content: () => <PlaylistReviewContent state={state} />,
  });
}

export function PublishButton(props: { state: SeedBibleState }) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      className="sb-pe-publish"
      onClick={() => openPlaylistReview(props.state)}
    >
      {t("playlist-editor-review-and-publish", {
        defaultValue: "Review & publish",
      })}
    </button>
  );
}

/**
 * While verses are picked in the reader for the open scripture step: which
 * ones, and Apply to give them to the step. Deselecting them hides it.
 */
export function VersePickBar(props: { state: SeedBibleState }) {
  const { playlists } = props.state;
  const { t } = useI18n();
  const index = playlists.editorVersePickIndex.value;
  const ref = playlists.editorVersePickRef.value;
  if (index === null || !ref || ref.verse == null) {
    return null;
  }
  const endVerse = ref.endVerse ?? ref.verse;
  return (
    <div className="sb-pe sb-pe-pickbar" role="status">
      <span>
        {t("playlist-editor-highlight-verses", {
          count: endVerse - ref.verse + 1,
          verses:
            endVerse > ref.verse ? `${ref.verse}-${endVerse}` : `${ref.verse}`,
          defaultValue: "Highlight verses {{verses}}",
        })}
      </span>
      <button
        type="button"
        className="sb-pe-pickbar-apply"
        onClick={() => playlists.applyEditorVersePick()}
      >
        {t("playlist-editor-apply", { defaultValue: "Apply" })}
      </button>
    </div>
  );
}

/**
 * Shown when the reader has moved off the open scripture step's passage (the
 * chapter pill, the book selector): Apply points the step at the chapter on
 * screen.
 */
export function ChapterChangeBar(props: { state: SeedBibleState }) {
  const { playlists } = props.state;
  const { t } = useI18n();
  const resolveBookName = useResolveBookName(props.state.tabs);
  const change = playlists.editorChapterChange.value;
  if (!change) {
    return null;
  }
  return (
    <div className="sb-pe sb-pe-pickbar sb-pe-chapterbar" role="status">
      <span>
        {t("playlist-editor-use-chapter", {
          step: playlists.editorStepIndex.value + 1,
          passage: formatVerseRef(
            { bookId: change.bookId, chapter: change.chapter },
            resolveBookName
          ),
          defaultValue: "Use {{passage}} for step {{step}}?",
        })}
      </span>
      <button
        type="button"
        className="sb-pe-pickbar-apply"
        onClick={() => playlists.applyEditorChapterChange()}
      >
        {t("playlist-editor-apply", { defaultValue: "Apply" })}
      </button>
    </div>
  );
}

/**
 * The playlist editor over a reader tab: the open step's toolbar along the
 * top, its card (or the reader itself, for scripture) in the middle, and the
 * editor's actions along the bottom. `children` is the tab's reader, kept
 * mounted while a card covers it so its place in the chapter survives.
 */
export function PlaylistEditorWorkspace(props: {
  state: SeedBibleState;
  compact: boolean;
  children: ComponentChildren;
}) {
  const { state, compact, children } = props;
  const { playlists, tabs, modals } = state;
  const { t } = useI18n();
  const resolveBookName = useResolveBookName(tabs);
  const loadChapter = useChapterLoader(state);
  const editing = playlists.editingPlaylist.value;
  const index = playlists.editorStepIndex.value;
  const status = usePlaylistDraftStatus(playlists);
  const addMenu = playlists.editorAddMenu.value;
  const detailsOpen = playlists.editorDetailsSheetOpen.value;
  if (!editing) {
    return <>{children}</>;
  }
  const item = editing.items[index];
  const kind = item ? playlistStepKind(item) : null;
  const showsCard = !!item && kind !== "scripture";
  const books =
    tabs.tabs.value.find((tab) => tab.id === tabs.selectedTabId.value)
      ?.readingState.translationBooks.value?.books ?? [];
  const ctx: StepCardContext = {
    playlists,
    index,
    count: editing.items.length,
    loadChapter,
    books,
    resolveBookName,
  };
  const card =
    showsCard && item ? (
      <div className="sb-pe sb-pe-card-scroll">
        <PlaylistStepCard key={`${index}-${kind}`} ctx={ctx} item={item} />
      </div>
    ) : !item && !compact ? (
      // Desktop's list is in the side pane, so beside it this says what to do.
      <div className="sb-pe sb-pe-card-scroll">
        <div className="sb-pe-card">
          <p className="sb-pe-step-empty">
            {editing.items.length === 0
              ? t("playlist-editor-no-steps", {
                  defaultValue: "No steps yet. Add one to get started.",
                })
              : t("playlist-editor-choose-step", {
                  defaultValue: "Choose a step from the list to edit it.",
                })}
          </p>
        </div>
      </div>
    ) : null;
  // On a phone, the list of steps is a page of its own in the reader's place.
  const onList = compact && !item;
  const workspaceClass = `sb-pane-reader-outer sb-pe-workspace${
    compact ? " sb-pe-workspace--mobile" : ""
  }${card || onList ? " sb-pe-workspace--card" : ""}`;

  if (compact) {
    const playlistTitle =
      editing.title?.trim() ||
      t("untitled-playlist", { defaultValue: "Untitled playlist" });
    return (
      <div className={workspaceClass}>
        <header className="sb-pe sb-pe-mobile-header">
          <PlaylistEditorBackButton playlists={playlists} modals={modals} />
          {item && kind ? (
            <div className="sb-pe-mobile-heading">
              <h2 className="sb-pe-mobile-title">
                <span className="sb-pe-mobile-title-text" dir="auto">
                  {playlistStepLabel(item, t, resolveBookName)}
                </span>
              </h2>
              <p className="sb-pe-mobile-status">
                {t("playlist-editor-step-position", {
                  step: index + 1,
                  count: editing.items.length,
                  kind: playlistStepKindName(kind, t),
                  defaultValue: "Step {{step}} of {{count}} · {{kind}}",
                })}
              </p>
            </div>
          ) : (
            <div className="sb-pe-mobile-heading">
              <h2 className="sb-pe-mobile-title">
                <button
                  type="button"
                  className="sb-pe-mobile-title-button"
                  aria-haspopup="dialog"
                  aria-expanded={detailsOpen}
                  title={t("playlist-editor-edit-details", {
                    defaultValue: "Edit title, description and cover",
                  })}
                  onClick={() =>
                    (playlists.editorDetailsSheetOpen.value = true)
                  }
                >
                  <span className="sb-pe-mobile-title-text" dir="auto">
                    {playlistTitle}
                  </span>
                  <PeIcon name="pencil" />
                </button>
              </h2>
              <p className="sb-pe-mobile-status">
                {t("playlist-editor-mobile-status", {
                  steps: editing.items.length,
                  minutes: playlistTotalMinutes(editing.items),
                  status: status.saved
                    ? status.label
                    : t("playlist-editor-draft", { defaultValue: "Draft" }),
                  defaultValue:
                    "{{steps}} items · {{minutes}} min · {{status}}",
                })}
              </p>
            </div>
          )}
          {item ? (
            <StepActions playlists={playlists} index={index} square />
          ) : (
            <div className="sb-pe-mobile-header-actions">
              <AddStepToggle playlists={playlists} />
            </div>
          )}
          {/* The title bar's Add button opens the menu, on a step's page and
              on the list. */}
          {addMenu ? (
            <AddStepMenu
              playlists={playlists}
              afterIndex={addMenu.afterIndex}
            />
          ) : null}
        </header>
        {children}
        {onList ? (
          <div className="sb-pe sb-pe-list-page">
            <PlaylistStepsSummary playlists={playlists} tabs={tabs} />
          </div>
        ) : (
          card
        )}
        {/* Review & publish belongs to the list; a step's page keeps only the
            verse pick bar here while verses are being picked, or the bar for
            using a chapter the reader has moved to. */}
        {onList ? (
          <div className="sb-pe sb-pe-mobile-bottom">
            <div className="sb-pe-mobile-bottom-row">
              <PublishButton state={state} />
            </div>
          </div>
        ) : playlists.editorVersePickIndex.value !== null ||
          playlists.editorChapterChange.value ? (
          <div className="sb-pe sb-pe-mobile-bottom">
            <VersePickBar state={state} />
            <ChapterChangeBar state={state} />
          </div>
        ) : null}
        {detailsOpen ? <PlaylistDetailsSheet state={state} /> : null}
        {item && playlists.editorStepSettingsOpen.value ? (
          <PlaylistStepSettingsSheet state={state} index={index} item={item} />
        ) : null}
      </div>
    );
  }

  return (
    <div className={workspaceClass}>
      {item ? (
        <div className="sb-pe sb-pe-toolbar">
          <div className="sb-pe-toolbar-settings">
            <StepSettings playlists={playlists} index={index} item={item} />
          </div>
          <StepActions playlists={playlists} index={index} />
        </div>
      ) : null}
      {children}
      {card}
    </div>
  );
}
