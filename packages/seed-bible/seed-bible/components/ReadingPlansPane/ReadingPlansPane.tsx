import "./ReadingPlansPane.css";
import type { ComponentChildren } from "preact";
import { useState } from "preact/hooks";
import { signal } from "@preact/signals";
import { MaterialIcon } from "../icons";
import { useI18n } from "../../i18n/I18nManager";
import {
  formatReadingPlanId,
  getReadingCalendar,
  summarizeCalendar,
  type CalendarReadingDay,
  type CalendarSummary,
  type ReadingPlan,
  type ReadingPlanMetadata,
  type ReadingPlanProgress,
  type ReadingPlansManager,
} from "../../managers/ReadingPlansManager";
import type {
  PlaylistItemData,
  VerseRef,
} from "../../managers/PlaylistManager";
import type { TranslationBook } from "../../managers/FreeUseBibleAPI";
import type { ModalManager } from "../../managers/ModalManager";
import { readingLabel } from "./readingLabel";
import { ReadingPlanEditor } from "./ReadingPlanEditor";
import { ReadingPlanDetail } from "./ReadingPlanDetail";

interface ReadingPlansPaneProps {
  readingPlans: ReadingPlansManager;
  /** Books of the active translation, for the scripture typeahead + labels. */
  books: TranslationBook[];
  /** Modals host, for previewing/opening a text or link reading. */
  modals?: ModalManager;
  /**
   * Navigates the reader to a scripture reading. Without it a plan's scripture
   * readings can only be ticked off, not opened.
   */
  onOpenScripture?: (
    ref: VerseRef,
    translationId?: string
  ) => void | Promise<void>;
  /**
   * Hands a run of readings to the reader's playback queue, starting at
   * `startIndex`, so a plan can be stepped through with the same next/back
   * controls a playlist uses. Without it the play action isn't offered.
   */
  onPlayReadings?: (
    plan: ReadingPlan,
    items: PlaylistItemData[],
    startIndex: number
  ) => void;
}

type ReadingPlansView = "list" | "edit" | "detail";

/**
 * Which of the pane's three screens is showing.
 *
 * Module-level rather than component state because the pane's chrome — the
 * back button, the title and the new-plan button — lives in the pane header,
 * which the panes manager renders outside this component (see
 * `ReadingPlansPaneTitle` and friends). There is only ever one plans pane, and
 * keeping the view here also means reopening the pane returns the user to
 * where they left off.
 */
const readingPlansView = signal<ReadingPlansView>("list");

/**
 * Set when a plan fails to load, so the list can say so. A plan that can't be
 * fetched must leave the user on the list with an explanation — opening the
 * detail view on nothing just produces a blank screen titled "Untitled plan".
 */
const planLoadError = signal<string | null>(null);

/** The plan currently being opened, so its card can show it's working. */
const openingPlanId = signal<string | null>(null);

/** The most recent progress the user has for a given plan id, if any. */
function latestProgress(
  progresses: ReadingPlanProgress[],
  planId: string
): ReadingPlanProgress | null {
  return (
    progresses
      .filter((p) => p.planId === planId)
      .sort((a, b) => b.startedAtMs - a.startedAtMs)[0] ?? null
  );
}

/**
 * Opens a plan's detail view. The view only switches once the plan is actually
 * in hand: a plan whose record is missing or unreadable leaves the user on the
 * list with an error, rather than on an empty screen.
 */
async function openPlanDetail(
  readingPlans: ReadingPlansManager,
  plan: ReadingPlanMetadata
) {
  const planId = formatReadingPlanId(plan.recordName, plan.address);
  planLoadError.value = null;
  openingPlanId.value = planId;
  try {
    await readingPlans.selectReadingPlan(plan);
  } catch {
    planLoadError.value = planId;
    return;
  } finally {
    openingPlanId.value = null;
  }
  const progress = latestProgress(
    readingPlans.userReadingPlanProgresses.value,
    planId
  );
  await readingPlans.selectReadingPlanProgress(progress);
  readingPlansView.value = "detail";
}

/**
 * Opens the editor on a new plan. An in-flight draft is resumed rather than
 * thrown away — the user may have stepped out of the editor to go read and add
 * a passage from the verse toolbar.
 */
function openPlanCreate(readingPlans: ReadingPlansManager) {
  if (!readingPlans.editingReadingPlan.peek()) {
    readingPlans.startEditingReadingPlan();
  }
  readingPlansView.value = "edit";
}

