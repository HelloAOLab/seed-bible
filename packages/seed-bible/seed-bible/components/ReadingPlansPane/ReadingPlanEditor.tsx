import "./PaceChoices.css";
import "./ReadingPlanEditor.css";
import "../visuallyHidden.inline.css";
import type { ComponentChildren } from "preact";
import { useCallback, useEffect, useState } from "preact/hooks";
import { useI18n } from "../../i18n/I18nManager";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import type { PlaylistItemData } from "../../managers/PlaylistManager";
import {
  cadenceDurationDays,
  DEFAULT_CADENCE_OPTIONS,
  draftReadingCount,
  estimateReadingMinutes,
  type CadenceOption,
  type EditorReading,
  type ReadingPlanSession,
  type ReadingPlansManager,
} from "../../managers/ReadingPlansManager";
import {
  ADD_MENU_OPENER,
  EmptyStepList,
  openUnsavedChangesModal,
  StepEditorPanel,
  StepRowActions,
  useResolveBookName,
} from "../PlaylistEditor/PlaylistEditorPanel";
import {
  EditorDetailsFields,
  SaveAndPublishButton,
  showUnfinishedSteps,
  StepEditorWorkspace,
} from "../PlaylistEditor/PlaylistEditorWorkspace";
import type { StepEditorHost } from "../PlaylistEditor/stepEditorHost";
import { PeIcon } from "../PlaylistEditor/editorControls";
import { playlistStepLabel } from "../PlaylistEditor/playlistSteps";
import { PlaylistStepRow } from "../PlaylistOverview/PlaylistOverview";
import { useDragReorder } from "../useDragReorder";
import { cadenceOptionLabel } from "./cadenceLabels";
import { Button } from "../Button/Button";
import { IconButton } from "../IconButton/IconButton";
import { CheckboxIndicator } from "../Checkbox/Checkbox";

/** The desktop plan editor's side pane. */
export const READING_PLAN_EDITOR_PANE_ID = "reading-plan-editor-pane";

type Translate = ReturnType<typeof useI18n>["t"];

/** How long one reading takes: as its author set it, else an estimate. */
function readingMinutes(state: SeedBibleState, item: PlaylistItemData): number {
  const { tabs } = state;
  const books =
    tabs.tabs.value.find((tab) => tab.id === tabs.selectedTabId.value)
      ?.readingState.translationBooks.value?.books ?? [];
  return estimateReadingMinutes([{ id: "", item }], (bookId) =>
    books.find((book) => book.id === bookId)
  );
}

/** "3 sessions · 8 readings", for the plan in the editor. */
function planSizeLabel(readingPlans: ReadingPlansManager, t: Translate) {
  const draft = readingPlans.editingReadingPlan.value;
  return [
    t("reading-plan-session-count-sessions", {
      defaultValue: "{{count}} sessions",
      count: draft?.plan.sessions.length ?? 0,
    }),
    t("reading-plan-session-reading-count", {
      defaultValue: "{{count}} readings",
      count: draft ? draftReadingCount(draft) : 0,
    }),
  ].join(" · ");
}

/**
 * Where the open plan's changes stand. A plan not yet published is saved to
 * the author's account as they go, so says how that went; changes to a
 * published one are only drafted until they're published.
 */
function planDraftStatus(
  readingPlans: ReadingPlansManager,
  t: Translate
): { saved: boolean; label: string } {
  const draft = readingPlans.editingReadingPlan.value;
  // Read so this is worked out again when the plan it's measured against is.
  void readingPlans.editingBaseline.value;
  if (!draft?.isNew) {
    return readingPlans.isEditingReadingPlanDirty()
      ? {
          saved: false,
          label: t("playlist-editor-unsaved", {
            defaultValue: "Draft - Unsaved changes",
          }),
        }
      : {
          saved: true,
          label: t("playlist-editor-saved", { defaultValue: "Saved" }),
        };
  }
  const label = readingPlans.editingReadingPlanSaveError.value
    ? t("reading-plan-draft-save-failed", {
        defaultValue: "Couldn't save draft",
      })
    : readingPlans.editingReadingPlanSaving.value
      ? t("reading-plan-draft-saving", { defaultValue: "Saving…" })
      : draft.persisted
        ? t("reading-plan-draft-saved", { defaultValue: "Draft saved" })
        : t("playlist-editor-draft", { defaultValue: "Draft" });
  return { saved: false, label };
}

