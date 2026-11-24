import { EmptyState } from "../EmptyState/EmptyState";
import "./PlaylistEditor.css";
import type { ComponentChildren } from "preact";
import { useCallback, useEffect, useRef } from "preact/hooks";
import { useI18n } from "../../i18n/I18nManager";
import type {
  NewPlaylistStepKind,
  PlaylistManager,
} from "../../managers/PlaylistManager";
import type { ModalManager } from "../../managers/ModalManager";
import type { StepEditor } from "../../managers/StepEditor";
import type { TabsManager } from "../../managers/TabsManager";
import { useDragReorder } from "../useDragReorder";
import { PlaylistStepRow } from "../PlaylistOverview/PlaylistOverview";
import { PeIcon } from "./editorControls";
import type { StepEditorPanelHost } from "./stepEditorHost";
import {
  playlistStepKindName,
  playlistStepLabel,
  playlistTotalMinutes,
} from "./playlistSteps";
import { Button } from "../Button/Button";
import { IconButton } from "../IconButton/IconButton";
import { CloseButton } from "../CloseButton/CloseButton";

const UNSAVED_CHANGES_CONFIRM_MODAL_ID = "step-editor-unsaved-changes-confirm";

function UnsavedChangesConfirmModalContent(props: {
  onDiscard: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
}) {
  const { onDiscard, onSaveDraft, onPublish } = props;
  const { t } = useI18n();

  return (
    <div className="sb-confirm-delete">
      <p className="sb-confirm-delete-message">
        {t("unsaved-changes-message", {
          defaultValue: "You have unsaved changes. What would you like to do?",
        })}
      </p>
      <div className="sb-confirm-delete-actions sb-unsaved-changes-actions">
        <Button variant="secondary" onClick={onDiscard}>
          {t("playlist-editor-discard-changes", {
            defaultValue: "Discard Changes",
          })}
        </Button>
        <Button variant="secondary" onClick={onSaveDraft}>
          {t("playlist-editor-save-draft", { defaultValue: "Save Draft" })}
        </Button>
        <Button variant="primary" onClick={onPublish}>
          {t("playlist-editor-save-and-publish", {
            defaultValue: "Save & Publish",
          })}
        </Button>
      </div>
    </div>
  );
}

/**
 * The back arrow at the start of the editor's title bar (the side panel's on
 * desktop, the editor's own header on a phone). The editor's list of steps
 * and each step opened from it are pages: from a step, Back returns to the
 * list; from the list, it leaves the editor, asking first if there are
 * unsaved changes. Points left, or right in RTL languages, where the title
 * bar is mirrored.
 */
export function StepEditorBackButton(props: { host: StepEditorPanelHost }) {
  const { host } = props;
  const { editor } = host;
  const { t, isRtl } = useI18n();
  const onStep = editor.stepIndex.value >= 0;
  return (
    <IconButton
      className="sb-pe-back"
      label={
        onStep
          ? t("playlist-editor-back-to-items", {
              defaultValue: "Back to items",
            })
          : host.closeLabel(t)
      }
      icon={
        <PeIcon
          name="arrow-right"
          className={isRtl ? undefined : "sb-pe-back-icon--flipped"}
        />
      }
      onClick={() => {
        if (onStep) {
          editor.selectStep(-1);
        } else {
          host.requestClose();
        }
      }}
    />
  );
}

/**
 * Asks what to do with the unsaved changes of the draft being left: throw
 * them away, keep them as a draft, or publish them.
 */
export function openUnsavedChangesModal(
  modals: ModalManager,
  choices: {
    onDiscard: () => void;
    onSaveDraft: () => void;
    onPublish: () => void;
  }
): void {
  const closeThen = (choice: () => void) => () => {
    modals.closeModal(UNSAVED_CHANGES_CONFIRM_MODAL_ID);
    choice();
  };
  modals.openModal({
    id: UNSAVED_CHANGES_CONFIRM_MODAL_ID,
    title: {
      key: "unsaved-changes",
      defaultValue: "Unsaved changes",
    },
    content: () => (
      <UnsavedChangesConfirmModalContent
        onDiscard={closeThen(choices.onDiscard)}
        onSaveDraft={closeThen(choices.onSaveDraft)}
        onPublish={closeThen(choices.onPublish)}
      />
    ),
  });
}

