import "./ReadingPlanDetail.css";
import { useState } from "preact/hooks";
import { DateTime } from "luxon";
import { MaterialIcon } from "../icons";
import { useI18n } from "../../i18n/I18nManager";
import {
  estimateReadingMinutes,
  summarizeCalendar,
  type CalendarReadingDay,
  type PlanReading,
  type ReadingPlansManager,
} from "../../managers/ReadingPlansManager";
import type { TranslationBook } from "../../managers/FreeUseBibleAPI";
import { formatRefLabel } from "../ScriptureItemInput/scriptureSuggestions";

interface ReadingPlanDetailProps {
  readingPlans: ReadingPlansManager;
  /** Books of the active translation, for resolving reading labels. */
  books: TranslationBook[];
  onBack: () => void;
}

/** A short human label for a single reading (verse ref, or a title/url). */
function readingLabel(
  item: PlanReading["item"],
  resolveBookName: (bookId: string) => string
): string {
  if (item.type === "bible-verse") {
    return `${resolveBookName(item.ref.bookId)} ${formatRefLabel(
      item.ref
    )}`.trim();
  }
  if (item.type === "html") {
    return item.title ?? "Reading";
  }
  return item.title ?? item.url;
}

function formatShortDate(ms: number): string {
  return DateTime.fromMillis(ms).toLocaleString({
    month: "short",
    day: "numeric",
  });
}

/**
 * Detail view for a single reading plan: a cover header with progress, streak
 * and time-per-day, a day-by-day tab strip, and per-reading completion for the
 * selected day. Offers to start the plan when there's no progress, and shows a
 * short celebration when a day is completed.
 */
