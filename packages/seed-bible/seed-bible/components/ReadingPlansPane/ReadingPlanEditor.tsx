import "./ReadingPlanEditor.css";
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

interface ReadingPlanEditorProps {
  readingPlans: ReadingPlansManager;
  /** Books of the active translation, for the scripture typeahead + labels. */
  books: TranslationBook[];
  /** Modals host for previewing a text/link reading. Optional — without it the
   * preview action is simply not offered. */
  modals?: ModalManager;
  /** Called when the user backs out of (or discards) the plan. */
  onCancel: () => void;
  /** Called after the plan is successfully saved. */
  onSaved: () => void;
}

/**
 * The reading-plan editor: one screen holding a plan's name, its readings, and
 * the paces it offers. The same screen creates a new plan and edits an existing
 * one — a plan is a name, a list of readings and some suggested paces, and
 * there is no reason those should be reachable in one order when creating and
 * not at all when editing.
 *
 * The readings come first because they *are* the plan; the paces come after,
 * because "how fast should this be read" is a question you can only answer once
 * you know what's in it.
 *
 * A plan is deliberately just content plus suggested paces — it has no duration
 * of its own and no start date. How long it takes follows from whichever
 * cadence a reader picks when they start it, which is what lets the same plan
 * be offered as, say, "the Bible in a year" and "the Bible in two years".
 *
 * The plan being edited lives on the manager (`editingReadingPlan`), not in this
 * component — so closing the plans pane to go read doesn't lose it, and the
 * reader's "Add to plan" verse action can add straight into the session shown
 * here. Every change is saved to the user's account as it's made, so leaving
 * mid-edit (or losing the tab) costs nothing.
 *
 * The component is fluid-width, so it fills the desktop side pane and the
 * mobile fullscreen pane without any breakpoint of its own.
 */