/**
 * Returns to the plans list. Leaving the editor steps out of the plan (a new
 * one stays saved in the user's account, listed under "Drafts"); leaving the
 * detail view clears the plan selection.
 */
function backToPlansList(readingPlans: ReadingPlansManager) {
  if (readingPlansView.peek() === "edit") {
    readingPlans.cancelEditingReadingPlan();
  } else {
    void readingPlans.selectReadingPlan(null);
    void readingPlans.selectReadingPlanProgress(null);
  }
  readingPlansView.value = "list";
}

/**
 * Icon shown in the pane header. Deliberately the same book glyph the plan
 * cards in the list use, so a plan looks like itself wherever it appears.
 */
export function ReadingPlansPaneIcon() {
  return <MaterialIcon>menu_book</MaterialIcon>;
}

/**
 * Pane header title: the plan's own name while viewing one, otherwise the name
 * of the screen. Reads signals, so it re-renders as the view changes.
 */
export function ReadingPlansPaneTitle(props: {
  readingPlans: ReadingPlansManager;
}) {
  const { t } = useI18n();
  const view = readingPlansView.value;
  if (view === "edit") {
    const draft = props.readingPlans.editingReadingPlan.value;
    return (
      <>
        {draft && !draft.isNew
          ? t("edit-reading-plan", { defaultValue: "Edit plan" })
          : t("create-reading-plan-wizard", {
              defaultValue: "Create new plan",
            })}
      </>
    );
  }
  if (view === "detail") {
    const plan = props.readingPlans.selectedReadingPlan.value;
    return (
      <span dir="auto">
        {plan?.title ??
          t("untitled-reading-plan", { defaultValue: "Untitled plan" })}
      </span>
    );
  }
  return <>{t("reading-plans", { defaultValue: "Reading plans" })}</>;
}

/** Pane header back button, shown on every screen except the list itself. */
export function ReadingPlansPaneLeading(props: {
  readingPlans: ReadingPlansManager;
}) {
  const { t } = useI18n();
  if (readingPlansView.value === "list") {
    return null;
  }
  return (
    <button
      type="button"
      className="sb-rp-icon-button sb-rp-pane-back"
      onClick={() => backToPlansList(props.readingPlans)}
      aria-label={t("back", { defaultValue: "Back" })}
      title={t("back", { defaultValue: "Back" })}
    >
      <MaterialIcon>arrow_back</MaterialIcon>
    </button>
  );
}

/** Pane header actions: the new-plan button, offered from the list. */
export function ReadingPlansPaneActions(props: {
  readingPlans: ReadingPlansManager;
}) {
  const { t } = useI18n();
  if (readingPlansView.value !== "list") {
    return null;
  }
  return (
    <button
      type="button"
      className="sb-reading-plans-create"
      onClick={() => openPlanCreate(props.readingPlans)}
      aria-label={t("create-reading-plan", { defaultValue: "New plan" })}
      title={t("create-reading-plan", { defaultValue: "New plan" })}
    >
      <MaterialIcon>add</MaterialIcon>
    </button>
  );
}

/**
 * Pane content for reading plans. Switches between the user's list of plans,
 * the plan editor, and a single-plan detail view. The chrome around it — back,
 * title and the new-plan button — is rendered by the pane header (see the
 * exports above), so this component renders only the body of each screen.
 */
