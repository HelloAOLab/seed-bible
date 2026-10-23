import "./CustomizationEditPane.css";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import type { SeedBibleCustomization } from "../../managers/CustomizationsManager";
import {
  ContextMenuItem,
  ContextMenuWithButton,
} from "../ContextMenu/ContextMenu";
import { MaterialIcon } from "../icons";
import { useI18n } from "../../i18n";
import {
  CustomizationCardPreview,
  getDefaultTranslationLabel,
} from "./CustomizationPreviews";

/**
 * One customization in a list: a miniature of its default theme with its
 * logo, its name and a short summary, plus a menu to copy its share link.
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
      </ContextMenuWithButton>
    </li>
  );
}
