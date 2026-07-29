import "./CreateReadingPlanWizard.css";
import { useState } from "preact/hooks";
import { MaterialIcon } from "../icons";
import { useI18n } from "../../i18n/I18nManager";
import {
  cadenceDurationDays,
  DEFAULT_CADENCE_OPTIONS,
  draftReadingCount,
  type CadenceOption,
  type ReadingPlanDraft,
  type ReadingPlanSession,
  type ReadingPlansManager,
} from "../../managers/ReadingPlansManager";
import type { TranslationBook } from "../../managers/FreeUseBibleAPI";
import type { PlaylistItemData } from "../../managers/PlaylistManager";
import type { ModalManager } from "../../managers/ModalManager";
import { PlaylistItemInput } from "../PlaylistItemInput/PlaylistItemInput";
import {
  canPreviewPlaylistItem,
  openPlaylistItemPreview,
} from "../playlistItemPreview";
import { cadenceOptionLabel } from "./cadenceLabels";
import { readingLabel } from "./readingLabel";
import {
  PLAN_READING_PREVIEW_MODAL_ID,
  readingItemIcon,
  readingPreviewText,
} from "./readingPreview";

interface CreateReadingPlanWizardProps {
  readingPlans: ReadingPlansManager;
  /** Books of the active translation, for the scripture typeahead + labels. */
  books: TranslationBook[];
  /** Modals host for previewing a text/link reading. Optional — without it the
   * preview action is simply not offered. */
  modals?: ModalManager;
  /** Called when the user backs out of the first step (or cancels). */
  onCancel: () => void;
  /** Called after a plan is successfully created. */
  onCreated: () => void;
}

/** The ordered steps of the wizard. */
const STEP_IDS = ["name", "cadences", "sessions"] as const;
type StepId = (typeof STEP_IDS)[number];

/**
 * The full create-a-reading-plan flow: a name, the cadences the plan offers,
 * and its list of reading sessions.
 *
 * A plan is deliberately just content plus suggested paces — it has no duration
 * of its own and no start date. How long it takes follows from whichever
 * cadence a reader picks when they start it, which is what lets the same plan
 * be offered as, say, "the Bible in a year" and "the Bible in two years".
 *
 * The draft lives on the manager (`editingReadingPlan`), not in this component
 * — so closing the plans pane to go read doesn't lose it, and the reader's
 * "Add to plan" verse action can add straight into the session the wizard is
 * showing. Every change is saved to the user's account as a `"draft"` plan, so
 * leaving mid-flow (or losing the tab) costs nothing.
 *
 * The component is fluid-width, so it fills the desktop side pane and the
 * mobile fullscreen pane without any breakpoint of its own.
 */
