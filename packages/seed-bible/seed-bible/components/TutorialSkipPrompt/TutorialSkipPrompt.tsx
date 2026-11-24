import "./TutorialSkipPrompt.css";
import { useI18n } from "../../i18n/I18nManager";
import type { TutorialManager } from "../../managers/TutorialManager";
import { Button } from "../Button/Button";
import { Dialog } from "../Dialog/Dialog";

/**
 * Follow-up dialog shown after the user skips a tutorial, asking whether they
 * want to turn off tutorial prompts entirely or just skip the one they were
 * on. Replaces the old "Don't show tutorials" button that lived on the tour
 * dialog itself. Escape and the backdrop skip just this one.
 */
export function TutorialSkipPrompt({
  tutorial,
  className,
}: {
  tutorial: TutorialManager;
  className?: string;
}) {
  const { t } = useI18n();

  if (!tutorial.skipPromptVisible.value) {
    return null;
  }

  return (
    <Dialog
      className={`sb-tutorial-skip-prompt${className ? ` ${className}` : ""}`}
      title={t("tutorial.skipPromptTitle", {
        defaultValue: "Turn off tutorials?",
      })}
      showClose={false}
      onClose={tutorial.keepTutorials}
      footer={
        <div className="sb-tutorial-skip-prompt-actions">
          <Button variant="ghost" onClick={tutorial.keepTutorials}>
            {t("tutorial.skipPromptKeep", { defaultValue: "Just this one" })}
          </Button>
          <Button variant="primary" onClick={tutorial.optOut}>
            {t("tutorial.skipPromptDisable", {
              defaultValue: "Turn off tutorials",
            })}
          </Button>
        </div>
      }
    >
      <p className="sb-tutorial-skip-prompt-body">
        {t("tutorial.skipPromptBody", {
          defaultValue:
            "You can turn tutorials back on later from Settings. Would you like to stop seeing them, or just skip this one?",
        })}
      </p>
    </Dialog>
  );
}
