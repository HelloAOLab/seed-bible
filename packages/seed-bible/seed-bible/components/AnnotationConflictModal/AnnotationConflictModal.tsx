import "./AnnotationConflictModal.css";
import { useState } from "preact/hooks";
import { useI18n } from "../../i18n/I18nManager";
import {
  conflictResolutions,
  type AnnotationConflict,
  type AnnotationSyncManager,
  type ConflictResolution,
} from "../../managers/AnnotationSyncManager";
import type { ModalManager } from "../../managers/ModalManager";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import {
  AnnotationPreview,
  getAnnotationUpdatedTimeFormatter,
} from "../DiscoverPane/DiscoverPane";

/** The id every conflict shares, so only one prompt is ever open. */
const MODAL_ID = "annotation-conflict";

/** The sentence explaining what happened, per kind of clash. */
function conflictMessage(
  conflict: AnnotationConflict,
  t: ReturnType<typeof useI18n>["t"]
): string {
  if (conflict.kind === "deleted_elsewhere") {
    return t("annotation-conflict-deleted-elsewhere", {
      defaultValue:
        "You changed this note on this device, but it was deleted somewhere else.",
    });
  }
  if (conflict.kind === "deleted_locally_edited_elsewhere") {
    return t("annotation-conflict-deleted-locally", {
      defaultValue:
        "You deleted this note on this device, but it was changed somewhere else.",
    });
  }
  return t("annotation-conflict-message", {
    defaultValue:
      "You changed this note on this device, and it also changed somewhere else. Which do you want to keep?",
  });
}

/**
 * Given which version(s) the user has checked, the resolution that means — or
 * `null` while the selection doesn't correspond to a choice worth offering
 * (nothing checked yet, since "keep both" is only ever offered when both
 * checkboxes can be selected — see {@link toggleVersion}).
 */
function resolutionFor(
  selectedMine: boolean,
  selectedTheirs: boolean
): ConflictResolution | null {
  if (selectedMine && selectedTheirs) {
    return "keep_both";
  }
  if (selectedMine) {
    return "keep_mine";
  }
  if (selectedTheirs) {
    return "keep_theirs";
  }
  return null;
}