/**
 * Leaves the playlist editor. If the draft changed since it opened, asks first
 * instead of discarding it.
 */
function requestCancelPlaylistEditor(
  playlists: PlaylistManager,
  modals: ModalManager
): void {
  if (!playlists.isEditingPlaylistDirty()) {
    playlists.cancelEditingPlaylist();
    return;
  }
  openUnsavedChangesModal(modals, {
    onDiscard: () => playlists.cancelEditingPlaylist(),
    onSaveDraft: () => playlists.leaveEditorKeepingDraft(),
    onPublish: () => {
      // A playlist with an unfinished step can't be saved: stay, on the
      // first such step, to finish it.
      const [unfinished] = playlists.editingPlaylistInvalidSteps();
      if (unfinished !== undefined) {
        playlists.selectEditorStep(unfinished);
        return;
      }
      playlists.saveEditingPlaylist().catch((error: unknown) => {
        console.error("Failed to save playlist:", error);
      });
    },
  });
}

/** The playlist editor's side of the step editor. */
export function playlistEditorPanelHost(props: {
  playlists: PlaylistManager;
  tabs: TabsManager;
  modals: ModalManager;
}): StepEditorPanelHost {
  const { playlists, tabs, modals } = props;
  return {
    editor: playlists.stepEditor,
    title: (t) =>
      playlists.editingPlaylist.value?.title?.trim() ||
      t("untitled-playlist", { defaultValue: "Untitled playlist" }),
    status: (t) => playlistDraftStatus(playlists, t),
    closeLabel: (t) =>
      t("playlist-editor-close", { defaultValue: "Close playlist editor" }),
    requestClose: () => requestCancelPlaylistEditor(playlists, modals),
    editDetailsLabel: (t) =>
      t("playlist-editor-edit-details", {
        defaultValue: "Edit title, description and cover",
      }),
    addMenuPlace: (afterIndex, t) =>
      afterIndex < 0
        ? t("playlist-editor-inserted-first", {
            defaultValue: "Inserted as the first step",
          })
        : t("playlist-editor-inserted-after", {
            step: afterIndex + 1,
            defaultValue: "Inserted after step {{step}}",
          }),
    renderSteps: () => (
      <PlaylistStepsSummary playlists={playlists} tabs={tabs} />
    ),
  };
}

/**
 * Turns a book id into its name in the translation being read, falling back
 * to the id while the book list hasn't loaded.
 */
export function useResolveBookName(tabs: TabsManager) {
  const selectedTab =
    tabs.tabs.value.find((tab) => tab.id === tabs.selectedTabId.value) ?? null;
  const books = selectedTab?.readingState.translationBooks.value?.books ?? [];
  return (bookId: string): string => {
    const book = books.find((b) => b.id === bookId);
    return book?.name ?? book?.commonName ?? bookId;
  };
}

/** "Draft - Unsaved changes", "Draft", or "Saved", for the open draft. */
function playlistDraftStatus(
  playlists: PlaylistManager,
  t: ReturnType<typeof useI18n>["t"]
): { saved: boolean; label: string } {
  const editing = playlists.editingPlaylist.value;
  const dirty = playlists.isEditingPlaylistDirty();
  const stored =
    !!editing && playlists.userPlaylists.value.some((p) => p.id === editing.id);
  if (stored && !dirty) {
    return {
      saved: true,
      label: t("playlist-editor-saved", { defaultValue: "Saved" }),
    };
  }
  return {
    saved: false,
    label: dirty
      ? t("playlist-editor-unsaved", {
          defaultValue: "Draft - Unsaved changes",
        })
      : t("playlist-editor-draft", { defaultValue: "Draft" }),
  };
}

