import "../SettingsPage/SettingsPage.css";
import "./CustomizationEditPane.css";
// `.searchbar`/`.search-icon`/`.filters-icon` are defined here rather than in
// a shared stylesheet — imported explicitly rather than relying on
// `BibleSelector.tsx` happening to already be in the bundle.
import "../BibleSelector/BibleSelector.css";
import { signal, useSignal } from "@preact/signals";
import { lazy, Suspense } from "preact/compat";
import { useMemo, useRef } from "preact/hooks";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import type { ModalManager } from "../../managers/ModalManager";
import {
  CUSTOMIZATION_COLOR_GROUPS,
  CUSTOMIZATION_CONTRAST_PAIRS,
  CUSTOMIZATION_FONT_FIELDS,
  MIN_READABLE_CONTRAST_RATIO,
  buildCustomFontValue,
  getContrastRatio,
  getExtensionAvailability,
  getExtensionSettingDefault,
  getFontPresetsForField,
  type CustomizationsManager,
  type ExtensionAvailability,
} from "../../managers/CustomizationsManager";
import {
  DEFAULT_HIGHLIGHT_IDS,
  type BibleTheme,
  type ThemeColorKey,
  type ThemeFontFamilyKey,
} from "../../managers/ThemeManager";
import type { TutorialStep } from "../../managers/TutorialManager";
import {
  groupTranslationsByLanguage,
  filterTranslationGroups,
  type TranslationViewMode,
} from "../../managers/translationGrouping";
import { UI_TO_BIBLE_LANGUAGE_CODES } from "../../managers/BibleReadingManager";
import type { Translation } from "../../managers/FreeUseBibleAPI";
import { useI18n } from "../../i18n/I18nManager";
import { FiltersIcon, MaterialIcon, TickIcon } from "../icons";
import { ExtensionSettingsForm } from "../ExtensionSettingsForm/ExtensionSettingsForm";
import { SensitiveSettingsForm } from "../ExtensionSettingsForm/SensitiveSettingsForm";
import {
  firstAcceptableSettingValue,
  nonSensitiveSettings,
  type ExtensionListEntry,
} from "../../managers/ExtensionManager";
import { Skeleton, SkeletonContainer } from "../Skeleton/Skeleton";
import { LazyColorPicker } from "../ColorPicker/LazyColorPicker";
import { normalizeHex } from "../ColorPicker/color";
import {
  closeContextMenus,
  ContextMenuItem,
  ContextMenuWithButton,
} from "../ContextMenu/ContextMenu";
import { TranslationList } from "../TranslationList/TranslationList";
import { TranslationViewModeMenu } from "../TranslationList/TranslationViewModeMenu";
import { localizedThemeName } from "../SettingsPage/localizedThemeName";
import {
  getDefaultTranslationLabel,
  isPaintableColor,
  ThemeLivePreview,
  ThemeThumbnail,
} from "./CustomizationPreviews";

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
 * Whether `foregroundKey` (e.g. `primaryFontColor`) has a known reading
 * pair (e.g. `primaryColor`) in `CUSTOMIZATION_CONTRAST_PAIRS`, and if so,
 * whether its resolved color falls short of `MIN_READABLE_CONTRAST_RATIO`
 * against that pair's background. `null` when the field has no such pair,
 * or its contrast is already sufficient.
 */
function getContrastWarning(
  foregroundKey: ThemeColorKey,
  resolvedTheme: BibleTheme
): { ratio: number; label: string } | null {
  const pair = CUSTOMIZATION_CONTRAST_PAIRS.find(
    (p) => p.foreground === foregroundKey
  );
  if (!pair) {
    return null;
  }
  const foreground = resolvedTheme.variables[pair.foreground];
  const background = resolvedTheme.variables[pair.background];
  // `inherit`/`transparent` take their color from elsewhere on the page, so
  // there's no fixed pair of colors here to measure.
  if (!isPaintableColor(foreground) || !isPaintableColor(background)) {
    return null;
  }
  const ratio = getContrastRatio(foreground, background);
  if (ratio >= MIN_READABLE_CONTRAST_RATIO) {
    return null;
  }
  return { ratio, label: pair.label };
}

/** Low-contrast badge on a color tile, e.g. "3.0:1", with the full warning as its tooltip. */
function ContrastBadge(props: { ratio: number; label: string }) {
  const { ratio, label } = props;
  const { t } = useI18n();
  const message = t("low-contrast-warning", {
    label,
    ratio: ratio.toFixed(1),
    minRatio: MIN_READABLE_CONTRAST_RATIO.toFixed(1),
    defaultValue:
      "{{label}}: contrast is only {{ratio}}:1 — aim for at least {{minRatio}}:1 so text stays readable.",
  });
  return (
    <span className="sb-cz-contrast-badge" title={message} aria-label={message}>
      {t("contrast-ratio", {
        ratio: ratio.toFixed(1),
        defaultValue: "{{ratio}}:1",
      })}
    </span>
  );
}

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

/**
 * Switches the pane to a variant's theme editor, previews it live, and marks
 * it the customization's actively-edited variant. Shared by the variants
 * list (clicking a theme) and the "customization-created" tutorial, which
 * deep-links here to walk through the editor's sections.
 */
function openCustomizationVariant(
  state: SeedBibleState,
  variantId: string
): void {
  state.customizations.editingVariantId.value = variantId;
  customizationEditView.value = "edit-variant";
  void state.customizations.selectActiveVariant(variantId);
}

/**
 * Steps for the "customization-created" tutorial, shown the first time a
 * user creates a customization. Covers the name and logo fields, then
 * deep-links into `variantId`'s theme editor (the customization's default
 * variant) to walk through each of its sections in turn.
 *
 * Built per-call (rather than a static `CONTEXTUAL_TUTORIALS` entry) because
 * the theme-editor steps' `onEnter`/`onLeave` need `state` and `variantId`,
 * neither of which exists at module load — see `startContextual`'s `steps`
 * override.
 */
