import { useState } from "preact/hooks";
import { MaterialIcon } from "../icons";
import { useI18n } from "../../i18n/I18nManager";
import type { ModalManager } from "../../managers/ModalManager";
import type {
  ReadingPlan,
  ReadingPlanMetadata,
  ReadingPlansManager,
} from "../../managers/ReadingPlansManager";
import {
  ContextMenuItem,
  ContextMenuWithButton,
} from "../ContextMenu/ContextMenu";

/**
 * Share, edit, and delete for one reading plan, in the same options menu a
 * playlist row uses. Delete asks in a confirmation modal before it erases
 * the plan. When no modal host is available, the menu item asks once in
 * place instead of deleting on the first click.
 */
export function ReadingPlanOptionsMenu(props: {
  readingPlans: ReadingPlansManager;
  plan: Pick<
    ReadingPlanMetadata,
    "recordName" | "address" | "status" | "title"
  >;
  /** Full plan record, needed to build a share URL. Share is hidden without it. */
  fullPlan: ReadingPlan | null;
  /** When omitted, Edit is hidden — a plan the reader can't change. */
  onEdit?: () => void;
  /** Called after the plan has been deleted, so a detail view can leave it. */
  onDeleted?: () => void;
  modals?: ModalManager;
  toast?: (message: string) => void;
}) {
  const { readingPlans, plan, fullPlan, onEdit, onDeleted, modals, toast } =
    props;
  const { t } = useI18n();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const deletePlan = () => {
    if (modals) {
      openDeleteReadingPlanConfirm(
        modals,
        readingPlans,
        plan,
        toast,
        onDeleted
      );
      return;
    }
    if (!confirmingDelete) {
      return "confirm";
    }
    setConfirmingDelete(false);
    void readingPlans.deleteReadingPlan(plan).then(
      () => onDeleted?.(),
      (error: unknown) => {
        console.error("Failed to delete reading plan:", error);
        toast?.(
          t("reading-plan-delete-failed", {
            defaultValue: "Couldn't delete the reading plan.",
          })
        );
      }
    );
    return "deleted";
  };

  return (
    <ContextMenuWithButton
      anchorClassName="sb-rp-card-menu"
      aria-label={t("reading-plan-options", {
        defaultValue: "Reading plan options",
      })}
      onClick={(e) => {
        e.stopPropagation();
        setConfirmingDelete(false);
      }}
    >
      {fullPlan ? (
        <ContextMenuItem
          onClick={(e) => {
            e.stopPropagation();
            void navigator.clipboard.writeText(
              readingPlans.getReadingPlanShareUrl(fullPlan)
            );
            toast?.(
              t("reading-plan-url-copied", {
                defaultValue: "Reading plan URL copied to clipboard",
              })
            );
          }}
        >
          <MaterialIcon className="sb-context-menu-item-icon">
            share
          </MaterialIcon>
          {t("share-reading-plan", { defaultValue: "Share plan" })}
        </ContextMenuItem>
      ) : null}
      {onEdit ? (
        <ContextMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          <MaterialIcon className="sb-context-menu-item-icon">
            edit
          </MaterialIcon>
          {t("edit-reading-plan", { defaultValue: "Edit plan" })}
        </ContextMenuItem>
      ) : null}
      <ContextMenuItem
        className="sb-context-menu-item--danger"
        onClick={(e) => {
          e.stopPropagation();
          if (deletePlan() === "confirm") {
            e.preventDefault();
            setConfirmingDelete(true);
          }
        }}
      >
        <MaterialIcon className="sb-context-menu-item-icon">
          delete
        </MaterialIcon>
        {confirmingDelete
          ? t("reading-plan-delete-confirm", {
              defaultValue: "Delete for good?",
            })
          : t("reading-plan-delete", { defaultValue: "Delete" })}
      </ContextMenuItem>
    </ContextMenuWithButton>
  );
}

function ConfirmDeleteReadingPlanModalContent(props: {
  readingPlans: ReadingPlansManager;
  plan: Pick<
    ReadingPlanMetadata,
    "recordName" | "address" | "status" | "title"
  >;
  toast?: (message: string) => void;
  onDeleted?: () => void;
  onClose: () => void;
}) {
  const { readingPlans, plan, toast, onDeleted, onClose } = props;
  const { t } = useI18n();

  const confirm = async () => {
    try {
      await readingPlans.deleteReadingPlan(plan);
      onDeleted?.();
    } catch (error) {
      console.error("Failed to delete reading plan:", error);
      toast?.(
        t("reading-plan-delete-failed", {
          defaultValue: "Couldn't delete the reading plan.",
        })
      );
    }
    onClose();
  };

  return (
    <div className="sb-confirm-delete">
      <p className="sb-confirm-delete-message">
        {t("reading-plan-delete-confirm-message", {
          title:
            plan.title ??
            t("untitled-reading-plan", { defaultValue: "Untitled plan" }),
          defaultValue: 'Delete "{{title}}"? This can\'t be undone.',
        })}
      </p>
      <div className="sb-confirm-delete-actions">
        <button
          type="button"
          className="sb-session-settings-cancel"
          onClick={onClose}
        >
          {t("cancel")}
        </button>
        <button
          type="button"
          className="sb-session-settings-end"
          onClick={() => void confirm()}
        >
          {t("delete")}
        </button>
      </div>
    </div>
  );
}

function openDeleteReadingPlanConfirm(
  modals: ModalManager,
  readingPlans: ReadingPlansManager,
  plan: Pick<
    ReadingPlanMetadata,
    "recordName" | "address" | "status" | "title"
  >,
  toast: ((message: string) => void) | undefined,
  onDeleted?: () => void
) {
  const modalId = `delete-reading-plan-confirm-${plan.recordName}-${plan.address}`;
  modals.openModal({
    id: modalId,
    title: {
      key: "reading-plan-delete-confirm-title",
      defaultValue: "Delete reading plan?",
    },
    content: () => (
      <ConfirmDeleteReadingPlanModalContent
        readingPlans={readingPlans}
        plan={plan}
        toast={toast}
        onDeleted={onDeleted}
        onClose={() => modals.closeModal(modalId)}
      />
    ),
  });
}
