import "./PlaylistEditorScreen.css";
import { useState } from "preact/hooks";
import { useI18n } from "../../i18n/I18nManager";
import type { TabsManager } from "../../managers/TabsManager";
import type {
  PlaylistItemData,
  PlaylistManager,
} from "../../managers/PlaylistManager";
import type { ModalManager } from "../../managers/ModalManager";
import type { ChatsManager } from "../../managers/ChatsManager";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import { formatRelativeTime } from "../../app/utils";
import { MaterialIcon } from "../icons";
import {
  ADD_MODES,
  PlaylistItemInput,
  modeForItem,
  type AddMode,
} from "../PlaylistItemInput/PlaylistItemInput";
import { scriptureRefsLabel, verseRefLabel } from "../playlistItemLabel";
import {
  minutesLabel,
  playlistItemAutoMinutes,
  playlistItemKind,
  playlistItemMinutes,
  playlistMinutes,
} from "../playlistItemSubtitle";
import {
  PlaylistCoverField,
  PlaylistDescriptionField,
  PlaylistTitleField,
  requestCancelPlaylistEditor,
} from "./playlistEditorFields";
import { PlaylistEditorAiButton } from "./PlaylistEditorAiButton";
import { usePlaylistEditor } from "./usePlaylistEditor";
import { PlaylistEditorStepList } from "./PlaylistEditorStepList";
import { PlaylistReviewPanel } from "./PlaylistReviewPanel";
import { PlaylistStepPreview } from "./PlaylistStepPreview";
import { openAddStepModal } from "./AddStepModal";

/** Pane title; the screen draws its own header, so this only names the pane. */
export function PlaylistEditorScreenTitle(props: {
  playlists: PlaylistManager;
}) {
  const { t } = useI18n();
  return (
    <>
      {props.playlists.editingPlaylist.value?.title ||
        t("playlist-editor", { defaultValue: "Playlist editor" })}
    </>
  );
}

interface PlaylistEditorScreenProps {
  state: SeedBibleState;
  playlists: PlaylistManager;
  tabs: TabsManager;
  modals: ModalManager;
  chats: ChatsManager;
  openChatPanel: () => void;
}

/** The kinds a step can be switched to from its settings, in the design's order. */
const TYPE_MODES: AddMode[] = [
  "text",
  "scripture",
  "note-scripture",
  "compare",
  "video",
  "question",
];

const COVER_MODAL_ID = "playlist-editor-cover";

/**
 * The playlist editor, in three screens. A new playlist starts on its
 * details (title, description, cover). The steps screen lists the steps
 * down the left, the open step's editor (or a preview of it) in the middle,
 * and the step's settings on the right, with the details still editable in
 * its header. Review & publish shows the playlist as a shared link would,
 * and is where it is saved. On a phone the steps screen shows the list or
 * the open step, one at a time. Edits are kept as the author moves between
 * steps and screens.
 */