export function CreateReadingPlanWizard(props: CreateReadingPlanWizardProps) {
  const { readingPlans, books, modals, onCancel, onCreated } = props;
  const { t } = useI18n();

  // Resume on the sessions step when the draft already has readings — either
  // the user got that far and left to add a passage from the reader, or they
  // are picking a saved draft back up.
  const [stepIndex, setStepIndex] = useState(() => {
    const inFlight = readingPlans.editingReadingPlan.peek();
    return inFlight && draftReadingCount(inFlight) > 0
      ? STEP_IDS.length - 1
      : 0;
  });
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState(false);

  // Reading `.value` during render subscribes the component to draft edits,
  // including ones made from the reader's verse toolbar.
  const draft = readingPlans.editingReadingPlan.value;
  const autosaving = readingPlans.editingReadingPlanSaving.value;
  const autosaveFailed = readingPlans.editingReadingPlanSaveError.value;

  const step: StepId = STEP_IDS[stepIndex]!;
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === STEP_IDS.length - 1;

  if (!draft) {
    return null;
  }

  const totalReadings = draftReadingCount(draft);
  const selectedCadenceIds = draft.plan.cadenceOptions.map((o) => o.id);

  // Whether the current step is complete enough to advance / submit.
  const canAdvance = (() => {
    if (step === "name") {
      return (draft.plan.title ?? "").trim().length > 0;
    }
    if (step === "cadences") {
      return selectedCadenceIds.length > 0;
    }
    return totalReadings > 0;
  })();

  const goBack = () => {
    setSubmitError(false);
    if (isFirstStep) {
      onCancel();
      return;
    }
    setStepIndex((i) => i - 1);
  };

  const handleCreate = async () => {
    if (saving || totalReadings === 0) {
      return;
    }
    setSaving(true);
    setSubmitError(false);
    try {
      await readingPlans.finishEditingReadingPlan();
      onCreated();
    } catch (error) {
      console.error("Failed to create reading plan:", error);
      setSubmitError(true);
      setSaving(false);
    }
  };

  const goNext = () => {
    if (!canAdvance) {
      return;
    }
    if (isLastStep) {
      void handleCreate();
      return;
    }
    setStepIndex((i) => i + 1);
  };

  const stepTitle = {
    name: t("reading-plan-step-name-title", { defaultValue: "Name your plan" }),
    cadences: t("reading-plan-step-cadences-title", {
      defaultValue: "Reading cadences",
    }),
    sessions: t("reading-plan-step-scripture-title", {
      defaultValue: "Select readings",
    }),
  }[step];

  return (
    <div className="sb-rp-wizard">
      <div className="sb-rp-wizard-steps">
        <span className="sb-rp-wizard-step-count">
          {t("reading-plan-step-indicator", {
            defaultValue: "Step {{current}} of {{total}}",
            current: stepIndex + 1,
            total: STEP_IDS.length,
          })}
        </span>
        <span className="sb-rp-wizard-save-state" aria-live="polite">
          {autosaveFailed
            ? t("reading-plan-draft-save-failed", {
                defaultValue: "Couldn't save draft",
              })
            : autosaving
              ? t("reading-plan-draft-saving", { defaultValue: "Saving…" })
              : draft.persisted
                ? t("reading-plan-draft-saved", { defaultValue: "Draft saved" })
                : ""}
        </span>
      </div>

      <div
        className="sb-rp-progress"
        role="progressbar"
        aria-valuenow={stepIndex + 1}
        aria-valuemin={1}
        aria-valuemax={STEP_IDS.length}
      >
        <div
          className="sb-rp-progress-fill"
          style={{
            width: `${((stepIndex + 1) / STEP_IDS.length) * 100}%`,
          }}
        />
      </div>

      <div className="sb-rp-wizard-body">
        <h2 className="sb-rp-step-title">{stepTitle}</h2>

        {step === "name" && (
          <div className="sb-rp-field">
            <p className="sb-rp-hint">
              {t("reading-plan-step-name-hint", {
                defaultValue: "Give your plan a name people will recognise",
              })}
            </p>
            <input
              className="sb-rp-text-input"
              type="text"
              value={draft.plan.title ?? ""}
              autoFocus
              onInput={(event: Event) =>
                readingPlans.updateEditingReadingPlan({
                  title: (event.currentTarget as HTMLInputElement).value,
                })
              }
              placeholder={t("reading-plan-name-placeholder", {
                defaultValue: "e.g. My Psalms Journey",
              })}
            />
          </div>
        )}

        {step === "cadences" && (
          <CadencesStep
            selectedIds={selectedCadenceIds}
            // Only sessions that hold something take a day to read, so an empty
            // one the author has added but not filled must not lengthen the
            // estimate — or a brand-new plan would claim to finish in a day.
            sessionCount={
              draft.plan.sessions.filter((s) => s.readings.length > 0).length
            }
            onToggle={(id) =>
              readingPlans.setEditingPlanCadenceOptions(
                selectedCadenceIds.includes(id)
                  ? selectedCadenceIds.filter((existing) => existing !== id)
                  : [...selectedCadenceIds, id]
              )
            }
          />
        )}

        {step === "sessions" && (
          <SessionsStep
            books={books}
            modals={modals}
            draft={draft}
            onSelectSession={(index) =>
              readingPlans.selectEditingPlanSession(index)
            }
            onAddSession={() => readingPlans.addSessionToEditingPlan()}
            onRemoveSession={(index) =>
              readingPlans.removeSessionFromEditingPlan(index)
            }
            onAddReading={(item) => readingPlans.addReadingToEditingPlan(item)}
            onRemoveReading={(sessionIndex, readingId) =>
              readingPlans.removeReadingFromEditingPlan(sessionIndex, readingId)
            }
          />
        )}
      </div>

      <footer className="sb-rp-wizard-footer">
        {submitError && (
          <p className="sb-rp-error" role="alert">
            {t("reading-plan-create-error", {
              defaultValue:
                "Something went wrong creating your plan. Please try again.",
            })}
          </p>
        )}
        {step === "sessions" && totalReadings === 0 && (
          <p className="sb-rp-footer-note">
            {t("reading-plan-no-readings", {
              defaultValue: "Add at least one reading to create the plan",
            })}
          </p>
        )}
        <div className="sb-rp-wizard-actions">
          <button
            type="button"
            className="sb-rp-button sb-rp-button-secondary"
            onClick={goBack}
            disabled={saving}
          >
            {t("back", { defaultValue: "Back" })}
          </button>
          <button
            type="button"
            className="sb-rp-button sb-rp-button-primary"
            onClick={goNext}
            disabled={!canAdvance || saving}
          >
            {isLastStep
              ? t("reading-plan-create-submit", { defaultValue: "Create plan" })
              : t("next", { defaultValue: "Next" })}
          </button>
        </div>
      </footer>
    </div>
  );
}

