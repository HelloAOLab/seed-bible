import "./ReadingPlanBelongsCard.css";
import { useEffect, useRef, useState } from "preact/hooks";
import { MaterialIcon } from "../icons";
import { useI18n } from "../../i18n/I18nManager";
import type { BibleReadingState } from "../../managers/BibleReadingManager";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import { FEATURE_KEY_READING_PLANS } from "../../managers/FeaturesManager";
import {
  formatReadingPlanId,
  readingChapters,
  isReadingChapterComplete,
  sessionMatchesPassage,
  type ReadingPlanProgress,
  type ReadingPlanSession,
} from "../../managers/ReadingPlansManager";

interface ReadingPlanBelongsCardProps {
  state: SeedBibleState;
  readingState: BibleReadingState;
}

/**
 * How long the reader must dwell on a chapter (with the card scrolled into
 * view, i.e. having reached the end of the passage) before we treat it as a
 * genuine read and nudge them to mark it complete. Paired with the scroll-to-
 * card signal this rejects an instant fling to the bottom. Tunable.
 */
const MIN_DWELL_MS = 12_000;

interface PlanMatch {
  planKey: string;
  planTitle: string;
  progress: ReadingPlanProgress;
  /** Sessions in this plan whose readings cover the current passage. */
  sessions: ReadingPlanSession[];
  /** True when this chapter is recorded as read everywhere it appears. */
  allComplete: boolean;
}

/**
 * "This reading belongs to" — shown at the bottom of the passage. Lists the
 * user's active plans that include the currently-open chapter, each with a
 * done/not-done indicator and a tap-to-toggle, plus a "Mark as complete"
 * action. A lightweight tracker watches for a realistic read (scrolled to the
 * end + a dwell threshold) and, when met, gently nudges toward completing it.
 *
 * Everything here is scoped to the chapter actually on screen. Marking complete
 * credits *this chapter* — a plan whose reading is "John 1–10" advances by one
 * chapter when you finish John 4, rather than being ticked off whole, and the
 * text and link readings that happen to share the session (and can't be reached
 * from the reader at all) are left alone.
 */