/**
 * Publishes the open plan, or says what it still needs: its unfinished
 * readings, a name, or something to read. Says so if it fails.
 */
async function publishPlan(state: SeedBibleState): Promise<void> {
  const { readingPlans } = state;
  const { stepEditor } = readingPlans;
  // Destructured for the translation lint rules, which only recognise calls
  // made through a bare `t`.
  const { t } = state.i18n;
  const draft = readingPlans.editingReadingPlan.peek();
  if (!draft || showUnfinishedSteps(state, stepEditor)) {
    return;
  }
  if (draftReadingCount(draft) === 0) {
    state.app.toast(
      t("reading-plan-no-readings", {
        defaultValue: "Add at least one reading to create the plan",
      })
    );
    return;
  }
  if (!draft.plan.title?.trim()) {
    state.app.toast(
      t("reading-plan-needs-name", {
        defaultValue: "Give your plan a name to save it",
      })
    );
    stepEditor.detailsOpen.value = true;
    return;
  }
  try {
    await readingPlans.finishEditingReadingPlan();
  } catch (error) {
    console.error("Failed to save reading plan:", error);
    state.app.toast(
      t("reading-plan-create-error", {
        defaultValue:
          "Something went wrong creating your plan. Please try again.",
      })
    );
  }
}

/** Leaves the plan editor, asking first what to do with unsaved changes. */
function requestClosePlanEditor(state: SeedBibleState) {
  const { readingPlans, modals } = state;
  if (!readingPlans.isEditingReadingPlanDirty()) {
    readingPlans.leaveEditorKeepingDraft();
    return;
  }
  openUnsavedChangesModal(modals, {
    onDiscard: readingPlans.discardEditorChanges,
    onSaveDraft: readingPlans.leaveEditorKeepingDraft,
    onPublish: () => void publishPlan(state),
  });
}

/** The reading plan editor's side of the step editor. */
export function readingPlanEditorHost(state: SeedBibleState): StepEditorHost {
  const { readingPlans } = state;
  return {
    editor: readingPlans.stepEditor,
    title: (t) =>
      readingPlans.editingReadingPlan.value?.plan.title?.trim() ||
      t("untitled-reading-plan", { defaultValue: "Untitled plan" }),
    status: (t) => planDraftStatus(readingPlans, t),
    closeLabel: (t) =>
      t("reading-plan-editor-close", { defaultValue: "Close plan editor" }),
    requestClose: () => requestClosePlanEditor(state),
    editDetailsLabel: (t) =>
      t("reading-plan-editor-edit-details", {
        defaultValue: "Edit title, description, cover and paces",
      }),
    // The session matters more than the place in it: a session is what a
    // reader sits down to.
    addMenuPlace: (_afterIndex, t) =>
      t("reading-plan-editor-added-to-session", {
        number:
          (readingPlans.editingReadingPlan.value?.selectedSessionIndex ?? 0) +
          1,
        defaultValue: "Added to session {{number}}",
      }),
    renderSteps: () => <ReadingPlanSteps state={state} />,
    stepMinutes: (item) => readingMinutes(state, item),
    mobileStatus: (t) =>
      `${planSizeLabel(readingPlans, t)} · ${planDraftStatus(readingPlans, t).label}`,
    details: {
      title: {
        key: "reading-plan-editor-details",
        defaultValue: "Plan details",
      },
      render: (idPrefix) => (
        <ReadingPlanDetailsFields state={state} idPrefix={idPrefix} />
      ),
    },
    renderPublishButton: () => <PublishPlanButton state={state} />,
  };
}

