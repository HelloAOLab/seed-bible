import "./TranslationSwitchPrompt.css";
import { useI18n, type I18nManager } from "../../i18n/I18nManager";
import { LANG_META } from "../../i18n/languageMeta";
import type { ModalManager } from "../../managers/ModalManager";

const MODAL_ID = "translation-switch-prompt";

/**
 * Offers to move the reader's Bible text to the language they just picked for
 * the interface, instead of switching it out from under them.
 *
 * The body of a `ModalHost` dialog — the overlay, card, title and close button
 * come from there.
 *
 * The gating (single tab, once per language, complete translation available,
 * "never ask again") lives in `I18nManager`; by the time this renders, asking
 * has already been judged appropriate. The checkbox is manager state too, so
 * closing the dialog from the host honours it the same as the buttons do.
 */
export function TranslationSwitchPromptContent() {
  const {
    t,
    translationSwitchPrompt,
    translationSwitchNeverAskAgain,
    confirmTranslationSwitch,
    chooseTranslationManually,
    dismissTranslationSwitch,
  } = useI18n();
  const prompt = translationSwitchPrompt.value;

  if (!prompt) {
    return null;
  }

  const languageDisplay =
    LANG_META[prompt.language]?.display ?? prompt.language;

  return (
    <div className="sb-translation-switch-prompt">
      <p className="sb-translation-switch-prompt-body">
        {t("translationSwitch.body", {
          defaultValue:
            "You've changed the app language to {{language}}. Would you like to read the Bible in {{language}} too? We'll switch this tab to {{translation}}.",
          language: languageDisplay,
          translation: prompt.translationName,
        })}
      </p>
      <label
        className="sb-translation-switch-prompt-never"
        htmlFor="sb-translation-switch-never"
      >
        <input
          id="sb-translation-switch-never"
          className="sb-translation-switch-prompt-never-checkbox"
          type="checkbox"
          checked={translationSwitchNeverAskAgain.value}
          onChange={(event: Event) => {
            translationSwitchNeverAskAgain.value = (
              event.currentTarget as HTMLInputElement
            ).checked;
          }}
        />
        <span>
          {t("translationSwitch.neverAskAgain", {
            defaultValue: "Never ask again",
          })}
        </span>
      </label>
      <div className="sb-translation-switch-prompt-actions">
        <button
          type="button"
          className="sb-translation-switch-prompt-btn sb-translation-switch-prompt-btn-primary"
          onClick={() => {
            void confirmTranslationSwitch();
          }}
        >
          {t("translationSwitch.confirm", { defaultValue: "Yes, switch" })}
        </button>
        <button
          type="button"
          className="sb-translation-switch-prompt-btn sb-translation-switch-prompt-btn-secondary"
          onClick={() => {
            chooseTranslationManually();
          }}
        >
          {t("translationSwitch.chooseAnother", {
            defaultValue: "Choose a different translation",
          })}
        </button>
        <button
          type="button"
          className="sb-translation-switch-prompt-btn sb-translation-switch-prompt-btn-tertiary"
          onClick={() => {
            dismissTranslationSwitch();
          }}
        >
          {t("translationSwitch.dismiss", {
            defaultValue: "No, keep reading",
          })}
        </button>
      </div>
    </div>
  );
}

/**
 * Opens (or closes) the translation-switch prompt to match whether one is
 * pending.
 *
 * Safe to call on every change: `openModal` upserts by id, so re-opening the
 * same id replaces the body rather than stacking a second dialog.
 *
 * `onClose` maps the host's own exits — the header's close button and a click
 * on the backdrop — onto "No, keep reading", which is what dismissing this
 * question means. Without it the dialog would vanish while
 * `translationSwitchPrompt` still said one was open.
 */
export function syncTranslationSwitchPromptModal(
  modals: ModalManager,
  i18n: I18nManager
): void {
  if (!i18n.translationSwitchPrompt.value) {
    modals.closeModal(MODAL_ID);
    return;
  }

  modals.openModal({
    id: MODAL_ID,
    title: {
      key: "translationSwitch.title",
      defaultValue: "Also switch the Bible text?",
    },
    content: () => <TranslationSwitchPromptContent />,
    onClose: () => i18n.dismissTranslationSwitch(),
  });
}
