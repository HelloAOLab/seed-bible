import "../SettingsPage/SettingsPage.css";
import { signal, useSignal } from "@preact/signals";
import { lazy, Suspense } from "preact/compat";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import {
  CUSTOMIZATION_COLOR_GROUPS,
  CUSTOMIZATION_FONT_FIELDS,
  buildBibleThemeFromCustomizationTheme,
  buildCustomFontValue,
  getExtensionAvailability,
  getFontPresetsForField,
  type CustomizationsManager,
  type ExtensionAvailability,
} from "../../managers/CustomizationsManager";
import {
  DEFAULT_HIGHLIGHT_IDS,
  type ThemeFontFamilyKey,
} from "../../managers/ThemeManager";
import { useI18n } from "../../i18n/I18nManager";
import { MaterialIcon } from "../icons";
import { Skeleton, SkeletonContainer } from "../Skeleton/Skeleton";
import { toHexInputValue } from "../../app/utils";
import {
  ContextMenuItem,
  ContextMenuWithButton,
} from "../ContextMenu/ContextMenu";

// The picture editor pulls in `react-avatar-editor`, so it's only fetched on
// the "Upload logo" click rather than at boot, same as SettingsPage does.
const LogoCropModalContent = lazy(() =>
  import("../LogoCropModal/LogoCropModal").then((m) => ({
    default: m.LogoCropModalContent,
  }))
);

export const CUSTOMIZATION_EDIT_PANE_ID = "customization-edit-pane";

type CustomizationEditView = "edit" | "edit-variant" | "edit-extensions";

/**
 * Which of the pane's three screens is showing.
 *
 * Module-level rather than component state because the pane's chrome — the
 * back button and the title — lives in the pane header, which the panes
 * manager renders outside this component (see `CustomizationEditPaneTitle`
 * and `CustomizationEditPaneLeading` below). There is only ever one
 * customization editor pane open at a time.
 */
const customizationEditView = signal<CustomizationEditView>("edit");

/** Pane header icon. Same glyph as the "Customize" entry in Settings. */
export function CustomizationEditPaneIcon() {
  return <MaterialIcon>palette</MaterialIcon>;
}

/** Pane header title: the customization/theme name, or the screen's own name. */
export function CustomizationEditPaneTitle(props: {
  customizations: CustomizationsManager;
}) {
  const { t } = useI18n();
  const record = props.customizations.editingCustomization.value;
  const view = customizationEditView.value;

  if (!record) {
    return <>{t("customize", { defaultValue: "Customize" })}</>;
  }
  if (view === "edit-extensions") {
    return <>{t("customization-extensions", { defaultValue: "Extensions" })}</>;
  }
  if (view === "edit-variant") {
    const variant = record.variants.find(
      (v) => v.id === props.customizations.editingVariantId.value
    );
    return <span dir="auto">{variant?.name ?? record.name}</span>;
  }
  return <span dir="auto">{record.name}</span>;
}

/** Pane header back button, shown on every screen except the main editor. */
export function CustomizationEditPaneLeading() {
  const { t } = useI18n();
  if (customizationEditView.value === "edit") {
    return null;
  }
  return (
    <button
      type="button"
      className="sb-settings-breadcrumbs-back"
      onClick={() => {
        customizationEditView.value = "edit";
      }}
      aria-label={t("back", { defaultValue: "Back" })}
      title={t("back", { defaultValue: "Back" })}
    >
      <span className="material-symbols-outlined">arrow_back</span>
    </button>
  );
}

/**
 * Opens (or, if already open, updates) the customization editor side pane on
 * a specific customization. Called from the customizations list in Settings.
 */
export function openCustomizationEditPane(
  state: SeedBibleState,
  id: string
): void {
  state.customizations.startEditing(id);
  customizationEditView.value = "edit";
  state.panes.openPane({
    id: CUSTOMIZATION_EDIT_PANE_ID,
    placement: "side",
    title: () => (
      <CustomizationEditPaneTitle customizations={state.customizations} />
    ),
    icon: () => <CustomizationEditPaneIcon />,
    leading: () => <CustomizationEditPaneLeading />,
    component: () => <CustomizationEditPane state={state} />,
    onClose: () => {
      state.customizations.stopEditing();
    },
  });
}

/**
 * Pane content for the customization editor. Switches between the main
 * editor, a single theme variant's editor, and the extensions screen. The
 * chrome around it — back button and title — is rendered by the pane header
 * (see the exports above), so this component renders only the body.
 */
