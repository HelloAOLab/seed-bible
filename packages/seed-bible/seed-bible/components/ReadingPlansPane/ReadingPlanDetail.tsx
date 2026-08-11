import "./ReadingPlanDetail.css";
import { useState } from "preact/hooks";
import { MaterialIcon } from "../icons";
import { useI18n } from "../../i18n/I18nManager";
import {
  cadenceDurationDays,
  estimateReadingMinutes,
  isReadingChapterComplete,
  readingChapters,
  readingCompletion,
  summarizeCalendar,
  type CalendarReadingDay,
  type PlanReading,
  type ReadingPlan,
  type ReadingPlanSession,
  type ReadingPlansManager,
  type SessionProgress,
} from "../../managers/ReadingPlansManager";
import type {
  PlaylistItemData,
  VerseRef,
} from "../../managers/PlaylistManager";
import type { TranslationBook } from "../../managers/FreeUseBibleAPI";
import type { ModalManager } from "../../managers/ModalManager";
import {
  canPreviewPlaylistItem,
  openPlaylistItemPreview,
} from "../playlistItemPreview";
import { cadenceOptionLabel } from "./cadenceLabels";
import { planQueueStartIndex } from "./planQueue";
import { readingLabel } from "./readingLabel";
import {
  PLAN_READING_PREVIEW_MODAL_ID,
  readingItemIcon,
  readingPreviewText,
} from "./readingPreview";

interface ReadingPlanDetailProps {
  readingPlans: ReadingPlansManager;
  /** Books of the active translation, for resolving reading labels. */
  books: TranslationBook[];
  /** Modals host for opening a text/link reading. Optional — without it the
   * open action is simply not offered. */
  modals?: ModalManager;
  /** Navigates the reader to a scripture reading. */
  onOpenScripture?: (
    ref: VerseRef,
    translationId?: string
  ) => void | Promise<void>;
  /** Hands a day's readings to the reader's playback queue. */
  onPlayReadings?: (
    plan: ReadingPlan,
    items: PlaylistItemData[],
    startIndex: number
  ) => void;
  /** Opens this plan in the editor. */
  onEdit?: () => void;
  /** Called after the plan has been deleted, so the pane can leave this view. */
  onDeleted?: () => void;
}

function formatShortDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/** Marks the reader chose "at my own pace" rather than one of the cadences. */
const SELF_PACED_CHOICE = "__self_paced__";

/**
 * Detail view for a single reading plan: progress, streak and time-per-day, a
 * day-by-day tab strip, and per-reading completion for the selected day. Offers
 * a choice of how to read the plan when there's no progress yet, and shows a
 * short celebration when a day is completed.
 *
 * The plan's name, its icon and the back button live in the pane's own header
 * (see `ReadingPlansPane`), so this view starts at the progress summary.
 */