export function ReadingPlansPane(props: ReadingPlansPaneProps) {
  const { readingPlans, books, modals, onOpenScripture, onPlayReadings } =
    props;
  // The view outlives this component, so closing the pane to go read and add a
  // passage brings the user back to the editor they were in, not to the list.
  const view = readingPlansView.value;

  const closeEditor = () => {
    readingPlansView.value = "list";
  };

  /**
   * Restarts a finished plan: creates a fresh progress (so the calendar starts
   * over from today) and opens the detail view on it. `openPlanDetail` picks
   * the most recently started progress, which is the one just created.
   */
  const restartPlan = async (plan: ReadingPlanMetadata) => {
    try {
      await readingPlans.startReadingPlan(plan);
    } catch (error) {
      console.error("Failed to restart reading plan:", error);
      return;
    }
    await openPlanDetail(readingPlans, plan);
  };

  /** Opens an existing plan in the editor, loading its contents if needed. */
  const editPlan = async (meta: ReadingPlanMetadata) => {
    const planId = formatReadingPlanId(meta.recordName, meta.address);
    planLoadError.value = null;
    openingPlanId.value = planId;
    let full: ReadingPlan | null = null;
    try {
      full = await readingPlans.selectReadingPlan(meta);
    } catch {
      planLoadError.value = planId;
      return;
    } finally {
      openingPlanId.value = null;
    }
    if (!full) {
      planLoadError.value = planId;
      return;
    }
    // A plan still in draft picks up where it left off; a published one opens
    // in edit mode, where backing out changes nothing.
    if (full.status === "draft") {
      readingPlans.resumeEditingReadingPlan(full);
    } else {
      readingPlans.editExistingReadingPlan(full);
    }
    readingPlansView.value = "edit";
  };

  if (view === "edit") {
    return (
      <ReadingPlanEditor
        readingPlans={readingPlans}
        books={books}
        modals={modals}
        onCancel={() => backToPlansList(readingPlans)}
        onSaved={closeEditor}
      />
    );
  }

  if (view === "detail") {
    return (
      <ReadingPlanDetail
        readingPlans={readingPlans}
        books={books}
        modals={modals}
        onOpenScripture={onOpenScripture}
        onPlayReadings={onPlayReadings}
        onEdit={() => {
          const plan = readingPlans.selectedReadingPlan.peek();
          if (plan) {
            void editPlan(plan);
          }
        }}
        onDeleted={() => {
          readingPlansView.value = "list";
        }}
      />
    );
  }

  return (
    <ReadingPlansList
      readingPlans={readingPlans}
      books={books}
      onOpen={(plan) => void openPlanDetail(readingPlans, plan)}
      onEdit={(plan) => void editPlan(plan)}
      onRestart={(plan) => void restartPlan(plan)}
    />
  );
}

interface PlanRow {
  meta: ReadingPlanMetadata;
  planId: string;
  full: ReadingPlan | null;
  progress: ReadingPlanProgress | null;
  summary: CalendarSummary | null;
  state: "active" | "notstarted" | "completed";
}

interface ReadingPlansListProps {
  readingPlans: ReadingPlansManager;
  books: TranslationBook[];
  onOpen: (plan: ReadingPlanMetadata) => void;
  onEdit: (plan: ReadingPlanMetadata) => void;
  /** Starts a completed plan over on a fresh progress, then opens it. */
  onRestart: (plan: ReadingPlanMetadata) => void;
}