function VersionCard(props: {
  label: string;
  timeMs: number | null;
  html: string | null;
  language: string;
  emptyLabel: string;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  const {
    label,
    timeMs,
    html,
    language,
    emptyLabel,
    selected,
    disabled,
    onToggle,
  } = props;
  const time =
    timeMs != null
      ? getAnnotationUpdatedTimeFormatter(language).format(new Date(timeMs))
      : null;

  return (
    <div
      className={
        "sb-annotation-conflict-version" +
        (selected ? " sb-annotation-conflict-version-selected" : "")
      }
      role="checkbox"
      aria-checked={selected}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onClick={disabled ? undefined : onToggle}
      onKeyDown={(event) => {
        if (disabled) return;
        if (event.key === " " || event.key === "Enter") {
          event.preventDefault();
          onToggle();
        }
      }}
    >
      <div className="sb-annotation-conflict-version-header">
        <span className="sb-annotation-conflict-checkbox" aria-hidden="true" />
        <span className="sb-annotation-conflict-version-label">
          {label}
          {time ? (
            <span className="sb-annotation-conflict-version-time">
              {" "}
              — {time}
            </span>
          ) : null}
        </span>
      </div>
      <div className="sb-annotation-conflict-body">
        {html ? (
          <AnnotationPreview html={html} />
        ) : (
          <span className="sb-annotation-conflict-empty">{emptyLabel}</span>
        )}
      </div>
    </div>
  );
}

/** One conflict's prompt: pick a version (or both), then confirm. */
function ConflictForm(props: {
  conflict: AnnotationConflict;
  queueLength: number;
  sync: AnnotationSyncManager;
  toast: SeedBibleState["app"]["toast"];
}) {
  const { conflict, queueLength, sync, toast } = props;
  const { t, language } = useI18n();
  const [applying, setApplying] = useState(false);
  const [selectedMine, setSelectedMine] = useState(false);
  const [selectedTheirs, setSelectedTheirs] = useState(false);

  const deletedLocally = conflict.kind === "deleted_locally_edited_elsewhere";
  const canKeepBoth = conflictResolutions(conflict.kind).includes("keep_both");

  /**
   * Checking one version when "keep both" isn't on offer un-checks the other,
   * since there's nothing meaningful in checking both when only one version
   * actually exists to keep.
   */
  const toggleMine = () => {
    setSelectedMine((prev) => {
      const next = !prev;
      if (next && !canKeepBoth) {
        setSelectedTheirs(false);
      }
      return next;
    });
  };
  const toggleTheirs = () => {
    setSelectedTheirs((prev) => {
      const next = !prev;
      if (next && !canKeepBoth) {
        setSelectedMine(false);
      }
      return next;
    });
  };

  const resolution = resolutionFor(selectedMine, selectedTheirs);

  const confirm = async () => {
    if (!resolution) {
      return;
    }
    setApplying(true);
    try {
      await sync.resolveConflict(conflict.id, resolution);
    } catch {
      toast(
        t("annotation-conflict-resolve-failed", {
          defaultValue: "Couldn't apply that choice. It'll be tried again.",
        })
      );
    }
    setApplying(false);
  };

  return (
    <div className="sb-annotation-conflict">
      <p className="sb-annotation-conflict-message">
        {conflictMessage(conflict, t)}
      </p>
      {queueLength > 1 ? (
        <p className="sb-annotation-conflict-progress">
          {t("annotation-conflict-progress", {
            defaultValue: "1 of {{total}} notes to review",
            total: queueLength,
          })}
        </p>
      ) : null}

      <div className="sb-annotation-conflict-versions">
        <VersionCard
          label={t("annotation-conflict-yours", {
            defaultValue: "Your version",
          })}
          timeMs={conflict.localUpdatedAtMs}
          html={conflict.local?.data.html ?? null}
          language={language}
          emptyLabel={
            deletedLocally
              ? t("annotation-conflict-you-deleted", {
                  defaultValue: "You deleted this note.",
                })
              : t("annotation-conflict-no-content", {
                  defaultValue: "No content.",
                })
          }
          selected={selectedMine}
          disabled={applying}
          onToggle={toggleMine}
        />
        <VersionCard
          label={t("annotation-conflict-theirs", {
            defaultValue: "The other version",
          })}
          timeMs={conflict.serverUpdatedAtMs}
          html={conflict.server?.data.html ?? null}
          language={language}
          emptyLabel={t("annotation-conflict-was-deleted", {
            defaultValue: "This note was deleted.",
          })}
          selected={selectedTheirs}
          disabled={applying}
          onToggle={toggleTheirs}
        />
      </div>

      <div className="sb-annotation-conflict-actions">
        <button
          type="button"
          className="sb-annotation-conflict-confirm"
          disabled={applying || !resolution}
          onClick={() => void confirm()}
        >
          {t("annotation-conflict-confirm", { defaultValue: "Confirm" })}
        </button>
      </div>
    </div>
  );
}

/**
 * Asks which version of a note to keep.
 *
 * Shows one conflict at a time even when several are waiting: a stack of modals
 * would be unreadable, and each decision is independent anyway. Resolving one
 * advances to the next, and the host closes the modal once the queue empties.
 */
export function AnnotationConflictModalContent(props: {
  sync: AnnotationSyncManager;
  toast: SeedBibleState["app"]["toast"];
}) {
  const { sync, toast } = props;

  const queue = sync.conflicts.value;
  const conflict = queue[0];
  if (!conflict) {
    return null;
  }

  return (
    <ConflictForm
      key={conflict.id}
      conflict={conflict}
      queueLength={queue.length}
      sync={sync}
      toast={toast}
    />
  );
}

/**
 * Opens (or closes) the conflict prompt to match what's waiting.
 *
 * Safe to call on every change: `openModal` upserts by id, so re-opening the
 * same id replaces the body rather than stacking a second dialog.
 */
export function syncAnnotationConflictModal(
  modals: ModalManager,
  sync: AnnotationSyncManager,
  toast: SeedBibleState["app"]["toast"]
): void {
  if (sync.conflicts.value.length === 0) {
    modals.closeModal(MODAL_ID);
    return;
  }

  modals.openModal({
    id: MODAL_ID,
    title: {
      key: "annotation-conflict-title",
      defaultValue: "This note changed in two places",
    },
    content: () => <AnnotationConflictModalContent sync={sync} toast={toast} />,
  });
}