export function buildCustomizationTutorialSteps(
  state: SeedBibleState,
  variantId: string
): TutorialStep[] {
  // Shared by every step inside the theme editor: entering re-affirms the
  // editor is open on `variantId` (idempotent — a no-op if it already is,
  // so stepping forward within the group doesn't repeatedly reselect the
  // variant), and leaving snaps back to the main editor. Moving to the next
  // step in the same group immediately re-applies "edit-variant" via its own
  // onEnter, so the two only have a visible effect when the group's first or
  // last step is actually being entered/left.
  const enterVariantEditor = () => {
    if (
      customizationEditView.value !== "edit-variant" ||
      state.customizations.editingVariantId.value !== variantId
    ) {
      openCustomizationVariant(state, variantId);
    }
  };
  const leaveVariantEditor = () => {
    customizationEditView.value = "edit";
  };

  // One static step per `CUSTOMIZATION_COLOR_GROUPS` entry. Written out
  // rather than mapped over that array so each `titleKey`/`bodyKey` is a
  // plain string literal — the i18n lint rules that check for missing/unused
  // translation keys only recognize a `TutorialStep`'s keys when they're
  // statically readable off the AST, not built from a template literal.
  const colorGroupSteps: TutorialStep[] = [
    {
      id: "customization-tutorial-theme-group-brand",
      target: '[data-tutorial="theme-group-brand"]',
      titleKey: "tutorial.themeBrandTitle",
      titleDefault: "Brand colors",
      bodyKey: "tutorial.themeBrandBody",
      bodyDefault:
        "Your primary, secondary, and link colors — the colors that carry your site's identity.",
      placement: "right",
      onEnter: enterVariantEditor,
      onLeave: leaveVariantEditor,
    },
    {
      id: "customization-tutorial-theme-group-surfaces",
      target: '[data-tutorial="theme-group-surfaces"]',
      titleKey: "tutorial.themeSurfacesTitle",
      titleDefault: "Surfaces",
      bodyKey: "tutorial.themeSurfacesBody",
      bodyDefault: "Backgrounds for the app, reader, sidebar, and toolbar.",
      placement: "right",
      onEnter: enterVariantEditor,
      onLeave: leaveVariantEditor,
    },
    {
      id: "customization-tutorial-theme-group-text",
      target: '[data-tutorial="theme-group-text"]',
      titleKey: "tutorial.themeTextTitle",
      titleDefault: "Text colors",
      bodyKey: "tutorial.themeTextBody",
      bodyDefault: "Colors for body text, headings, verse numbers, and more.",
      placement: "right",
      onEnter: enterVariantEditor,
      onLeave: leaveVariantEditor,
    },
    {
      id: "customization-tutorial-theme-group-selection",
      target: '[data-tutorial="theme-group-selection"]',
      titleKey: "tutorial.themeSelectionTitle",
      titleDefault: "Verse selection",
      bodyKey: "tutorial.themeSelectionBody",
      bodyDefault: "The color used to highlight a verse when it's selected.",
      placement: "right",
      onEnter: enterVariantEditor,
      onLeave: leaveVariantEditor,
    },
  ];

  return [
    {
      id: "customization-tutorial-name",
      target: '[data-tutorial="customization-name"]',
      titleKey: "tutorial.customizationNameTitle",
      titleDefault: "Name your site",
      bodyKey: "tutorial.customizationNameBody",
      bodyDefault:
        "This name shows up in the browser tab, the header, and anywhere else your site is referenced. Change it any time.",
      placement: "bottom",
    },
    {
      id: "customization-tutorial-logo",
      target: '[data-tutorial="customization-logo"]',
      titleKey: "tutorial.customizationLogoTitle",
      titleDefault: "Add a logo",
      bodyKey: "tutorial.customizationLogoBody",
      bodyDefault:
        "Upload an image to replace the default logo shown across your site.",
      placement: "bottom",
    },
    {
      id: "customization-tutorial-themes",
      target: '[data-tutorial="customization-themes"]',
      titleKey: "tutorial.customizationThemesTitle",
      titleDefault: "Themes",
      bodyKey: "tutorial.customizationThemesBody",
      bodyDefault:
        "A theme controls all of your site's colors and fonts. Let's open one and see what you can change.",
      placement: "top",
    },
    {
      id: "customization-tutorial-variant-name",
      target: '[data-tutorial="theme-variant-name"]',
      titleKey: "tutorial.themeVariantNameTitle",
      titleDefault: "Name this theme",
      bodyKey: "tutorial.themeVariantNameBody",
      bodyDefault:
        "Give each theme its own name so it's easy to tell them apart if you create more than one.",
      placement: "bottom",
      onEnter: enterVariantEditor,
      onLeave: leaveVariantEditor,
    },
    {
      id: "customization-tutorial-base",
      target: '[data-tutorial="theme-base"]',
      titleKey: "tutorial.themeBaseTitle",
      titleDefault: "Base theme",
      bodyKey: "tutorial.themeBaseBody",
      bodyDefault:
        "Every theme starts from a preset. Pick one here, then fine-tune individual colors below — your edits are kept even if you switch presets later.",
      placement: "bottom",
      onEnter: enterVariantEditor,
      onLeave: leaveVariantEditor,
    },
    ...colorGroupSteps,
    {
      id: "customization-tutorial-fonts",
      target: '[data-tutorial="theme-group-fonts"]',
      titleKey: "tutorial.themeFontsTitle",
      titleDefault: "Fonts",
      bodyKey: "tutorial.themeFontsBody",
      bodyDefault:
        "Pick fonts for your default text, book titles, chapter headings, and verses — choose a preset or type in any Google Font name.",
      placement: "right",
      onEnter: enterVariantEditor,
      onLeave: leaveVariantEditor,
    },
    {
      id: "customization-tutorial-highlights",
      target: '[data-tutorial="theme-group-highlights"]',
      titleKey: "tutorial.themeHighlightsTitle",
      titleDefault: "Highlight colors",
      bodyKey: "tutorial.themeHighlightsBody",
      bodyDefault:
        "The colors readers can use to highlight verses — set a background and text color for each.",
      placement: "right",
      onEnter: enterVariantEditor,
      onLeave: leaveVariantEditor,
    },
  ];
}

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

const UNSAVED_CHANGES_CONFIRM_MODAL_ID =
  "customization-unsaved-changes-confirm";

/**
 * Confirmation body shown when the editor pane's close (X) button is
 * clicked while the draft has unsaved changes still pending — same
 * `sb-confirm-delete*` structure and button classes as the playlist
 * editor's "unsaved item" confirmation (`CreatePlaylistForm.tsx`), adapted
 * to this editor's own auto-save/discard actions instead of its "add
 * item" ones.
 */
