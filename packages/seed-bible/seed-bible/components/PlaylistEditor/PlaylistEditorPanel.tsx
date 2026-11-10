import "./PlaylistEditor.css";
import type { ComponentChildren } from "preact";
import { useCallback, useEffect, useRef } from "preact/hooks";
import { useI18n } from "../../i18n/I18nManager";
import type {
  NewPlaylistStepKind,
  PlaylistManager,
} from "../../managers/PlaylistManager";
import type { ModalManager } from "../../managers/ModalManager";
import type { TabsManager } from "../../managers/TabsManager";
import { useDragReorder } from "../useDragReorder";
import { PlaylistStepRow } from "../PlaylistOverview/PlaylistOverview";
import { PeIcon } from "./editorControls";
import {
  playlistStepKindName,
  playlistStepLabel,
  playlistTotalMinutes,
} from "./playlistSteps";

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
 * The back arrow at the start of the editor's title bar (the side panel's on
 * desktop, the editor's own header on a phone). The editor's list of steps
 * and each step opened from it are pages: from a step, Back returns to the
 * list; from the list, it leaves the editor, asking first if there are
 * unsaved changes. Points left, or right in RTL languages, where the title
 * bar is mirrored.
 */
export function PlaylistEditorBackButton(props: {
  playlists: PlaylistManager;
  modals: ModalManager;
}) {
  const { playlists, modals } = props;
  const { t, isRtl } = useI18n();
  const onStep = playlists.editorStepIndex.value >= 0;
  const label = onStep
    ? t("playlist-editor-back-to-items", { defaultValue: "Back to items" })
    : t("playlist-editor-close", { defaultValue: "Close playlist editor" });
  return (
    <button
      type="button"
      className="sb-pe-back"
      aria-label={label}
      title={label}
      onClick={() => {
        if (onStep) {
          playlists.selectEditorStep(-1);
        } else {
          requestCancelPlaylistEditor(playlists, modals);
        }
      }}
    >
      <PeIcon
        name="arrow-right"
        className={isRtl ? undefined : "sb-pe-back-icon--flipped"}
      />
    </button>
  );
}

/**
 * Leaves the playlist editor. If the draft changed since it opened, asks first
 * instead of discarding it.
 */
