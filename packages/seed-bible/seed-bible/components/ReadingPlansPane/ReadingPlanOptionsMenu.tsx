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
import { openConfirmDeleteModal } from "../ConfirmDeleteModal/ConfirmDeleteModal";

/**
 * Share, edit, and delete for one reading plan, in the same options menu a
 * playlist row uses. Delete asks in a confirmation modal before it erases
 * the plan.
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
  modals: ModalManager;
  toast?: (message: string) => void;
  /** Styles the ⋮ button to match the list it sits in. */
  buttonClassName?: string;
}) {
  const { readingPlans, plan, fullPlan, onEdit, onDeleted, modals, toast } =
    props;
  const { t } = useI18n();

  return (
    <ContextMenuWithButton
      anchorClassName="sb-rp-card-menu"
      buttonClassName={props.buttonClassName}
      aria-label={t("reading-plan-options", {
        defaultValue: "Reading plan options",
      })}
      onClick={(e) => e.stopPropagation()}
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
          {t("share", { defaultValue: "Share" })}
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
          {t("edit", { defaultValue: "Edit" })}
        </ContextMenuItem>
      ) : null}
      <ContextMenuItem
        className="sb-context-menu-item--danger"
        onClick={(e) => {
          e.stopPropagation();
          openDeleteReadingPlanConfirm(
            modals,
            readingPlans,
            plan,
            toast,
            onDeleted
          );
        }}
      >
        <MaterialIcon className="sb-context-menu-item-icon">
          delete
        </MaterialIcon>
        {t("reading-plan-delete", { defaultValue: "Delete" })}
      </ContextMenuItem>
    </ContextMenuWithButton>
  );
}

/**
 * Asks before deleting a plan. Deleting erases the plan and the user's
 * progress through it for good.
 */
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
  openConfirmDeleteModal(modals, {
    id: `delete-reading-plan-confirm-${plan.recordName}-${plan.address}`,
    title: {
      key: "delete-reading-plan-confirm-title",
      defaultValue: "Delete reading plan?",
    },
    message: (t) =>
      t("delete-reading-plan-confirm-message", {
        title:
          plan.title ??
          t("untitled-reading-plan", { defaultValue: "Untitled plan" }),
        defaultValue: 'Delete "{{title}}"? This can\'t be undone.',
      }),
    onConfirm: async () => {
      await readingPlans.deleteReadingPlan(plan);
      onDeleted?.();
    },
    failedMessage: (t) =>
      t("delete-reading-plan-failed", {
        defaultValue: "Couldn't delete the reading plan.",
      }),
    toast,
  });
}