export function ReadingPlanDetail(props: ReadingPlanDetailProps) {
  const {
    readingPlans,
    books,
    modals,
    onOpenScripture,
    onPlayReadings,
    onEdit,
    onDeleted,
  } = props;
  const { t } = useI18n();

  const [starting, setStarting] = useState(false);
  const [celebrationDay, setCelebrationDay] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [pace, setPace] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // Scripture readings covering several chapters can be opened out to tick off
  // one chapter at a time; keyed by reading id.
  const [expandedReadingId, setExpandedReadingId] = useState<string | null>(
    null
  );

  const resolveBookName = (bookId: string): string => {
    const book = books.find((b) => b.id === bookId);
    return book?.name ?? book?.commonName ?? bookId;
  };

  // Feeds the time estimate a book's average chapter length, so a chapter of
  // Psalms doesn't read as taking as long as a chapter of Isaiah.
  const resolveBookLength = (bookId: string) =>
    books.find((b) => b.id === bookId) ?? null;

  // `.value` reads subscribe this component to the manager's signals.
  const plan = readingPlans.selectedReadingPlan.value;
  const progress = readingPlans.selectedReadingPlanProgress.value;
  const calendar = readingPlans.selectedReadingPlanProgressCalendar.value;
  const canEdit = readingPlans.canEditSelectedPlan.value;

  if (!plan) {
    return null;
  }

  const deletePlan = async () => {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setConfirmingDelete(false);
    try {
      await readingPlans.deleteReadingPlan(plan);
      onDeleted?.();
    } catch (error) {
      console.error("Failed to delete reading plan:", error);
    }
  };

  /**
   * Edit and delete for the open plan. Delete is offered whether or not the
   * plan is the user's to edit — a plan you can't get rid of is a plan you're
   * stuck with — and asks once before erasing anything.
   */
  const planActions = (
    <div className="sb-rpd-plan-actions">
      {canEdit && onEdit ? (
        <button
          type="button"
          className="sb-rp-icon-button"
          onClick={onEdit}
          aria-label={t("edit-reading-plan", { defaultValue: "Edit plan" })}
          title={t("edit-reading-plan", { defaultValue: "Edit plan" })}
        >
          <MaterialIcon>edit</MaterialIcon>
        </button>
      ) : null}
      <button
        type="button"
        className={`sb-rp-restart${
          confirmingDelete ? " sb-rp-restart-danger" : ""
        }`}
        onClick={() => void deletePlan()}
      >
        {confirmingDelete
          ? t("reading-plan-delete-confirm", {
              defaultValue: "Delete for good?",
            })
          : t("reading-plan-delete", { defaultValue: "Delete" })}
      </button>
    </div>
  );

  // Not started yet: pick how to read it, then start.
  if (!progress) {
    // Default to the plan's own suggested cadence until the reader picks.
    const chosen =
      pace ?? plan.defaultCadenceId ?? plan.cadenceOptions[0]?.id ?? null;
    const selfPaced = chosen === SELF_PACED_CHOICE;

    const handleStart = async () => {
      if (starting) {
        return;
      }
      setStarting(true);
      try {
        const created = await readingPlans.startReadingPlan(
          plan,
          selfPaced ? { selfPaced: true } : { cadenceId: chosen }
        );
        await readingPlans.selectReadingPlanProgress(created);
      } catch (error) {
        console.error("Failed to start reading plan:", error);
      } finally {
        setStarting(false);
      }
    };

    return (
      <div className="sb-rpd">
        <div className="sb-rpd-body">
          {plan.description ? (
            <p className="sb-rpd-subtitle" dir="auto">
              {plan.description}
            </p>
          ) : null}
          <p className="sb-rpd-hero-summary">
            {t("reading-plan-session-count-sessions", {
              defaultValue: "{{count}} sessions",
              count: plan.sessions.length,
            })}
          </p>

          {/* How the reader wants to take the plan. A plan has no duration of
              its own — each cadence implies its own, and "at my own pace" has
              none at all. */}
          <h3 className="sb-rpd-section-title">
            {t("reading-plan-choose-pace", {
              defaultValue: "How do you want to read it?",
            })}
          </h3>
          <div className="sb-rp-choices">
            {plan.cadenceOptions.map((option) => {
              const days = cadenceDurationDays(
                option.cadence,
                plan.sessions.length
              );
              return (
                <PaceChoice
                  key={option.id}
                  selected={chosen === option.id}
                  title={cadenceOptionLabel(option, t)}
                  description={
                    days > 0
                      ? t("reading-plan-cadence-length", {
                          defaultValue: "Finishes in {{count}} days",
                          count: days,
                        })
                      : ""
                  }
                  onSelect={() => setPace(option.id)}
                />
              );
            })}
            <PaceChoice
              selected={selfPaced}
              title={t("reading-plan-pace-self", {
                defaultValue: "At my own pace",
              })}
              description={t("reading-plan-pace-self-description", {
                defaultValue: "Read one session at a time, with no schedule",
              })}
              onSelect={() => setPace(SELF_PACED_CHOICE)}
            />
          </div>
          {planActions}
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

  const summary = summarizeCalendar(calendar, Date.now(), progress.timeZone);
  const { readingDays, totalDays, doneDays, streak } = summary;
  const planComplete = totalDays > 0 && doneDays === totalDays;
  // A self-paced read has an order but no schedule, so it's counted in sessions
  // rather than days and never shows dates, streaks or "behind".
  const selfPaced = progress.selfPaced === true;

  const sessionProgressFor = (sessionId: string): SessionProgress | undefined =>
    progress.sessions.find((s) => s.sessionId === sessionId);

  // Average minutes per reading day, for the "~N min/day" chip.
  const avgMinutes =
    readingDays.length > 0
      ? Math.round(
          readingDays.reduce(
            (sum, day) =>
              sum +
              estimateReadingMinutes(
                day.sessions.flatMap((s) => s.session.readings),
                resolveBookLength
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

  const isReadingDone = (sessionId: string, readingId: string): boolean =>
    sessionProgressFor(sessionId)?.completedReadingIds.includes(readingId) ??
    false;

  const toggleReading = async (
    session: ReadingPlanSession,
    readingId: string,
    done: boolean
  ) => {
    try {
      await readingPlans.markReadingComplete(session, readingId, !done);
    } catch (error) {
      console.error("Failed to update reading:", error);
    }
  };

  const toggleReadingChapter = async (
    session: ReadingPlanSession,
    readingId: string,
    chapter: number,
    done: boolean
  ) => {
    try {
      await readingPlans.markReadingChapterComplete(
        session,
        readingId,
        chapter,
        !done
      );
    } catch (error) {
      console.error("Failed to update chapter:", error);
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

  /**
   * Opens a scripture reading in the reader, at the first chapter of it the
   * user hasn't finished — reopening a reading you're six chapters into should
   * put you at chapter seven, not back at chapter one.
   */
  const openScripture = (session: ReadingPlanSession, reading: PlanReading) => {
    const item = reading.item;
    if (item.type !== "bible-verse" || !onOpenScripture) {
      return;
    }
    const sp = sessionProgressFor(session.id);
    const chapters = readingChapters(reading);
    const firstUnread = chapters.find(
      (chapter) => !isReadingChapterComplete(sp, reading.id, chapter)
    );
    const chapter = firstUnread ?? item.ref.chapter;
    void onOpenScripture(
      // Only the first chapter of a range starts at a specific verse; landing
      // mid-range should start at the top of that chapter.
      chapter === item.ref.chapter
        ? item.ref
        : { bookId: item.ref.bookId, chapter },
      item.translationId
    );
  };

  // Celebration overlay after completing a day.
  if (celebrationDay != null) {
    return (
      <div className="sb-rpd">
        <div className="sb-rpd-celebration">
          <div className="sb-rpd-celebration-badge" aria-hidden="true">
            <MaterialIcon>check</MaterialIcon>
          </div>
          <h3 className="sb-rpd-celebration-title">
            {planComplete
              ? t("reading-plan-complete-title", {
                  defaultValue: "Plan complete!",
                })
              : selfPaced
                ? t("reading-plan-celebration-session-title", {
                    defaultValue: "Session {{day}} complete!",
                    day: celebrationDay,
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
  const lastDate = summary.lastDay?.date;
  const endsMs = lastDate
    ? new Date(lastDate.year, lastDate.month - 1, lastDate.day).getTime()
    : null;

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

  /**
   * Reads the day straight through: hands its readings to the reader's playback
   * queue — the same one playlists use — starting at the first one that isn't
   * finished, so next/back step through the plan rather than a parallel set of
   * controls being grown here.
   */
  const playActiveDay = () => {
    if (!onPlayReadings || activeDayReadings.length === 0) {
      return;
    }
    onPlayReadings(
      plan,
      activeDayReadings.map(({ reading }) => reading.item),
      planQueueStartIndex(activeDayReadings, {
        isReadingDone,
        sessionProgressFor,
      })
    );
  };

  return (
    <div className="sb-rpd">
      <header className="sb-rpd-hero-header">
        <p className="sb-rpd-subtitle">
          {selfPaced
            ? t("reading-plan-session-count-sessions", {
                defaultValue: "{{count}} sessions",
                count: totalDays,
              })
            : t("reading-plan-duration-days", {
                defaultValue: "{{count}} days",
                count: totalDays,
              })}
          {" · "}
          {t("reading-plan-started-on", {
            defaultValue: "started {{date}}",
            date: formatShortDate(progress.startedAtMs),
          })}
          {!selfPaced && endsMs != null
            ? ` · ${t("reading-plan-ends-on", {
                defaultValue: "ends {{date}}",
                date: formatShortDate(endsMs),
              })}`
            : ""}
        </p>

        <div className="sb-rpd-hero-progress">
          <div className="sb-rpd-progress-bar sb-rpd-progress-bar-onhero">
            <div
              className="sb-rpd-progress-bar-fill"
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="sb-rpd-progress-count">
            {selfPaced
              ? t("reading-plan-progress-sessions", {
                  defaultValue: "{{done}}/{{total}} sessions",
                  done: doneDays,
                  total: totalDays,
                })
              : t("reading-plan-progress-days", {
                  defaultValue: "{{done}}/{{total}} days",
                  done: doneDays,
                  total: totalDays,
                })}
          </span>
        </div>

        <div className="sb-rpd-chips">
          {/* A streak counts consecutive days you kept to the schedule, so it
              means nothing when there is no schedule to keep to. */}
          {!selfPaced && streak > 0 ? (
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
              {selfPaced
                ? t("reading-plan-min-per-session", {
                    defaultValue: "~{{count}} min/session",
                    count: avgMinutes,
                  })
                : t("reading-plan-min-per-day", {
                    defaultValue: "~{{count}} min/day",
                    count: avgMinutes,
                  })}
            </span>
          ) : null}
        </div>

        {planActions}
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
                const isToday = !selfPaced && day.containsNow;
                return (
                  <button
                    key={day.dayOffset}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={`sb-rpd-day-tab${
                      isActive ? " sb-rpd-day-tab-active" : ""
                    }${isToday ? " sb-rpd-day-tab-today" : ""}`}
                    onClick={() => setSelectedDay(index)}
                  >
                    <span className="sb-rpd-day-tab-label">
                      {selfPaced
                        ? t("reading-plan-session-short", {
                            defaultValue: "Session",
                          })
                        : t("reading-plan-day-short", {
                            defaultValue: "Day",
                          })}
                    </span>
                    <span className="sb-rpd-day-tab-num">{index + 1}</span>
                    {isDone ? (
                      <MaterialIcon className="sb-rpd-day-tab-check">
                        check
                      </MaterialIcon>
                    ) : isToday ? (
                      <span className="sb-rpd-day-tab-dot" aria-hidden="true" />
                    ) : null}
                  </button>
                );
              })}
            </div>

            {activeDay ? (
              <>
                <ul className="sb-rpd-reading-cards">
                  {activeDayReadings.map(({ session, reading }) => (
                    <ReadingRow
                      key={reading.id}
                      session={session}
                      reading={reading}
                      sessionProgress={sessionProgressFor(session.id)}
                      expanded={expandedReadingId === reading.id}
                      canPreview={
                        !!modals && canPreviewPlaylistItem(reading.item)
                      }
                      canNavigate={
                        !!onOpenScripture && reading.item.type === "bible-verse"
                      }
                      resolveBookName={resolveBookName}
                      resolveBookLength={resolveBookLength}
                      onToggleExpanded={() =>
                        setExpandedReadingId((current) =>
                          current === reading.id ? null : reading.id
                        )
                      }
                      onToggle={(done) =>
                        void toggleReading(session, reading.id, done)
                      }
                      onToggleChapter={(chapter, done) =>
                        void toggleReadingChapter(
                          session,
                          reading.id,
                          chapter,
                          done
                        )
                      }
                      onOpen={() => {
                        if (reading.item.type === "bible-verse") {
                          openScripture(session, reading);
                        } else if (modals) {
                          openPlaylistItemPreview(
                            modals,
                            reading.item,
                            PLAN_READING_PREVIEW_MODAL_ID,
                            t
                          );
                        }
                      }}
                      t={t}
                    />
                  ))}
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
          <div className="sb-rpd-footer-actions">
            {onPlayReadings && activeDayReadings.length > 0 ? (
              <button
                type="button"
                className="sb-rp-button sb-rp-button-primary"
                onClick={playActiveDay}
              >
                <MaterialIcon>play_arrow</MaterialIcon>
                {t("reading-plan-read-day", { defaultValue: "Read" })}
              </button>
            ) : null}
            <button
              type="button"
              className="sb-rp-button sb-rp-button-secondary"
              disabled={!activeDayAllDone}
              onClick={() => void completeDay(activeDay, activeIndex + 1)}
            >
              {selfPaced
                ? t("reading-plan-mark-session-complete", {
                    defaultValue: "Mark session {{day}} complete",
                    day: activeIndex + 1,
                  })
                : t("reading-plan-mark-day-complete", {
                    defaultValue: "Mark Day {{day}} complete",
                    day: activeIndex + 1,
                  })}
            </button>
          </div>
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

interface ReadingRowProps {
  session: ReadingPlanSession;
  reading: PlanReading;
  sessionProgress: SessionProgress | undefined;
  expanded: boolean;
  canPreview: boolean;
  canNavigate: boolean;
  resolveBookName: (bookId: string) => string;
  resolveBookLength: (
    bookId: string
  ) => { numberOfChapters: number; totalNumberOfVerses: number } | null;
  onToggleExpanded: () => void;
  onToggle: (done: boolean) => void;
  onToggleChapter: (chapter: number, done: boolean) => void;
  onOpen: () => void;
  t: ReturnType<typeof useI18n>["t"];
}

/**
 * One reading in the day's list. Every kind of reading has the same shape — the
 * completion check sits outside the card on the left, and the card itself is
 * the thing you tap to go and read it: scripture opens in the reader, a text or
 * link reading opens its preview. (Scripture used to be the odd one out, a
 * single big "mark complete" target with the check tucked inside, because there
 * was nowhere for it to take you.)
 *
 * A scripture reading covering several chapters can also be opened out to tick
 * off one chapter at a time, so being six chapters into "John 1–10" is
 * something the plan can actually record.
 */
function ReadingRow(props: ReadingRowProps) {
  const {
    session,
    reading,
    sessionProgress,
    expanded,
    canPreview,
    canNavigate,
    resolveBookName,
    resolveBookLength,
    onToggleExpanded,
    onToggle,
    onToggleChapter,
    onOpen,
    t,
  } = props;

  const { done: doneUnits, total: totalUnits } = readingCompletion(
    reading,
    sessionProgress
  );
  const done = doneUnits === totalUnits;
  const partly = doneUnits > 0 && !done;
  const minutes = estimateReadingMinutes([reading], resolveBookLength);
  const chapters = readingChapters(reading);
  const multiChapter = chapters.length > 1;
  const openable = canPreview || canNavigate;
  const preview = readingPreviewText(reading.item, t);

  const meta = done
    ? t("reading-plan-reading-read", { defaultValue: "Read" })
    : partly
      ? t("reading-plan-reading-chapters-done", {
          defaultValue: "{{done}} of {{total}} chapters",
          done: doneUnits,
          total: totalUnits,
        })
      : t("reading-plan-reading-mins", {
          defaultValue: "~{{count}} min",
          count: minutes,
        });

  return (
    <li className="sb-rpd-reading-row">
      <div className="sb-rpd-reading-main">
        <button
          type="button"
          className="sb-rpd-reading-toggle"
          onClick={() => onToggle(done)}
          aria-pressed={done}
          aria-label={t("reading-plan-mark-reading-complete", {
            defaultValue: "Mark reading complete",
          })}
        >
          <span
            className={`sb-rpd-reading-check${
              done ? " sb-rpd-reading-check-done" : ""
            }${partly ? " sb-rpd-reading-check-partial" : ""}`}
            aria-hidden="true"
          >
            <MaterialIcon>
              {done
                ? "check_circle"
                : partly
                  ? "incomplete_circle"
                  : "radio_button_unchecked"}
            </MaterialIcon>
          </span>
        </button>

        <button
          type="button"
          className={`sb-rpd-reading-card${
            done ? " sb-rpd-reading-card-done" : ""
          }${openable ? " sb-rpd-reading-card-open" : ""}`}
          onClick={onOpen}
          disabled={!openable}
        >
          <span className="sb-rpd-reading-icon" aria-hidden="true">
            <MaterialIcon>{readingItemIcon(reading.item)}</MaterialIcon>
          </span>
          <span className="sb-rpd-reading-text">
            <span className="sb-rpd-reading-title">
              {readingLabel(reading.item, resolveBookName)}
            </span>
            {preview ? (
              <span className="sb-rpd-reading-preview" dir="auto">
                {preview}
              </span>
            ) : null}
            <span className="sb-rpd-reading-meta">{meta}</span>
          </span>
        </button>

        {multiChapter ? (
          <button
            type="button"
            className="sb-rp-icon-button sb-rpd-reading-expand"
            onClick={onToggleExpanded}
            aria-expanded={expanded}
            aria-label={t("reading-plan-reading-chapters", {
              defaultValue: "Chapters",
            })}
            title={t("reading-plan-reading-chapters", {
              defaultValue: "Chapters",
            })}
          >
            <MaterialIcon>
              {expanded ? "expand_less" : "expand_more"}
            </MaterialIcon>
          </button>
        ) : null}
      </div>

      {multiChapter && expanded ? (
        <ul className="sb-rpd-chapter-chips">
          {chapters.map((chapter) => {
            const chapterDone = isReadingChapterComplete(
              sessionProgress,
              reading.id,
              chapter
            );
            return (
              <li key={`${session.id}-${reading.id}-${chapter}`}>
                <button
                  type="button"
                  className={`sb-rpd-chapter-chip${
                    chapterDone ? " sb-rpd-chapter-chip-done" : ""
                  }`}
                  onClick={() => onToggleChapter(chapter, chapterDone)}
                  aria-pressed={chapterDone}
                >
                  {chapter}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </li>
  );
}

interface PaceChoiceProps {
  selected: boolean;
  title: string;
  description: string;
  onSelect: () => void;
}

function PaceChoice(props: PaceChoiceProps) {
  const { selected, title, description, onSelect } = props;
  return (
    <button
      type="button"
      className={`sb-rp-choice${selected ? " sb-rp-choice-selected" : ""}`}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <span className="sb-rp-choice-radio" aria-hidden="true">
        {selected && <MaterialIcon>check</MaterialIcon>}
      </span>
      <span className="sb-rp-choice-text">
        <span className="sb-rp-choice-title">{title}</span>
        {description ? (
          <span className="sb-rp-choice-description">{description}</span>
        ) : null}
      </span>
    </button>
  );
}
