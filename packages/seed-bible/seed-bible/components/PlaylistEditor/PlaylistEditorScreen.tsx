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
import { requestCancelPlaylistEditor } from "../CreatePlaylistForm/CreatePlaylistForm";
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

/**
 * The fullscreen playlist editor, for screens wide enough to show it: the
 * steps down the left, grouped under their scenes; the open step's editor
 * (or a preview of it) in the middle; and the step's settings on the right.
 * Edits are kept as the author moves between steps; Review & publish is
 * where the playlist is saved. Phones get the one-column
 * `CreatePlaylistForm` in the Discover pane instead; the two share their
 * editing state through `usePlaylistEditor`.
 */
export function PlaylistEditorScreen(props: PlaylistEditorScreenProps) {
  const { state, playlists, tabs, modals } = props;
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
    addOpen,
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
    stepNumbers,
    stepCount,
    stepLinkTargets,
    addScene,
    handleSave,
    hasUnsavedItemInput,
    saveOpenItem,
  } = editor;

  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const translationName =
    tabs.tabs.value.find((tab) => tab.id === tabs.selectedTabId.value)
      ?.readingState.translation?.value?.shortName ?? undefined;
  // The last look before publishing takes the middle column's place.
  const [reviewOpen, setReviewOpen] = useState(false);
  const openReview = () => {
    const proceed = () => {
      setOpenIndex(null);
      setAddOpen(false);
      setReviewOpen(true);
    };
    if (openIndex !== null && editInputRef.current?.isDirty()) {
      void saveOpenItem().then((saved) => {
        if (saved) proceed();
      });
      return;
    }
    proceed();
  };

  const openStepNumber = openIndex !== null ? stepNumbers.get(openIndex) : null;
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

  // Plays the draft with people: a session is started on a new tab and the
  // draft plays there, so the group reads it as it stands now.
  const testWithGroup = async () => {
    if (!editing || !state.app?.createSharedSession) {
      return;
    }
    if (openIndex !== null && editInputRef.current?.isDirty()) {
      if (!(await saveOpenItem())) {
        return;
      }
    }
    const draft = playlists.editingPlaylist.peek();
    if (!draft) {
      return;
    }
    await state.app.createSharedSession();
    playlists.startPlaying(draft, 0, { history: false });
  };

  // "Add a step" and a change of kind both go through the modal; the step
  // lands after the open one (or at the end), or in the changed step's place.
  const openAddStep = (options: { replace?: number; mode?: AddMode }) => {
    const proceed = () => {
      const after = options.replace === undefined ? openIndex : null;
      const sceneOf = (index: number | null) => {
        if (index === null) return null;
        for (let i = index; i >= 0; i -= 1) {
          const item = items[i];
          if (item?.type === "scene") {
            let number = 0;
            for (let j = 0; j <= i; j += 1) {
              if (items[j]?.type === "scene") number += 1;
            }
            return t("playlist-editor-scene-group", {
              defaultValue: "Scene {{number}} · {{title}}",
              number,
              title: item.title,
            });
          }
        }
        return null;
      };
      const afterStep = after !== null ? stepNumbers.get(after) : undefined;
      const position = [
        afterStep
          ? t("playlist-editor-add-after", {
              defaultValue: "After step {{step}}",
              step: afterStep,
            })
          : null,
        sceneOf(after),
      ]
        .filter(Boolean)
        .join(" · ");
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
            const settings =
              old && old.type !== "scene"
                ? {
                    ...(old.minutes ? { minutes: old.minutes } : {}),
                    ...(old.pause ? { pause: true } : {}),
                    ...(old.leaderOnly ? { leaderOnly: true } : {}),
                  }
                : {};
            playlists.updateEditingPlaylistItem(
              options.replace,
              item.type === "scene" ? item : { ...settings, ...item }
            );
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
          onClick={() =>
            requestCancelPlaylistEditor(
              playlists,
              modals,
              hasUnsavedItemInput()
            )
          }
        >
          <MaterialIcon>chevron_left</MaterialIcon>
        </button>
        <div className="sb-playlist-editor-heading">
          <input
            className="sb-playlist-editor-title"
            type="text"
            value={editing?.title ?? ""}
            dir="auto"
            aria-label={t("playlist-title_placeholder", {
              defaultValue: "Playlist title",
            })}
            onInput={(event: Event) => {
              const value = (event.currentTarget as HTMLInputElement).value;
              playlists.updateEditingPlaylistMetadata({
                title: value.trim() ? value : null,
              });
            }}
            placeholder={t("playlist-title_placeholder", {
              defaultValue: "Playlist title",
            })}
          />
          <span className="sb-playlist-editor-summary">{draftLine}</span>
        </div>
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
        <button
          type="button"
          className="sb-playlist-editor-secondary"
          onClick={() => void testWithGroup()}
        >
          {t("playlist-editor-test-group", {
            defaultValue: "Test with a group",
          })}
        </button>
        <button
          type="button"
          className="sb-settings-save-button sb-playlist-editor-primary"
          aria-pressed={reviewOpen}
          onClick={openReview}
        >
          {t("playlist-review-publish", { defaultValue: "Review & publish" })}
        </button>
      </header>

      <div className="sb-playlist-editor-columns">
        <aside
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
            <PlaylistEditorStepList editor={editor} caret={false} grouped />
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
                setReviewOpen(false);
                setMode("edit");
                openAddStep({});
              }}
            >
              <MaterialIcon>add</MaterialIcon>
              {t("playlist-add-step", { defaultValue: "Add step" })}
            </button>
            <button
              type="button"
              className="sb-playlist-add-scene"
              onClick={() => {
                setReviewOpen(false);
                setMode("edit");
                addScene();
              }}
            >
              <MaterialIcon>add</MaterialIcon>
              {t("playlist-add-scene", { defaultValue: "Add scene" })}
            </button>
          </div>
        </aside>

        <main
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
          {reviewOpen && openItem === null && !addOpen ? (
            <PlaylistReviewPanel
              playlists={playlists}
              modals={modals}
              books={books}
              resolveBookName={resolveBookName}
              authorName={state.login?.profile?.value?.name ?? null}
              os={state.os}
              login={state.login}
              gallery={state.gallery}
              onOpenItem={(index) => {
                setReviewOpen(false);
                requestOpen(index);
              }}
              onPublish={handleSave}
              publishing={saving}
            />
          ) : mode === "preview" ? (
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
                {openItem.type === "scene"
                  ? t("playlist-item-scene", { defaultValue: "Scene" })
                  : t("playlist-editor-step-n", {
                      defaultValue: "Step {{number}}",
                      number: openStepNumber ?? "",
                    })}
                {" · "}
                {playlistItemKind(openItem, t)}
              </p>
              <PlaylistItemInput
                ref={editInputRef}
                // Remount when the open item changes so the sub-inputs seed
                // fresh values from it.
                key={`edit-${openIndex}`}
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
                  const settings =
                    current && current.type !== "scene"
                      ? {
                          ...(current.minutes
                            ? { minutes: current.minutes }
                            : {}),
                          ...(current.pause ? { pause: true } : {}),
                          ...(current.leaderOnly ? { leaderOnly: true } : {}),
                        }
                      : {};
                  playlists.updateEditingPlaylistItem(
                    openIndex,
                    updated.type === "scene"
                      ? updated
                      : { ...settings, ...updated }
                  );
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
          {openItem && openIndex !== null && openItem.type !== "scene" ? (
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
                          setReviewOpen(false);
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
          ) : openItem && openIndex !== null ? (
            <>
              <p className="sb-playlist-editor-empty">
                {t("playlist-editor-scene-settings", {
                  defaultValue: "A scene is a heading over the steps after it.",
                })}
              </p>
              <button
                type="button"
                className="sb-playlist-editor-delete"
                onClick={() => removeItem(openIndex)}
              >
                {t("playlist-editor-delete-scene", {
                  defaultValue: "Delete scene",
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
 * The step before `index` (skipping scenes) when it shows the same passage,
 * with its step number, so the settings can offer to drop the repeat.
 */
function previousSamePassage(
  items: PlaylistItemData[],
  index: number
): { index: number; step: number; ref: VerseRefOf } | null {
  const current = items[index];
  if (current?.type !== "bible-verse") {
    return null;
  }
  let step = 0;
  let previous: { index: number; step: number } | null = null;
  for (let i = 0; i < index; i += 1) {
    const item = items[i]!;
    if (item.type === "scene") continue;
    step += 1;
    previous = { index: i, step };
  }
  const before = previous ? items[previous.index] : null;
  if (
    !previous ||
    before?.type !== "bible-verse" ||
    JSON.stringify(before.ref) !== JSON.stringify(current.ref)
  ) {
    return null;
  }
  return { ...previous, ref: current.ref };
}

type VerseRefOf = Extract<PlaylistItemData, { type: "bible-verse" }>["ref"];

/**
 * "4 min · auto · edit": the step's length as estimated, or as the author
 * set it; "edit" opens a field for a number of minutes, and an emptied
 * field goes back to the estimate.
 */
function ReadingTimeSetting(props: {
  item: Exclude<PlaylistItemData, { type: "scene" }>;
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