function PublishPlanButton(props: { state: SeedBibleState }) {
  const { state } = props;
  const [saving, setSaving] = useState(false);
  return (
    <SaveAndPublishButton
      saving={saving}
      onClick={() => {
        setSaving(true);
        void publishPlan(state).finally(() => setSaving(false));
      }}
    />
  );
}

/** The desktop plan editor's side pane. */
export function ReadingPlanEditorPanel(props: { state: SeedBibleState }) {
  const { state } = props;
  return (
    <StepEditorPanel
      host={readingPlanEditorHost(state)}
      footerActions={<PublishPlanButton state={state} />}
    />
  );
}

/** The plan editor over a reader tab; see `StepEditorWorkspace`. */
export function ReadingPlanEditorWorkspace(props: {
  state: SeedBibleState;
  compact: boolean;
  children: ComponentChildren;
}) {
  const { state, compact, children } = props;
  return (
    <StepEditorWorkspace
      state={state}
      host={readingPlanEditorHost(state)}
      compact={compact}
    >
      {children}
    </StepEditorWorkspace>
  );
}

/**
 * The plan's name, description and cover, as a playlist has, and the paces it
 * offers its readers.
 */
function ReadingPlanDetailsFields(props: {
  state: SeedBibleState;
  idPrefix: string;
}) {
  const { state, idPrefix } = props;
  const { readingPlans, gallery } = state;
  const { t } = useI18n();
  const draft = readingPlans.editingReadingPlan.value;
  const heroImageUrl = draft?.plan.heroImageUrl;

  // A cover from before the gallery existed joins it, to be picked again.
  useEffect(() => {
    if (
      heroImageUrl &&
      gallery &&
      !gallery.photos.peek().some((photo) => photo.url === heroImageUrl)
    ) {
      void gallery.rememberPhoto(heroImageUrl);
    }
  }, [heroImageUrl, gallery]);

  if (!draft) {
    return null;
  }
  return (
    <>
      <EditorDetailsFields
        state={state}
        idPrefix={idPrefix}
        details={draft.plan}
        titlePlaceholder={t("reading-plan-name-placeholder", {
          defaultValue: "e.g. My Psalms Journey",
        })}
        descriptionPlaceholder={t("reading-plan-description_placeholder", {
          defaultValue: "What is this plan about?",
        })}
        onChange={readingPlans.updateEditingReadingPlan}
        fallbackUpload={readingPlans.uploadHeroImage}
      />
      <CadencesField readingPlans={readingPlans} idPrefix={idPrefix} />
    </>
  );
}

/**
 * The paces the plan offers its readers. A reader picks one of these when they
 * start the plan (or opts out and reads at their own pace), which is what
 * decides how long the plan takes them — so the same content can be offered at
 * several speeds instead of being locked to one duration.
 */
