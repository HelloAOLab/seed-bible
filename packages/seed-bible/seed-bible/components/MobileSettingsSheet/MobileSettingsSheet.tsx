import "./MobileSettingsSheet.css";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import {
  UI_TEXT_SIZE_OPTIONS,
  VERSE_LINE_HEIGHT_OPTIONS,
  DEFAULT_VERSE_LINE_HEIGHT,
  type UITextSize,
} from "../../managers/SettingsManager";
import { useI18n } from "../../i18n/I18nManager";
import { SettingsIcon } from "../icons";

const FONT_SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL"] as const;

function ScriptureLineHeightIcon({ index }: { index: number }) {
  const gap = 3.5 + index * 1.5;
  const startY = 1;
  return (
    <svg width="20" height="14" viewBox="0 0 20 14" fill="none">
      <rect x="0" y={startY} width="20" height="2" rx="1" fill="currentColor" />
      <rect
        x="0"
        y={startY + gap}
        width="20"
        height="2"
        rx="1"
        fill="currentColor"
      />
      <rect
        x="0"
        y={startY + 2 * gap}
        width="20"
        height="2"
        rx="1"
        fill="currentColor"
      />
    </svg>
  );
}

interface MobileSettingsSheetProps {
  state: SeedBibleState;
  onClose: () => void;
  onOpenAllSettings: () => void;
}

export function MobileSettingsSheet(props: MobileSettingsSheetProps) {
  const { state, onClose, onOpenAllSettings } = props;
  const { t } = useI18n();
  const settings = state.settings;
  const current = settings.settings.value;
  const fontSize = state.config.config.value.fontSize;
  const fontSizeIndex = FONT_SIZE_OPTIONS.indexOf(
    fontSize as (typeof FONT_SIZE_OPTIONS)[number]
  );
  const currentLineHeight =
    current.textConfig.verse.lineHeight ?? DEFAULT_VERSE_LINE_HEIGHT;
  const lineHeightIndex = (() => {
    const idx = VERSE_LINE_HEIGHT_OPTIONS.indexOf(currentLineHeight);
    return idx === -1 ? 0 : idx;
  })();

  const handleDecreaseFontSize = () => {
    if (fontSizeIndex > 0) {
      const next = FONT_SIZE_OPTIONS[fontSizeIndex - 1];
      if (next) state.config.setFontSize(next);
    }
  };
  const handleIncreaseFontSize = () => {
    if (fontSizeIndex < FONT_SIZE_OPTIONS.length - 1 && fontSizeIndex >= 0) {
      const next = FONT_SIZE_OPTIONS[fontSizeIndex + 1];
      if (next) state.config.setFontSize(next);
    }
  };
  const handleCycleLineHeight = () => {
    const nextIndex = (lineHeightIndex + 1) % VERSE_LINE_HEIGHT_OPTIONS.length;
    const next = VERSE_LINE_HEIGHT_OPTIONS[nextIndex];
    if (next !== undefined) settings.setVerseLineHeight(next);
  };

  return (
    <>
      <div
        className="sb-mobile-settings-sheet-overlay"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="sb-mobile-settings-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={t("theme-and-text", { defaultValue: "Theme & text" })}
      >
        <div className="sb-mobile-settings-sheet-header">
          <div className="sb-mobile-settings-sheet-title">
            <span
              className="material-symbols-outlined"
              aria-hidden="true"
              style={{ fontSize: "1.375rem" }}
            >
              auto_stories
            </span>
            <span>{t("theme-and-text", { defaultValue: "Theme & text" })}</span>
          </div>
          <button
            type="button"
            className="sb-mobile-settings-sheet-close"
            onClick={onClose}
            aria-label={t("close", { defaultValue: "Close" })}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="sb-mobile-settings-sheet-section-label">
          {t("scripture-settings", { defaultValue: "Scripture settings" })}
        </div>
        <div className="sb-mobile-settings-sheet-scripture-row">
          <button
            type="button"
            className="sb-mobile-settings-sheet-scripture-button"
            onClick={handleDecreaseFontSize}
            disabled={fontSizeIndex <= 0}
            aria-label={t("decrease-scripture-font-size", {
              defaultValue: "Decrease scripture font size",
            })}
            style={{ fontSize: "0.875rem" }}
            // eslint-disable-next-line seed-bible-i18n/i18n-untranslated-content
          >
            A
          </button>
          <button
            type="button"
            className="sb-mobile-settings-sheet-scripture-button"
            onClick={handleIncreaseFontSize}
            disabled={fontSizeIndex >= FONT_SIZE_OPTIONS.length - 1}
            aria-label={t("increase-scripture-font-size", {
              defaultValue: "Increase scripture font size",
            })}
            style={{ fontSize: "1.25rem", fontWeight: 500 }}
            // eslint-disable-next-line seed-bible-i18n/i18n-untranslated-content
          >
            A
          </button>
          <button
            type="button"
            className="sb-mobile-settings-sheet-scripture-button"
            onClick={handleCycleLineHeight}
            aria-label={t("change-line-spacing", {
              defaultValue: "Change line spacing",
            })}
          >
            <ScriptureLineHeightIcon index={lineHeightIndex} />
          </button>
        </div>
        <div className="sb-mobile-settings-sheet-section-label">
          {t("ui-text-size", { defaultValue: "UI text size" })}
        </div>
        <div className="sb-mobile-settings-sheet-size-row">
          {UI_TEXT_SIZE_OPTIONS.map((size, i) => (
            <button
              key={size}
              type="button"
              className={`sb-mobile-settings-sheet-size-button${
                current.uiTextSize === size
                  ? " sb-mobile-settings-sheet-size-button-selected"
                  : ""
              }`}
              onClick={() => settings.setUITextSize(size as UITextSize)}
              style={{ fontSize: `${(12 + i * 2) / 16}rem` }}
              aria-label={size}
              // eslint-disable-next-line seed-bible-i18n/i18n-untranslated-content
            >
              A
            </button>
          ))}
        </div>

        <div className="sb-settings-toggle-row sb-mobile-settings-sheet-toggle-row">
          <label
            className="sb-settings-toggle-label"
            htmlFor="sb-mobile-wake-lock-toggle"
          >
            {t("keep-screen-awake", { defaultValue: "Keep screen awake" })}
          </label>
          <input
            id="sb-mobile-wake-lock-toggle"
            type="checkbox"
            checked={current.keepScreenAwake}
            onChange={(event: Event) => {
              settings.setKeepScreenAwake(
                (event.currentTarget as HTMLInputElement).checked
              );
            }}
          />
        </div>

        <div className="sb-mobile-settings-sheet-divider" />

        <button
          type="button"
          className="sb-mobile-settings-sheet-all-settings"
          onClick={onOpenAllSettings}
        >
          <span className="material-symbols-outlined sb-mobile-settings-icon">
            <SettingsIcon />
          </span>
          <span>
            {t("go-to-all-settings", { defaultValue: "Go to all settings" })}
          </span>
          <span className="material-symbols-outlined sb-mobile-settings-sheet-all-settings-chevron">
            chevron_right
          </span>
        </button>
      </div>
    </>
  );
}