function ReadingPlansList(props: ReadingPlansListProps) {
  const { readingPlans, books, onOpen, onEdit, onRestart } = props;
  const { t } = useI18n();
  // Deleting a plan erases it for good, so the button asks once first rather
  // than deleting on the tap that was meant to open it.
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Reading `.value` during render subscribes the component to updates.
  const metas = readingPlans.userReadingPlans.value;
  const fullPlans = readingPlans.fullReadingPlans.value;
  const progresses = readingPlans.userReadingPlanProgresses.value;
  const failedPlanId = planLoadError.value;
  const openingId = openingPlanId.value;

  const resolveBookName = (bookId: string): string => {
    const book = books.find((b) => b.id === bookId);
    return book?.name ?? book?.commonName ?? bookId;
  };

  const dayReadingsLabel = (day: CalendarReadingDay): string =>
    day.sessions
      .flatMap((cs) => cs.session.readings)
      .map((r) => readingLabel(r.item, resolveBookName, ""))
      .filter(Boolean)
      .slice(0, 3)
      .join(", ");

  const nowMs = Date.now();
  const fullById = new Map(
    fullPlans.map((p) => [formatReadingPlanId(p.recordName, p.address), p])
  );

  // Plans still being authored are kept out of the reading sections entirely —
  // there is nothing to read yet — and listed on their own to resume.
  const drafts = metas.filter((meta) => meta.status === "draft");

  const rows: PlanRow[] = metas
    .filter((meta) => meta.status !== "draft")
    .map((meta) => {
      const planId = formatReadingPlanId(meta.recordName, meta.address);
      const progress = latestProgress(progresses, planId);
      const full = fullById.get(planId) ?? null;
      let summary: CalendarSummary | null = null;
      let state: PlanRow["state"] = "notstarted";
      if (progress && full) {
        summary = summarizeCalendar(
          getReadingCalendar(full, progress, nowMs),
          nowMs,
          progress.timeZone
        );
        state =
          summary.totalDays > 0 && summary.doneDays === summary.totalDays
            ? "completed"
            : "active";
      } else if (progress) {
        state = "active";
      }
      return { meta, planId, full, progress, summary, state };
    });

  const active = rows.filter((r) => r.state === "active");
  const notStarted = rows.filter((r) => r.state === "notstarted");
  const completed = rows.filter((r) => r.state === "completed");

  // Today hero: the first active plan that has a next day due.
  const hero = active.find((r) => r.summary?.next != null) ?? null;

  const planTitle = (meta: ReadingPlanMetadata) =>
    meta.title ?? t("untitled-reading-plan", { defaultValue: "Untitled plan" });

  /**
   * Edit and delete for a plan the user owns. Delete is offered on every plan
   * — a plan you can't get rid of is a plan you're stuck with — and asks once
   * before it erases anything.
   */
  const PlanActions = (actionProps: { row: PlanRow }) => {
    const { row } = actionProps;
    const confirming = confirmDeleteId === row.planId;
    return (
      <div className="sb-rp-card-actions">
        <button
          type="button"
          className="sb-rp-icon-button"
          onClick={() => onEdit(row.meta)}
          aria-label={t("edit-reading-plan", { defaultValue: "Edit plan" })}
          title={t("edit-reading-plan", { defaultValue: "Edit plan" })}
        >
          <MaterialIcon>edit</MaterialIcon>
        </button>
        <button
          type="button"
          className={`sb-rp-restart${
            confirming ? " sb-rp-restart-danger" : ""
          }`}
          onClick={() => {
            if (!confirming) {
              setConfirmDeleteId(row.planId);
              return;
            }
            setConfirmDeleteId(null);
            void readingPlans.deleteReadingPlan(row.meta);
          }}
        >
          {confirming
            ? t("reading-plan-delete-confirm", {
                defaultValue: "Delete for good?",
              })
            : t("reading-plan-delete", { defaultValue: "Delete" })}
        </button>
      </div>
    );
  };

  /** "Couldn't load this plan", shown in place of opening a dead screen. */
  const LoadError = (errorProps: { planId: string }) =>
    failedPlanId === errorProps.planId ? (
      <p className="sb-rp-card-error" role="alert">
        {t("reading-plan-load-failed", {
          defaultValue: "Couldn't load this plan. Please try again.",
        })}
      </p>
    ) : null;

  const resumeDraft = (meta: ReadingPlanMetadata) => {
    const full = fullById.get(
      formatReadingPlanId(meta.recordName, meta.address)
    );
    if (!full) {
      return;
    }
    readingPlans.resumeEditingReadingPlan(full);
    readingPlansView.value = "edit";
  };

  return (
    <div className="sb-reading-plans-pane">
      {rows.length === 0 && drafts.length === 0 ? (
        <div className="sb-reading-plans-empty">
          {t("reading-plans-empty", {
            defaultValue:
              "You don't have any reading plans yet. Create one to get started.",
          })}
        </div>
      ) : (
        <div className="sb-reading-plans-scroll">
          {hero && hero.summary?.next ? (
            <button
              type="button"
              className="sb-rp-today"
              onClick={() => onOpen(hero.meta)}
              disabled={openingId === hero.planId}
            >
              <div className="sb-rp-today-text">
                <span className="sb-rp-today-eyebrow">
                  {t("reading-plan-today-eyebrow", {
                    defaultValue: "Today · Day {{day}}",
                    day: hero.summary.nextDayNumber ?? 1,
                  })}
                </span>
                <span className="sb-rp-today-title" dir="auto">
                  {planTitle(hero.meta)}
                </span>
                <span className="sb-rp-today-readings">
                  {dayReadingsLabel(hero.summary.next)}
                </span>
              </div>
              <span className="sb-rp-today-go" aria-hidden="true">
                <MaterialIcon>
                  {openingId === hero.planId
                    ? "hourglass_top"
                    : "arrow_forward"}
                </MaterialIcon>
              </span>
            </button>
          ) : null}

          {drafts.length > 0 ? (
            <PlanSection
              label={t("reading-plan-drafts", { defaultValue: "Drafts" })}
              count={drafts.length}
            >
              {drafts.map((meta) => {
                const planId = formatReadingPlanId(
                  meta.recordName,
                  meta.address
                );
                const full = fullById.get(planId);
                const readings =
                  full?.sessions.reduce(
                    (sum, session) => sum + session.readings.length,
                    0
                  ) ?? 0;
                const confirming = confirmDeleteId === planId;
                return (
                  <div key={planId} className="sb-rp-card sb-rp-card-static">
                    <button
                      type="button"
                      className="sb-rp-card-open"
                      onClick={() => resumeDraft(meta)}
                      disabled={!full}
                    >
                      <span className="sb-rp-card-tile" aria-hidden="true">
                        <MaterialIcon>edit_note</MaterialIcon>
                      </span>
                      <span className="sb-rp-card-body">
                        <span className="sb-rp-card-title" dir="auto">
                          {planTitle(meta)}
                        </span>
                        <span className="sb-rp-card-sub">
                          {t("reading-plan-draft-summary", {
                            defaultValue: "Draft · {{count}} readings",
                            count: readings,
                          })}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className={`sb-rp-restart${
                        confirming ? " sb-rp-restart-danger" : ""
                      }`}
                      onClick={() => {
                        if (!confirming) {
                          setConfirmDeleteId(planId);
                          return;
                        }
                        setConfirmDeleteId(null);
                        void readingPlans.deleteReadingPlan(meta);
                      }}
                    >
                      {confirming
                        ? t("reading-plan-discard-draft-confirm", {
                            defaultValue: "Delete for good?",
                          })
                        : t("reading-plan-discard-draft", {
                            defaultValue: "Discard",
                          })}
                    </button>
                  </div>
                );
              })}
            </PlanSection>
          ) : null}

          {active.length > 0 ? (
            <PlanSection
              label={t("reading-plan-active", { defaultValue: "Active" })}
              count={active.length}
            >
              {active.map((row) => (
                <div key={row.planId} className="sb-rp-card-group">
                  <ActivePlanCard
                    row={row}
                    title={planTitle(row.meta)}
                    dayReadingsLabel={dayReadingsLabel}
                    opening={openingId === row.planId}
                    onOpen={() => onOpen(row.meta)}
                    t={t}
                  />
                  <LoadError planId={row.planId} />
                  <PlanActions row={row} />
                </div>
              ))}
            </PlanSection>
          ) : null}

          {notStarted.length > 0 ? (
            <PlanSection
              label={t("reading-plan-not-started", {
                defaultValue: "Not started",
              })}
              count={notStarted.length}
            >
              {notStarted.map((row) => (
                <div key={row.planId} className="sb-rp-card-group">
                  <button
                    type="button"
                    className="sb-rp-card"
                    onClick={() => onOpen(row.meta)}
                    disabled={openingId === row.planId}
                  >
                    <span className="sb-rp-card-tile" aria-hidden="true">
                      <MaterialIcon>menu_book</MaterialIcon>
                    </span>
                    <span className="sb-rp-card-body">
                      <span className="sb-rp-card-title" dir="auto">
                        {planTitle(row.meta)}
                      </span>
                      <span className="sb-rp-card-sub">
                        {openingId === row.planId
                          ? t("loading", { defaultValue: "Loading…" })
                          : t("reading-plan-not-started", {
                              defaultValue: "Not started",
                            })}
                      </span>
                    </span>
                    <MaterialIcon className="sb-rp-card-chevron">
                      chevron_right
                    </MaterialIcon>
                  </button>
                  <LoadError planId={row.planId} />
                  <PlanActions row={row} />
                </div>
              ))}
            </PlanSection>
          ) : null}

          {completed.length > 0 ? (
            <PlanSection
              label={t("reading-plan-completed", { defaultValue: "Completed" })}
              count={completed.length}
            >
              {completed.map((row) => {
                const finishedMs =
                  row.summary?.lastDay?.completedAtMs ??
                  row.progress?.updatedAtMs ??
                  null;
                return (
                  <div key={row.planId} className="sb-rp-card-group">
                    <div className="sb-rp-card sb-rp-card-static">
                      <button
                        type="button"
                        className="sb-rp-card-open"
                        onClick={() => onOpen(row.meta)}
                        disabled={openingId === row.planId}
                      >
                        <span
                          className="sb-rp-card-tile sb-rp-card-tile-done"
                          aria-hidden="true"
                        >
                          <MaterialIcon>check</MaterialIcon>
                        </span>
                        <span className="sb-rp-card-body">
                          <span className="sb-rp-card-title" dir="auto">
                            {planTitle(row.meta)}
                          </span>
                          <span className="sb-rp-card-sub">
                            {finishedMs != null
                              ? `${t("reading-plan-finished", {
                                  defaultValue: "Finished {{date}}",
                                  date: new Date(finishedMs).toLocaleDateString(
                                    undefined,
                                    {
                                      month: "short",
                                      day: "numeric",
                                    }
                                  ),
                                })} · ${row.summary?.doneDays ?? 0}/${row.summary?.totalDays ?? 0}`
                              : `${row.summary?.doneDays ?? 0}/${row.summary?.totalDays ?? 0}`}
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        className="sb-rp-restart"
                        onClick={() => onRestart(row.meta)}
                      >
                        {t("reading-plan-restart", { defaultValue: "Restart" })}
                      </button>
                    </div>
                    <LoadError planId={row.planId} />
                    <PlanActions row={row} />
                  </div>
                );
              })}
            </PlanSection>
          ) : null}
        </div>
      )}
    </div>
  );
}