function CadencesField(props: {
  readingPlans: ReadingPlansManager;
  idPrefix: string;
}) {
  const { readingPlans, idPrefix } = props;
  const { t } = useI18n();
  const plan = readingPlans.editingReadingPlan.value?.plan;
  if (!plan) {
    return null;
  }
  const selectedIds = plan.cadenceOptions.map((option) => option.id);
  const lastSelected = selectedIds.length === 1;
  // Only sessions that hold something take a day to read, so an empty one the
  // author has added but not filled must not lengthen the estimate — or a
  // brand-new plan would claim to finish in a day.
  const sessionCount = plan.sessions.filter(
    (session) => session.readings.length > 0
  ).length;
  const toggle = (id: string) =>
    readingPlans.setEditingPlanCadenceOptions(
      selectedIds.includes(id)
        ? selectedIds.filter((existing) => existing !== id)
        : [...selectedIds, id]
    );

  return (
    <div
      className="sb-pe-field sb-rp-choices"
      role="group"
      aria-labelledby={`${idPrefix}-cadences`}
    >
      <span id={`${idPrefix}-cadences`} className="sb-pe-field-label">
        {t("reading-plan-step-cadences-title", {
          defaultValue: "Reading cadences",
        })}
      </span>
      {/* Says plainly that this is authoring options *for readers*, and that
          self-pacing is always on offer without being one of these boxes. */}
      <p className="sb-rp-cadences-hint">
        {t("reading-plan-step-cadences-hint", {
          defaultValue:
            "Choose the reading paces you want to offer. Readers can always choose to go at their own pace instead.",
        })}
      </p>
      {DEFAULT_CADENCE_OPTIONS.map((option: CadenceOption) => {
        const selected = selectedIds.includes(option.id);
        // How long the plan takes at this pace, once there's content to
        // measure. Before that there is nothing meaningful to say.
        const days =
          sessionCount > 0
            ? cadenceDurationDays(option.cadence, sessionCount)
            : 0;
        return (
          <label
            key={option.id}
            className={`sb-rp-choice${selected ? " sb-rp-choice-selected" : ""}`}
          >
            <input
              type="checkbox"
              className="sb-rp-choice-checkbox sb-visually-hidden"
              checked={selected}
              // A plan has to offer at least one cadence, so the last one
              // standing can't be unchecked.
              disabled={selected && lastSelected}
              onChange={() => toggle(option.id)}
            />
            <CheckboxIndicator
              className="sb-rp-choice-box"
              checked={selected}
              disabled={selected && lastSelected}
            />
            <span className="sb-rp-choice-text">
              <span className="sb-rp-choice-title">
                {cadenceOptionLabel(option, t)}
              </span>
              {days > 0 ? (
                <span className="sb-rp-choice-description">
                  {t("reading-plan-cadence-length", {
                    defaultValue: "Finishes in {{count}} days",
                    count: days,
                  })}
                </span>
              ) : null}
            </span>
          </label>
        );
      })}
    </div>
  );
}

/** A row of the list: a session's heading, or one of its readings. */
type PlanRow =
  | { type: "session"; session: ReadingPlanSession; sessionIndex: number }
  | (EditorReading & { type: "reading"; index: number });

/** The list's rows: each session's heading followed by its readings. */
function planRows(
  sessions: readonly ReadingPlanSession[],
  readings: readonly EditorReading[]
): PlanRow[] {
  return sessions.flatMap((session, sessionIndex): PlanRow[] => [
    { type: "session", session, sessionIndex },
    ...readings.flatMap((reading, index): PlanRow[] =>
      reading.sessionIndex === sessionIndex
        ? [{ ...reading, type: "reading", index }]
        : []
    ),
  ]);
}

/**
 * The plan's sessions and their readings. The sessions come out as one list,
 * so that a reading can be dragged from one into another: past a session's
 * heading, it's in that session.
 */
