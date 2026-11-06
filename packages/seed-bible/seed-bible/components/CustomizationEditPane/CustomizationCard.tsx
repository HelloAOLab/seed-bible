import "./CustomizationEditPane.css";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import type { SeedBibleCustomization } from "../../managers/CustomizationsManager";
import {
  ContextMenuItem,
  ContextMenuWithButton,
} from "../ContextMenu/ContextMenu";
import { MaterialIcon } from "../icons";
import { useI18n } from "../../i18n";
import { openConfirmDeleteModal } from "../ConfirmDeleteModal/ConfirmDeleteModal";
import {
  CustomizationCardPreview,
  getDefaultTranslationLabel,
} from "./CustomizationPreviews";

export const CUSTOMIZATION_EDIT_PANE_ID = "customization-edit-pane";

/**
 * Asks before deleting a customization for good, then deletes it. If it was
 * open in the editor, the editor closes too, whichever button deleted it. A
 * failed delete is reported and leaves it in place.
 */
export function confirmDeleteCustomization(
  state: SeedBibleState,
  customization: SeedBibleCustomization
) {
  openConfirmDeleteModal(state.modals, {
    id: `delete-customization-confirm-${customization.id}`,
    title: {
      key: "delete-customization-confirm-title",
      defaultValue: "Delete Custom Branding?",
    },
    message: (t) =>
      t("delete-customization-confirm-message", {
        name: customization.name,
        defaultValue:
          'Delete Custom Branding "{{name}}"? This can\'t be undone.',
      }),
    onConfirm: async () => {
      // Read first: deleting the one being edited clears the draft.
      const wasEditing =
        state.customizations.editingCustomization.peek()?.id ===
        customization.id;
      await state.customizations.remove(customization.id);
      if (wasEditing) {
        state.panes.closePane(CUSTOMIZATION_EDIT_PANE_ID);
      }
    },
    failedMessage: (t) =>
      t("delete-customization-failed", {
        defaultValue: "Couldn't delete the Custom Branding.",
      }),
    toast: state.app.toast,
  });
}

/**
 * One customization in a list: a miniature of its default theme with its
 * logo, its name and a short summary, plus a menu to copy its share link or
 * delete it.
 */
export function CustomizationCard(props: {
  state: SeedBibleState;
  customization: SeedBibleCustomization;
  onOpen: () => void;
}) {
  const { state, customization } = props;
  const { customizations } = state;
  const { t } = useI18n();
  const previewVariant =
    customization.variants.find(
      (v) => v.id === customization.defaultVariantId
    ) ?? customization.variants[0];

  return (
    <li className="sb-cz-card">
      <button type="button" className="sb-cz-card-open" onClick={props.onOpen}>
        {previewVariant && (
          <CustomizationCardPreview
            theme={customizations.resolveEditingVariantTheme(previewVariant)}
            logoUrl={customization.logoUrl}
            heading={t("customization-preview-chapter", {
              defaultValue: "John 1",
            })}
          />
        )}
        <span className="sb-cz-card-text">
          <span className="sb-cz-card-title" dir="auto">
            {customization.name}
          </span>
          <span className="sb-cz-card-subtitle">
            {t("customization-card-summary", {
              themes: t("customization-theme-count", {
                count: customization.variants.length,
                defaultValue: "{{count}} themes",
              }),
              translation: getDefaultTranslationLabel(
                t,
                customization,
                state.bibleData.availableTranslations.value
              ),
              defaultValue: "{{themes}} · {{translation}}",
            })}
          </span>
        </span>
      </button>
      <ContextMenuWithButton
        anchorClassName="sb-cz-card-menu"
        buttonClassName="sb-cz-icon-button"
        aria-label={t("customization-options", {
          defaultValue: "Custom Branding options",
        })}
      >
        <ContextMenuItem
          onClick={() => {
            navigator.clipboard.writeText(
              customizations.getShareLink(customization)
            );
            state.app.toast(
              t("customization-link-copied", {
                defaultValue: "Custom Branding link copied to clipboard",
              })
            );
          }}
        >
          <MaterialIcon className="sb-context-menu-item-icon">
            share
          </MaterialIcon>
          <span>{t("share", { defaultValue: "Share" })}</span>
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => confirmDeleteCustomization(state, customization)}
        >
          <MaterialIcon className="sb-context-menu-item-icon">
            delete
          </MaterialIcon>
          <span>{t("delete", { defaultValue: "Delete" })}</span>
        </ContextMenuItem>
      </ContextMenuWithButton>
    </li>
  );
}