function PlanSection(props: {
  label: string;
  count: number;
  children: ComponentChildren;
}) {
  return (
    <section className="sb-rp-section">
      <h3 className="sb-rp-section-label">
        {props.label} · {props.count}
      </h3>
      <div className="sb-rp-section-cards">{props.children}</div>
    </section>
  );
}

function ActivePlanCard(props: {
  row: PlanRow;
  title: string;
  dayReadingsLabel: (day: CalendarReadingDay) => string;
  opening: boolean;
  onOpen: () => void;
  t: ReturnType<typeof useI18n>["t"];
}) {
  const { row, title, dayReadingsLabel, opening, onOpen, t } = props;
  const summary = row.summary;
  const total = summary?.totalDays ?? 0;
  const done = summary?.doneDays ?? 0;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  const startedMs = row.progress?.startedAtMs ?? null;
  // A self-paced read has an order but no schedule, so it is counted in
  // sessions and never shown as behind.
  const selfPaced = row.progress?.selfPaced === true;

  return (
    <button
      type="button"
      className="sb-rp-card sb-rp-card-lg"
      onClick={onOpen}
      disabled={opening}
    >
      <div className="sb-rp-card-row">
        <span className="sb-rp-card-tile" aria-hidden="true">
          <MaterialIcon>menu_book</MaterialIcon>
        </span>
        <span className="sb-rp-card-body">
          <span className="sb-rp-card-title" dir="auto">
            {title}
          </span>
          <span className="sb-rp-card-sub">
            {selfPaced
              ? t("reading-plan-session-count-sessions", {
                  defaultValue: "{{count}} sessions",
                  count: total,
                })
              : t("reading-plan-duration-days", {
                  defaultValue: "{{count}} days",
                  count: total,
                })}
            {startedMs != null
              ? ` · ${t("reading-plan-started-on", {
                  defaultValue: "started {{date}}",
                  date: new Date(startedMs).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  }),
                })}`
              : ""}
          </span>
        </span>
        <MaterialIcon className="sb-rp-card-chevron">
          {opening ? "hourglass_top" : "arrow_forward"}
        </MaterialIcon>
      </div>

      <div className="sb-rp-card-progress">
        <span className="sb-rp-card-progress-bar">
          <span
            className="sb-rp-card-progress-fill"
            style={{ width: `${percent}%` }}
          />
        </span>
        <span className="sb-rp-card-progress-label">
          {done}/{total}
        </span>
      </div>

      <div className="sb-rp-card-footer">
        {!selfPaced && summary && summary.behind > 0 ? (
          <span className="sb-rp-chip sb-rp-chip-warn">
            <MaterialIcon>warning</MaterialIcon>
            {t("reading-plan-days-behind", {
              defaultValue: "{{count}} days behind",
              count: summary.behind,
            })}
          </span>
        ) : !selfPaced && summary && summary.streak > 0 ? (
          <span className="sb-rp-chip sb-rp-chip-streak">
            🔥{" "}
            {t("reading-plan-streak", {
              defaultValue: "{{count}}-day streak",
              count: summary.streak,
            })}
          </span>
        ) : (
          <span />
        )}
        {summary?.next ? (
          <span className="sb-rp-card-next">
            {selfPaced
              ? t("reading-plan-next-session", {
                  defaultValue: "Next: Session {{day}} · {{readings}}",
                  day: summary.nextDayNumber ?? 1,
                  readings: dayReadingsLabel(summary.next),
                })
              : t("reading-plan-next", {
                  defaultValue: "Next: Day {{day}} · {{readings}}",
                  day: summary.nextDayNumber ?? 1,
                  readings: dayReadingsLabel(summary.next),
                })}
          </span>
        ) : null}
      </div>
    </button>
  );
}