export function CustomizationEditPane(props: { state: SeedBibleState }) {
  const { state } = props;
  const view = customizationEditView.value;

  if (view === "edit-extensions") {
    return <CustomizationEditExtensionsView state={state} />;
  }
  if (view === "edit-variant") {
    return <CustomizationEditVariantView state={state} />;
  }
  return <CustomizationEditMainView state={state} />;
}

function CustomizationEditMainView(props: { state: SeedBibleState }) {
  const { state } = props;
  const { customizations } = state;
  const { t } = useI18n();
  const confirmingDelete = useSignal(false);
  const isUploadingLogo = useSignal(false);

  const record = customizations.editingCustomization.value;

  const openVariant = (variantId: string) => {
    customizations.editingVariantId.value = variantId;
    customizationEditView.value = "edit-variant";
    // Select this variant as the live-previewed one (only takes effect if
    // this customization is the currently active one) so edits made in the
    // variant editor are visible immediately, rather than requiring the
    // user to separately go pick it from the theme gallery first.
    void customizations.selectActiveVariant(variantId);
  };

  const handleAddVariant = () => {
    const variant = customizations.addEditingVariant();
    if (variant) {
      openVariant(variant.id);
    }
  };

  const handleSave = async () => {
    await customizations.saveEditingCustomization();
    state.app.toast(
      t("customization-saved", { defaultValue: "Customization saved" })
    );
  };

  const handleUploadLogo = () => {
    const modalId = state.modals.openModal({
      title: { key: "upload-logo", defaultValue: "Upload logo" },
      content: () => (
        <Suspense
          fallback={
            <SkeletonContainer
              label={t("loading-picture-editor", {
                defaultValue: "Loading the picture editor…",
              })}
            >
              <Skeleton width="100%" height="16rem" radius="0.625rem" />
            </SkeletonContainer>
          }
        >
          <LogoCropModalContent
            onClose={() => state.modals.closeModal(modalId)}
            onUpload={async (file) => {
              isUploadingLogo.value = true;
              try {
                await customizations.uploadLogo(file);
              } catch (error) {
                console.error("Failed to upload logo.", error);
                throw error;
              } finally {
                isUploadingLogo.value = false;
              }
            }}
          />
        </Suspense>
      ),
    });
  };

  if (!record) {
    return (
      <div className="sb-settings-page">
        <section className="sb-settings-section">
          <div className="sb-settings-empty-state">
            <p>
              {t("customization-not-found", {
                defaultValue: "This customization could not be found.",
              })}
            </p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="sb-settings-page">
      <section className="sb-settings-section">
        <div className="sb-settings-field-row">
          <label className="sb-settings-field-label">
            {t("customization-name", { defaultValue: "Name" })}
          </label>
          <input
            type="text"
            className="sb-settings-text-input"
            value={record.name}
            onChange={(event: Event) => {
              const target = event.currentTarget as HTMLInputElement;
              customizations.updateEditingName(target.value);
            }}
          />
        </div>

        <div className="sb-settings-field-row">
          <label className="sb-settings-field-label">
            {t("logo", { defaultValue: "Logo" })}
          </label>
          <div className="sb-customization-logo-row">
            {record.logoUrl ? (
              <img
                className="sb-customization-logo-preview"
                src={record.logoUrl}
                alt={t("logo", { defaultValue: "Logo" })}
              />
            ) : (
              <div
                className="sb-customization-logo-placeholder"
                aria-hidden="true"
              >
                <span className="material-symbols-outlined">image</span>
              </div>
            )}
            <button
              type="button"
              className="sb-settings-action-button"
              onClick={handleUploadLogo}
              disabled={isUploadingLogo.value}
            >
              {t("upload-logo", { defaultValue: "Upload logo" })}
            </button>
            {record.logoUrl && (
              <button
                type="button"
                className="sb-settings-action-button"
                onClick={() => void customizations.removeEditingLogo()}
                disabled={isUploadingLogo.value}
              >
                {t("remove-logo", { defaultValue: "Remove logo" })}
              </button>
            )}
          </div>
        </div>

        <section className="sb-settings-section">
          <h3 className="sb-settings-subheading">
            {t("variants", { defaultValue: "Themes" })}
          </h3>
          <ul className="sb-settings-list">
            {record.variants.map((variant) => (
              <li
                key={variant.id}
                className="sb-settings-nav-item sb-customization-row"
                onClick={() => openVariant(variant.id)}
              >
                <span className="sb-customization-swatches" aria-hidden="true">
                  <span
                    className="sb-customization-swatch"
                    style={{ background: variant.themes.primaryColor }}
                  />
                  <span
                    className="sb-customization-swatch"
                    style={{ background: variant.themes.secondaryColor }}
                  />
                  <span
                    className="sb-customization-swatch"
                    style={{ background: variant.themes.tertiaryColor }}
                  />
                </span>
                <span className="sb-settings-nav-label">{variant.name}</span>
                {variant.id === record.defaultVariantId && (
                  <span className="sb-customization-active-badge">
                    {t("default", { defaultValue: "Default" })}
                  </span>
                )}
                {variant.id !== record.defaultVariantId && (
                  <ContextMenuWithButton
                    buttonClassName="sb-extension-row-action-button"
                    aria-label={t("variant-options", {
                      defaultValue: "Theme options",
                    })}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ContextMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        customizations.setEditingDefaultVariant(variant.id);
                      }}
                    >
                      <MaterialIcon className="sb-context-menu-item-icon">
                        star
                      </MaterialIcon>
                      <span>
                        {t("set-as-default-variant", {
                          defaultValue: "Set as default",
                        })}
                      </span>
                    </ContextMenuItem>
                  </ContextMenuWithButton>
                )}
                <span className="material-symbols-outlined rtl-mirror">
                  chevron_right
                </span>
              </li>
            ))}
          </ul>
          <div className="sb-settings-actions">
            <button
              type="button"
              className="sb-settings-action-button"
              onClick={handleAddVariant}
            >
              {t("add-variant", { defaultValue: "Add theme" })}
            </button>
          </div>
        </section>

        <button
          type="button"
          className="sb-settings-nav-item"
          onClick={() => {
            customizationEditView.value = "edit-extensions";
          }}
        >
          <span>
            {t("customization-extensions", { defaultValue: "Extensions" })}
          </span>
          <span className="material-symbols-outlined rtl-mirror">
            chevron_right
          </span>
        </button>

        <div className="sb-settings-actions">
          <button
            type="button"
            className="sb-settings-save-button"
            onClick={() => void handleSave()}
          >
            {t("save", { defaultValue: "Save" })}
          </button>

          <button
            type="button"
            className="sb-settings-action-button"
            onClick={() => {
              navigator.clipboard.writeText(
                customizations.getShareLink(record)
              );
              state.app.toast(
                t("customization-link-copied", {
                  defaultValue: "Customization link copied to clipboard",
                })
              );
            }}
          >
            {t("share", { defaultValue: "Share" })}
          </button>

          {confirmingDelete.value ? (
            <button
              type="button"
              className="sb-settings-action-button"
              onClick={() => {
                void customizations.remove(record.id);
                state.panes.closePane(CUSTOMIZATION_EDIT_PANE_ID);
              }}
            >
              {t("confirm-delete-customization", {
                defaultValue: "Confirm delete",
              })}
            </button>
          ) : (
            <button
              type="button"
              className="sb-settings-action-button"
              onClick={() => {
                confirmingDelete.value = true;
              }}
            >
              {t("delete-customization", { defaultValue: "Delete" })}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function CustomizationEditExtensionsView(props: { state: SeedBibleState }) {
  const { state } = props;
  const { customizations, extensions } = state;
  const { t } = useI18n();

  const record = customizations.editingCustomization.value;

  if (!record) {
    return (
      <div className="sb-settings-page">
        <section className="sb-settings-section">
          <div className="sb-settings-empty-state">
            <p>
              {t("customization-not-found", {
                defaultValue: "This customization could not be found.",
              })}
            </p>
          </div>
        </section>
      </div>
    );
  }

  const installableExtensions = extensions.extensions.value.filter(
    (entry) => entry.extension !== null
  );

  return (
    <div className="sb-settings-page">
      <section className="sb-settings-section">
        <p className="sb-settings-field-description">
          {t("customization-extensions-description", {
            defaultValue:
              "Choose how each extension behaves for anyone using this customization: available to install themselves, installed automatically with no prompt, or hidden from the extensions list entirely.",
          })}
        </p>
        {installableExtensions.length === 0 ? (
          <div className="sb-settings-empty-state">
            <p>
              {t("no-extensions-available", {
                defaultValue: "No extensions available.",
              })}
            </p>
          </div>
        ) : (
          installableExtensions.map((entry) => (
            <div className="sb-settings-field-row" key={entry.id}>
              <label
                className="sb-settings-field-label"
                htmlFor={`sb-customization-extension-${entry.id}`}
              >
                {
                  // eslint-disable-next-line seed-bible-i18n/translation-missing-keys
                  t("title", { ns: entry.id, defaultValue: entry.id })
                }
              </label>
              <select
                id={`sb-customization-extension-${entry.id}`}
                className="sb-settings-language-select"
                value={getExtensionAvailability(record, entry.id)}
                onChange={(event: Event) => {
                  const target = event.currentTarget as HTMLSelectElement;
                  customizations.setEditingExtensionAvailability(
                    entry.id,
                    target.value as ExtensionAvailability
                  );
                }}
              >
                <option value="available">
                  {t("extension-availability-available", {
                    defaultValue: "Available",
                  })}
                </option>
                <option value="auto-installed">
                  {t("extension-availability-auto-installed", {
                    defaultValue: "Auto-installed",
                  })}
                </option>
                <option value="hidden">
                  {t("extension-availability-hidden", {
                    defaultValue: "Hidden",
                  })}
                </option>
              </select>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

function CustomizationEditVariantView(props: { state: SeedBibleState }) {
  const { state } = props;
  const { customizations, theme } = state;
  const { t } = useI18n();
  const confirmingDelete = useSignal(false);

  const record = customizations.editingCustomization.value;
  const variant = record?.variants.find(
    (v) => v.id === customizations.editingVariantId.value
  );

  const handleSave = async () => {
    await customizations.saveEditingCustomization();
    state.app.toast(
      t("customization-saved", { defaultValue: "Customization saved" })
    );
  };

  if (!record || !variant) {
    return (
      <div className="sb-settings-page">
        <section className="sb-settings-section">
          <div className="sb-settings-empty-state">
            <p>
              {t("variant-not-found", {
                defaultValue: "This theme could not be found.",
              })}
            </p>
          </div>
        </section>
      </div>
    );
  }

  const isDefault = variant.id === record.defaultVariantId;
  const canDelete = record.variants.length > 1;
  const resolvedTheme = buildBibleThemeFromCustomizationTheme(
    variant,
    customizations.resolveVariantBaseTheme(variant)
  );

  return (
    <div className="sb-settings-page">
      <section className="sb-settings-section">
        <div className="sb-settings-field-row">
          <label className="sb-settings-field-label">
            {t("variant-name", { defaultValue: "Name" })}
          </label>
          <input
            type="text"
            className="sb-settings-text-input"
            value={variant.name}
            onChange={(event: Event) => {
              const target = event.currentTarget as HTMLInputElement;
              customizations.renameEditingVariant(variant.id, target.value);
            }}
          />
        </div>

        <div className="sb-settings-field-row">
          <label
            className="sb-settings-field-label"
            htmlFor="sb-customization-variant-base-theme"
          >
            {t("base-theme", { defaultValue: "Base theme" })}
          </label>
          <select
            id="sb-customization-variant-base-theme"
            className="sb-settings-language-select"
            value=""
            onChange={(event: Event) => {
              const target = event.currentTarget as HTMLSelectElement;
              if (target.value) {
                customizations.applyPresetToEditingVariant(
                  variant.id,
                  target.value
                );
                target.value = "";
              }
            }}
          >
            <option value="">
              {t("select-base-theme", {
                defaultValue: "Base this theme on…",
              })}
            </option>
            {theme.themes.value.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>
          <p className="sb-settings-field-description">
            {t("base-theme-description", {
              defaultValue:
                "Changes which preset this theme falls back to for anything you haven't customized. Your own edits are kept.",
            })}
          </p>
        </div>

        {CUSTOMIZATION_COLOR_GROUPS.map((group) => (
          <div key={group.id} className="sb-theme-colors-group">
            <h3 className="sb-settings-subheading">{group.title}</h3>
            <ul className="sb-theme-colors-list">
              {group.fields.map((field) => {
                const value = resolvedTheme.variables[field.key] ?? "";
                const isOverridden = variant.themes[field.key] !== undefined;
                const label = t(`customization-${field.key}`, {
                  defaultValue: field.label,
                });
                return (
                  <li key={field.key} className="sb-theme-color-row">
                    <div className="sb-theme-color-row-main">
                      <span className="sb-theme-color-label">{label}</span>
                      <span className="sb-theme-color-value">
                        {value || "—"}
                      </span>
                    </div>
                    <div className="sb-theme-color-row-controls">
                      <input
                        type="color"
                        className="sb-theme-color-input"
                        value={toHexInputValue(value)}
                        aria-label={label}
                        onInput={(event: Event) => {
                          const target =
                            event.currentTarget as HTMLInputElement;
                          customizations.setEditingVariantColor(
                            variant.id,
                            field.key,
                            target.value
                          );
                        }}
                      />
                      {isOverridden && (
                        <button
                          type="button"
                          className="sb-theme-color-reset"
                          title={t("reset-to-base-theme", {
                            defaultValue: "Reset to base theme",
                          })}
                          aria-label={`Reset ${label}`}
                          onClick={() =>
                            customizations.resetEditingVariantField(
                              variant.id,
                              field.key
                            )
                          }
                        >
                          <span className="material-symbols-outlined">
                            restart_alt
                          </span>
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        <div className="sb-theme-colors-group">
          <h3 className="sb-settings-subheading">
            {t("customization-fonts", { defaultValue: "Fonts" })}
          </h3>
          {CUSTOMIZATION_FONT_FIELDS.map((field) => (
            <CustomizationFontFieldRow
              key={field.key}
              variantId={variant.id}
              fieldKey={field.key}
              value={resolvedTheme.variables[field.key] ?? ""}
              isOverridden={variant.themes[field.key] !== undefined}
              label={t(`customization-${field.key}`, {
                defaultValue: field.label,
              })}
              customizations={customizations}
            />
          ))}
        </div>

        <div className="sb-theme-colors-group">
          <h3 className="sb-settings-subheading">
            {t("highlight-colors", { defaultValue: "Highlight colors" })}
          </h3>
          <ul className="sb-theme-colors-list">
            {DEFAULT_HIGHLIGHT_IDS.map((id) => {
              const effective = resolvedTheme.highlightColors[id];
              const bg = effective?.color ?? "";
              const fg = effective?.fontColor ?? "";
              const isOverridden = variant.highlightColors[id] !== undefined;
              const label = id.charAt(0).toUpperCase() + id.slice(1);
              return (
                <li key={id} className="sb-theme-color-row">
                  <div className="sb-theme-color-row-main">
                    <span
                      className="sb-highlight-preview-pill"
                      style={{ background: bg, color: fg }}
                      aria-hidden="true"
                    >
                      {label}
                    </span>
                    <span className="sb-theme-color-value">{bg || "—"}</span>
                  </div>
                  <div className="sb-theme-color-row-controls">
                    <input
                      type="color"
                      className="sb-theme-color-input"
                      value={toHexInputValue(bg)}
                      aria-label={t("id_highlight-background-color", { id })}
                      title={t("highlight-background-color", {
                        defaultValue: "Highlight background color",
                      })}
                      onInput={(event: Event) => {
                        const target = event.currentTarget as HTMLInputElement;
                        customizations.setEditingVariantHighlightColor(
                          variant.id,
                          id,
                          { color: target.value }
                        );
                      }}
                    />
                    <input
                      type="color"
                      className="sb-theme-color-input"
                      value={toHexInputValue(fg)}
                      aria-label={t("id_highlight-text-color", { id })}
                      title={t("highlight-text-color", {
                        defaultValue: "Highlight text color",
                      })}
                      onInput={(event: Event) => {
                        const target = event.currentTarget as HTMLInputElement;
                        customizations.setEditingVariantHighlightColor(
                          variant.id,
                          id,
                          { fontColor: target.value }
                        );
                      }}
                    />
                    {isOverridden && (
                      <button
                        type="button"
                        className="sb-theme-color-reset"
                        title={t("reset-to-base-theme", {
                          defaultValue: "Reset to base theme",
                        })}
                        aria-label={`Reset ${label}`}
                        onClick={() =>
                          customizations.resetEditingVariantHighlightColor(
                            variant.id,
                            id
                          )
                        }
                      >
                        <span className="material-symbols-outlined">
                          restart_alt
                        </span>
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="sb-settings-actions">
          <button
            type="button"
            className="sb-settings-save-button"
            onClick={() => void handleSave()}
          >
            {t("save", { defaultValue: "Save" })}
          </button>

          {!isDefault && (
            <button
              type="button"
              className="sb-settings-action-button"
              onClick={() =>
                customizations.setEditingDefaultVariant(variant.id)
              }
            >
              {t("set-as-default-variant", { defaultValue: "Set as default" })}
            </button>
          )}

          {canDelete &&
            (confirmingDelete.value ? (
              <button
                type="button"
                className="sb-settings-action-button"
                onClick={() => {
                  customizations.removeEditingVariant(variant.id);
                  customizationEditView.value = "edit";
                }}
              >
                {t("confirm-delete-variant", {
                  defaultValue: "Confirm delete",
                })}
              </button>
            ) : (
              <button
                type="button"
                className="sb-settings-action-button"
                onClick={() => {
                  confirmingDelete.value = true;
                }}
              >
                {t("delete-variant", { defaultValue: "Delete" })}
              </button>
            ))}
        </div>
      </section>
    </div>
  );
}

/**
 * One font-family row in a customization variant's Fonts section. Custom
 * mode is tracked as its own local signal, separate from the stored value —
 * picking "Custom…" stores an empty value until a name is typed, and an
 * empty value is also what "nothing selected, use Default" looks like
 * (`CustomizationEditVariantView`'s field lookup falls back to the Default
 * preset for it). Without a separate "the user is actively in custom mode"
 * flag, storing that empty value would immediately read back as "nothing
 * selected" and snap the row back to Default, hiding the name field before
 * anything could be typed into it.
 */
function CustomizationFontFieldRow(props: {
  variantId: string;
  fieldKey: ThemeFontFamilyKey;
  value: string;
  isOverridden: boolean;
  label: string;
  customizations: CustomizationsManager;
}) {
  const { variantId, fieldKey, value, isOverridden, label, customizations } =
    props;
  const { t } = useI18n();
  const forcedCustom = useSignal(false);

  const fieldPresets = getFontPresetsForField(fieldKey);
  const matchedPreset = value
    ? fieldPresets.find((p) => p.value === value)
    : fieldPresets[0];
  // A stored value that doesn't match any preset is a real custom font
  // (e.g. reopening an editor that already has one saved) — show custom
  // mode for it even before the user has touched the select this session.
  const isCustom = forcedCustom.value || (!!value && !matchedPreset);
  const preset = isCustom ? undefined : matchedPreset;
  const customName = value.split(",")[0]?.trim() ?? "";

  return (
    <div className="sb-settings-field-row">
      <label
        className="sb-settings-field-label"
        htmlFor={`sb-customization-font-${fieldKey}`}
      >
        {label}
      </label>
      <div className="sb-settings-field-row-controls">
        <select
          id={`sb-customization-font-${fieldKey}`}
          className="sb-settings-language-select"
          value={preset ? preset.name : "__custom__"}
          onChange={(event: Event) => {
            const target = event.currentTarget as HTMLSelectElement;
            if (target.value === "__custom__") {
              forcedCustom.value = true;
              return;
            }
            forcedCustom.value = false;
            const nextPreset = fieldPresets.find(
              (p) => p.name === target.value
            );
            if (nextPreset) {
              customizations.setEditingVariantFont(
                variantId,
                fieldKey,
                nextPreset.value
              );
            }
          }}
        >
          {fieldPresets.map((p) => (
            <option key={p.name} value={p.name}>
              {p.name === "Default"
                ? t("default", { defaultValue: "Default" })
                : p.name}
            </option>
          ))}
          <option value="__custom__">
            {t("custom-font-option", { defaultValue: "Custom…" })}
          </option>
        </select>
        {isCustom && (
          <input
            type="text"
            className="sb-settings-text-input"
            placeholder={t("custom-font-name-placeholder", {
              defaultValue: "Google Font name",
            })}
            value={customName}
            onInput={(event: Event) => {
              const target = event.currentTarget as HTMLInputElement;
              customizations.setEditingVariantFont(
                variantId,
                fieldKey,
                buildCustomFontValue(target.value)
              );
            }}
          />
        )}
        {isOverridden && (
          <button
            type="button"
            className="sb-theme-color-reset"
            title={t("reset-to-base-theme", {
              defaultValue: "Reset to base theme",
            })}
            aria-label={`Reset ${label}`}
            onClick={() => {
              forcedCustom.value = false;
              customizations.resetEditingVariantField(variantId, fieldKey);
            }}
          >
            <span className="material-symbols-outlined">restart_alt</span>
          </button>
        )}
      </div>
    </div>
  );
}
