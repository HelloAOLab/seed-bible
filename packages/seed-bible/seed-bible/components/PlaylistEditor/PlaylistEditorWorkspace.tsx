import "./PlaylistEditor.css";
import type { ComponentChildren } from "preact";
import { useEffect, useState } from "preact/hooks";
import { useI18n } from "../../i18n/I18nManager";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import type { PlaylistItemData } from "../../managers/PlaylistManager";
import type { StepEditor } from "../../managers/StepEditor";
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
  playlistEditorPanelHost,
  StepEditorBackButton,
  useResolveBookName,
} from "./PlaylistEditorPanel";
import type { StepEditorHost } from "./stepEditorHost";
import { PlaylistCompareEditor } from "./PlaylistCompareEditor";
import { PlaylistStepCard, type StepCardContext } from "./PlaylistStepCard";
import {
  formatVerseRef,
  playlistStepKind,
  playlistStepKindName,
  playlistStepLabel,
  playlistStepMinutes,
  playlistTotalMinutes,
} from "./playlistSteps";
import { translateTitle } from "../../app/utils";
import { Button } from "../Button/Button";
import { BottomSheet } from "../BottomSheet/BottomSheet";
import { TextInput } from "../TextField/TextField";

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
  editor: StepEditor;
  index: number;
  square?: boolean;
}) {
  const { editor, index, square } = props;
  const { t } = useI18n();
  const duplicate = t("playlist-editor-duplicate", {
    defaultValue: "Duplicate",
  });
  const remove = t("playlist-editor-delete", { defaultValue: "Delete" });
  if (square) {
    const more = t("more", { defaultValue: "More" });
    return (
      <div className="sb-pe-mobile-header-actions">
        <AddStepToggle editor={editor} />
        <ContextMenuWithButton
          buttonClassName="sb-pe-step-menu"
          size="lg"
          label={more}
        >
          <ContextMenuItem onClick={() => (editor.settingsOpen.value = true)}>
            <PeIcon name="settings" />
            {t("playlist-editor-item-settings", {
              defaultValue: "Item settings",
            })}
          </ContextMenuItem>
          <ContextMenuItem
            className="sb-pe-step-menu-delete"
            onClick={() => editor.removeItem(index)}
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
      <Button
        variant="ghost"
        size="sm"
        icon={<PeIcon name="copy" />}
        className="sb-pe-toolbar-action"
        onClick={() => editor.duplicateItem(index)}
      >
        {duplicate}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        tone="danger"
        icon={<PeIcon name="trash" />}
        className="sb-pe-toolbar-action"
        onClick={() => editor.removeItem(index)}
      >
        {remove}
      </Button>
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

/** What a draft's details fields edit. */
export interface EditorDetails {
  title: string | null;
  description: string | null;
  heroImageUrl?: string | null;
}

/**
 * A draft's title, description and cover image, edited in place: in the
 * phone's details sheet, and the desktop's details dialog.
 */
export function EditorDetailsFields(props: {
  state: SeedBibleState;
  /** Keeps the fields' ids unique when two sets could be on screen. */
  idPrefix: string;
  details: EditorDetails;
  titlePlaceholder: string;
  descriptionPlaceholder: string;
  onChange: (changes: Partial<EditorDetails>) => void;
  /** Uploads a cover image when there's no gallery to upload it to. */
  fallbackUpload: (file: File) => Promise<string>;
}) {
  const { state, idPrefix, details, onChange } = props;
  const { modals, gallery } = state;
  const { t } = useI18n();

  return (
    <>
      <div className="sb-pe-field">
        <label className="sb-pe-field-label" htmlFor={`${idPrefix}-title`}>
          {t("playlist-editor-title", { defaultValue: "Title" })}
        </label>
        <TextInput
          id={`${idPrefix}-title`}
          dir="auto"
          value={details.title ?? ""}
          placeholder={props.titlePlaceholder}
          onValueInput={(value) => {
            onChange({ title: value.trim() ? value : null });
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
        <TextInput
          multiline
          id={`${idPrefix}-description`}
          dir="auto"
          rows={3}
          value={details.description ?? ""}
          placeholder={props.descriptionPlaceholder}
          onValueInput={(value) => {
            onChange({ description: value.trim() ? value : null });
          }}
        />
      </div>
      <div className="sb-pe-field">
        <span className="sb-pe-field-label">
          {t("hero-image", { defaultValue: "Cover image" })}
        </span>
        <HeroImageField
          imageUrl={details.heroImageUrl}
          modals={modals}
          gallery={gallery}
          photos={gallery?.photos}
          onUpload={async (file) => {
            const url = await uploadPhotoToGallery(file, {
              gallery,
              os: state.os,
              userId: state.login.userId.value,
              fallbackUpload: props.fallbackUpload,
            });
            onChange({ heroImageUrl: url });
            return url;
          }}
          onSelectPhoto={(url) => {
            onChange({ heroImageUrl: url });
            void gallery?.rememberPhoto(url);
          }}
          onRemove={() => onChange({ heroImageUrl: null })}
        />
      </div>
    </>
  );
}

function PlaylistDetailsFields(props: {
  state: SeedBibleState;
  idPrefix: string;
}) {
  const { state, idPrefix } = props;
  const { playlists } = state;
  const { t } = useI18n();
  const editing = playlists.editingPlaylist.value;
  if (!editing) {
    return null;
  }
  return (
    <EditorDetailsFields
      state={state}
      idPrefix={idPrefix}
      details={editing}
      titlePlaceholder={t("untitled-playlist", {
        defaultValue: "Untitled playlist",
      })}
      descriptionPlaceholder={t("playlist-description_placeholder", {
        defaultValue: "What is this playlist about?",
      })}
      onChange={playlists.updateEditingPlaylistMetadata}
      fallbackUpload={playlists.uploadHeroImage}
    />
  );
}

/**
 * Phone only: the sheet the title opens, for the draft's title, description
 * and cover image.
 */
function DetailsSheet(props: { host: StepEditorHost }) {
  const { host } = props;
  const { t } = useI18n();
  const close = () => (host.editor.detailsOpen.value = false);
  const heading = translateTitle(t, host.details.title);

  return (
    <BottomSheet
      className="sb-pe-details-sheet"
      label={heading}
      title={heading}
      onClose={close}
    >
      <div className="sb-pe sb-pe-details-sheet-body">
        {host.details.render("sb-pe-details")}
      </div>
    </BottomSheet>
  );
}

/** Phone only: the open step's settings, from its title bar's menu. */
function StepSettingsSheet(props: {
  host: StepEditorHost;
  index: number;
  item: PlaylistItemData;
}) {
  const { host, index, item } = props;
  const { editor } = host;
  const { t } = useI18n();
  const close = () => (editor.settingsOpen.value = false);
  const heading = t("playlist-editor-item-settings", {
    defaultValue: "Item settings",
  });

  return (
    <BottomSheet
      className="sb-pe-details-sheet sb-pe-settings-sheet"
      label={heading}
      title={heading}
      onClose={close}
    >
      <div className="sb-pe sb-pe-details-sheet-body">
        <StepSettings
          editor={editor}
          index={index}
          item={item}
          minutes={host.stepMinutes(item)}
        />
      </div>
    </BottomSheet>
  );
}

const UNFINISHED_STEPS_MODAL_ID = "step-editor-unfinished-steps";

/** Why the draft can't be saved yet: the steps that need finishing. */
function UnfinishedStepsContent(props: {
  state: SeedBibleState;
  editor: StepEditor;
}) {
  const { state, editor } = props;
  const { modals } = state;
  const { t } = useI18n();
  const resolveBookName = useResolveBookName(state.tabs);
  const items = editor.items.value;
  const close = () => modals.closeModal(UNFINISHED_STEPS_MODAL_ID);

  return (
    <div className="sb-pe sb-pe-review">
      <div className="sb-pe-review-problems" role="alert">
        {t("playlist-editor-incomplete-steps-save", {
          defaultValue: "These steps need finishing before you save:",
        })}
        <ul>
          {editor.invalidSteps().map((index) => (
            <li key={index}>
              <button
                type="button"
                onClick={() => {
                  close();
                  editor.selectStep(index);
                }}
              >
                {t("playlist-editor-step-link-text", {
                  step: index + 1,
                  label: playlistStepLabel(items[index]!, t, resolveBookName),
                  defaultValue: "Step {{step}}: {{label}}",
                })}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="sb-pe-review-actions">
        <Button className="sb-pe-review-back" onClick={close}>
          {t("playlist-editor-keep-editing", { defaultValue: "Keep editing" })}
        </Button>
      </div>
    </div>
  );
}

/**
 * Says which of the draft's steps are unfinished (a video step with no link,
 * say), as one saved with them would fail to load. False when there are none.
 */
export function showUnfinishedSteps(
  state: SeedBibleState,
  editor: StepEditor
): boolean {
  if (editor.invalidSteps().length === 0) {
    return false;
  }
  state.modals.openModal({
    id: UNFINISHED_STEPS_MODAL_ID,
    title: {
      key: "playlist-editor-unfinished-steps",
      defaultValue: "Some steps aren't finished",
    },
    mobileSheet: true,
    content: () => <UnfinishedStepsContent state={state} editor={editor} />,
  });
  return true;
}

/** Saves the playlist, or says which steps need finishing first. */
export function PublishButton(props: { state: SeedBibleState }) {
  const { state } = props;
  const { t } = useI18n();
  const [saving, setSaving] = useState(false);
  const save = () => {
    if (showUnfinishedSteps(state, state.playlists.stepEditor)) {
      return;
    }
    setSaving(true);
    state.playlists
      .saveEditingPlaylist()
      .catch((cause: unknown) => {
        console.error("Failed to save playlist:", cause);
        state.app.toast(
          t("playlist-editor-save-failed", {
            defaultValue: "The playlist couldn't be saved. Try again.",
          })
        );
      })
      .finally(() => setSaving(false));
  };
  return <SaveAndPublishButton saving={saving} onClick={save} />;
}

/** The step editor's "Save & Publish" button. */
export function SaveAndPublishButton(props: {
  saving: boolean;
  onClick: () => void;
}) {
  const { saving, onClick } = props;
  const { t } = useI18n();
  return (
    <Button
      variant="primary"
      size="lg"
      className="sb-pe-publish"
      loading={saving}
      onClick={onClick}
    >
      {saving
        ? t("saving", { defaultValue: "Saving…" })
        : t("playlist-editor-save-and-publish", {
            defaultValue: "Save & Publish",
          })}
    </Button>
  );
}

const DETAILS_MODAL_ID = "step-editor-details";

/**
 * Desktop: the draft's details (its title, description and cover) in a
 * dialog, opened from its title, as a phone opens them in a sheet.
 */
function DetailsModal(props: {
  modals: SeedBibleState["modals"];
  host: StepEditorHost;
}) {
  const { modals, host } = props;
  const { editor } = host;
  const open = editor.detailsOpen.value;
  useEffect(() => {
    if (!open) {
      modals.closeModal(DETAILS_MODAL_ID);
      return;
    }
    const close = () => (editor.detailsOpen.value = false);
    modals.openModal({
      id: DETAILS_MODAL_ID,
      title: host.details.title,
      mobileSheet: true,
      content: () => (
        <div className="sb-pe sb-pe-details-modal">
          {host.details.render("sb-pe-details-modal")}
        </div>
      ),
      footer: ({ t }) => (
        <div className="sb-pe sb-pe-details-modal-footer">
          <Button variant="primary" className="sb-pe-publish" onClick={close}>
            {t("done", { defaultValue: "Done" })}
          </Button>
        </div>
      ),
      onDismiss: close,
    });
  }, [open]);
  // Gone with the editor.
  useEffect(() => () => modals.closeModal(DETAILS_MODAL_ID), []);
  return null;
}

/**
 * While verses are picked in the reader for the open scripture step: which
 * ones, and Apply to give them to the step. Deselecting them hides it.
 */
export function VersePickBar(props: { editor: StepEditor }) {
  const { editor } = props;
  const { t } = useI18n();
  const index = editor.versePickIndex.value;
  const ref = editor.versePickRef.value;
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
      <Button
        variant="primary"
        size="sm"
        shape="pill"
        className="sb-pe-pickbar-apply"
        onClick={() => editor.applyVersePick()}
      >
        {t("playlist-editor-apply", { defaultValue: "Apply" })}
      </Button>
    </div>
  );
}

/**
 * Shown when the reader has moved off the open scripture step's passage (the
 * chapter pill, the book selector): Apply points the step at the chapter on
 * screen.
 */
export function ChapterChangeBar(props: {
  editor: StepEditor;
  resolveBookName: (bookId: string) => string;
}) {
  const { editor, resolveBookName } = props;
  const { t } = useI18n();
  const change = editor.chapterChange.value;
  if (!change) {
    return null;
  }
  return (
    <div className="sb-pe sb-pe-pickbar sb-pe-chapterbar" role="status">
      <span>
        {t("playlist-editor-use-chapter", {
          step: editor.stepIndex.value + 1,
          passage: formatVerseRef(
            { bookId: change.bookId, chapter: change.chapter },
            resolveBookName
          ),
          defaultValue: "Use {{passage}} for step {{step}}?",
        })}
      </span>
      <Button
        variant="primary"
        size="sm"
        shape="pill"
        className="sb-pe-pickbar-apply"
        onClick={() => editor.applyChapterChange()}
      >
        {t("playlist-editor-apply", { defaultValue: "Apply" })}
      </Button>
    </div>
  );
}

/** The playlist editor's side of the step editor. */
export function playlistEditorHost(state: SeedBibleState): StepEditorHost {
  const { playlists, tabs, modals } = state;
  const panelHost = playlistEditorPanelHost({ playlists, tabs, modals });
  return {
    ...panelHost,
    stepMinutes: playlistStepMinutes,
    mobileStatus: (t) => {
      const items = playlists.editingPlaylist.value?.items ?? [];
      const status = panelHost.status(t);
      return t("playlist-editor-mobile-status", {
        steps: items.length,
        minutes: playlistTotalMinutes(items),
        status: status.saved
          ? status.label
          : t("playlist-editor-draft", { defaultValue: "Draft" }),
        defaultValue: "{{steps}} items · {{minutes}} min · {{status}}",
      });
    },
    details: {
      title: {
        key: "playlist-editor-details",
        defaultValue: "Playlist details",
      },
      render: (idPrefix) => (
        <PlaylistDetailsFields state={state} idPrefix={idPrefix} />
      ),
    },
    renderPublishButton: () => <PublishButton state={state} />,
  };
}

/** The playlist editor over a reader tab; see `StepEditorWorkspace`. */
export function PlaylistEditorWorkspace(props: {
  state: SeedBibleState;
  compact: boolean;
  children: ComponentChildren;
}) {
  const { state, compact, children } = props;
  if (!state.playlists.editingPlaylist.value) {
    return <>{children}</>;
  }
  return (
    <StepEditorWorkspace
      state={state}
      host={playlistEditorHost(state)}
      compact={compact}
    >
      {children}
    </StepEditorWorkspace>
  );
}

/**
 * The step editor over a reader tab: the open step's toolbar along the top,
 * its card (or the reader itself, for scripture) in the middle, and the
 * editor's actions along the bottom. `children` is the tab's reader, kept
 * mounted while a card covers it so its place in the chapter survives.
 */
export function StepEditorWorkspace(props: {
  state: SeedBibleState;
  host: StepEditorHost;
  compact: boolean;
  children: ComponentChildren;
}) {
  const { state, host, compact, children } = props;
  const { tabs, modals } = state;
  const { editor } = host;
  const { t } = useI18n();
  const resolveBookName = useResolveBookName(tabs);
  const loadChapter = useChapterLoader(state);
  const items = editor.items.value;
  const index = editor.stepIndex.value;
  const addMenu = editor.addMenu.value;
  const detailsOpen = editor.detailsOpen.value;
  const item = items[index];
  const kind = item ? playlistStepKind(item) : null;
  const showsCard = !!item && kind !== "scripture";
  const books =
    tabs.tabs.value.find((tab) => tab.id === tabs.selectedTabId.value)
      ?.readingState.translationBooks.value?.books ?? [];
  const ctx: StepCardContext = {
    editor,
    index,
    count: items.length,
    loadChapter,
    books,
    resolveBookName,
  };
  const card =
    kind === "compare" && item?.type === "bible-verse" ? (
      <PlaylistCompareEditor
        key={index}
        editor={editor}
        index={index}
        item={item}
        loadChapter={loadChapter}
        resolveBookName={resolveBookName}
        compact={compact}
      />
    ) : showsCard && item ? (
      <div className="sb-pe sb-pe-card-scroll">
        <PlaylistStepCard key={`${index}-${kind}`} ctx={ctx} item={item} />
      </div>
    ) : !item && !compact ? (
      // Desktop's list is in the side pane, so beside it this says what to do.
      <div className="sb-pe sb-pe-card-scroll">
        <div className="sb-pe-card">
          <p className="sb-pe-step-empty">
            {items.length === 0
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
  }${compact && !state.app.isCompactReader.value ? " sb-pe-workspace--tablet" : ""}${
    card || onList ? " sb-pe-workspace--card" : ""
  }`;

  if (compact) {
    return (
      <div className={workspaceClass}>
        <header className="sb-pe sb-pe-mobile-header">
          <StepEditorBackButton host={host} />
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
                  count: items.length,
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
                  title={host.editDetailsLabel(t)}
                  onClick={() => (editor.detailsOpen.value = true)}
                >
                  <span className="sb-pe-mobile-title-text" dir="auto">
                    {host.title(t)}
                  </span>
                  <PeIcon name="pencil" />
                </button>
              </h2>
              <p className="sb-pe-mobile-status">{host.mobileStatus(t)}</p>
            </div>
          )}
          {item ? (
            <StepActions editor={editor} index={index} square />
          ) : (
            <div className="sb-pe-mobile-header-actions">
              <AddStepToggle editor={editor} />
            </div>
          )}
          {/* The title bar's Add button opens the menu, on a step's page and
              on the list. */}
          {addMenu ? (
            <AddStepMenu host={host} afterIndex={addMenu.afterIndex} />
          ) : null}
        </header>
        {children}
        {onList ? (
          <div className="sb-pe sb-pe-list-page">{host.renderSteps()}</div>
        ) : (
          card
        )}
        {/* Save belongs to the list; a step's page keeps only the
            verse pick bar here while verses are being picked, or the bar for
            using a chapter the reader has moved to. */}
        {onList ? (
          <div className="sb-pe sb-pe-mobile-bottom">
            <div className="sb-pe-mobile-bottom-row">
              {host.renderPublishButton()}
            </div>
          </div>
        ) : // Wider than a phone, the reader's own toolbar is the desktop one,
        // whose stack above it already shows these bars.
        state.app.isCompactReader.value &&
          (editor.versePickIndex.value !== null ||
            editor.chapterChange.value) ? (
          <div className="sb-pe sb-pe-mobile-bottom">
            <VersePickBar editor={editor} />
            <ChapterChangeBar
              editor={editor}
              resolveBookName={resolveBookName}
            />
          </div>
        ) : null}
        {detailsOpen ? <DetailsSheet host={host} /> : null}
        {item && editor.settingsOpen.value ? (
          <StepSettingsSheet host={host} index={index} item={item} />
        ) : null}
      </div>
    );
  }

  return (
    <div className={workspaceClass}>
      {item ? (
        <div className="sb-pe sb-pe-toolbar">
          <div className="sb-pe-toolbar-settings">
            <StepSettings
              editor={editor}
              index={index}
              item={item}
              minutes={host.stepMinutes(item)}
            />
          </div>
          <StepActions editor={editor} index={index} />
        </div>
      ) : null}
      {children}
      {card}
      <DetailsModal modals={modals} host={host} />
    </div>
  );
}
