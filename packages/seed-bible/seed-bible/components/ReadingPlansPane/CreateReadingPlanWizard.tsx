import "./CreateReadingPlanWizard.css";
import { useState } from "preact/hooks";
import { useI18n } from "../../i18n/I18nManager";
import {
  draftReadingCount,
  type PlanReading,
  type ReadingPlanDraft,
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

const MS_PER_DAY = 86_400_000;

/** The ordered steps of the wizard. */
const STEP_IDS = ["name", "type", "schedule", "scripture"] as const;
type StepId = (typeof STEP_IDS)[number];

/** Formats an epoch-ms instant as a local `YYYY-MM-DD` for a date input. */
function toDateInputValue(ms: number): string {
  const d = new Date(ms);
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

/** Parses a `YYYY-MM-DD` date input value to epoch ms at local midnight. */
function fromDateInputValue(value: string): number | null {
  if (!value) {
    return null;
  }
  const ms = new Date(`${value}T00:00:00`).getTime();
  return Number.isNaN(ms) ? null : ms;
}

/**
 * The full create-a-reading-plan flow. Collects a name, a plan type, a schedule
 * (duration + optional start date), and per-day readings, then saves the plan
 * through the existing `ReadingPlansManager`.
 *
 * The draft itself lives on the manager (`editingReadingPlan`), not in this
 * component — so closing the plans pane to go read doesn't lose it, and the
 * reader's "Add to plan" verse action can add straight into the day the wizard
 * is showing.
 *
 * The component is fluid-width, so it fills the desktop side pane and the
 * mobile fullscreen pane without any breakpoint of its own.
 */
export function CreateReadingPlanWizard(props: CreateReadingPlanWizardProps) {
  const { readingPlans, books, modals, onCancel, onCreated } = props;
  const { t } = useI18n();

  // Resume on the readings step when the draft already has some — the user got
  // that far, left to add a passage from the reader, and is coming back to it.
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

  const step: StepId = STEP_IDS[stepIndex]!;
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === STEP_IDS.length - 1;

  if (!draft) {
    return null;
  }

  const endDateMs =
    draft.startDateMs + Math.max(0, draft.durationDays - 1) * MS_PER_DAY;
  const totalReadings = draftReadingCount(draft);

  // Whether the current step is complete enough to advance / submit.
  const canAdvance = (() => {
    if (step === "name") {
      return draft.title.trim().length > 0;
    }
    if (step === "scripture") {
      return totalReadings > 0;
    }
    return true;
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
      await readingPlans.saveEditingReadingPlan();
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
    type: t("reading-plan-step-type-title", {
      defaultValue: "Choose reading plan type",
    }),
    schedule: t("reading-plan-step-schedule-title", {
      defaultValue: "Select duration, start & date",
    }),
    scripture: t("reading-plan-step-scripture-title", {
      defaultValue: "Select readings",
    }),
  }[step];

  return (
    <div className="sb-rp-wizard">
      <header className="sb-rp-wizard-header">
        <button
          type="button"
          className="sb-rp-icon-button"
          onClick={goBack}
          aria-label={t("back", { defaultValue: "Back" })}
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="sb-rp-wizard-heading">
          <span className="sb-rp-wizard-eyebrow">
            {t("create-reading-plan-wizard", {
              defaultValue: "Create new plan",
            })}
          </span>
          <span className="sb-rp-wizard-step-count">
            {t("reading-plan-step-indicator", {
              defaultValue: "Step {{current}} of {{total}}",
              current: stepIndex + 1,
              total: STEP_IDS.length,
            })}
          </span>
        </div>
      </header>

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
                defaultValue: "Choose how you want to structure your plan",
              })}
            </p>
            <input
              className="sb-rp-text-input"
              type="text"
              value={draft.title}
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

        {step === "type" && (
          <div className="sb-rp-choices">
            <PlanTypeChoice
              selected={draft.planType === "flexible"}
              title={t("reading-plan-type-flexible", {
                defaultValue: "Flexible Plan",
              })}
              description={t("reading-plan-type-flexible-description", {
                defaultValue: "Start reading anytime at your own pace",
              })}
              onSelect={() =>
                readingPlans.updateEditingReadingPlan({ planType: "flexible" })
              }
            />
            <PlanTypeChoice
              selected={draft.planType === "scheduled"}
              title={t("reading-plan-type-scheduled", {
                defaultValue: "Scheduled Plan",
              })}
              description={t("reading-plan-type-scheduled-description", {
                defaultValue: "Follow a plan starting on a specific date",
              })}
              onSelect={() =>
                readingPlans.updateEditingReadingPlan({ planType: "scheduled" })
              }
            />
          </div>
        )}

        {step === "schedule" && (
          <div className="sb-rp-field-group">
            <div className="sb-rp-field">
              <label className="sb-rp-label" htmlFor="sb-rp-duration">
                {t("reading-plan-duration", { defaultValue: "Duration" })}
              </label>
              <div className="sb-rp-duration-input">
                <input
                  id="sb-rp-duration"
                  className="sb-rp-text-input"
                  type="number"
                  min={1}
                  value={draft.durationDays}
                  onInput={(event: Event) => {
                    const raw = parseInt(
                      (event.currentTarget as HTMLInputElement).value,
                      10
                    );
                    readingPlans.setEditingPlanDuration(
                      Number.isNaN(raw) || raw < 1 ? 1 : raw
                    );
                  }}
                />
                <span className="sb-rp-duration-unit">
                  {t("reading-plan-duration-unit", { defaultValue: "days" })}
                </span>
              </div>
            </div>

            {draft.planType === "scheduled" && (
              <div className="sb-rp-date-row">
                <div className="sb-rp-field">
                  <label className="sb-rp-label" htmlFor="sb-rp-start-date">
                    {t("reading-plan-start-date", {
                      defaultValue: "Start date",
                    })}
                  </label>
                  <input
                    id="sb-rp-start-date"
                    className="sb-rp-text-input"
                    type="date"
                    value={toDateInputValue(draft.startDateMs)}
                    onInput={(event: Event) => {
                      const ms = fromDateInputValue(
                        (event.currentTarget as HTMLInputElement).value
                      );
                      if (ms !== null) {
                        readingPlans.updateEditingReadingPlan({
                          startDateMs: ms,
                        });
                      }
                    }}
                  />
                </div>
                <div className="sb-rp-field">
                  <label className="sb-rp-label" htmlFor="sb-rp-end-date">
                    {t("reading-plan-end-date", { defaultValue: "End date" })}
                  </label>
                  <input
                    id="sb-rp-end-date"
                    className="sb-rp-text-input"
                    type="date"
                    value={toDateInputValue(endDateMs)}
                    disabled
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {step === "scripture" && (
          <ReadingsStep
            books={books}
            modals={modals}
            draft={draft}
            onSelectDay={(day) =>
              readingPlans.updateEditingReadingPlan({ selectedDay: day })
            }
            onAddReading={(item) => readingPlans.addReadingToEditingPlan(item)}
            onRemoveReading={(readingId) =>
              readingPlans.removeReadingFromEditingPlan(
                draft.selectedDay,
                readingId
              )
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
        {step === "scripture" && totalReadings === 0 && (
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

interface PlanTypeChoiceProps {
  selected: boolean;
  title: string;
  description: string;
  onSelect: () => void;
}

function PlanTypeChoice(props: PlanTypeChoiceProps) {
  const { selected, title, description, onSelect } = props;
  return (
    <button
      type="button"
      className={`sb-rp-choice${selected ? " sb-rp-choice-selected" : ""}`}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <span className="sb-rp-choice-radio" aria-hidden="true">
        {selected && <span className="material-symbols-outlined">check</span>}
      </span>
      <span className="sb-rp-choice-text">
        <span className="sb-rp-choice-title">{title}</span>
        <span className="sb-rp-choice-description">{description}</span>
      </span>
    </button>
  );
}

interface ReadingsStepProps {
  books: TranslationBook[];
  modals?: ModalManager;
  draft: ReadingPlanDraft;
  onSelectDay: (day: number) => void;
  onAddReading: (item: PlaylistItemData) => void;
  onRemoveReading: (readingId: string) => void;
}

/**
 * Per-day readings: a day tab strip, the same add-item control the playlist
 * editor uses (scripture, text, or link), and the list of what's on the day —
 * each text or link reading previewable, so the author can check it renders
 * the way they meant before saving the plan.
 */
function ReadingsStep(props: ReadingsStepProps) {
  const { books, modals, draft, onSelectDay, onAddReading, onRemoveReading } =
    props;
  const { t } = useI18n();

  const readings: PlanReading[] = draft.readingsByDay[draft.selectedDay] ?? [];

  // Resolve a book's display name from the active translation's book list.
  const resolveBookName = (bookId: string): string => {
    const book = books.find((b) => b.id === bookId);
    return book?.name ?? book?.commonName ?? bookId;
  };

  const untitledReading = t("reading-plan-untitled-reading", {
    defaultValue: "Reading",
  });

  return (
    <div className="sb-rp-scripture">
      <p className="sb-rp-hint">
        {t("reading-plan-scripture-hint", {
          defaultValue:
            "Add the readings for each day — scripture, text, or a link",
        })}
      </p>

      <div className="sb-rp-day-tabs" role="tablist">
        {Array.from({ length: draft.durationDays }, (_, day) => (
          <button
            key={day}
            type="button"
            role="tab"
            aria-selected={day === draft.selectedDay}
            className={`sb-rp-day-tab${
              day === draft.selectedDay ? " sb-rp-day-tab-selected" : ""
            }`}
            onClick={() => onSelectDay(day)}
          >
            {t("reading-plan-scripture-day", {
              defaultValue: "Day {{day}}",
              day: day + 1,
            })}
          </button>
        ))}
      </div>

      <PlaylistItemInput books={books} onAdd={onAddReading} />

      {readings.length === 0 ? (
        <p className="sb-rp-empty-day">
          {t("reading-plan-scripture-empty-day", {
            defaultValue: "No readings yet for this day",
          })}
        </p>
      ) : (
        <ul className="sb-rp-reading-list">
          {readings.map((reading) => {
            const label = readingLabel(
              reading.item,
              resolveBookName,
              untitledReading
            );
            const preview = readingPreviewText(reading.item, t);
            // A text or link reading is the button — tapping it opens the same
            // preview the reader will see. Scripture has nothing to preview, so
            // it stays plain text.
            const canPreview = modals && canPreviewPlaylistItem(reading.item);

            // Leading type icon, then the label with its one-line summary.
            const body = (
              <>
                <span className="sb-rp-reading-icon" aria-hidden="true">
                  <span className="material-symbols-outlined">
                    {readingItemIcon(reading.item)}
                  </span>
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
                  onClick={() => onRemoveReading(reading.id)}
                  aria-label={t("reading-plan-scripture-remove", {
                    defaultValue: "Remove reading",
                  })}
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
