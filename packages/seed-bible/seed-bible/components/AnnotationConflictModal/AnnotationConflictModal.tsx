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

/** The button label for one choice, which differs when the change was a delete. */
function resolutionLabel(
  resolution: ConflictResolution,
  conflict: AnnotationConflict,
  t: ReturnType<typeof useI18n>["t"]
): string {
  if (resolution === "keep_theirs") {
    return t("annotation-conflict-keep-theirs", {
      defaultValue: "Keep the other version",
    });
  }
  if (resolution === "keep_both") {
    return t("annotation-conflict-keep-both", { defaultValue: "Keep both" });
  }
  return conflict.kind === "deleted_locally_edited_elsewhere"
    ? t("annotation-conflict-delete-anyway", { defaultValue: "Delete it" })
    : t("annotation-conflict-keep-mine", { defaultValue: "Keep mine" });
}

function VersionBlock(props: {
  label: string;
  timeMs: number | null;
  html: string | null;
  language: string;
  emptyLabel: string;
}) {
  const { label, timeMs, html, language, emptyLabel } = props;
  const time =
    timeMs != null
      ? getAnnotationUpdatedTimeFormatter(language).format(new Date(timeMs))
      : null;

  return (
    <div className="sb-annotation-conflict-version">
      <span className="sb-annotation-conflict-version-label">
        {label}
        {time ? (
          <span className="sb-annotation-conflict-version-time"> — {time}</span>
        ) : null}
      </span>
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
  const { t, language } = useI18n();
  const [applying, setApplying] = useState(false);

  const queue = sync.conflicts.value;
  const conflict = queue[0];
  if (!conflict) {
    return null;
  }

  const apply = async (resolution: ConflictResolution) => {
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

  const deletedLocally = conflict.kind === "deleted_locally_edited_elsewhere";

  return (
    <div className="sb-annotation-conflict">
      <p className="sb-annotation-conflict-message">
        {conflictMessage(conflict, t)}
      </p>
      {queue.length > 1 ? (
        <p className="sb-annotation-conflict-progress">
          {t("annotation-conflict-progress", {
            defaultValue: "1 of {{total}} notes to review",
            total: queue.length,
          })}
        </p>
      ) : null}

      <div className="sb-annotation-conflict-versions">
        <VersionBlock
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
        />
        <VersionBlock
          label={t("annotation-conflict-theirs", {
            defaultValue: "The other version",
          })}
          timeMs={conflict.serverUpdatedAtMs}
          html={conflict.server?.data.html ?? null}
          language={language}
          emptyLabel={t("annotation-conflict-was-deleted", {
            defaultValue: "This note was deleted.",
          })}
        />
      </div>

      <div className="sb-annotation-conflict-actions">
        {conflictResolutions(conflict.kind).map((resolution) => (
          <button
            key={resolution}
            type="button"
            className={
              resolution === "keep_theirs"
                ? "sb-session-settings-cancel"
                : "sb-session-settings-end"
            }
            disabled={applying}
            onClick={() => void apply(resolution)}
          >
            {resolutionLabel(resolution, conflict, t)}
          </button>
        ))}
      </div>
    </div>
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