function UnsavedChangesConfirmModalContent(props: {
  onKeepEditing: () => void;
  onDiscard: () => void;
  onSaveAndLeave: () => void;
}) {
  const { onKeepEditing, onDiscard, onSaveAndLeave } = props;
  const { t } = useI18n();

  return (
    <div className="sb-confirm-delete">
      <p className="sb-confirm-delete-message">
        {t("unsaved-changes-confirm-message", {
          defaultValue:
            "You have unsaved changes to this customization. What would you like to do?",
        })}
      </p>
      <div className="sb-confirm-delete-actions">
        <button
          type="button"
          className="sb-session-settings-cancel"
          onClick={onKeepEditing}
        >
          {t("keep-editing", { defaultValue: "Keep editing" })}
        </button>
        <button
          type="button"
          className="sb-session-settings-cancel"
          onClick={onDiscard}
        >
          {t("discard-changes", { defaultValue: "Discard changes" })}
        </button>
        <button
          type="button"
          className="sb-session-settings-end"
          onClick={onSaveAndLeave}
        >
          {t("save-and-leave", { defaultValue: "Save and leave" })}
        </button>
      </div>
    </div>
  );
}

/** Opens the unsaved-changes confirmation modal. */
function openUnsavedChangesConfirm(
  modals: ModalManager,
  onDiscard: () => void,
  onSaveAndLeave: () => void
) {
  modals.openModal({
    id: UNSAVED_CHANGES_CONFIRM_MODAL_ID,
    title: {
      key: "unsaved-changes-confirm-title",
      defaultValue: "Unsaved changes",
    },
    content: () => (
      <UnsavedChangesConfirmModalContent
        onKeepEditing={() =>
          modals.closeModal(UNSAVED_CHANGES_CONFIRM_MODAL_ID)
        }
        onDiscard={() => {
          modals.closeModal(UNSAVED_CHANGES_CONFIRM_MODAL_ID);
          onDiscard();
        }}
        onSaveAndLeave={() => {
          modals.closeModal(UNSAVED_CHANGES_CONFIRM_MODAL_ID);
          onSaveAndLeave();
        }}
      />
    ),
  });
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
    exclusive: true,
    title: () => (
      <CustomizationEditPaneTitle customizations={state.customizations} />
    ),
    icon: () => <CustomizationEditPaneIcon />,
    leading: () => <CustomizationEditPaneLeading />,
    component: () => <CustomizationEditPane state={state} />,
    onClose: () => {
      state.customizations.stopEditing();
    },
    // Blocks the header's close (X) button while the draft has unsaved
    // edits, showing a confirmation instead of silently discarding or
    // (invisibly) auto-saving them. Returning `false` here leaves the pane
    // open; each modal action closes the pane itself afterward.
    confirmClose: () => {
      if (!state.customizations.hasUnsavedChanges.value) {
        return true;
      }
      openUnsavedChangesConfirm(
        state.modals,
        () => {
          state.customizations.discardEditingCustomization();
          state.panes.closePane(CUSTOMIZATION_EDIT_PANE_ID, "user");
        },
        () => {
          void (async () => {
            await state.customizations.saveEditingCustomization();
            state.panes.closePane(CUSTOMIZATION_EDIT_PANE_ID, "user");
          })();
        }
      );
      return false;
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
  const { customizations, bibleData, extensions } = state;
  const { t } = useI18n();
  const confirmingDelete = useSignal(false);
  const isUploadingLogo = useSignal(false);

  const record = customizations.editingCustomization.value;

  const openVariant = (variantId: string) =>
    openCustomizationVariant(state, variantId);

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
    return <CustomizationNotFound />;
  }

  const defaultTranslationLabel = getDefaultTranslationLabel(
    t,
    record,
    bibleData.availableTranslations.value
  );

  const availabilityCounts = { available: 0, "auto-installed": 0, hidden: 0 };
  for (const entry of extensions.extensions.value) {
    if (entry.extension !== null) {
      availabilityCounts[getExtensionAvailability(record, entry.id)] += 1;
    }
  }

  return (
    <div className="sb-settings-page sb-cz-page">
      <section className="sb-settings-section sb-cz-body">
        <div
          className="sb-settings-field-row"
          data-tutorial="customization-name"
        >
          <label
            className="sb-settings-field-label"
            htmlFor="sb-customization-name"
          >
            {t("customization-name", { defaultValue: "Name" })}
          </label>
          <input
            id="sb-customization-name"
            type="text"
            className="sb-cz-input"
            value={record.name}
            onChange={(event: Event) => {
              const target = event.currentTarget as HTMLInputElement;
              customizations.updateEditingName(target.value);
            }}
          />
        </div>

        <div
          className="sb-settings-field-row"
          data-tutorial="customization-logo"
        >
          <span className="sb-settings-field-label">
            {t("logo", { defaultValue: "Logo" })}
          </span>
          {record.logoUrl ? (
            <div className="sb-cz-logo sb-cz-logo-filled">
              <img
                className="sb-cz-logo-image"
                src={record.logoUrl}
                alt={t("logo", { defaultValue: "Logo" })}
              />
              <div className="sb-cz-logo-actions">
                <button
                  type="button"
                  className="sb-cz-button"
                  onClick={handleUploadLogo}
                  disabled={isUploadingLogo.value}
                >
                  {t("replace-logo", { defaultValue: "Replace" })}
                </button>
                <button
                  type="button"
                  className="sb-cz-button"
                  onClick={() => void customizations.removeEditingLogo()}
                  disabled={isUploadingLogo.value}
                >
                  {t("remove-logo", { defaultValue: "Remove logo" })}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="sb-cz-logo"
              onClick={handleUploadLogo}
              disabled={isUploadingLogo.value}
            >
              <span className="sb-cz-logo-icon">
                <span className="material-symbols-outlined">upload</span>
              </span>
              <span className="sb-cz-logo-text">
                <span className="sb-cz-logo-title">
                  {t("upload-a-logo", { defaultValue: "Upload a logo" })}
                </span>
                <span className="sb-cz-logo-hint">
                  {t("upload-logo-hint", {
                    defaultValue: "Square PNG or SVG, at least 256px",
                  })}
                </span>
              </span>
            </button>
          )}
        </div>

        <ContextMenuWithButton
          type="button"
          buttonClassName="sb-cz-row"
          menuClassName="sb-customization-translation-picker-menu"
          icon={
            <>
              <span className="sb-cz-row-label">
                {t("customization-default-translation", {
                  defaultValue: "Default translation",
                })}
              </span>
              <span className="sb-cz-row-value">{defaultTranslationLabel}</span>
              <span className="material-symbols-outlined">expand_more</span>
            </>
          }
        >
          <DefaultTranslationPickerMenuContent state={state} />
        </ContextMenuWithButton>

        <div className="sb-cz-group" data-tutorial="customization-themes">
          <h3 className="sb-settings-subheading">
            {t("variants", { defaultValue: "Themes" })}
          </h3>
          <ul className="sb-cz-theme-grid">
            {record.variants.map((variant) => {
              const isDefault = variant.id === record.defaultVariantId;
              const basePreset =
                customizations.resolveVariantBaseTheme(variant);
              return (
                <li key={variant.id} className="sb-cz-theme-card">
                  <button
                    type="button"
                    className="sb-cz-theme-card-open"
                    onClick={() => openVariant(variant.id)}
                  >
                    <ThemeThumbnail
                      theme={customizations.resolveEditingVariantTheme(variant)}
                    />
                    <span className="sb-cz-card-text">
                      <span className="sb-cz-card-title" dir="auto">
                        {variant.name}
                      </span>
                      {isDefault ? (
                        <span className="sb-cz-card-subtitle sb-cz-card-subtitle-accent">
                          {t("default", { defaultValue: "Default" })}
                        </span>
                      ) : (
                        <span className="sb-cz-card-subtitle">
                          {t("based-on-theme", {
                            name: localizedThemeName(t, basePreset),
                            defaultValue: "Based on {{name}}",
                          })}
                        </span>
                      )}
                    </span>
                  </button>
                  {(!isDefault || record.variants.length > 1) && (
                    <ContextMenuWithButton
                      anchorClassName="sb-cz-card-menu"
                      buttonClassName="sb-cz-icon-button"
                      aria-label={t("variant-options", {
                        defaultValue: "Theme options",
                      })}
                    >
                      {!isDefault && (
                        <ContextMenuItem
                          onClick={() =>
                            customizations.setEditingDefaultVariant(variant.id)
                          }
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
                      )}
                      {record.variants.length > 1 && (
                        <ContextMenuItem
                          onClick={() =>
                            customizations.removeEditingVariant(variant.id)
                          }
                        >
                          <MaterialIcon className="sb-context-menu-item-icon">
                            delete
                          </MaterialIcon>
                          <span>
                            {t("delete-variant", { defaultValue: "Delete" })}
                          </span>
                        </ContextMenuItem>
                      )}
                    </ContextMenuWithButton>
                  )}
                </li>
              );
            })}
            <li>
              <button
                type="button"
                className="sb-cz-add-card"
                onClick={handleAddVariant}
              >
                <span className="material-symbols-outlined">add</span>
                {t("add-variant", { defaultValue: "Add theme" })}
              </button>
            </li>
          </ul>
        </div>

        <button
          type="button"
          className="sb-cz-row sb-cz-row-tall"
          onClick={() => {
            customizationEditView.value = "edit-extensions";
          }}
        >
          <span className="material-symbols-outlined sb-cz-row-icon">
            extension
          </span>
          <span className="sb-cz-row-text">
            <span className="sb-cz-row-label">
              {t("customization-extensions", { defaultValue: "Extensions" })}
            </span>
            <span className="sb-cz-row-hint">
              {t("customization-extensions-summary", {
                available: availabilityCounts.available,
                auto: availabilityCounts["auto-installed"],
                hidden: availabilityCounts.hidden,
                defaultValue:
                  "{{available}} available · {{auto}} auto · {{hidden}} hidden",
              })}
            </span>
          </span>
          <span className="material-symbols-outlined rtl-mirror">
            chevron_right
          </span>
        </button>
      </section>

      <footer className="sb-cz-footer">
        {confirmingDelete.value ? (
          <button
            type="button"
            className="sb-cz-button sb-cz-button-danger"
            onClick={() => {
              void customizations.remove(record.id);
              state.panes.closePane(CUSTOMIZATION_EDIT_PANE_ID);
            }}
          >
            <span className="material-symbols-outlined">delete</span>
            {t("confirm-delete-customization", {
              defaultValue: "Confirm delete",
            })}
          </button>
        ) : (
          <button
            type="button"
            className="sb-cz-button sb-cz-button-danger sb-cz-button-quiet"
            onClick={() => {
              confirmingDelete.value = true;
            }}
          >
            <span className="material-symbols-outlined">delete</span>
            {t("delete-customization", { defaultValue: "Delete" })}
          </button>
        )}
        <span className="sb-cz-footer-spacer" />
        <button
          type="button"
          className="sb-cz-button"
          onClick={() => {
            navigator.clipboard.writeText(customizations.getShareLink(record));
            state.app.toast(
              t("customization-link-copied", {
                defaultValue: "Customization link copied to clipboard",
              })
            );
          }}
        >
          <span className="material-symbols-outlined">share</span>
          {t("share", { defaultValue: "Share" })}
        </button>
        <SaveButton
          hasUnsavedChanges={customizations.hasUnsavedChanges.value}
          onSave={() => void handleSave()}
        />
      </footer>
    </div>
  );
}