export function ReadingPlanDetail(props: ReadingPlanDetailProps) {
  const { readingPlans, books, onBack } = props;
  const { t } = useI18n();

  const [starting, setStarting] = useState(false);
  const [celebrationDay, setCelebrationDay] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const resolveBookName = (bookId: string): string => {
    const book = books.find((b) => b.id === bookId);
    return book?.name ?? book?.commonName ?? bookId;
  };

  // `.value` reads subscribe this component to the manager's signals.
  const plan = readingPlans.selectedReadingPlan.value;
  const progress = readingPlans.selectedReadingPlanProgress.value;
  const calendar = readingPlans.selectedReadingPlanProgressCalendar.value;

  if (!plan) {
    return null;
  }

  const title =
    plan.title ?? t("untitled-reading-plan", { defaultValue: "Untitled plan" });

  const cover = (
    <span className="sb-rpd-cover" aria-hidden="true">
      <MaterialIcon>auto_stories</MaterialIcon>
    </span>
  );

  const handleStart = async () => {
    if (starting) {
      return;
    }
    setStarting(true);
    try {
      const created = await readingPlans.startReadingPlan(plan);
      await readingPlans.selectReadingPlanProgress(created);
    } catch (error) {
      console.error("Failed to start reading plan:", error);
    } finally {
      setStarting(false);
    }
  };

  const backButton = (
    <button
      type="button"
      className="sb-rp-icon-button sb-rpd-back"
      onClick={onBack}
      aria-label={t("back", { defaultValue: "Back" })}
    >
      <MaterialIcon>arrow_back</MaterialIcon>
    </button>
  );

  // Not started yet: hero + start CTA.
  if (!progress) {
    return (
      <div className="sb-rpd">
        <header className="sb-rpd-hero-header">
          {backButton}
          <div className="sb-rpd-hero-top">
            {cover}
            <div className="sb-rpd-hero-heading">
              <h2 className="sb-rpd-title" dir="auto">
                {title}
              </h2>
              {plan.description ? (
                <p className="sb-rpd-subtitle" dir="auto">
                  {plan.description}
                </p>
              ) : null}
            </div>
          </div>
        </header>
        <div className="sb-rpd-body">
          <p className="sb-rpd-hero-summary">
            {t("reading-plan-session-count", {
              defaultValue: "{{count}} readings",
              count: plan.sessions.length,
            })}
          </p>
        </div>
        <footer className="sb-rpd-footer">
          <button
            type="button"
            className="sb-rp-button sb-rp-button-primary"
            onClick={() => void handleStart()}
            disabled={starting || plan.sessions.length === 0}
          >
            {t("reading-plan-start", { defaultValue: "Start plan" })}
          </button>
        </footer>
      </div>
    );
  }

  const summary = summarizeCalendar(calendar, Date.now());
  const { readingDays, totalDays, doneDays, streak } = summary;
  const planComplete = totalDays > 0 && doneDays === totalDays;

  // Average minutes per reading day, for the "~N min/day" chip.
  const avgMinutes =
    readingDays.length > 0
      ? Math.round(
          readingDays.reduce(
            (sum, day) =>
              sum +
              estimateReadingMinutes(
                day.sessions.flatMap((s) => s.session.readings)
              ),
            0
          ) / readingDays.length
        )
      : 0;

  // Which day tab is active: explicit selection, else today, else next, else first.
  const autoIndex =
    summary.today != null
      ? readingDays.indexOf(summary.today)
      : summary.next != null
        ? readingDays.indexOf(summary.next)
        : 0;
  const activeIndex =
    selectedDay != null && selectedDay >= 0 && selectedDay < readingDays.length
      ? selectedDay
      : Math.max(0, autoIndex);
  const activeDay = readingDays[activeIndex] ?? null;

  const isReadingDone = (sessionId: string, readingId: string): boolean => {
    const sp = progress.sessions.find((s) => s.sessionId === sessionId);
    return sp?.completedReadingIds.includes(readingId) ?? false;
  };

  const toggleReading = async (
    session: CalendarReadingDay["sessions"][number]["session"],
    readingId: string,
    done: boolean
  ) => {
    try {
      await readingPlans.markReadingComplete(session, readingId, !done);
    } catch (error) {
      console.error("Failed to update reading:", error);
    }
  };

  const completeDay = async (day: CalendarReadingDay, dayNumber: number) => {
    try {
      await readingPlans.markDayComplete(day, true);
      setCelebrationDay(dayNumber);
    } catch (error) {
      console.error("Failed to complete day:", error);
    }
  };

  // Celebration overlay after completing a day.
  if (celebrationDay != null) {
    return (
      <div className="sb-rpd">
        <header className="sb-rpd-hero-header">{backButton}</header>
        <div className="sb-rpd-celebration">
          <div className="sb-rpd-celebration-badge" aria-hidden="true">
            <MaterialIcon>check</MaterialIcon>
          </div>
          <h3 className="sb-rpd-celebration-title">
            {planComplete
              ? t("reading-plan-complete-title", {
                  defaultValue: "Plan complete!",
                })
              : t("reading-plan-celebration-title", {
                  defaultValue: "Day {{day}} complete!",
                  day: celebrationDay,
                })}
          </h3>
          <p className="sb-rpd-celebration-subtitle">
            {t("reading-plan-celebration-subtitle", {
              defaultValue: "Great work. Keep the momentum going.",
            })}
          </p>
          <button
            type="button"
            className="sb-rp-button sb-rp-button-primary"
            onClick={() => setCelebrationDay(null)}
          >
            {t("reading-plan-back-to-plan", { defaultValue: "Back to plan" })}
          </button>
        </div>
      </div>
    );
  }

  const percent = totalDays > 0 ? Math.round((doneDays / totalDays) * 100) : 0;
  const endsMs = summary.lastDay?.date.toMillis() ?? null;

  // Whether every reading on the active day is complete (gates the day button).
  const activeDayReadings = activeDay
    ? activeDay.sessions.flatMap((cs) =>
        cs.session.readings.map((r) => ({
          session: cs.session,
          reading: r,
        }))
      )
    : [];
  const activeDayAllDone =
    activeDayReadings.length > 0 &&
    activeDayReadings.every(({ session, reading }) =>
      isReadingDone(session.id, reading.id)
    );
  const activeDayNote = activeDay?.sessions.find((s) => s.session.note)?.session
    .note;

  return (
    <div className="sb-rpd">
      <header className="sb-rpd-hero-header">
        {backButton}
        <div className="sb-rpd-hero-top">
          {cover}
          <div className="sb-rpd-hero-heading">
            <h2 className="sb-rpd-title" dir="auto">
              {title}
            </h2>
            <p className="sb-rpd-subtitle">
              {t("reading-plan-duration-days", {
                defaultValue: "{{count}} days",
                count: totalDays,
              })}
              {" · "}
              {t("reading-plan-started-on", {
                defaultValue: "started {{date}}",
                date: formatShortDate(progress.startedAtMs),
              })}
              {endsMs != null
                ? ` · ${t("reading-plan-ends-on", {
                    defaultValue: "ends {{date}}",
                    date: formatShortDate(endsMs),
                  })}`
                : ""}
            </p>
          </div>
        </div>

        <div className="sb-rpd-hero-progress">
          <div className="sb-rpd-progress-bar sb-rpd-progress-bar-onhero">
            <div
              className="sb-rpd-progress-bar-fill"
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="sb-rpd-progress-count">
            {t("reading-plan-progress-days", {
              defaultValue: "{{done}}/{{total}} days",
              done: doneDays,
              total: totalDays,
            })}
          </span>
        </div>

        <div className="sb-rpd-chips">
          {streak > 0 ? (
            <span className="sb-rpd-chip">
              🔥{" "}
              {t("reading-plan-streak", {
                defaultValue: "{{count}}-day streak",
                count: streak,
              })}
            </span>
          ) : null}
          {avgMinutes > 0 ? (
            <span className="sb-rpd-chip">
              {t("reading-plan-min-per-day", {
                defaultValue: "~{{count}} min/day",
                count: avgMinutes,
              })}
            </span>
          ) : null}
        </div>
      </header>

      <div className="sb-rpd-body">
        {readingDays.length === 0 ? (
          <p className="sb-rpd-empty">
            {t("reading-plan-empty-sessions", {
              defaultValue: "This plan doesn't have any readings yet.",
            })}
          </p>
        ) : (
          <>
            <div className="sb-rpd-day-tabs" role="tablist">
              {readingDays.map((day, index) => {
                const isDone = day.completedAtMs != null;
                const isActive = index === activeIndex;
                return (
                  <button
                    key={day.dayOffset}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={`sb-rpd-day-tab${
                      isActive ? " sb-rpd-day-tab-active" : ""
                    }${day.containsNow ? " sb-rpd-day-tab-today" : ""}`}
                    onClick={() => setSelectedDay(index)}
                  >
                    <span className="sb-rpd-day-tab-label">
                      {t("reading-plan-day-short", {
                        defaultValue: "Day",
                      })}
                    </span>
                    <span className="sb-rpd-day-tab-num">{index + 1}</span>
                    {isDone ? (
                      <MaterialIcon className="sb-rpd-day-tab-check">
                        check
                      </MaterialIcon>
                    ) : day.containsNow ? (
                      <span className="sb-rpd-day-tab-dot" aria-hidden="true" />
                    ) : null}
                  </button>
                );
              })}
            </div>

            {activeDay ? (
              <>
                <ul className="sb-rpd-reading-cards">
                  {activeDayReadings.map(({ session, reading }) => {
                    const done = isReadingDone(session.id, reading.id);
                    const minutes = estimateReadingMinutes([reading]);
                    return (
                      <li key={reading.id}>
                        <button
                          type="button"
                          className={`sb-rpd-reading-card${
                            done ? " sb-rpd-reading-card-done" : ""
                          }`}
                          onClick={() =>
                            void toggleReading(session, reading.id, done)
                          }
                          aria-pressed={done}
                        >
                          <span
                            className={`sb-rpd-reading-check${
                              done ? " sb-rpd-reading-check-done" : ""
                            }`}
                            aria-hidden="true"
                          >
                            <MaterialIcon>
                              {done ? "check_circle" : "radio_button_unchecked"}
                            </MaterialIcon>
                          </span>
                          <span className="sb-rpd-reading-text">
                            <span className="sb-rpd-reading-title">
                              {readingLabel(reading.item, resolveBookName)}
                            </span>
                            <span className="sb-rpd-reading-meta">
                              {done
                                ? t("reading-plan-reading-read", {
                                    defaultValue: "Read",
                                  })
                                : t("reading-plan-reading-mins", {
                                    defaultValue: "~{{count}} min",
                                    count: minutes,
                                  })}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>

                {activeDayNote ? (
                  <div className="sb-rpd-reflect">
                    <div className="sb-rpd-reflect-head">
                      <MaterialIcon>lightbulb</MaterialIcon>
                      {t("reading-plan-reflect", { defaultValue: "Reflect" })}
                    </div>
                    <p className="sb-rpd-reflect-text">{activeDayNote}</p>
                  </div>
                ) : null}
              </>
            ) : null}
          </>
        )}
      </div>

      {activeDay ? (
        <footer className="sb-rpd-footer">
          <button
            type="button"
            className="sb-rp-button sb-rp-button-primary"
            disabled={!activeDayAllDone}
            onClick={() => void completeDay(activeDay, activeIndex + 1)}
          >
            {t("reading-plan-mark-day-complete", {
              defaultValue: "Mark Day {{day}} complete",
              day: activeIndex + 1,
            })}
          </button>
          {!activeDayAllDone ? (
            <p className="sb-rpd-footer-note">
              {t("reading-plan-finish-readings", {
                defaultValue: "Finish all readings to complete the day",
              })}
            </p>
          ) : null}
        </footer>
      ) : null}
    </div>
  );
}
