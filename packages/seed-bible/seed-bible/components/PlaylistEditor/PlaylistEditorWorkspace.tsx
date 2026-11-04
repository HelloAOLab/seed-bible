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
import { PlaylistHtmlContent } from "../PlaylistHtmlContent/PlaylistHtmlContent";
import type { ScriptureChapterLoader } from "../PlaylistItemInlinePreview/PlaylistItemInlinePreview";
import { PeIcon, StepSettings } from "./editorControls";
import {
  AddStepButton,
  AddStepMenu,
  PlaylistEditorPanel,
  usePlaylistDraftStatus,
  useResolveBookName,
} from "./PlaylistEditorPanel";
import { PlaylistNoteComposer } from "./PlaylistNoteComposer";
import { PlaylistStepCard, type StepCardContext } from "./PlaylistStepCard";
import {
  formatVerseRef,
  playlistStepKind,
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

function useOtherSteps(state: SeedBibleState, openIndex: number) {
  const { t } = useI18n();
  const resolveBookName = useResolveBookName(state.tabs);
  const items = state.playlists.editingPlaylist.value?.items ?? [];
  return items.flatMap((item, index) =>
    index === openIndex
      ? []
      : [{ index, label: playlistStepLabel(item, t, resolveBookName) }]
  );
}

/** Duplicate and Delete for the open step. */
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
    return (
      <div className="sb-pe-mobile-header-actions">
        <button
          type="button"
          className="sb-pe-square-button"
          aria-label={duplicate}
          onClick={() => playlists.duplicateEditingPlaylistItem(index)}
        >
          <PeIcon name="copy" />
        </button>
        <button
          type="button"
          className="sb-pe-square-button sb-pe-step-action--danger"
          aria-label={remove}
          onClick={() => playlists.removeEditingPlaylistItem(index)}
        >
          <PeIcon name="trash" />
        </button>
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

/** The phone's collapsible home for the step's settings. */
function MobileStepSettings(props: {
  playlists: PlaylistManager;
  index: number;
  item: PlaylistItemData;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <div className="sb-pe sb-pe-step-settings" data-open={open}>
      <button
        type="button"
        className="sb-pe-step-settings-toggle"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className="sb-pe-step-settings-toggle-label">
          <PeIcon name="settings" />
          {t("playlist-editor-step-settings", {
            defaultValue: "Step Settings",
          })}
        </span>
        <PeIcon name="chevron-down" />
      </button>
      {open ? (
        <div className="sb-pe-step-settings-body">
          <StepSettings {...props} />
        </div>
      ) : null}
    </div>
  );
}

/**
 * Shown in the reader right after the open scripture step's verses: its note,
 * or a button to add one, plus the step's number beside the passage.
 */
export function PlaylistScriptureStepSlot(props: {
  state: SeedBibleState;
  index: number;
  item: ScriptureItem;
  firstVerse: number;
  compact: boolean;
}) {
  const { state, index, item, firstVerse, compact } = props;
  const { playlists } = state;
  const { t } = useI18n();
  const resolveBookName = useResolveBookName(state.tabs);
  const preview = playlists.editorMode.value === "preview";
  const count = playlists.editingPlaylist.value?.items.length ?? 0;
  const otherSteps = useOtherSteps(state, index);
  const [composing, setComposing] = useState(false);
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

  const passage = formatVerseRef(item.ref, resolveBookName);
  const hasNote = !!item.note;

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
      {preview ? (
        hasNote ? (
          <div className="sb-pe-note-preview">
            {item.noteTitle ? <strong>{item.noteTitle}</strong> : null}
            <PlaylistHtmlContent html={item.note!} />
          </div>
        ) : null
      ) : hasNote || composing ? (
        <div className="sb-pe-note-composer">
          <p className="sb-pe-eyebrow">
            {t("playlist-editor-your-note", {
              passage,
              defaultValue: "Your note · shown with {{passage}}",
            })}
          </p>
          <PlaylistNoteComposer
            key={index}
            initialHtml={item.note ?? ""}
            autofocus={composing && !hasNote}
            placeholder={t("playlist-editor-scripture-note-placeholder", {
              defaultValue:
                "Add a note readers see with this passage (optional)",
            })}
            steps={otherSteps}
            onChange={(html) => {
              const current = playlists.editingPlaylist.peek()?.items[index];
              if (current?.type === "bible-verse") {
                playlists.updateEditingPlaylistItem(index, {
                  ...current,
                  note: html || undefined,
                });
              }
            }}
          />
        </div>
      ) : (
        <button
          type="button"
          className="sb-pe-add-note"
          onClick={() => setComposing(true)}
        >
          <span className="sb-pe-add-note-plus" aria-hidden="true">
            +
          </span>
          {t("playlist-editor-add-note", {
            defaultValue: "Add a note to this item",
          })}
        </button>
      )}
      {compact && !preview ? (
        <MobileStepSettings playlists={playlists} index={index} item={item} />
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
  const gallery = state.gallery;

  return (
    <div className="sb-pe sb-pe-review">
      <div className="sb-pe-field">
        <label className="sb-pe-field-label" htmlFor="sb-pe-review-title">
          {t("playlist-editor-title", { defaultValue: "Title" })}
        </label>
        <input
          id="sb-pe-review-title"
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
        <label className="sb-pe-field-label" htmlFor="sb-pe-review-description">
          {t("description", { defaultValue: "Description" })}
        </label>
        <textarea
          id="sb-pe-review-description"
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

function PublishButton(props: { state: SeedBibleState }) {
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

function VersePickBar(props: { state: SeedBibleState }) {
  const { playlists } = props.state;
  const { t } = useI18n();
  const resolveBookName = useResolveBookName(props.state.tabs);
  const index = playlists.editorVersePickIndex.value;
  const ref = playlists.editorVersePickRef.value;
  if (index === null) {
    return null;
  }
  return (
    <div className="sb-pe sb-pe-pickbar" role="status">
      <span>
        {t("playlist-editor-tap-verses", {
          step: index + 1,
          defaultValue: "Tap verses for step {{step}}",
        })}
        {ref ? (
          <>
            {" · "}
            <span className="sb-pe-pickbar-ref">
              {formatVerseRef(ref, resolveBookName)}
            </span>
          </>
        ) : null}
      </span>
      <button
        type="button"
        className="sb-pe-pickbar-cancel"
        onClick={() => playlists.cancelEditorVersePick()}
      >
        {t("cancel", { defaultValue: "Cancel" })}
      </button>
      <button
        type="button"
        className="sb-pe-pickbar-apply"
        disabled={!ref}
        onClick={() => playlists.applyEditorVersePick()}
      >
        {t("playlist-editor-apply", { defaultValue: "Apply" })}
      </button>
    </div>
  );
}

function ModeSwitch(props: { playlists: PlaylistManager }) {
  const { playlists } = props;
  const { t } = useI18n();
  const mode = playlists.editorMode.value;
  return (
    <div
      className="sb-pe-mode"
      role="group"
      aria-label={t("playlist-editor-mode", { defaultValue: "Editor view" })}
    >
      <button
        type="button"
        className="sb-pe-mode-option"
        aria-pressed={mode === "edit"}
        onClick={() => (playlists.editorMode.value = "edit")}
      >
        {t("playlist-editor-edit", { defaultValue: "Edit" })}
      </button>
      <button
        type="button"
        className="sb-pe-mode-option"
        aria-pressed={mode === "preview"}
        onClick={() => {
          playlists.cancelEditorVersePick();
          playlists.editorMode.value = "preview";
        }}
      >
        {t("playlist-editor-preview", { defaultValue: "Preview" })}
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
  const otherSteps = useOtherSteps(state, index);
  const status = usePlaylistDraftStatus(playlists);
  const preview = playlists.editorMode.value === "preview";
  const addMenu = playlists.editorAddMenu.value;
  const sheetOpen = playlists.editorStepsSheetOpen.value;
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
    otherSteps,
  };
  const card =
    showsCard && item ? (
      <div className="sb-pe sb-pe-card-scroll">
        <PlaylistStepCard
          key={`${index}-${kind}`}
          ctx={ctx}
          item={item}
          preview={preview}
        />
        {compact && !preview ? (
          <MobileStepSettings playlists={playlists} index={index} item={item} />
        ) : null}
      </div>
    ) : !item ? (
      <div className="sb-pe sb-pe-card-scroll">
        <div className="sb-pe-card">
          <p className="sb-pe-step-empty">
            {t("playlist-editor-no-steps", {
              defaultValue: "No steps yet. Add one to get started.",
            })}
          </p>
        </div>
      </div>
    ) : null;
  const workspaceClass = `sb-pane-reader-outer sb-pe-workspace${
    compact ? " sb-pe-workspace--mobile" : ""
  }${card ? " sb-pe-workspace--card" : ""}`;

  if (compact) {
    const title =
      editing.title?.trim() ||
      t("untitled-playlist", { defaultValue: "Untitled playlist" });
    return (
      <div className={workspaceClass}>
        <header className="sb-pe sb-pe-mobile-header">
          <div className="sb-pe-mobile-heading">
            <h2 className="sb-pe-mobile-title" dir="auto">
              {title}
            </h2>
            <p className="sb-pe-mobile-status">
              {t("playlist-editor-mobile-status", {
                steps: editing.items.length,
                minutes: playlistTotalMinutes(editing.items),
                status: status.saved
                  ? status.label
                  : t("playlist-editor-draft", { defaultValue: "Draft" }),
                defaultValue: "{{steps}} items · {{minutes}} min · {{status}}",
              })}
            </p>
          </div>
          {item ? (
            <StepActions playlists={playlists} index={index} square />
          ) : null}
        </header>
        {children}
        {card}
        <div className="sb-pe sb-pe-mobile-bottom">
          <VersePickBar state={state} />
          <div className="sb-pe-mobile-bottom-row">
            <button
              type="button"
              className="sb-pe-items-button"
              aria-expanded={sheetOpen}
              onClick={() => (playlists.editorStepsSheetOpen.value = true)}
            >
              <PeIcon name="items-list" />
              {t("playlist-editor-items", { defaultValue: "Items" })}
              <span className="sb-pe-items-badge">
                {t("playlist-editor-step-of", {
                  step: Math.max(index + 1, 0),
                  count: editing.items.length,
                  defaultValue: "{{step}}/{{count}}",
                })}
              </span>
            </button>
            <AddStepButton playlists={playlists} short />
            <PublishButton state={state} />
          </div>
          {addMenu ? (
            <AddStepMenu
              playlists={playlists}
              afterIndex={addMenu.afterIndex}
            />
          ) : null}
        </div>
        {sheetOpen ? (
          <>
            <div
              className="sb-pe-sheet-scrim"
              onClick={() => (playlists.editorStepsSheetOpen.value = false)}
            />
            <div
              className="sb-pe sb-pe-sheet"
              role="dialog"
              aria-label={t("playlist-editor-items", { defaultValue: "Items" })}
            >
              <div className="sb-pe-sheet-handle" />
              <PlaylistEditorPanel
                playlists={playlists}
                tabs={tabs}
                modals={modals}
                inSheet
              />
            </div>
          </>
        ) : null}
      </div>
    );
  }

  return (
    <div className={workspaceClass}>
      {item && !preview ? (
        <div className="sb-pe sb-pe-toolbar">
          <div className="sb-pe-toolbar-settings">
            <StepSettings playlists={playlists} index={index} item={item} />
          </div>
          <StepActions playlists={playlists} index={index} />
        </div>
      ) : null}
      {children}
      {card}
      <div className="sb-pe sb-pe-bottom">
        <VersePickBar state={state} />
        <div className="sb-pe-actionbar">
          <ModeSwitch playlists={playlists} />
          <PublishButton state={state} />
        </div>
      </div>
    </div>
  );
}
