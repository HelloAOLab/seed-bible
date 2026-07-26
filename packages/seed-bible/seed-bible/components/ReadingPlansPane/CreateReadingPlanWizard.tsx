import "./CreateReadingPlanWizard.css";
import { useMemo, useState } from "preact/hooks";
import { v4 as uuid } from "uuid";
import { useI18n } from "../../i18n/I18nManager";
import type {
  PlanReading,
  ReadingPlansManager,
  ReadingPlanSession,
  ReadingPlanType,
} from "../../managers/ReadingPlansManager";
import type { TranslationBook } from "../../managers/FreeUseBibleAPI";
import type {
  PlaylistItemData,
  VerseRef,
} from "../../managers/PlaylistManager";
import { ScriptureItemInput } from "../ScriptureItemInput/ScriptureItemInput";
import { formatRefLabel } from "../ScriptureItemInput/scriptureSuggestions";

interface CreateReadingPlanWizardProps {
  readingPlans: ReadingPlansManager;
  /** Books of the active translation, for the scripture typeahead + labels. */
  books: TranslationBook[];
  /** Called when the user backs out of the first step (or cancels). */
  onCancel: () => void;
  /** Called after a plan is successfully created. */
  onCreated: () => void;
}

/** A single scripture reading held in the wizard's draft. */
interface DraftReading {
  /** Human label shown back to the user (e.g. "Genesis 1:1-3"). */
  display: string;
  ref: VerseRef;
}

const MS_PER_DAY = 86_400_000;
const DEFAULT_DURATION_DAYS = 30;

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