export function ReadingPlanEditor(props: ReadingPlanEditorProps) {
  const { readingPlans, books, modals, onCancel, onSaved } = props;
  const { t } = useI18n();

  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  // Discarding a new plan erases it for good, so the button asks once first.
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

  // Reading `.value` during render subscribes the component to edits, including
  // ones made from the reader's verse toolbar.
  const draft = readingPlans.editingReadingPlan.value;
  const autosaving = readingPlans.editingReadingPlanSaving.value;
  const autosaveFailed = readingPlans.editingReadingPlanSaveError.value;

  if (!draft) {
    return null;
  }

  const totalReadings = draftReadingCount(draft);
  const selectedCadenceIds = draft.plan.cadenceOptions.map((o) => o.id);
  const hasTitle = (draft.plan.title ?? "").trim().length > 0;
  const canSave = hasTitle && totalReadings > 0;

  const handleSave = async () => {
    if (saving || !canSave) {
      return;
    }
    setSaving(true);
    setSubmitError(false);
    try {
      await readingPlans.finishEditingReadingPlan();
      onSaved();
    } catch (error) {
      console.error("Failed to save reading plan:", error);
      setSubmitError(true);
      setSaving(false);
    }
  };

  const handleDiscard = async () => {
    if (!confirmingDiscard) {
      setConfirmingDiscard(true);
      return;
    }
    setConfirmingDiscard(false);
    await readingPlans.discardEditingReadingPlan();
    onCancel();
  };

  // What's still missing before the plan can be saved, so the reason the button
  // is disabled is on screen rather than left to be guessed at.
  const blockingNote = !hasTitle
    ? t("reading-plan-needs-name", {
        defaultValue: "Give your plan a name to save it",
      })
    : totalReadings === 0
      ? t("reading-plan-no-readings", {
          defaultValue: "Add at least one reading to create the plan",
        })
      : null;

  return (
    <div className="sb-rp-editor">
      <div className="sb-rp-editor-status" aria-live="polite">
        {autosaveFailed
          ? t("reading-plan-draft-save-failed", {
              defaultValue: "Couldn't save draft",
            })
          : autosaving
            ? t("reading-plan-draft-saving", { defaultValue: "Saving…" })
            : draft.persisted
              ? t("reading-plan-draft-saved", { defaultValue: "Draft saved" })
              : ""}
      </div>

      <div className="sb-rp-editor-body">
        <section className="sb-rp-editor-section">
          <label className="sb-rp-field">
            <span className="sb-rp-field-label">
              {t("reading-plan-step-name-title", {
                defaultValue: "Name your plan",
              })}
            </span>
            <input
              className="sb-rp-text-input"
              type="text"
              value={draft.plan.title ?? ""}
              autoFocus={draft.isNew && totalReadings === 0}
              onInput={(event: Event) =>
                readingPlans.updateEditingReadingPlan({
                  title: (event.currentTarget as HTMLInputElement).value,
                })
              }
              placeholder={t("reading-plan-name-placeholder", {
                defaultValue: "e.g. My Psalms Journey",
              })}
            />
          </label>
          <label className="sb-rp-field">
            <span className="sb-rp-field-label">
              {t("reading-plan-description-label", {
                defaultValue: "Description (optional)",
              })}
            </span>
            <input
              className="sb-rp-text-input"
              type="text"
              value={draft.plan.description ?? ""}
              onInput={(event: Event) =>
                readingPlans.updateEditingReadingPlan({
                  description: (event.currentTarget as HTMLInputElement).value,
                })
              }
              placeholder={t("reading-plan-description_placeholder", {
                defaultValue: "What is this plan about?",
              })}
            />
          </label>
        </section>

        <section className="sb-rp-editor-section">
          <h3 className="sb-rp-editor-section-title">
            {t("reading-plan-step-scripture-title", {
              defaultValue: "Select readings",
            })}
          </h3>
          <SessionsSection
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
        </section>

        <section className="sb-rp-editor-section">
          <h3 className="sb-rp-editor-section-title">
            {t("reading-plan-step-cadences-title", {
              defaultValue: "Reading cadences",
            })}
          </h3>
          <CadencesSection
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
        </section>
      </div>

      <footer className="sb-rp-editor-footer">
        {submitError && (
          <p className="sb-rp-error" role="alert">
            {t("reading-plan-create-error", {
              defaultValue:
                "Something went wrong creating your plan. Please try again.",
            })}
          </p>
        )}
        {blockingNote && <p className="sb-rp-footer-note">{blockingNote}</p>}
        <div className="sb-rp-editor-actions">
          {/* Discarding only ever throws away a plan that is still being
              created. Backing out of an edit to a published plan leaves it
              alone, so that case gets a plain "Done" instead. */}
          {draft.isNew ? (
            <button
              type="button"
              className={`sb-rp-button sb-rp-button-secondary${
                confirmingDiscard ? " sb-rp-button-danger" : ""
              }`}
              onClick={() => void handleDiscard()}
              disabled={saving}
            >
              {confirmingDiscard
                ? t("reading-plan-discard-draft-confirm", {
                    defaultValue: "Delete for good?",
                  })
                : t("reading-plan-discard-draft", { defaultValue: "Discard" })}
            </button>
          ) : (
            <button
              type="button"
              className="sb-rp-button sb-rp-button-secondary"
              onClick={onCancel}
              disabled={saving}
            >
              {t("cancel", { defaultValue: "Cancel" })}
            </button>
          )}
          <button
            type="button"
            className="sb-rp-button sb-rp-button-primary"
            onClick={() => void handleSave()}
            disabled={!canSave || saving}
          >
            {draft.isNew
              ? t("reading-plan-create-submit", { defaultValue: "Create plan" })
              : t("reading-plan-save-changes", {
                  defaultValue: "Save changes",
                })}
          </button>
        </div>
      </footer>
    </div>
  );
}

interface CadencesSectionProps {
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
function CadencesSection(props: CadencesSectionProps) {
  const { selectedIds, sessionCount, onToggle } = props;
  const { t } = useI18n();

  const lastSelected = selectedIds.length === 1;

  return (
    <div className="sb-rp-choices">
      {/* Says plainly that this is authoring options *for readers*, and that
          self-pacing is always on offer without being one of these boxes. */}
      <p className="sb-rp-hint">
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

interface SessionsSectionProps {
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
function SessionsSection(props: SessionsSectionProps) {
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