/** The open step's Duplicate and Delete, at the end of its row. */
export function StepRowActions(props: {
  editor: StepEditor;
  index: number;
  /** Whether its verses are being picked, which comes first. */
  picking: boolean;
}) {
  const { editor, index, picking } = props;
  const { t } = useI18n();
  return (
    <div className="sb-pe-step-actions">
      {picking ? (
        <span
          className="sb-pe-step-action"
          title={t("playlist-editor-picking-verses", {
            defaultValue: "Picking verses",
          })}
        >
          <PeIcon name="pencil" />
        </span>
      ) : (
        <>
          <IconButton
            size="sm"
            className="sb-pe-step-action"
            icon={<PeIcon name="copy" />}
            label={t("playlist-editor-duplicate-step", {
              defaultValue: "Duplicate step",
            })}
            onClick={() => editor.duplicateItem(index)}
          />
          <IconButton
            size="sm"
            className="sb-pe-step-action sb-pe-step-action--danger"
            icon={<PeIcon name="trash" />}
            label={t("playlist-editor-delete-step", {
              defaultValue: "Delete step",
            })}
            onClick={() => editor.removeItem(index)}
          />
        </>
      )}
    </div>
  );
}

/** A draft with no steps yet: says so, with a button that adds the first. */
export function EmptyStepList(props: { editor: StepEditor; title: string }) {
  const { editor, title } = props;
  const { t } = useI18n();
  return (
    <EmptyState
      className="sb-pe-empty-list"
      size="panel"
      icon={<PeIcon name="items-list" />}
      title={title}
      action={
        <Button
          size="lg"
          icon="add"
          className="sb-pe-empty-list-add"
          {...ADD_MENU_OPENER}
          onClick={editor.openAddMenu}
        >
          {t("playlist-editor-add-step-title", {
            defaultValue: "Add a step",
          })}
        </Button>
      }
    >
      {t("playlist-editor-empty-text", {
        defaultValue:
          "Add scripture, notes, questions or videos to get started.",
      })}
    </EmptyState>
  );
}

/** The steps of the open draft, each opening in the editor when clicked. */
export function PlaylistStepList(props: {
  playlists: PlaylistManager;
  tabs: TabsManager;
}) {
  const { playlists, tabs } = props;
  const { t } = useI18n();
  const resolveBookName = useResolveBookName(tabs);
  const items = playlists.editingPlaylist.value?.items ?? [];
  const openIndex = playlists.editorStepIndex.value;
  const pickIndex = playlists.editorVersePickIndex.value;
  const invalid = new Set(playlists.editingPlaylistInvalidSteps());

  const onReorder = useCallback(
    (from: number, to: number) =>
      void playlists.reorderEditingPlaylistItem(from, to),
    [playlists]
  );
  const { getRowClassName, getHandleProps } = useDragReorder({
    itemCount: items.length,
    onReorder,
  });

  if (items.length === 0) {
    return (
      <EmptyStepList
        editor={playlists.stepEditor}
        title={t("playlist-editor-empty-title", {
          defaultValue: "This playlist is empty",
        })}
      />
    );
  }

  return (
    <ul className="sb-discover-list sb-playlist-page-items sb-pe-steps">
      {items.map((item, index) => {
        const active = index === openIndex;
        return (
          <PlaylistStepRow
            key={index}
            item={item}
            resolveBookName={resolveBookName}
            label={playlistStepLabel(item, t, resolveBookName)}
            current={active}
            ariaCurrent={active ? "step" : undefined}
            className={`sb-pe-step${active ? " sb-pe-step--active" : ""}${
              invalid.has(index) ? " sb-pe-step--invalid" : ""
            }${getRowClassName(index)}`}
            dragHandleProps={getHandleProps(index)}
            dragLabel={t("drag-to-reorder-playlist-item", {
              defaultValue: "Drag to reorder",
            })}
            handleClassName="sb-pe-step-handle"
            openClassName="sb-pe-step-open"
            onOpen={() => playlists.selectEditorStep(index)}
            trailing={
              active ? (
                <StepRowActions
                  editor={playlists.stepEditor}
                  index={index}
                  picking={pickIndex === index}
                />
              ) : null
            }
          />
        );
      })}
    </ul>
  );
}

/**
 * Put on every button that opens the "Add a step" menu. They work it
 * themselves, so the menu doesn't treat a press on one as a click outside
 * (which would close it only for the button to open it again).
 */