export function requestCancelPlaylistEditor(
  playlists: PlaylistManager,
  modals: ModalManager
): void {
  if (!playlists.isEditingPlaylistDirty()) {
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
          playlists.saveEditingPlaylist().catch((error: unknown) => {
            console.error("Failed to save playlist:", error);
          });
        }}
      />
    ),
  });
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
export function usePlaylistDraftStatus(playlists: PlaylistManager): {
  saved: boolean;
  label: string;
} {
  const { t } = useI18n();
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
      <div className="sb-pe-empty-list">
        <PeIcon name="items-list" />
        <p className="sb-pe-empty-list-title">
          {t("playlist-editor-empty-title", {
            defaultValue: "This playlist is empty",
          })}
        </p>
        <p className="sb-pe-empty-list-text">
          {t("playlist-editor-empty-text", {
            defaultValue:
              "Add scripture, notes, questions or videos to get started.",
          })}
        </p>
        <button
          type="button"
          className="sb-pe-empty-list-add"
          onClick={() => openAddStepMenu(playlists)}
        >
          <span aria-hidden="true">+</span>
          {t("playlist-editor-add-step-title", { defaultValue: "Add a step" })}
        </button>
      </div>
    );
  }

  return (
    <ul className="sb-discover-list sb-playlist-page-items sb-pe-steps">
      {items.map((item, index) => {
        const active = index === openIndex;
        // On the list page no step is open, so every step can be dragged.
        const draggable = active || openIndex < 0;
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
            dragHandleProps={draggable ? getHandleProps(index) : undefined}
            dragLabel={t("drag-to-reorder-playlist-item", {
              defaultValue: "Drag to reorder",
            })}
            handleClassName="sb-pe-step-handle"
            openClassName="sb-pe-step-open"
            onOpen={() => playlists.selectEditorStep(index)}
            trailing={
              active ? (
                <div className="sb-pe-step-actions">
                  {pickIndex === index ? (
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
                      <button
                        type="button"
                        className="sb-pe-step-action"
                        aria-label={t("playlist-editor-duplicate-step", {
                          defaultValue: "Duplicate step",
                        })}
                        onClick={() =>
                          playlists.duplicateEditingPlaylistItem(index)
                        }
                      >
                        <PeIcon name="copy" />
                      </button>
                      <button
                        type="button"
                        className="sb-pe-step-action sb-pe-step-action--danger"
                        aria-label={t("playlist-editor-delete-step", {
                          defaultValue: "Delete step",
                        })}
                        onClick={() =>
                          playlists.removeEditingPlaylistItem(index)
                        }
                      >
                        <PeIcon name="trash" />
                      </button>
                    </>
                  )}
                </div>
              ) : null
            }
          />
        );
      })}
    </ul>
  );
}

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
  playlists: PlaylistManager;
  afterIndex: number;
}) {
  const { playlists, afterIndex } = props;
  const { t } = useI18n();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const close = useCallback(() => {
    playlists.editorAddMenu.value = null;
  }, [playlists]);

  useEffect(() => {
    menuRef.current
      ?.querySelector<HTMLButtonElement>(".sb-pe-add-option")
      ?.focus({ focusVisible: false } as FocusOptions);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };
    // The buttons that open the menu toggle it themselves, so a press on one
    // isn't treated as a click outside (which would close the menu only for
    // the button to open it again).
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (
        target &&
        !menuRef.current?.contains(target) &&
        !target.closest(".sb-pe-add-toggle, .sb-pe-empty-list-add")
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
        <button
          type="button"
          className="sb-pe-add-menu-close"
          aria-label={t("close", { defaultValue: "Close" })}
          onClick={close}
        >
          <PeIcon name="close" />
        </button>
      </div>
      <p className="sb-pe-add-menu-where">
        {afterIndex < 0
          ? t("playlist-editor-inserted-first", {
              defaultValue: "Inserted as the first step",
            })
          : t("playlist-editor-inserted-after", {
              step: afterIndex + 1,
              defaultValue: "Inserted after step {{step}}",
            })}
      </p>
      <ul className="sb-pe-add-menu-list">
        {ADD_OPTIONS.map((kind) => (
          <li key={kind}>
            <button
              type="button"
              className="sb-pe-add-option"
              onClick={() => playlists.addEditorStep(kind, afterIndex)}
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

/** Opens the "Add a step" menu, placing new steps after the open one. */
export function openAddStepMenu(playlists: PlaylistManager) {
  const count = playlists.editingPlaylist.peek()?.items.length ?? 0;
  const open = playlists.editorStepIndex.peek();
  playlists.editorAddMenu.value = {
    afterIndex: open >= 0 ? open : count - 1,
  };
}

/**
 * A title bar's Add button, which opens the "Add a step" menu below the bar:
 * after the open step on a phone's step page, at the end on the list.
 */
export function AddStepToggle(props: { playlists: PlaylistManager }) {
  const { playlists } = props;
  const { t } = useI18n();
  const menuOpen = playlists.editorAddMenu.value !== null;
  const add = t("playlist-editor-add-step-title", {
    defaultValue: "Add a step",
  });
  return (
    <button
      type="button"
      className="sb-pe-square-button sb-pe-add-toggle"
      aria-label={add}
      title={add}
      aria-expanded={menuOpen}
      onClick={() => {
        if (menuOpen) {
          playlists.editorAddMenu.value = null;
        } else {
          openAddStepMenu(playlists);
        }
      }}
    >
      {/* Drawn rather than typed: a "+" sits on the text line, below the
          button's middle. */}
      <svg
        className="sb-pe-add-toggle-plus"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
    </button>
  );
}

/**
 * The playlist's name, which opens its details (name, description and cover)
 * to edit, as a phone's title bar does.
 */
function PlaylistTitle(props: { playlists: PlaylistManager }) {
  const { playlists } = props;
  const { t } = useI18n();
  const title = playlists.editingPlaylist.value?.title ?? "";
  const shown =
    title.trim() ||
    t("untitled-playlist", { defaultValue: "Untitled playlist" });

  return (
    <div className="sb-pe-panel-title-row">
      <h2 className="sb-pe-panel-title">
        <button
          type="button"
          className="sb-pe-panel-title-button"
          aria-haspopup="dialog"
          aria-expanded={playlists.editorDetailsSheetOpen.value}
          title={t("playlist-editor-edit-details", {
            defaultValue: "Edit title, description and cover",
          })}
          onClick={() => (playlists.editorDetailsSheetOpen.value = true)}
        >
          <span className="sb-pe-panel-title-text" dir="auto">
            {shown}
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
 * The desktop editor's side pane: the playlist's name, with Add in its title
 * bar as on a phone, above its list of steps.
 */
export function PlaylistEditorPanel(props: {
  playlists: PlaylistManager;
  tabs: TabsManager;
  modals: ModalManager;
  /** Extra buttons at the end of the title bar. */
  headerActions?: ComponentChildren;
  /** At the foot of the panel, such as Save. */
  footerActions?: ComponentChildren;
}) {
  const { playlists, tabs, modals, headerActions, footerActions } = props;
  const status = usePlaylistDraftStatus(playlists);
  const addMenu = playlists.editorAddMenu.value;

  return (
    <div className="sb-pe sb-pe-panel">
      <div className="sb-pe-panel-header">
        <PlaylistEditorBackButton playlists={playlists} modals={modals} />
        <div className="sb-pe-panel-heading">
          <PlaylistTitle playlists={playlists} />
          <p className="sb-pe-panel-status">{status.label}</p>
        </div>
        <div className="sb-pe-panel-header-actions">
          <AddStepToggle playlists={playlists} />
          {headerActions}
        </div>
        {addMenu ? (
          <AddStepMenu playlists={playlists} afterIndex={addMenu.afterIndex} />
        ) : null}
      </div>
      <div className="sb-pe-panel-body">
        <PlaylistStepsSummary playlists={playlists} tabs={tabs} />
      </div>
      {footerActions ? (
        <div className="sb-pe-panel-footer">
          <div className="sb-pe-panel-footer-row">{footerActions}</div>
        </div>
      ) : null}
    </div>
  );
}