export function ReadingPlanBelongsCard(props: ReadingPlanBelongsCardProps) {
  const { state, readingState } = props;
  const { t } = useI18n();
  const cardRef = useRef<HTMLDivElement>(null);
  const [readReached, setReadReached] = useState(false);
  const [notifyDismissed, setNotifyDismissed] = useState(false);

  const readingPlans = state.readingPlans;
  const featureOn = state.features.isFeatureEnabled(FEATURE_KEY_READING_PLANS);

  // Read signals unconditionally so the component stays subscribed.
  const bookId = readingState.bookId.value;
  const chapter = readingState.chapterNumber.value;
  const fullPlans = readingPlans?.fullReadingPlans.value ?? [];
  const progresses = readingPlans?.userReadingPlanProgresses.value ?? [];

  const untitled = t("untitled-reading-plan", {
    defaultValue: "Untitled plan",
  });

  const matches: PlanMatch[] = [];
  if (readingPlans && featureOn && bookId) {
    for (const plan of fullPlans) {
      const planId = formatReadingPlanId(plan.recordName, plan.address);
      const progress = progresses.find((p) => p.planId === planId);
      if (!progress) {
        continue; // only plans the user is actually following
      }
      const sessions = plan.sessions.filter((s) =>
        sessionMatchesPassage(s, bookId, chapter)
      );
      if (sessions.length === 0) {
        continue;
      }
      // Done means "this chapter is read", not "the whole session is read":
      // every reading covering the open chapter has that chapter recorded.
      const allComplete = sessions.every((s) => {
        const sp = progress.sessions.find((entry) => entry.sessionId === s.id);
        return s.readings.every((reading) => {
          const item = reading.item;
          if (item.type !== "bible-verse" || item.ref.bookId !== bookId) {
            return true; // not this passage — not this card's business
          }
          if (!readingChapters(reading).includes(chapter)) {
            return true;
          }
          return isReadingChapterComplete(sp, reading.id, chapter);
        });
      });
      matches.push({
        planKey: planId,
        planTitle: plan.title ?? untitled,
        progress,
        sessions,
        allComplete,
      });
    }
  }

  const matchCount = matches.length;
  const hasIncomplete = matches.some((m) => !m.allComplete);

  // Smart tracker: reset per chapter, then mark "read" once the card has been
  // visible (end of passage reached) for at least MIN_DWELL_MS.
  useEffect(() => {
    setReadReached(false);
    setNotifyDismissed(false);
    // Dev-only tracing so the read heuristic can be watched in the console.
    const log = (...args: unknown[]) => {
      if (import.meta.env.DEV) {
        console.log("[reading-tracker]", ...args);
      }
    };
    if (matchCount === 0 || typeof IntersectionObserver === "undefined") {
      log(
        `idle — ${bookId ?? "?"} ${chapter}: ${matchCount} matching plan(s), nothing to track`
      );
      return;
    }
    const el = cardRef.current;
    if (!el) {
      return;
    }
    const openedAt = Date.now();
    log(
      `armed — ${bookId} ${chapter}: ${matchCount} plan(s); need to reach the card + dwell ${MIN_DWELL_MS}ms`
    );
    let timer: number | undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          const remaining = Math.max(0, MIN_DWELL_MS - (Date.now() - openedAt));
          log(`reached end of passage — will count as read in ${remaining}ms`);
          timer = window.setTimeout(() => {
            log("read threshold met — nudging to mark complete");
            setReadReached(true);
          }, remaining);
        } else if (timer !== undefined) {
          log("scrolled away before dwell elapsed — cancelling");
          clearTimeout(timer);
          timer = undefined;
        }
      },
      { threshold: 0.6 }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      if (timer !== undefined) {
        clearTimeout(timer);
      }
    };
  }, [bookId, chapter, matchCount]);

  if (!readingPlans || !featureOn || matchCount === 0) {
    return null;
  }

  const setPlanComplete = async (match: PlanMatch, complete: boolean) => {
    if (!bookId) {
      return;
    }
    for (const session of match.sessions) {
      await readingPlans.setPassageCompleteForProgress(
        match.progress.id,
        session,
        bookId,
        chapter,
        complete
      );
    }
  };

  const markAllComplete = async () => {
    for (const match of matches) {
      if (!match.allComplete) {
        await setPlanComplete(match, true);
      }
    }
  };

  const nudging = readReached && hasIncomplete;
  const showNotification = nudging && !notifyDismissed;

  const bookName = readingState.chapterData.value?.book.name ?? bookId ?? "";
  const passageLabel = `${bookName} ${chapter}`.trim();

  const markAllAndDismiss = async () => {
    setNotifyDismissed(true);
    await markAllComplete();
  };

  return (
    <>
      {showNotification ? (
        <div className="sb-rpb-toast" role="status" aria-live="polite">
          <span className="sb-rpb-toast-icon" aria-hidden="true">
            <MaterialIcon>menu_book</MaterialIcon>
          </span>
          <div className="sb-rpb-toast-text">
            <span className="sb-rpb-toast-title">
              {t("reading-plan-read-nudge-title", {
                defaultValue: "Nice reading!",
              })}
            </span>
            <span className="sb-rpb-toast-sub">
              {t("reading-plan-read-nudge-toast", {
                defaultValue: "Mark {{passage}} complete?",
                passage: passageLabel,
              })}
            </span>
            <div className="sb-rpb-toast-actions">
              <button
                type="button"
                className="sb-rpb-toast-primary"
                onClick={() => void markAllAndDismiss()}
              >
                {t("reading-plan-mark-complete", {
                  defaultValue: "Mark as complete",
                })}
              </button>
              <button
                type="button"
                className="sb-rpb-toast-later"
                onClick={() => setNotifyDismissed(true)}
              >
                {t("reading-plan-nudge-later", { defaultValue: "Not now" })}
              </button>
            </div>
          </div>
          <button
            type="button"
            className="sb-rpb-toast-close"
            onClick={() => setNotifyDismissed(true)}
            aria-label={t("dismiss", { defaultValue: "Dismiss" })}
          >
            <MaterialIcon>close</MaterialIcon>
          </button>
        </div>
      ) : null}

      <div
        className={`sb-rpb-card${nudging ? " sb-rpb-card-nudge" : ""}`}
        ref={cardRef}
      >
        <div className="sb-rpb-label">
          {t("reading-belongs-to", { defaultValue: "This reading belongs to" })}
        </div>

        <ul className="sb-rpb-list">
          {matches.map((match) => (
            <li key={match.planKey} className="sb-rpb-item">
              <button
                type="button"
                className="sb-rpb-row"
                onClick={() => void setPlanComplete(match, !match.allComplete)}
                aria-pressed={match.allComplete}
              >
                <span className="sb-rpb-plan-name" dir="auto">
                  {match.planTitle}
                </span>
                <span
                  className={`sb-rpb-check${
                    match.allComplete ? " sb-rpb-check-done" : ""
                  }`}
                  aria-hidden="true"
                >
                  <MaterialIcon>
                    {match.allComplete
                      ? "check_circle"
                      : "radio_button_unchecked"}
                  </MaterialIcon>
                </span>
              </button>
            </li>
          ))}
        </ul>

        {hasIncomplete ? (
          <button
            type="button"
            className={`sb-rpb-mark${nudging ? " sb-rpb-mark-nudge" : ""}`}
            onClick={() => void markAllComplete()}
          >
            <MaterialIcon>check</MaterialIcon>
            {/* Names the passage so it's plain that this credits the chapter
                in front of the reader, not the whole reading it belongs to. */}
            {t("reading-plan-mark-passage-complete", {
              defaultValue: "Mark {{passage}} as read",
              passage: passageLabel,
            })}
          </button>
        ) : null}
      </div>
    </>
  );
}