export function PlaylistEditorScreen(props: PlaylistEditorScreenProps) {
  const { state, playlists, tabs, modals, chats, openChatPanel } = props;
  const { t, language } = useI18n();
  const editor = usePlaylistEditor({
    playlists,
    tabs,
    modals,
    bibleData: state.bibleData,
    autoCommit: true,
  });
  const {
    editing,
    items,
    saving,
    openIndex,
    openItem,
    setOpenIndex,
    setAddOpen,
    addItem,
    updateOpenItemSettings,
    stepIssues,
    editInputRef,
    books,
    resolveBookName,
    loadChapter,
    requestOpen,
    removeItem,
    stepCount,
    stepLinkTargets,
    handleSave,
    hasUnsavedItemInput,
    saveOpenItem,
  } = editor;

  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const translationName =
    tabs.tabs.value.find((tab) => tab.id === tabs.selectedTabId.value)
      ?.readingState.translation?.value?.shortName ?? undefined;
  const narrow = state.app?.isMobile?.value ?? false;
  // A playlist with nothing in it yet starts on its details.
  const [screen, setScreen] = useState<"details" | "steps" | "review">(() => {
    const draft = playlists.editingPlaylist.peek();
    return draft && !draft.title && draft.items.length === 0
      ? "details"
      : "steps";
  });
  const openReview = () => {
    const proceed = () => {
      setOpenIndex(null);
      setAddOpen(false);
      setScreen("review");
    };
    if (openIndex !== null && editInputRef.current?.isDirty()) {
      void saveOpenItem().then((saved) => {
        if (saved) proceed();
      });
      return;
    }
    proceed();
  };

  const openStepNumber = openIndex !== null ? openIndex + 1 : null;
  const dirty = playlists.isEditingPlaylistDirty() || hasUnsavedItemInput();
  const isSaved = playlists.userPlaylists.value.some(
    (playlist) => playlist.id === editing?.id
  );
  const draftLine = dirty
    ? t("playlist-editor-draft-unsaved", {
        defaultValue: "Draft · unsaved changes",
      })
    : isSaved && editing
      ? t("playlist-editor-draft-saved", {
          defaultValue: "Draft · saved {{when}}",
          when: formatRelativeTime(editing.updatedAtMs, language),
        })
      : t("playlist-editor-draft-new", {
          defaultValue: "Draft · not saved yet",
        });

  const leave = () =>
    requestCancelPlaylistEditor(playlists, modals, hasUnsavedItemInput());

  const openCover = () =>
    modals.openModal({
      id: COVER_MODAL_ID,
      title: t("hero-image", { defaultValue: "Cover image" }),
      content: () => (
        <PlaylistCoverField
          playlists={playlists}
          modals={modals}
          os={state.os}
          login={state.login}
          gallery={state.gallery}
        />
      ),
    });

  // "Add a step" and a change of kind both go through the modal; the step
  // lands after the open one (or at the end), or in the changed step's place.
  const openAddStep = (options: { replace?: number; mode?: AddMode }) => {
    const proceed = () => {
      const after = options.replace === undefined ? openIndex : null;
      const position =
        after !== null
          ? t("playlist-editor-add-after", {
              defaultValue: "After step {{step}}",
              step: after + 1,
            })
          : "";
      openAddStepModal(modals, t, {
        books,
        loadChapter,
        steps: stepLinkTargets,
        initialMode: options.mode,
        position: position || undefined,
        title:
          options.replace !== undefined
            ? t("playlist-editor-change-type", {
                defaultValue: "Change the step's type",
              })
            : undefined,
        onAdd: (item) => {
          if (options.replace !== undefined) {
            const old = items[options.replace];
            const settings = old
              ? {
                  ...(old.minutes ? { minutes: old.minutes } : {}),
                  ...(old.pause ? { pause: true } : {}),
                  ...(old.leaderOnly ? { leaderOnly: true } : {}),
                }
              : {};
            playlists.updateEditingPlaylistItem(options.replace, {
              ...settings,
              ...item,
            });
            setOpenIndex(options.replace);
            return;
          }
          if (after !== null && after < items.length - 1) {
            playlists.insertEditingPlaylistItem(after + 1, item);
            setOpenIndex(after + 1);
            return;
          }
          playlists.addEditingPlaylistItem(item);
          setOpenIndex(items.length);
        },
      });
    };
    if (openIndex !== null && editInputRef.current?.isDirty()) {
      void saveOpenItem().then((saved) => {
        if (saved) proceed();
      });
      return;
    }
    proceed();
  };

  const issues = openIndex !== null ? (stepIssues.get(openIndex) ?? []) : [];

  if (screen === "details") {
    return (
      <div className="sb-playlist-editor sb-playlist-details">
        <header className="sb-playlist-editor-header">
          <button
            type="button"
            className="sb-reading-plans-back sb-playlist-editor-back"
            aria-label={t("back", { defaultValue: "Back" })}
            onClick={leave}
          >
            <MaterialIcon>chevron_left</MaterialIcon>
          </button>
          <h2 className="sb-playlist-details-heading">
            {t("playlist-details-heading", { defaultValue: "New playlist" })}
          </h2>
        </header>
        <div className="sb-playlist-details-body">
          <label className="sb-playlist-editor-field">
            <span className="sb-playlist-editor-field-label">
              {t("playlist-review-title", { defaultValue: "Title" })}
            </span>
            <PlaylistTitleField
              playlists={playlists}
              className="sb-settings-text-input sb-playlist-input sb-playlist-details-title"
              autoFocus
            />
          </label>
          <label className="sb-playlist-editor-field">
            <span className="sb-playlist-editor-field-label">
              {t("description", { defaultValue: "Description" })}
            </span>
            <PlaylistDescriptionField playlists={playlists} />
          </label>
          <div className="sb-playlist-editor-field">
            <span className="sb-playlist-editor-field-label">
              {t("hero-image", { defaultValue: "Cover image" })}
            </span>
            <PlaylistCoverField
              playlists={playlists}
              modals={modals}
              os={state.os}
              login={state.login}
              gallery={state.gallery}
            />
          </div>
          <div className="sb-playlist-details-actions">
            <button
              type="button"
              className="sb-settings-save-button sb-playlist-details-next"
              onClick={() => setScreen("steps")}
            >
              {t("next", { defaultValue: "Next" })}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "review") {
    return (
      <PlaylistReviewPanel
        playlists={playlists}
        books={books}
        resolveBookName={resolveBookName}
        authorName={state.login?.profile?.value?.name ?? null}
        translationName={translationName}
        onOpenItem={(index) => {
          setScreen("steps");
          requestOpen(index);
        }}
        onBack={() => setScreen("steps")}
        onPublish={handleSave}
        publishing={saving}
      />
    );
  }
  const sameAs =
    openIndex !== null && openItem?.type === "bible-verse"
      ? previousSamePassage(items, openIndex)
      : null;

  return (
    <div className="sb-playlist-editor">
      <header className="sb-playlist-editor-header">
        <button
          type="button"
          className="sb-reading-plans-back sb-playlist-editor-back"
          aria-label={t("back", { defaultValue: "Back" })}
          onClick={leave}
        >
          <MaterialIcon>chevron_left</MaterialIcon>
        </button>
        <button
          type="button"
          className="sb-playlist-editor-cover"
          aria-label={t("hero-image", { defaultValue: "Cover image" })}
          onClick={openCover}
        >
          {editing?.heroImageUrl ? (
            <img src={editing.heroImageUrl} alt="" />
          ) : (
            <MaterialIcon>add_photo_alternate</MaterialIcon>
          )}
        </button>
        <div className="sb-playlist-editor-heading">
          <PlaylistTitleField
            playlists={playlists}
            className="sb-playlist-editor-title"
          />
          <PlaylistDescriptionField
            playlists={playlists}
            className="sb-playlist-editor-description"
            rows={1}
          />
          <span className="sb-playlist-editor-summary">{draftLine}</span>
        </div>
        <div className="sb-playlist-editor-actions">
          <div
            className="sb-playlist-editor-modes"
            role="group"
            aria-label={t("playlist-editor-mode-edit", {
              defaultValue: "Edit",
            })}
          >
            <button
              type="button"
              className={`sb-playlist-editor-mode${
                mode === "edit" ? " sb-playlist-editor-mode--on" : ""
              }`}
              aria-pressed={mode === "edit"}
              onClick={() => setMode("edit")}
            >
              {t("playlist-editor-mode-edit", { defaultValue: "Edit" })}
            </button>
            <button
              type="button"
              className={`sb-playlist-editor-mode${
                mode === "preview" ? " sb-playlist-editor-mode--on" : ""
              }`}
              aria-pressed={mode === "preview"}
              onClick={() => {
                if (openIndex !== null && editInputRef.current?.isDirty()) {
                  void saveOpenItem().then((saved) => {
                    if (saved) setMode("preview");
                  });
                  return;
                }
                setMode("preview");
              }}
            >
              {t("playlist-editor-mode-preview", { defaultValue: "Preview" })}
            </button>
          </div>
          <PlaylistEditorAiButton chats={chats} openChatPanel={openChatPanel} />
          <button
            type="button"
            className="sb-settings-save-button sb-playlist-editor-primary"
            onClick={openReview}
          >
            {t("playlist-review-publish", { defaultValue: "Review & publish" })}
          </button>
        </div>
      </header>

      <div
        className={`sb-playlist-editor-columns${
          narrow ? " sb-playlist-editor-columns--narrow" : ""
        }`}
      >
        {narrow && openIndex !== null ? (
          <nav
            className="sb-playlist-editor-stepbar"
            aria-label={t("playlist-editor-steps", { defaultValue: "Steps" })}
          >
            <button
              type="button"
              className="sb-playlist-editor-stepbar-back"
              onClick={() => requestOpen(null)}
            >
              <MaterialIcon>chevron_left</MaterialIcon>
              {t("playlist-editor-all-steps", { defaultValue: "All steps" })}
            </button>
            <span className="sb-playlist-editor-stepbar-count">
              {t("playlist-editor-step-of", {
                defaultValue: "Step {{number}} of {{count}}",
                number: openIndex + 1,
                count: stepCount,
              })}
            </span>
            <button
              type="button"
              className="sb-playlist-editor-stepbar-arrow"
              aria-label={t("playlist-editor-previous-step", {
                defaultValue: "Previous step",
              })}
              disabled={openIndex === 0}
              onClick={() => requestOpen(openIndex - 1)}
            >
              <MaterialIcon>expand_less</MaterialIcon>
            </button>
            <button
              type="button"
              className="sb-playlist-editor-stepbar-arrow"
              aria-label={t("playlist-editor-next-step", {
                defaultValue: "Next step",
              })}
              disabled={openIndex >= items.length - 1}
              onClick={() => requestOpen(openIndex + 1)}
            >
              <MaterialIcon>expand_more</MaterialIcon>
            </button>
          </nav>
        ) : null}
        <aside
          hidden={narrow && openIndex !== null}
          className="sb-playlist-editor-steps"
          aria-label={t("playlist-editor-steps", { defaultValue: "Steps" })}
        >
          <div className="sb-playlist-editor-column-head">
            <span>{t("playlist-editor-steps", { defaultValue: "Steps" })}</span>
            <span className="sb-playlist-editor-column-count">
              {t("playlist-editor-steps-summary", {
                defaultValue: "{{count}} · ~{{minutes}}",
                count: stepCount,
                minutes: minutesLabel(playlistMinutes(items), t),
              })}
            </span>
          </div>
          {items.length > 0 ? (
            <PlaylistEditorStepList editor={editor} caret={false} fullscreen />
          ) : (
            <p className="sb-playlist-editor-empty">
              {t("playlist-items-empty", { defaultValue: "No items yet." })}
            </p>
          )}
          <div className="sb-playlist-editor-steps-foot">
            <button
              type="button"
              className="sb-playlist-add-toggle"
              onClick={() => {
                setMode("edit");
                openAddStep({});
              }}
            >
              <MaterialIcon>add</MaterialIcon>
              {t("playlist-add-step", { defaultValue: "Add step" })}
            </button>
          </div>
        </aside>

        <main
          hidden={narrow && openIndex === null}
          className="sb-playlist-editor-main"
          aria-label={
            openItem
              ? t("playlist-editor-step-n", {
                  defaultValue: "Step {{number}}",
                  number: openStepNumber ?? "",
                })
              : t("playlist-editor-steps", { defaultValue: "Steps" })
          }
        >
          {mode === "preview" ? (
            openItem && openIndex !== null ? (
              <PlaylistStepPreview
                item={openItem}
                stepNumber={openStepNumber ?? null}
                stepCount={stepCount}
                loadChapter={loadChapter}
                resolveBookName={resolveBookName}
              />
            ) : (
              <p className="sb-playlist-editor-empty sb-playlist-editor-placeholder">
                {t("playlist-editor-preview-empty", {
                  defaultValue: "Pick a step to preview it.",
                })}
              </p>
            )
          ) : openItem && openIndex !== null ? (
            <div className="sb-playlist-editor-step">
              <p className="sb-playlist-editor-eyebrow">
                {t("playlist-editor-step-n", {
                  defaultValue: "Step {{number}}",
                  number: openStepNumber ?? "",
                })}
                {" · "}
                {playlistItemKind(openItem, t)}
              </p>
              <PlaylistItemInput
                ref={editInputRef}
                // Remount when the open item, or its kind, changes so the
                // sub-inputs seed fresh values from it.
                key={`edit-${openIndex}-${modeForItem(openItem)}`}
                id={`sb-playlist-item-editor-${openIndex}`}
                books={books}
                onAdd={(added) => addItem(added)}
                editItem={openItem}
                editScriptureText={
                  openItem.type === "bible-verse"
                    ? scriptureRefsLabel(openItem, resolveBookName)
                    : undefined
                }
                loadChapter={loadChapter}
                steps={stepLinkTargets}
                layout="screen"
                translationName={translationName}
                onUpdate={(updated) => {
                  // The editor only knows the step's content; its settings
                  // stay as the settings column set them.
                  const current = items[openIndex];
                  const settings = current
                    ? {
                        ...(current.minutes
                          ? { minutes: current.minutes }
                          : {}),
                        ...(current.pause ? { pause: true } : {}),
                        ...(current.leaderOnly ? { leaderOnly: true } : {}),
                      }
                    : {};
                  playlists.updateEditingPlaylistItem(openIndex, {
                    ...settings,
                    ...updated,
                  });
                }}
                onCancelEdit={() => setOpenIndex(null)}
              />
            </div>
          ) : (
            <p className="sb-playlist-editor-empty sb-playlist-editor-placeholder">
              {t("playlist-editor-pick-step", {
                defaultValue: "Pick a step on the left, or add one.",
              })}
            </p>
          )}
        </main>

        <aside
          hidden={narrow && openIndex === null}
          className="sb-playlist-editor-settings"
          aria-label={t("playlist-editor-step-settings", {
            defaultValue: "Step settings",
          })}
        >
          <div className="sb-playlist-editor-column-head">
            <span>
              {t("playlist-editor-step-settings", {
                defaultValue: "Step settings",
              })}
            </span>
          </div>
          {openItem && openIndex !== null ? (
            <>
              <div className="sb-playlist-editor-setting">
                <span className="sb-playlist-editor-setting-label">
                  {t("playlist-editor-type", { defaultValue: "Type" })}
                </span>
                <div
                  className="sb-playlist-editor-types"
                  role="radiogroup"
                  aria-label={t("playlist-editor-type", {
                    defaultValue: "Type",
                  })}
                >
                  {TYPE_MODES.map((candidate) => {
                    const option = ADD_MODES.find((o) => o.mode === candidate)!;
                    const selected = modeForItem(openItem) === candidate;
                    return (
                      <button
                        key={candidate}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        className={`sb-playlist-editor-type${
                          selected ? " sb-playlist-editor-type--on" : ""
                        }`}
                        onClick={() => {
                          if (selected) return;
                          setMode("edit");
                          openAddStep({ replace: openIndex, mode: candidate });
                        }}
                      >
                        {t(option.labelKey, {
                          defaultValue: option.defaultLabel,
                        })}
                      </button>
                    );
                  })}
                </div>
              </div>

              <ReadingTimeSetting
                item={openItem}
                onChange={(minutes) => updateOpenItemSettings({ minutes })}
              />

              <div className="sb-playlist-editor-setting">
                <span className="sb-playlist-editor-setting-label">
                  {t("playlist-editor-group-sessions", {
                    defaultValue: "Group sessions",
                  })}
                </span>
                <label className="sb-playlist-editor-check">
                  <input
                    type="checkbox"
                    checked={!!openItem.pause}
                    onChange={(event: Event) =>
                      updateOpenItemSettings({
                        pause: (event.currentTarget as HTMLInputElement)
                          .checked,
                      })
                    }
                  />
                  {t("playlist-editor-pause", {
                    defaultValue: "Pause here for discussion",
                  })}
                </label>
                <label className="sb-playlist-editor-check">
                  <input
                    type="checkbox"
                    checked={!!openItem.leaderOnly}
                    onChange={(event: Event) =>
                      updateOpenItemSettings({
                        leaderOnly: (event.currentTarget as HTMLInputElement)
                          .checked,
                      })
                    }
                  />
                  {t("playlist-editor-leader-only", {
                    defaultValue: "Leader only (hide from solo readers)",
                  })}
                </label>
              </div>

              {sameAs ? (
                <div className="sb-playlist-editor-issue" role="status">
                  <p className="sb-playlist-editor-issue-title">
                    <MaterialIcon>warning</MaterialIcon>
                    {t("playlist-editor-issue-same-passage", {
                      defaultValue: "Same passage as step {{step}}",
                      step: sameAs.step,
                    })}
                  </p>
                  <p className="sb-playlist-editor-issue-body">
                    {t("playlist-editor-issue-same-passage-body", {
                      defaultValue:
                        "Readers will see {{passage}} twice in a row. This step already shows it.",
                      passage: verseRefLabel(sameAs.ref, resolveBookName),
                    })}
                  </p>
                  <div className="sb-playlist-editor-issue-actions">
                    <button
                      type="button"
                      className="sb-settings-save-button"
                      onClick={() => removeItem(sameAs.index)}
                    >
                      {t("playlist-editor-remove-step-n", {
                        defaultValue: "Remove step {{step}}",
                        step: sameAs.step,
                      })}
                    </button>
                    <span className="sb-playlist-editor-issue-keep">
                      {t("playlist-editor-keep-both", {
                        defaultValue: "Keep both",
                      })}
                    </span>
                  </div>
                </div>
              ) : (
                issues.map((issue, index) => (
                  <div
                    key={index}
                    className="sb-playlist-editor-issue"
                    role="status"
                  >
                    <p className="sb-playlist-editor-issue-title">
                      <MaterialIcon>warning</MaterialIcon>
                      {issue.message}
                    </p>
                  </div>
                ))
              )}

              <button
                type="button"
                className="sb-playlist-editor-delete"
                onClick={() => removeItem(openIndex)}
              >
                {t("playlist-editor-delete-step", {
                  defaultValue: "Delete step",
                })}
              </button>
            </>
          ) : (
            <p className="sb-playlist-editor-empty">
              {t("playlist-editor-no-step", {
                defaultValue: "Select a step to see its settings.",
              })}
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}

/**
 * The step before `index` when it shows the same passage, with its step
 * number, so the settings can offer to drop the repeat.
 */
function previousSamePassage(
  items: PlaylistItemData[],
  index: number
): { index: number; step: number; ref: VerseRefOf } | null {
  const current = items[index];
  const before = index > 0 ? items[index - 1] : undefined;
  if (
    current?.type !== "bible-verse" ||
    before?.type !== "bible-verse" ||
    JSON.stringify(before.ref) !== JSON.stringify(current.ref)
  ) {
    return null;
  }
  return { index: index - 1, step: index, ref: current.ref };
}

type VerseRefOf = Extract<PlaylistItemData, { type: "bible-verse" }>["ref"];

/**
 * "4 min · auto · edit": the step's length as estimated, or as the author
 * set it; "edit" opens a field for a number of minutes, and an emptied
 * field goes back to the estimate.
 */
function ReadingTimeSetting(props: {
  item: PlaylistItemData;
  onChange: (minutes: number | null) => void;
}) {
  const { item, onChange } = props;
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const auto = !item.minutes;
  return (
    <div className="sb-playlist-editor-setting">
      <span className="sb-playlist-editor-setting-label">
        {t("playlist-editor-reading-time", { defaultValue: "Reading time" })}
      </span>
      {editing ? (
        <div className="sb-playlist-editor-time sb-playlist-editor-time--editing">
          <input
            className="sb-settings-text-input sb-playlist-editor-time-input"
            type="number"
            min={1}
            step={1}
            value={item.minutes ?? playlistItemAutoMinutes(item)}
            aria-label={t("playlist-editor-reading-time", {
              defaultValue: "Reading time",
            })}
            onInput={(event: Event) => {
              const value = Number(
                (event.currentTarget as HTMLInputElement).value
              );
              onChange(Number.isInteger(value) && value > 0 ? value : null);
            }}
            onBlur={() => setEditing(false)}
            onKeyDown={(event: KeyboardEvent) => {
              if (event.key === "Enter" || event.key === "Escape") {
                setEditing(false);
              }
            }}
            autoFocus
          />
          <span className="sb-playlist-editor-time-unit">
            {t("playlist-minutes-unit", { defaultValue: "min" })}
          </span>
        </div>
      ) : (
        <div className="sb-playlist-editor-time">
          <span className="sb-playlist-editor-time-value">
            {minutesLabel(playlistItemMinutes(item), t)}
          </span>
          <span className="sb-playlist-editor-time-actions">
            {auto ? (
              <span className="sb-playlist-editor-time-auto">
                {t("playlist-editor-reading-time-auto", {
                  defaultValue: "auto",
                })}
              </span>
            ) : (
              <button
                type="button"
                className="sb-playlist-editor-time-link"
                onClick={() => onChange(null)}
              >
                {t("playlist-editor-reading-time-reset", {
                  defaultValue: "Use the estimate",
                })}
              </button>
            )}
            {" · "}
            <button
              type="button"
              className="sb-playlist-editor-time-link"
              onClick={() => setEditing(true)}
            >
              {t("playlist-editor-reading-time-edit", {
                defaultValue: "edit",
              })}
            </button>
          </span>
        </div>
      )}
    </div>
  );
}