interface CadencesStepProps {
  selectedIds: string[];
  sessionCount: number;
  onToggle: (id: string) => void;
}

/**
 * The paces the plan offers its readers. A reader picks one of these when they
 * start the plan (or opts out and reads at their own pace), which is what
 * decides how long the plan takes them — so the same content can be offered at
 * several speeds instead of being locked to one duration.
 */
function CadencesStep(props: CadencesStepProps) {
  const { selectedIds, sessionCount, onToggle } = props;
  const { t } = useI18n();

  const lastSelected = selectedIds.length === 1;

  return (
    <div className="sb-rp-choices">
      <p className="sb-rp-hint">
        {t("reading-plan-step-cadences-hint", {
          defaultValue:
            "Pick the paces readers can choose from. They can also read at their own pace.",
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
              className="sb-rp-choice-checkbox"
              checked={selected}
              // A plan has to offer at least one cadence, so the last one
              // standing can't be unchecked.
              disabled={selected && lastSelected}
              onChange={() => onToggle(option.id)}
            />
            <span className="sb-rp-choice-box" aria-hidden="true">
              {selected && <MaterialIcon>check</MaterialIcon>}
            </span>
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

interface SessionsStepProps {
  books: TranslationBook[];
  modals?: ModalManager;
  draft: ReadingPlanDraft;
  onSelectSession: (index: number) => void;
  onAddSession: () => void;
  onRemoveSession: (index: number) => void;
  onAddReading: (item: PlaylistItemData) => void;
  onRemoveReading: (sessionIndex: number, readingId: string) => void;
}

/**
 * The plan's content: a vertical list of reading sessions, each holding one
 * sitting's worth of reading. Selecting a session opens the same add-item
 * control the playlist editor uses (scripture, text, or link) inside it, and is
 * also where the reader's "Add to plan" verse action puts a passage.
 */
function SessionsStep(props: SessionsStepProps) {
  const {
    books,
    modals,
    draft,
    onSelectSession,
    onAddSession,
    onRemoveSession,
    onAddReading,
    onRemoveReading,
  } = props;
  const { t } = useI18n();

  // Resolve a book's display name from the active translation's book list.
  const resolveBookName = (bookId: string): string => {
    const book = books.find((b) => b.id === bookId);
    return book?.name ?? book?.commonName ?? bookId;
  };

  const untitledReading = t("reading-plan-untitled-reading", {
    defaultValue: "Reading",
  });

  return (
    <div className="sb-rp-sessions">
      <p className="sb-rp-hint">
        {t("reading-plan-sessions-hint", {
          defaultValue:
            "Add the readings for each session — scripture, text, or a link",
        })}
      </p>

      <ul className="sb-rp-session-list">
        {draft.plan.sessions.map((session: ReadingPlanSession, index) => {
          const isSelected = index === draft.selectedSessionIndex;
          return (
            <li
              key={session.id}
              className={`sb-rp-session${
                isSelected ? " sb-rp-session-selected" : ""
              }`}
            >
              <div className="sb-rp-session-head">
                <button
                  type="button"
                  className="sb-rp-session-select"
                  aria-pressed={isSelected}
                  onClick={() => onSelectSession(index)}
                >
                  <span className="sb-rp-session-number">{index + 1}</span>
                  <span className="sb-rp-session-name">
                    {t("reading-plan-session-label", {
                      defaultValue: "Session {{number}}",
                      number: index + 1,
                    })}
                  </span>
                  <span className="sb-rp-session-count">
                    {t("reading-plan-session-reading-count", {
                      defaultValue: "{{count}} readings",
                      count: session.readings.length,
                    })}
                  </span>
                </button>
                <button
                  type="button"
                  className="sb-rp-icon-button sb-rp-session-remove"
                  onClick={() => onRemoveSession(index)}
                  aria-label={t("reading-plan-remove-session", {
                    defaultValue: "Remove session",
                  })}
                >
                  <MaterialIcon>delete</MaterialIcon>
                </button>
              </div>

              {session.readings.length > 0 ? (
                <ul className="sb-rp-reading-list">
                  {session.readings.map((reading) => {
                    const label = readingLabel(
                      reading.item,
                      resolveBookName,
                      untitledReading
                    );
                    const preview = readingPreviewText(reading.item, t);
                    // A text or link reading is the button — tapping it opens
                    // the same preview the reader will see. Scripture has
                    // nothing to preview, so it stays plain text.
                    const canPreview =
                      modals && canPreviewPlaylistItem(reading.item);

                    // Leading type icon, then the label with its one-line summary.
                    const body = (
                      <>
                        <span className="sb-rp-reading-icon" aria-hidden="true">
                          <MaterialIcon>
                            {readingItemIcon(reading.item)}
                          </MaterialIcon>
                        </span>
                        <span className="sb-rp-reading-text">
                          <span className="sb-rp-reading-label" dir="auto">
                            {label}
                          </span>
                          {preview ? (
                            <span className="sb-rp-reading-preview" dir="auto">
                              {preview}
                            </span>
                          ) : null}
                        </span>
                      </>
                    );

                    return (
                      <li key={reading.id} className="sb-rp-reading-item">
                        {canPreview ? (
                          <button
                            type="button"
                            className="sb-rp-reading-open"
                            onClick={() =>
                              openPlaylistItemPreview(
                                modals,
                                reading.item,
                                PLAN_READING_PREVIEW_MODAL_ID,
                                t
                              )
                            }
                            aria-label={t("reading-plan-preview-reading", {
                              defaultValue: "Preview {{reading}}",
                              reading: label,
                            })}
                          >
                            {body}
                          </button>
                        ) : (
                          <span className="sb-rp-reading-body">{body}</span>
                        )}
                        <button
                          type="button"
                          className="sb-rp-icon-button sb-rp-reading-remove"
                          onClick={() => onRemoveReading(index, reading.id)}
                          aria-label={t("reading-plan-scripture-remove", {
                            defaultValue: "Remove reading",
                          })}
                        >
                          <MaterialIcon>close</MaterialIcon>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="sb-rp-empty-day">
                  {t("reading-plan-session-empty", {
                    defaultValue: "No readings yet in this session",
                  })}
                </p>
              )}

              {/* Only the selected session takes new readings — including the
                  ones sent over from the reader's "Add to plan" action, which
                  has no way to name a session. */}
              {isSelected ? (
                <PlaylistItemInput books={books} onAdd={onAddReading} />
              ) : null}
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        className="sb-rp-add-session"
        onClick={onAddSession}
      >
        <MaterialIcon>add</MaterialIcon>
        {t("reading-plan-add-session", { defaultValue: "Add session" })}
      </button>
    </div>
  );
}