export const ADD_MENU_OPENER = { "data-sb-add-menu-opener": "" };

const ADD_OPTIONS: NewPlaylistStepKind[] = [
  "scripture",
  "note",
  "video",
  "link",
  "question",
  "compare",
];

function addOptionDescription(
  kind: NewPlaylistStepKind,
  t: ReturnType<typeof useI18n>["t"]
): string {
  switch (kind) {
    case "scripture":
      return t("playlist-editor-add-scripture-desc", {
        defaultValue: "A passage from the Bible",
      });
    case "note":
      return t("playlist-editor-add-note-desc", {
        defaultValue: "Your own words between steps",
      });
    case "video":
      return t("playlist-editor-add-video-desc", {
        defaultValue: "A YouTube or Vimeo link",
      });
    case "link":
      return t("playlist-editor-add-link-desc", {
        defaultValue: "Any web page, videos included",
      });
    case "question":
      return t("playlist-editor-add-question-desc", {
        defaultValue: "Ask readers to reflect",
      });
    case "compare":
      return t("playlist-editor-add-compare-desc", {
        defaultValue: "Two passages side by side",
      });
  }
}

function AddOptionIcon(props: { kind: NewPlaylistStepKind }) {
  const glyph =
    props.kind === "scripture" ? (
      <PeIcon name="book-open" />
    ) : props.kind === "note" ? (
      <PeIcon name="pencil" />
    ) : props.kind === "video" ? (
      "▷"
    ) : props.kind === "link" ? (
      <PeIcon name="link" />
    ) : props.kind === "question" ? (
      "?"
    ) : (
      <span className="sb-pe-compare-glyph" />
    );
  return (
    <span
      className={`sb-pe-add-option-icon sb-pe-add-option-icon--${props.kind}`}
      aria-hidden="true"
    >
      {glyph}
    </span>
  );
}

