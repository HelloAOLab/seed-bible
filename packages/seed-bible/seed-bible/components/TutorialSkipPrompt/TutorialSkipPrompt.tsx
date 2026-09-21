import "./TutorialSkipPrompt.css";
import { useI18n } from "../../i18n/I18nManager";
import type { TutorialManager } from "../../managers/TutorialManager";

/**
 * Follow-up dialog shown after the user skips a tutorial, asking whether they
 * want to turn off tutorial prompts entirely or just skip the one they were
 * on. Replaces the old "Don't show tutorials" button that lived on the tour
 * dialog itself.
 */
export function TutorialSkipPrompt({
  tutorial,
  className = "",
}: {
  tutorial: TutorialManager;
  className?: string;
}) {
  const { t } = useI18n();

  if (!tutorial.skipPromptVisible.value) {
    return null;
  }

  return (
    <div
      className={`sb-tutorial-skip-prompt-overlay ${className}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sb-tutorial-skip-prompt-title"
      onClick={tutorial.keepTutorials}
    >
      <div
        className="sb-tutorial-skip-prompt"
        onClick={(event: MouseEvent) => event.stopPropagation()}
      >
        <h3
          className="sb-tutorial-skip-prompt-title"
          id="sb-tutorial-skip-prompt-title"
        >
          {t("tutorial.skipPromptTitle", {
            defaultValue: "Turn off tutorials?",
          })}
        </h3>
        <p className="sb-tutorial-skip-prompt-body">
          {t("tutorial.skipPromptBody", {
            defaultValue:
              "You can turn tutorials back on later from Settings. Would you like to stop seeing them, or just skip this one?",
          })}
        </p>
        <div className="sb-tutorial-skip-prompt-actions">
          <button
            type="button"
            className="sb-tutorial-skip-prompt-btn sb-tutorial-skip-prompt-btn-secondary"
            onClick={tutorial.keepTutorials}
          >
            {t("tutorial.skipPromptKeep", { defaultValue: "Just this one" })}
          </button>
          <button
            type="button"
            className="sb-tutorial-skip-prompt-btn sb-tutorial-skip-prompt-btn-primary"
            onClick={tutorial.optOut}
          >
            {t("tutorial.skipPromptDisable", {
              defaultValue: "Turn off tutorials",
            })}
          </button>
        </div>
      </div>
    </div>
  );
}