function ReadingPlanSteps(props: { state: SeedBibleState }) {
  const { state } = props;
  const { readingPlans, tabs } = state;
  const { stepEditor } = readingPlans;
  const { t } = useI18n();
  const resolveBookName = useResolveBookName(tabs);
  const draft = readingPlans.editingReadingPlan.value;
  const sessions = draft?.plan.sessions ?? [];
  const rows = planRows(sessions, readingPlans.editorReadings.value);
  const openIndex = stepEditor.stepIndex.value;
  const pickIndex = stepEditor.versePickIndex.value;
  const invalid = new Set(stepEditor.invalidSteps());

  const onReorder = useCallback(
    (from: number, to: number) => {
      const current = planRows(
        readingPlans.editingReadingPlan.peek()?.plan.sessions ?? [],
        readingPlans.editorReadings.peek()
      );
      const [moved] = current.splice(from, 1);
      if (moved?.type !== "reading") {
        return;
      }
      const above = current.slice(0, to);
      const heading = above.findLastIndex((row) => row.type === "session");
      const session = above[heading];
      if (session?.type === "session") {
        readingPlans.moveReadingInEditingPlan(
          moved.reading.id,
          session.sessionIndex,
          to - heading - 1
        );
      }
    },
    [readingPlans]
  );
  const { getRowClassName, getHandleProps } = useDragReorder({
    itemCount: rows.length,
    // Below the first session's heading: there's no session above it.
    minIndex: 1,
    onReorder,
  });

  if (!draft) {
    return null;
  }

  const addSession = (
    <Button
      size="lg"
      icon="add"
      className="sb-rp-add-session"
      onClick={readingPlans.addSessionToEditingPlan}
    >
      {t("reading-plan-add-session", { defaultValue: "Add session" })}
    </Button>
  );

  // One empty session, as a new plan starts with, says no more than the plan
  // being empty does.
  if (draftReadingCount(draft) === 0 && sessions.length === 1) {
    return (
      <EmptyStepList
        editor={stepEditor}
        title={t("reading-plan-editor-empty-title", {
          defaultValue: "This plan is empty",
        })}
      />
    );
  }

  return (
    <>
      <p className="sb-pe-step-count">{planSizeLabel(readingPlans, t)}</p>
      <ul className="sb-discover-list sb-playlist-page-items sb-pe-steps">
        {rows.map((row, rowIndex) => {
          if (row.type === "session") {
            return (
              <SessionHeadingRow
                key={rowIndex}
                readingPlans={readingPlans}
                session={row.session}
                sessionIndex={row.sessionIndex}
              />
            );
          }
          const { item } = row.reading;
          const active = row.index === openIndex;
          return (
            <PlaylistStepRow
              // By place, like a playlist's: a row that moved in the page
              // under the finger dragging it would drop it.
              key={rowIndex}
              item={item}
              resolveBookName={resolveBookName}
              label={playlistStepLabel(item, t, resolveBookName)}
              minutes={readingMinutes(state, item)}
              current={active}
              ariaCurrent={active ? "step" : undefined}
              className={`sb-pe-step${active ? " sb-pe-step--active" : ""}${
                invalid.has(row.index) ? " sb-pe-step--invalid" : ""
              }${getRowClassName(rowIndex)}`}
              dragHandleProps={getHandleProps(rowIndex)}
              dragLabel={t("drag-to-reorder-playlist-item", {
                defaultValue: "Drag to reorder",
              })}
              handleClassName="sb-pe-step-handle"
              openClassName="sb-pe-step-open"
              onOpen={() => stepEditor.selectStep(row.index)}
              trailing={
                active ? (
                  <StepRowActions
                    editor={stepEditor}
                    index={row.index}
                    picking={pickIndex === row.index}
                  />
                ) : null
              }
            />
          );
        })}
      </ul>
      {addSession}
    </>
  );
}

/**
 * A session's heading in the list: its number and how many readings it holds,
 * with buttons to add to it and remove it.
 */
function SessionHeadingRow(props: {
  readingPlans: ReadingPlansManager;
  session: ReadingPlanSession;
  sessionIndex: number;
}) {
  const { readingPlans, session, sessionIndex } = props;
  const { t } = useI18n();
  const number = sessionIndex + 1;
  return (
    <li className="sb-rp-session-row">
      <h3 className="sb-rp-session-name">
        {t("reading-plan-session-label", {
          defaultValue: "Session {{number}}",
          number,
        })}
      </h3>
      <span className="sb-rp-session-count">
        {session.readings.length > 0
          ? t("reading-plan-session-reading-count", {
              defaultValue: "{{count}} readings",
              count: session.readings.length,
            })
          : t("reading-plan-session-empty", {
              defaultValue: "No readings yet in this session",
            })}
      </span>
      <IconButton
        size="sm"
        className="sb-rp-session-add"
        icon="add"
        label={t("reading-plan-editor-add-to-session", {
          number,
          defaultValue: "Add to session {{number}}",
        })}
        {...ADD_MENU_OPENER}
        onClick={() => readingPlans.openAddMenuForSession(sessionIndex)}
      />
      <IconButton
        size="sm"
        className="sb-pe-step-action--danger sb-rp-session-remove"
        icon={<PeIcon name="trash" />}
        label={t("reading-plan-remove-session", {
          defaultValue: "Remove session",
        })}
        onClick={() => readingPlans.removeSessionFromEditingPlan(sessionIndex)}
      />
    </li>
  );
}