/** The "Add a step" menu, opened from a title bar's Add button. */
export function AddStepMenu(props: {
  host: StepEditorPanelHost;
  afterIndex: number;
}) {
  const { host, afterIndex } = props;
  const { editor } = host;
  const { t } = useI18n();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const close = useCallback(() => {
    editor.addMenu.value = null;
  }, [editor]);

  useEffect(() => {
    menuRef.current
      ?.querySelector<HTMLButtonElement>(".sb-pe-add-option")
      ?.focus({ focusVisible: false } as FocusOptions);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (
        target &&
        !menuRef.current?.contains(target) &&
        !target.closest("[data-sb-add-menu-opener]")
      ) {
        close();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [close]);

  return (
    <div
      ref={menuRef}
      className="sb-pe-add-menu"
      role="dialog"
      aria-labelledby="sb-pe-add-menu-title"
    >
      <div className="sb-pe-add-menu-header">
        <h3 id="sb-pe-add-menu-title" className="sb-pe-add-menu-title">
          {t("playlist-editor-add-step-title", { defaultValue: "Add a step" })}
        </h3>
        <CloseButton className="sb-pe-add-menu-close" onClose={close} />
      </div>
      <p className="sb-pe-add-menu-where">{host.addMenuPlace(afterIndex, t)}</p>
      <ul className="sb-pe-add-menu-list">
        {ADD_OPTIONS.map((kind) => (
          <li key={kind}>
            <button
              type="button"
              className="sb-pe-add-option"
              onClick={() => editor.addStep(kind, afterIndex)}
            >
              <AddOptionIcon kind={kind} />
              <span className="sb-pe-add-option-text">
                <span className="sb-pe-add-option-name">
                  {playlistStepKindName(kind, t)}
                </span>
                <span className="sb-pe-add-option-desc">
                  {addOptionDescription(kind, t)}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * A title bar's Add button, which opens the "Add a step" menu below the bar:
 * after the open step on a phone's step page, at the end on the list.
 */
export function AddStepToggle(props: { editor: StepEditor }) {
  const { editor } = props;
  const { t } = useI18n();
  const menuOpen = editor.addMenu.value !== null;
  const add = t("playlist-editor-add-step-title", {
    defaultValue: "Add a step",
  });
  return (
    <IconButton
      size="lg"
      className="sb-pe-add-toggle"
      label={add}
      aria-expanded={menuOpen}
      {...ADD_MENU_OPENER}
      onClick={() => {
        if (menuOpen) {
          editor.addMenu.value = null;
        } else {
          editor.openAddMenu();
        }
      }}
      // Drawn rather than typed: a "+" sits on the text line, below the
      // button's middle.
      icon={
        <svg className="sb-pe-add-toggle-plus" viewBox="0 0 24 24">
          <path d="M12 5v14M5 12h14" />
        </svg>
      }
    />
  );
}

/**
 * The name of what's being edited, which opens its details (name, description
 * and cover) to edit, as a phone's title bar does.
 */
function StepEditorTitle(props: { host: StepEditorPanelHost }) {
  const { host } = props;
  const { editor } = host;
  const { t } = useI18n();

  return (
    <div className="sb-pe-panel-title-row">
      <h2 className="sb-pe-panel-title">
        <button
          type="button"
          className="sb-pe-panel-title-button"
          aria-haspopup="dialog"
          aria-expanded={editor.detailsOpen.value}
          title={host.editDetailsLabel(t)}
          onClick={() => (editor.detailsOpen.value = true)}
        >
          <span className="sb-pe-panel-title-text" dir="auto">
            {host.title(t)}
          </span>
          <PeIcon name="pencil" />
        </button>
      </h2>
    </div>
  );
}

/** The steps of the open draft and how long they take. */
export function PlaylistStepsSummary(props: {
  playlists: PlaylistManager;
  tabs: TabsManager;
}) {
  const { playlists, tabs } = props;
  const { t } = useI18n();
  const items = playlists.editingPlaylist.value?.items ?? [];
  return (
    <>
      {items.length > 0 ? (
        <p className="sb-pe-step-count">
          {t("playlist-editor-step-count", {
            steps: items.length,
            minutes: playlistTotalMinutes(items),
            defaultValue: "{{steps}} steps · ~{{minutes}} min",
          })}
        </p>
      ) : null}
      <PlaylistStepList playlists={playlists} tabs={tabs} />
    </>
  );
}

/**
 * The desktop editor's side pane: the name of what's being edited, with Add
 * in its title bar as on a phone, above its list of steps.
 */
export function StepEditorPanel(props: {
  host: StepEditorPanelHost;
  /** Extra buttons at the end of the title bar. */
  headerActions?: ComponentChildren;
  /** At the foot of the panel, such as Save. */
  footerActions?: ComponentChildren;
}) {
  const { host, headerActions, footerActions } = props;
  const { editor } = host;
  const { t } = useI18n();
  const addMenu = editor.addMenu.value;

  return (
    <div className="sb-pe sb-pe-panel">
      <div className="sb-pe-panel-header">
        <StepEditorBackButton host={host} />
        <div className="sb-pe-panel-heading">
          <StepEditorTitle host={host} />
          <p className="sb-pe-panel-status">{host.status(t).label}</p>
        </div>
        <div className="sb-pe-panel-header-actions">
          <AddStepToggle editor={editor} />
          {headerActions}
        </div>
        {addMenu ? (
          <AddStepMenu host={host} afterIndex={addMenu.afterIndex} />
        ) : null}
      </div>
      <div className="sb-pe-panel-body">{host.renderSteps()}</div>
      {footerActions ? (
        <div className="sb-pe-panel-footer">
          <div className="sb-pe-panel-footer-row">{footerActions}</div>
        </div>
      ) : null}
    </div>
  );
}

/** The playlist editor's side pane on desktop. */
export function PlaylistEditorPanel(props: {
  playlists: PlaylistManager;
  tabs: TabsManager;
  modals: ModalManager;
  headerActions?: ComponentChildren;
  footerActions?: ComponentChildren;
}) {
  const { playlists, tabs, modals, headerActions, footerActions } = props;
  return (
    <StepEditorPanel
      host={playlistEditorPanelHost({ playlists, tabs, modals })}
      headerActions={headerActions}
      footerActions={footerActions}
    />
  );
}