/**
 * Edits auto-save a few seconds after they're made, so Save is only for
 * saving right now — it's disabled once there's nothing left waiting.
 */
function SaveButton(props: { hasUnsavedChanges: boolean; onSave: () => void }) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      className="sb-cz-button sb-cz-button-primary"
      disabled={!props.hasUnsavedChanges}
      onClick={props.onSave}
    >
      {t("save", { defaultValue: "Save" })}
    </button>
  );
}

function CustomizationNotFound(props: { message?: string }) {
  const { t } = useI18n();
  return (
    <div className="sb-settings-page">
      <section className="sb-settings-section">
        <div className="sb-settings-empty-state">
          <p>
            {props.message ??
              t("customization-not-found", {
                defaultValue: "This customization could not be found.",
              })}
          </p>
        </div>
      </section>
    </div>
  );
}

function CustomizationEditExtensionsView(props: { state: SeedBibleState }) {
  const { state } = props;
  const { customizations, extensions, extensionSettings } = state;
  const { t } = useI18n();

  const record = customizations.editingCustomization.value;

  if (!record) {
    return <CustomizationNotFound />;
  }

  const installableExtensions = extensions.extensions.value.filter(
    (entry) => entry.extension !== null
  );

  const handleConfigureDefaults = (entry: ExtensionListEntry) => {
    const allSettings = entry.extension?.meta.settings ?? {};
    // Sensitive values can't be part of the Customization record, which
    // anyone can read: they go into the owner's own proxies instead.
    const settings = nonSensitiveSettings(allSettings);
    const sensitive = entry.extension?.meta.sensitive ?? {};
    const hasSensitive =
      Object.keys(settings).length < Object.keys(allSettings).length;
    const customizationSecrets =
      extensionSettings.customizationSensitiveSettings;
    // The customization being edited, not the one the viewer currently has
    // active — those are only the same customization some of the time, and the
    // defaults written here belong to the draft.
    const draftDefault = (key: string) =>
      getExtensionSettingDefault(
        customizations.editingCustomization.value,
        entry.id,
        key
      );
    state.modals.openModal({
      title: {
        key: "extension-settings-defaults-title",
        defaultValue: "{{name}} defaults",
        options: {
          name:
            // eslint-disable-next-line seed-bible-i18n/translation-missing-keys
            t("title", { ns: entry.id, defaultValue: entry.id }),
        },
      },
      content: () => (
        <>
          {(!hasSensitive || Object.keys(settings).length > 0) && (
            <ExtensionSettingsForm
              extensionId={entry.id}
              settings={settings}
              getValue={draftDefault}
              // A Customization default overrides only the extension's own default.
              getDefault={(key) => settings[key]?.default}
              onChange={(key, value) =>
                customizations.setEditingExtensionSettingDefault(
                  entry.id,
                  key,
                  value
                )
              }
              overriding={{
                isOverridden: (key) => draftDefault(key) !== undefined,
                onOverrideChange: (key, overridden) => {
                  const definition = settings[key];
                  if (!overridden || !definition) {
                    customizations.clearEditingExtensionSettingDefault(
                      entry.id,
                      key
                    );
                    return;
                  }
                  // Storing a value as soon as the box is ticked keeps the record
                  // and the checkbox saying the same thing; a setting that declares
                  // no default starts from its type's empty value.
                  customizations.setEditingExtensionSettingDefault(
                    entry.id,
                    key,
                    firstAcceptableSettingValue(definition)
                  );
                },
              }}
              t={t}
            />
          )}
          {hasSensitive && (
            <SensitiveSettingsForm
              scope="customization"
              extensionId={entry.id}
              settings={allSettings}
              sensitive={sensitive}
              isSet={(key) =>
                customizationSecrets.isSensitiveValueSet(entry.id, key)
              }
              hasStored={(proxyId) =>
                customizationSecrets.hasStoredSensitiveValues(entry.id, proxyId)
              }
              getDestination={(proxyId) =>
                customizationSecrets.getSensitiveDestination(entry.id, proxyId)
              }
              onSave={(proxyId, values, options) =>
                customizationSecrets.setSensitiveValues(
                  entry.id,
                  proxyId,
                  values,
                  options
                )
              }
              onClear={(proxyId) =>
                customizationSecrets.clearSensitiveValues(entry.id, proxyId)
              }
              t={t}
            />
          )}
        </>
      ),
    });
  };

  return (
    <div className="sb-settings-page sb-cz-page">
      <section className="sb-settings-section sb-cz-body">
        <p className="sb-cz-intro">
          {t("customization-extensions-description", {
            defaultValue:
              "Choose how each extension behaves for anyone using this customization.",
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
          <ul className="sb-cz-list">
            {installableExtensions.map((entry) => {
              const availability = getExtensionAvailability(record, entry.id);
              const selectId = `sb-customization-extension-${entry.id}`;
              return (
                <li className="sb-cz-list-row" key={entry.id}>
                  <span className="sb-cz-row-text">
                    <label className="sb-cz-row-label" htmlFor={selectId}>
                      {
                        // eslint-disable-next-line seed-bible-i18n/translation-missing-keys
                        t("title", { ns: entry.id, defaultValue: entry.id })
                      }
                    </label>
                    <span className="sb-cz-row-hint">
                      <ExtensionAvailabilityHint availability={availability} />
                    </span>
                  </span>
                  {Object.keys(entry.extension?.meta.settings ?? {}).length >
                    0 && (
                    <button
                      type="button"
                      className="sb-cz-icon-button"
                      onClick={() => handleConfigureDefaults(entry)}
                      aria-label={t("configure-extension-defaults", {
                        defaultValue: "Configure defaults",
                      })}
                      title={t("configure-extension-defaults", {
                        defaultValue: "Configure defaults",
                      })}
                    >
                      <span className="material-symbols-outlined">tune</span>
                    </button>
                  )}
                  <span
                    className={`sb-cz-pill-select sb-cz-pill-select-${availability}`}
                  >
                    <span
                      className="material-symbols-outlined sb-cz-pill-select-icon"
                      aria-hidden="true"
                    >
                      {EXTENSION_AVAILABILITY_ICONS[availability]}
                    </span>
                    <select
                      id={selectId}
                      value={availability}
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
                    <span
                      className="material-symbols-outlined sb-cz-pill-select-caret"
                      aria-hidden="true"
                    >
                      expand_more
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

const EXTENSION_AVAILABILITY_ICONS: Record<ExtensionAvailability, string> = {
  available: "radio_button_unchecked",
  "auto-installed": "check_circle",
  hidden: "visibility_off",
};

/** What an extension's availability means for someone using the customization. */
function ExtensionAvailabilityHint(props: {
  availability: ExtensionAvailability;
}) {
  const { t } = useI18n();
  switch (props.availability) {
    case "auto-installed":
      return (
        <>
          {t("extension-availability-auto-installed-hint", {
            defaultValue: "Installed for everyone automatically",
          })}
        </>
      );
    case "hidden":
      return (
        <>
          {t("extension-availability-hidden-hint", {
            defaultValue: "Hidden from the extensions list",
          })}
        </>
      );
    default:
      return (
        <>
          {t("extension-availability-available-hint", {
            defaultValue: "People can install it themselves",
          })}
        </>
      );
  }
}

/** How many more language groups each "load more" reveals. */
const TRANSLATION_PAGE_SIZE = 50;

/**
 * Popover body for picking a customization's default translation — reuses
 * the same searchable, grouped-by-language `TranslationList` the reader's
 * own translation picker and the Compare pane use, so translations are
 * searched and grouped identically everywhere. Local-only
 * search/view-mode/page-size state, deliberately not shared with the
 * reader's own picker: this pane has no "current reader" preference to
 * speak for, just this one customization's setting. Single-select — picking
 * a translation (or "Seed Bible's default") applies it immediately and
 * closes the popover, unlike the Compare pane's multi-select picker which
 * needs an explicit "Done".
 */
function DefaultTranslationPickerMenuContent(props: { state: SeedBibleState }) {
  const { state } = props;
  const { customizations, bibleData } = state;
  const { t, language: uiLanguage } = useI18n();
  const query = useSignal("");
  const viewMode = useSignal<TranslationViewMode>("complete");
  const limit = useSignal(TRANSLATION_PAGE_SIZE);
  const showFilters = useSignal(false);

  const record = customizations.editingCustomization.value;
  const translations = bibleData.availableTranslations.value;
  const selectedTranslation = record?.defaultTranslationId
    ? (translations.find((tr) => tr.id === record.defaultTranslationId) ?? null)
    : null;

  // Memoized so a keystroke in search (or an unrelated re-render) doesn't
  // redo the grouping/filtering pass over the whole catalog every time.
  const allGroups = useMemo(
    () => groupTranslationsByLanguage(translations),
    [translations]
  );
  const { groups, totalMatching } = useMemo(() => {
    // The UI language's own translations are the ones most viewers of this
    // customization are likely to want, so they sort to the top by default
    // — unless a translation in a different language is already selected,
    // in which case that one leads (it's the current pick, and always
    // outranks `priorityLanguages` inside `filterTranslationGroups`) with
    // the UI language's group right behind it, rather than buried
    // alphabetically. Passed straight into `filterTranslationGroups` so the
    // priority sort runs *before* the list is cut down to `limit` — sorting
    // an already-sliced page can't recover a language that didn't make the
    // cut in the first place.
    const uiBibleLanguages = UI_TO_BIBLE_LANGUAGE_CODES[uiLanguage] ?? [];

    return filterTranslationGroups({
      groups: allGroups,
      query: query.value,
      viewMode: viewMode.value,
      limit: limit.value,
      selectedTranslation,
      priorityLanguages: uiBibleLanguages,
    });
  }, [
    allGroups,
    query.value,
    viewMode.value,
    limit.value,
    selectedTranslation,
    uiLanguage,
  ]);

  if (!record) {
    return (
      <div className="sb-settings-empty-state">
        <p>
          {t("customization-not-found", {
            defaultValue: "This customization could not be found.",
          })}
        </p>
      </div>
    );
  }

  const pick = (translation: Translation | null) => {
    customizations.updateEditingDefaultTranslationId(translation?.id ?? null);
    closeContextMenus();
  };

  return (
    <div
      className="sb-customization-translation-picker"
      // Arrow keys and Home/End are handled by the popover's own
      // vertical-list keyboard nav (`ContextMenu.tsx`), which would
      // otherwise hijack them from the search input below (e.g. Home/End
      // moving DOM focus to the first/last translation row instead of the
      // text cursor).
      onKeyDown={(event) => {
        if (
          event.key === "ArrowUp" ||
          event.key === "ArrowDown" ||
          event.key === "Home" ||
          event.key === "End"
        ) {
          event.stopPropagation();
        }
      }}
    >
      <div className="searchbar flex-align-center">
        <span className="material-symbols-outlined search-icon">search</span>
        <input
          type="search"
          className="flex-1"
          value={query.value}
          dir="auto"
          placeholder={t("search-translation", {
            defaultValue: "Search translations...",
          })}
          aria-label={t("search-translation", {
            defaultValue: "Search translations...",
          })}
          onInput={(event: Event) => {
            query.value = (event.currentTarget as HTMLInputElement).value;
          }}
        />
        <button
          type="button"
          className="filters-icon"
          // `.filters-icon` (BibleSelector.css) styles a bare `<span>` in
          // the reader's own picker, so it doesn't reset a real button's
          // native border — do that here instead of copying the `<span>`
          // (which would lose keyboard/focus semantics `<button>` gets for
          // free).
          style={{ border: "none" }}
          aria-label={t("filter-translations", {
            defaultValue: "Filter translations",
          })}
          title={t("filter-translations", {
            defaultValue: "Filter translations",
          })}
          aria-expanded={showFilters.value}
          onClick={() => {
            showFilters.value = !showFilters.value;
          }}
        >
          <FiltersIcon />
        </button>
      </div>
      {showFilters.value && (
        <TranslationViewModeMenu
          viewMode={viewMode.value}
          onChange={(mode) => {
            viewMode.value = mode;
            showFilters.value = false;
            // A narrower or wider catalog is a different list; start it
            // from the first page rather than mid-way through the old one.
            limit.value = TRANSLATION_PAGE_SIZE;
          }}
        />
      )}

      <TranslationList
        groups={groups}
        query={query.value}
        viewMode={viewMode.value}
        selectedTranslationIds={
          record.defaultTranslationId ? [record.defaultTranslationId] : []
        }
        expandedLanguage={selectedTranslation?.language?.toLowerCase() ?? null}
        onPick={pick}
        onShowAllTranslations={() => {
          viewMode.value = "all";
        }}
        canLoadMore={limit.value < totalMatching}
        totalGroupCount={totalMatching}
        onLoadMore={() => {
          limit.value += TRANSLATION_PAGE_SIZE;
        }}
        leadingItem={
          <div
            className="translation-option flex-between-center-gap-md"
            onClick={() => pick(null)}
          >
            <span className="translation-title inline-flex-start-center-gap-sm">
              {record.defaultTranslationId ? (
                <span className="emptyCircle" aria-hidden="true" />
              ) : (
                <TickIcon height={15} width={15} />
              )}
              <span className="translation-description">
                {t("customization-default-translation-none", {
                  defaultValue: "Seed Bible's default",
                })}
              </span>
            </span>
          </div>
        }
      />
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
      <CustomizationNotFound
        message={t("variant-not-found", {
          defaultValue: "This theme could not be found.",
        })}
      />
    );
  }

  const isDefault = variant.id === record.defaultVariantId;
  const canDelete = record.variants.length > 1;
  const resolvedTheme = customizations.resolveEditingVariantTheme(variant);

  return (
    <div className="sb-settings-page sb-cz-page">
      <section className="sb-settings-section sb-cz-body">
        <ThemeLivePreview theme={resolvedTheme} />

        <div
          className="sb-settings-field-row"
          data-tutorial="theme-variant-name"
        >
          <label
            className="sb-settings-field-label"
            htmlFor="sb-customization-variant-name"
          >
            {t("variant-name", { defaultValue: "Name" })}
          </label>
          <input
            id="sb-customization-variant-name"
            type="text"
            className="sb-cz-input"
            value={variant.name}
            onChange={(event: Event) => {
              const target = event.currentTarget as HTMLInputElement;
              customizations.renameEditingVariant(variant.id, target.value);
            }}
          />
        </div>

        <div className="sb-settings-field-row" data-tutorial="theme-base">
          <span
            className="sb-settings-field-label"
            id="sb-customization-variant-base-theme"
          >
            {t("based-on", { defaultValue: "Based on" })}
          </span>
          <div
            className="sb-cz-preset-grid"
            role="radiogroup"
            aria-labelledby="sb-customization-variant-base-theme"
          >
            {theme.themes.value.map((preset) => {
              const isSelected = preset.id === variant.baseTheme;
              return (
                <button
                  key={preset.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  className={`sb-cz-preset${
                    isSelected ? " sb-cz-preset-selected" : ""
                  }`}
                  onClick={() =>
                    customizations.applyPresetToEditingVariant(
                      variant.id,
                      preset.id
                    )
                  }
                >
                  <ThemeThumbnail theme={preset} />
                  <span className="sb-cz-preset-name">
                    {localizedThemeName(t, preset)}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="sb-cz-hint">
            {t("base-theme-description", {
              defaultValue:
                "Anything you haven't changed follows this preset. Your own edits are kept.",
            })}
          </p>
        </div>

        {CUSTOMIZATION_COLOR_GROUPS.map((group) => (
          <div
            key={group.id}
            className="sb-cz-group"
            data-tutorial={`theme-group-${group.id}`}
          >
            <h3 className="sb-settings-subheading">{group.title}</h3>
            <ul className="sb-cz-tile-grid">
              {group.fields.map((field) => {
                const label = t(`customization-${field.key}`, {
                  defaultValue: field.label,
                });
                return (
                  <ColorTile
                    key={field.key}
                    label={label}
                    value={resolvedTheme.variables[field.key] ?? ""}
                    isOverridden={variant.themes[field.key] !== undefined}
                    contrastWarning={getContrastWarning(
                      field.key,
                      resolvedTheme
                    )}
                    onChange={(color) =>
                      customizations.setEditingVariantColor(
                        variant.id,
                        field.key,
                        color
                      )
                    }
                    onPreview={(color) =>
                      customizations.previewEditingVariantColor(
                        variant.id,
                        field.key,
                        color
                      )
                    }
                    onCancel={() =>
                      customizations.clearPreviewEditingVariantColor(
                        variant.id,
                        field.key
                      )
                    }
                    onReset={() =>
                      customizations.resetEditingVariantField(
                        variant.id,
                        field.key
                      )
                    }
                  />
                );
              })}
            </ul>
          </div>
        ))}

        <div className="sb-cz-group" data-tutorial="theme-group-fonts">
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

        <div className="sb-cz-group" data-tutorial="theme-group-highlights">
          <h3 className="sb-settings-subheading">
            {t("highlight-colors", { defaultValue: "Highlight colors" })}
          </h3>
          <ul className="sb-cz-tile-grid">
            {DEFAULT_HIGHLIGHT_IDS.map((id) => {
              const effective = resolvedTheme.highlightColors[id];
              const bg = effective?.color ?? "";
              const fg = effective?.fontColor ?? "";
              const isOverridden = variant.highlightColors[id] !== undefined;
              const label = id.charAt(0).toUpperCase() + id.slice(1);
              const contrastRatio = bg && fg ? getContrastRatio(fg, bg) : null;
              const hasLowContrast =
                contrastRatio !== null &&
                contrastRatio < MIN_READABLE_CONTRAST_RATIO;
              return (
                <li
                  key={id}
                  className={`sb-cz-tile${
                    hasLowContrast ? " sb-cz-tile-warning" : ""
                  }`}
                >
                  <span
                    className="sb-cz-tile-swatch sb-cz-highlight-swatch"
                    style={{ background: bg, color: fg }}
                    aria-hidden="true"
                  >
                    {label}
                  </span>
                  <span className="sb-cz-tile-meta">
                    <span className="sb-cz-highlight-pickers">
                      <LazyColorPicker
                        value={normalizeHex(bg)}
                        className="sb-cz-highlight-picker"
                        ariaLabel={t("id_highlight-background-color", { id })}
                        onChange={(color) => {
                          customizations.setEditingVariantHighlightColor(
                            variant.id,
                            id,
                            { color }
                          );
                        }}
                        onPreview={(color) => {
                          customizations.previewEditingVariantHighlightColor(
                            variant.id,
                            id,
                            { color }
                          );
                        }}
                        onCancel={() => {
                          customizations.clearPreviewEditingVariantHighlightField(
                            variant.id,
                            id,
                            "color"
                          );
                        }}
                      />
                      <LazyColorPicker
                        value={normalizeHex(fg)}
                        className="sb-cz-highlight-picker"
                        ariaLabel={t("id_highlight-text-color", { id })}
                        onChange={(color) => {
                          customizations.setEditingVariantHighlightColor(
                            variant.id,
                            id,
                            { fontColor: color }
                          );
                        }}
                        onPreview={(color) => {
                          customizations.previewEditingVariantHighlightColor(
                            variant.id,
                            id,
                            { fontColor: color }
                          );
                        }}
                        onCancel={() => {
                          customizations.clearPreviewEditingVariantHighlightField(
                            variant.id,
                            id,
                            "fontColor"
                          );
                        }}
                      />
                    </span>
                    {hasLowContrast && (
                      <ContrastBadge
                        ratio={contrastRatio}
                        label={t("highlight-text-on-background", {
                          label,
                          defaultValue: "{{label}} text on its background",
                        })}
                      />
                    )}
                    {isOverridden && (
                      <ResetButton
                        label={label}
                        onReset={() =>
                          customizations.resetEditingVariantHighlightColor(
                            variant.id,
                            id
                          )
                        }
                      />
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <footer className="sb-cz-footer">
        {canDelete &&
          (confirmingDelete.value ? (
            <button
              type="button"
              className="sb-cz-button sb-cz-button-danger"
              onClick={() => {
                customizations.removeEditingVariant(variant.id);
                customizationEditView.value = "edit";
              }}
            >
              <span className="material-symbols-outlined">delete</span>
              {t("confirm-delete-variant", {
                defaultValue: "Confirm delete",
              })}
            </button>
          ) : (
            <button
              type="button"
              className="sb-cz-button sb-cz-button-danger sb-cz-button-quiet"
              onClick={() => {
                confirmingDelete.value = true;
              }}
            >
              <span className="material-symbols-outlined">delete</span>
              {t("delete-variant", { defaultValue: "Delete" })}
            </button>
          ))}
        <span className="sb-cz-footer-spacer" />
        {!isDefault && (
          <button
            type="button"
            className="sb-cz-button"
            onClick={() => customizations.setEditingDefaultVariant(variant.id)}
          >
            {t("set-as-default-variant", { defaultValue: "Set as default" })}
          </button>
        )}
        <SaveButton
          hasUnsavedChanges={customizations.hasUnsavedChanges.value}
          onSave={() => void handleSave()}
        />
      </footer>
    </div>
  );
}

/** Small "back to the base theme's value" button for a field the user has overridden. */
function ResetButton(props: { label: string; onReset: () => void }) {
  const { t } = useI18n();
  const title = t("reset-to-base-theme", {
    defaultValue: "Reset to base theme",
  });
  return (
    <button
      type="button"
      className="sb-cz-reset"
      title={title}
      aria-label={t("reset-field", {
        label: props.label,
        defaultValue: "Reset {{label}}",
      })}
      onClick={props.onReset}
    >
      <span className="material-symbols-outlined">restart_alt</span>
    </button>
  );
}

/**
 * One color in the theme editor: a large swatch that opens the color picker,
 * with the field's name and current value under it. The swatch is drawn here
 * rather than by the picker's own trigger so a value that isn't a plain color
 * (`transparent`, `inherit`) can show as "nothing" instead of black.
 */
function ColorTile(props: {
  label: string;
  value: string;
  isOverridden: boolean;
  contrastWarning: { ratio: number; label: string } | null;
  onChange: (color: string) => void;
  onPreview: (color: string) => void;
  onCancel: () => void;
  onReset: () => void;
}) {
  const { label, value, isOverridden, contrastWarning } = props;
  const isOpen = useSignal(false);
  const swatchRef = useRef<HTMLButtonElement | null>(null);
  const paintable = isPaintableColor(value);

  return (
    <li className={`sb-cz-tile${contrastWarning ? " sb-cz-tile-warning" : ""}`}>
      <button
        ref={swatchRef}
        type="button"
        className={`sb-cz-tile-swatch${
          paintable ? "" : " sb-cz-tile-swatch-unpainted"
        }`}
        style={paintable ? { background: value } : undefined}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={isOpen.value}
        onClick={() => {
          isOpen.value = !isOpen.value;
        }}
      />
      <span className="sb-cz-tile-meta">
        <span className="sb-cz-tile-text">
          <span className="sb-cz-tile-label">{label}</span>
          <span className="sb-cz-tile-value">{value || "—"}</span>
        </span>
        {contrastWarning && (
          <ContrastBadge
            ratio={contrastWarning.ratio}
            label={contrastWarning.label}
          />
        )}
        {isOverridden && <ResetButton label={label} onReset={props.onReset} />}
      </span>
      <LazyColorPicker
        value={normalizeHex(value)}
        showTrigger={false}
        open={isOpen.value}
        onOpenChange={(open) => {
          isOpen.value = open;
        }}
        anchorRef={swatchRef}
        ariaLabel={label}
        onChange={props.onChange}
        onPreview={props.onPreview}
        onCancel={props.onCancel}
      />
    </li>
  );
}

/** The sample text each font row is drawn with, matching where that font shows up in the reader. */
function FontSample(props: { fieldKey: ThemeFontFamilyKey }) {
  const { t } = useI18n();
  switch (props.fieldKey) {
    case "bookTitleFontFamily":
      return (
        <>
          {t("customization-preview-book", {
            defaultValue: "The Gospel of John",
          })}
        </>
      );
    case "chapterHeadingFontFamily":
      return (
        <>
          {t("customization-font-sample-chapter", {
            defaultValue: "Chapter 1",
          })}
        </>
      );
    case "verseFontFamily":
      return (
        <>
          {t("customization-font-sample-verse", {
            defaultValue: "In the beginning was the Word",
          })}
        </>
      );
    case "hebrewSubtitleFontFamily":
      return (
        <>
          {t("customization-font-sample-hebrew-subtitle", {
            defaultValue: "A Psalm of David",
          })}
        </>
      );
    default:
      return (
        <>
          {t("customization-font-sample-default", {
            defaultValue: "The quick brown fox",
          })}
        </>
      );
  }
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
  const selectId = `sb-customization-font-${fieldKey}`;

  return (
    <div className="sb-settings-field-row">
      <label className="sb-settings-field-label" htmlFor={selectId}>
        {label}
      </label>
      <div className="sb-cz-font-row">
        <span
          className="sb-cz-font-sample"
          style={{ fontFamily: value || undefined }}
          aria-hidden="true"
        >
          <FontSample fieldKey={fieldKey} />
        </span>
        {isOverridden && (
          <ResetButton
            label={label}
            onReset={() => {
              forcedCustom.value = false;
              customizations.resetEditingVariantField(variantId, fieldKey);
            }}
          />
        )}
        <span className="sb-cz-pill-select">
          <select
            id={selectId}
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
          <span
            className="material-symbols-outlined sb-cz-pill-select-caret"
            aria-hidden="true"
          >
            expand_more
          </span>
        </span>
      </div>
      {isCustom && (
        <input
          type="text"
          className="sb-cz-input"
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
    </div>
  );
}
