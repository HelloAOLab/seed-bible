import "./ReadingPlansPane.css";
import type { ComponentChildren } from "preact";
import { useState } from "preact/hooks";
import { DateTime } from "luxon";
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
import type { TranslationBook } from "../../managers/FreeUseBibleAPI";
import type { ModalManager } from "../../managers/ModalManager";
import { readingLabel } from "./readingLabel";
import { CreateReadingPlanWizard } from "./CreateReadingPlanWizard";
import { ReadingPlanDetail } from "./ReadingPlanDetail";

interface ReadingPlansPaneProps {
  readingPlans: ReadingPlansManager;
  /** Books of the active translation, for the scripture typeahead + labels. */
  books: TranslationBook[];
  /** Modals host, for previewing/opening a text or link reading. */
  modals?: ModalManager;
}

type ReadingPlansView = "list" | "create" | "detail";

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
 * Pane content for reading plans. Switches between the user's list of plans,
 * the create-plan wizard, and a single-plan detail view.
 */
export function ReadingPlansPane(props: ReadingPlansPaneProps) {
  const { readingPlans, books, modals } = props;
  // Reopen straight into the wizard when a draft is still in flight — the user
  // closed the pane to go read and add a passage, and would otherwise come back
  // to the list with their half-built plan nowhere in sight. `peek` reads it
  // without subscribing; this only decides the initial view.
  const [view, setView] = useState<ReadingPlansView>(
    readingPlans.editingReadingPlan.peek() ? "create" : "list"
  );

  const openDetail = async (plan: ReadingPlanMetadata) => {
    await readingPlans.selectReadingPlan(plan);
    const planId = formatReadingPlanId(plan.recordName, plan.address);
    const progress = latestProgress(
      readingPlans.userReadingPlanProgresses.value,
      planId
    );
    await readingPlans.selectReadingPlanProgress(progress);
    setView("detail");
  };

  /**
   * Restarts a finished plan: creates a fresh progress (so the calendar starts
   * over from today) and opens the detail view on it. `openDetail` picks the
   * most recently started progress, which is the one just created.
   */
  const restartPlan = async (plan: ReadingPlanMetadata) => {
    try {
      await readingPlans.startReadingPlan(plan);
    } catch (error) {
      console.error("Failed to restart reading plan:", error);
      return;
    }
    await openDetail(plan);
  };

  const backToList = () => {
    void readingPlans.selectReadingPlan(null);
    void readingPlans.selectReadingPlanProgress(null);
    setView("list");
  };

  // Opening the wizard starts a draft on the manager; leaving it either way
  // clears it. The draft outliving this component is deliberate — see
  // `editingReadingPlan` — but it must not outlive the wizard itself, or the
  // reader would keep offering "Add to plan" for a plan nobody is authoring.
  const openCreate = () => {
    // Resume an in-flight draft rather than throwing the user's work away.
    if (!readingPlans.editingReadingPlan.peek()) {
      readingPlans.startEditingReadingPlan();
    }
    setView("create");
  };

  const closeCreate = () => {
    readingPlans.cancelEditingReadingPlan();
    setView("list");
  };

  if (view === "create") {
    return (
      <CreateReadingPlanWizard
        readingPlans={readingPlans}
        books={books}
        modals={modals}
        onCancel={closeCreate}
        onCreated={closeCreate}
      />
    );
  }

  if (view === "detail") {
    return (
      <ReadingPlanDetail
        readingPlans={readingPlans}
        books={books}
        modals={modals}
        onBack={backToList}
      />
    );
  }

  return (
    <ReadingPlansList
      readingPlans={readingPlans}
      books={books}
      onCreate={openCreate}
      onOpen={(plan) => void openDetail(plan)}
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
  onCreate: () => void;
  onOpen: (plan: ReadingPlanMetadata) => void;
  /** Starts a completed plan over on a fresh progress, then opens it. */
  onRestart: (plan: ReadingPlanMetadata) => void;
}

function ReadingPlansList(props: ReadingPlansListProps) {
  const { readingPlans, books, onCreate, onOpen, onRestart } = props;
  const { t } = useI18n();

  // Reading `.value` during render subscribes the component to updates.
  const metas = readingPlans.userReadingPlans.value;
  const fullPlans = readingPlans.fullReadingPlans.value;
  const progresses = readingPlans.userReadingPlanProgresses.value;

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

  const rows: PlanRow[] = metas.map((meta) => {
    const planId = formatReadingPlanId(meta.recordName, meta.address);
    const progress = latestProgress(progresses, planId);
    const full = fullById.get(planId) ?? null;
    let summary: CalendarSummary | null = null;
    let state: PlanRow["state"] = "notstarted";
    if (progress && full) {
      summary = summarizeCalendar(
        getReadingCalendar(full, progress, nowMs),
        nowMs
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

  return (
    <div className="sb-reading-plans-pane">
      <div className="sb-reading-plans-header">
        <h2 className="sb-reading-plans-title">
          <MaterialIcon>menu_book</MaterialIcon>
          {t("reading-plans", { defaultValue: "Reading plans" })}
        </h2>
        <button
          type="button"
          className="sb-reading-plans-create"
          onClick={onCreate}
          aria-label={t("create-reading-plan", { defaultValue: "New plan" })}
        >
          <MaterialIcon>add</MaterialIcon>
        </button>
      </div>

      {rows.length === 0 ? (
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
                <MaterialIcon>arrow_forward</MaterialIcon>
              </span>
            </button>
          ) : null}

          {active.length > 0 ? (
            <PlanSection
              label={t("reading-plan-active", { defaultValue: "Active" })}
              count={active.length}
            >
              {active.map((row) => (
                <ActivePlanCard
                  key={row.planId}
                  row={row}
                  title={planTitle(row.meta)}
                  dayReadingsLabel={dayReadingsLabel}
                  onOpen={() => onOpen(row.meta)}
                  t={t}
                />
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
                <button
                  key={row.planId}
                  type="button"
                  className="sb-rp-card"
                  onClick={() => onOpen(row.meta)}
                >
                  <span className="sb-rp-card-tile" aria-hidden="true">
                    <MaterialIcon>menu_book</MaterialIcon>
                  </span>
                  <span className="sb-rp-card-body">
                    <span className="sb-rp-card-title" dir="auto">
                      {planTitle(row.meta)}
                    </span>
                    <span className="sb-rp-card-sub">
                      {t("reading-plan-not-started", {
                        defaultValue: "Not started",
                      })}
                    </span>
                  </span>
                  <MaterialIcon className="sb-rp-card-chevron">
                    chevron_right
                  </MaterialIcon>
                </button>
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
                  <div
                    key={row.planId}
                    className="sb-rp-card sb-rp-card-static"
                  >
                    <button
                      type="button"
                      className="sb-rp-card-open"
                      onClick={() => onOpen(row.meta)}
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
                                date: DateTime.fromMillis(
                                  finishedMs
                                ).toLocaleString({
                                  month: "short",
                                  day: "numeric",
                                }),
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
  onOpen: () => void;
  t: ReturnType<typeof useI18n>["t"];
}) {
  const { row, title, dayReadingsLabel, onOpen, t } = props;
  const summary = row.summary;
  const total = summary?.totalDays ?? 0;
  const done = summary?.doneDays ?? 0;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  const startedMs = row.progress?.startedAtMs ?? null;

  return (
    <button type="button" className="sb-rp-card sb-rp-card-lg" onClick={onOpen}>
      <div className="sb-rp-card-row">
        <span className="sb-rp-card-tile" aria-hidden="true">
          <MaterialIcon>wb_sunny</MaterialIcon>
        </span>
        <span className="sb-rp-card-body">
          <span className="sb-rp-card-title" dir="auto">
            {title}
          </span>
          <span className="sb-rp-card-sub">
            {t("reading-plan-duration-days", {
              defaultValue: "{{count}} days",
              count: total,
            })}
            {startedMs != null
              ? ` · ${t("reading-plan-started-on", {
                  defaultValue: "started {{date}}",
                  date: DateTime.fromMillis(startedMs).toLocaleString({
                    month: "short",
                    day: "numeric",
                  }),
                })}`
              : ""}
          </span>
        </span>
        <MaterialIcon className="sb-rp-card-chevron">
          arrow_forward
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
        {summary && summary.behind > 0 ? (
          <span className="sb-rp-chip sb-rp-chip-warn">
            <MaterialIcon>warning</MaterialIcon>
            {t("reading-plan-days-behind", {
              defaultValue: "{{count}} days behind",
              count: summary.behind,
            })}
          </span>
        ) : summary && summary.streak > 0 ? (
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
            {t("reading-plan-next", {
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