/** Local midnight (epoch ms) of the given instant — today's date by default. */
function todayMidnightMs(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

/**
 * The full create-a-reading-plan flow. Collects a name, a plan type, a schedule
 * (duration + optional start date), and per-day scripture readings, then builds
 * the plan and its sessions through the existing `ReadingPlansManager`.
 *
 * The component is fluid-width, so it fills the desktop side pane and the
 * mobile fullscreen pane without any breakpoint of its own.
 */
export function CreateReadingPlanWizard(props: CreateReadingPlanWizardProps) {
  const { readingPlans, books, onCancel, onCreated } = props;
  const { t } = useI18n();

  const [stepIndex, setStepIndex] = useState(0);
  const [name, setName] = useState("");
  const [planType, setPlanType] = useState<ReadingPlanType>("flexible");
  const [durationDays, setDurationDays] = useState(DEFAULT_DURATION_DAYS);
  const [startDateMs, setStartDateMs] = useState<number>(todayMidnightMs());
  const [readingsByDay, setReadingsByDay] = useState<
    Record<number, DraftReading[]>
  >({});
  const [selectedDay, setSelectedDay] = useState(0);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState(false);

  const step: StepId = STEP_IDS[stepIndex]!;
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === STEP_IDS.length - 1;

  const endDateMs = useMemo(
    () => startDateMs + Math.max(0, durationDays - 1) * MS_PER_DAY,
    [startDateMs, durationDays]
  );

  const totalReadings = useMemo(
    () =>
      Object.values(readingsByDay).reduce((sum, list) => sum + list.length, 0),
    [readingsByDay]
  );

  // Whether the current step is complete enough to advance / submit.
  const canAdvance = (() => {
    if (step === "name") {
      return name.trim().length > 0;
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

  const addReadingToDay = (day: number, reading: DraftReading) => {
    setReadingsByDay((prev) => ({
      ...prev,
      [day]: [...(prev[day] ?? []), reading],
    }));
  };

  const removeReading = (day: number, index: number) => {
    setReadingsByDay((prev) => ({
      ...prev,
      [day]: (prev[day] ?? []).filter((_, i) => i !== index),
    }));
  };

  const handleCreate = async () => {
    if (saving || totalReadings === 0) {
      return;
    }
    setSaving(true);
    setSubmitError(false);
    try {
      let plan = await readingPlans.createNewReadingPlan({
        title: name.trim() || null,
        planType,
        durationDays,
        suggestedStartDateMs: planType === "scheduled" ? startDateMs : null,
      });

      // One session per day, in day order, skipping days with no readings.
      for (let day = 0; day < durationDays; day++) {
        const readings = readingsByDay[day] ?? [];
        if (readings.length === 0) {
          continue;
        }
        const session: ReadingPlanSession = {
          id: uuid(),
          title: null,
          readings: readings.map(
            (r): PlanReading => ({
              id: uuid(),
              item: { type: "bible-verse", ref: r.ref },
            })
          ),
        };
        plan = await readingPlans.addSessionToReadingPlan(plan, session);
      }

      onCreated();
    } catch (error) {
      console.error("Failed to create reading plan:", error);
      setSubmitError(true);
      setSaving(false);
    }
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
      defaultValue: "Select scripture",
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
              value={name}
              autoFocus
              onInput={(event: Event) =>
                setName((event.currentTarget as HTMLInputElement).value)
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
              selected={planType === "flexible"}
              title={t("reading-plan-type-flexible", {
                defaultValue: "Flexible Plan",
              })}
              description={t("reading-plan-type-flexible-description", {
                defaultValue: "Start reading anytime at your own pace",
              })}
              onSelect={() => setPlanType("flexible")}
            />
            <PlanTypeChoice
              selected={planType === "scheduled"}
              title={t("reading-plan-type-scheduled", {
                defaultValue: "Scheduled Plan",
              })}
              description={t("reading-plan-type-scheduled-description", {
                defaultValue: "Follow a plan starting on a specific date",
              })}
              onSelect={() => setPlanType("scheduled")}
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
                  value={durationDays}
                  onInput={(event: Event) => {
                    const raw = parseInt(
                      (event.currentTarget as HTMLInputElement).value,
                      10
                    );
                    setDurationDays(Number.isNaN(raw) || raw < 1 ? 1 : raw);
                  }}
                />
                <span className="sb-rp-duration-unit">
                  {t("reading-plan-duration-unit", { defaultValue: "days" })}
                </span>
              </div>
            </div>

            {planType === "scheduled" && (
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
                    value={toDateInputValue(startDateMs)}
                    onInput={(event: Event) => {
                      const ms = fromDateInputValue(
                        (event.currentTarget as HTMLInputElement).value
                      );
                      if (ms !== null) {
                        setStartDateMs(ms);
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
          <ScriptureStep
            books={books}
            durationDays={durationDays}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
            readings={readingsByDay[selectedDay] ?? []}
            onAddReading={(reading) => addReadingToDay(selectedDay, reading)}
            onRemoveReading={(index) => removeReading(selectedDay, index)}
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

interface ScriptureStepProps {
  books: TranslationBook[];
  durationDays: number;
  selectedDay: number;
  onSelectDay: (day: number) => void;
  readings: DraftReading[];
  onAddReading: (reading: DraftReading) => void;
  onRemoveReading: (index: number) => void;
}

function ScriptureStep(props: ScriptureStepProps) {
  const {
    books,
    durationDays,
    selectedDay,
    onSelectDay,
    readings,
    onAddReading,
    onRemoveReading,
  } = props;
  const { t } = useI18n();

  // Resolve a book's display name from the active translation's book list.
  const resolveBookName = (bookId: string): string => {
    const book = books.find((b) => b.id === bookId);
    return book?.name ?? book?.commonName ?? bookId;
  };

  const handleAdd = (item: PlaylistItemData) => {
    if (item.type !== "bible-verse") {
      return;
    }
    const display = `${resolveBookName(item.ref.bookId)} ${formatRefLabel(
      item.ref
    )}`.trim();
    onAddReading({ display, ref: item.ref });
  };

  return (
    <div className="sb-rp-scripture">
      <p className="sb-rp-hint">
        {t("reading-plan-scripture-hint", {
          defaultValue: "Add the passages to read each day",
        })}
      </p>

      <div className="sb-rp-day-tabs" role="tablist">
        {Array.from({ length: durationDays }, (_, day) => (
          <button
            key={day}
            type="button"
            role="tab"
            aria-selected={day === selectedDay}
            className={`sb-rp-day-tab${
              day === selectedDay ? " sb-rp-day-tab-selected" : ""
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

      <ScriptureItemInput
        books={books}
        onAdd={handleAdd}
        submitLabel={t("reading-plan-add-reading", { defaultValue: "Add" })}
      />

      {readings.length === 0 ? (
        <p className="sb-rp-empty-day">
          {t("reading-plan-scripture-empty-day", {
            defaultValue: "No readings yet for this day",
          })}
        </p>
      ) : (
        <ul className="sb-rp-reading-list">
          {readings.map((reading, index) => (
            <li key={index} className="sb-rp-reading-item">
              <span className="sb-rp-reading-label">{reading.display}</span>
              <button
                type="button"
                className="sb-rp-icon-button sb-rp-reading-remove"
                onClick={() => onRemoveReading(index)}
                aria-label={t("reading-plan-scripture-remove", {
                  defaultValue: "Remove reading",
                })}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
