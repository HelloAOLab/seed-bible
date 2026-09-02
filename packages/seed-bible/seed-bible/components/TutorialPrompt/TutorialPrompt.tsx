import "./TutorialPrompt.css";
import { getBrandedAppText, useI18n } from "../../i18n/I18nManager";
import type { TutorialManager } from "../../managers/TutorialManager";
import { useAppConfig } from "../../app/appConfig";

/**
 * First-run tutorial offer. A small card pinned to the top-right of the screen
 * that invites the user to take the guided tour, shown once onboarding is done
 * instead of launching the tour unannounced. Accepting starts the tour;
 * dismissing records the tour as seen (replayable from Settings).
 */
export function TutorialPrompt({
  tutorial,
  className = "",
}: {
  tutorial: TutorialManager;
  className?: string;
}) {
  const { t } = useI18n();
  const { branding } = useAppConfig();

  if (!tutorial.promptVisible.value) {
    return null;
  }

  return (
    <div
      className={`sb-tutorial-prompt ${className}`}
      role="dialog"
      aria-modal="false"
      aria-labelledby="sb-tutorial-prompt-title"
    >
      <h3 className="sb-tutorial-prompt-title" id="sb-tutorial-prompt-title">
        {getBrandedAppText(
          t("tutorial.promptTitle", {
            defaultValue: "Welcome to Seed Bible. Would you like a tutorial?",
          }),
          t,
          branding
        )}
      </h3>
      <p className="sb-tutorial-prompt-body">
        {getBrandedAppText(
          t("tutorial.promptBody", {
            defaultValue:
              "A guided tour is available to help you learn the ins and outs of Seed Bible.",
          }),
          t,
          branding
        )}
      </p>
      <div className="sb-tutorial-prompt-actions">
        <button
          type="button"
          className="sb-tutorial-prompt-btn sb-tutorial-prompt-btn-secondary"
          onClick={tutorial.dismissPrompt}
        >
          {t("tutorial.promptDecline", { defaultValue: "No, thanks" })}
        </button>
        <button
          type="button"
          className="sb-tutorial-prompt-btn sb-tutorial-prompt-btn-primary"
          onClick={tutorial.acceptPrompt}
        >
          {t("tutorial.promptAccept", { defaultValue: "Take the tour" })}
          <span className="sb-tutorial-prompt-arrow" aria-hidden="true">
            →
          </span>
        </button>
      </div>
    </div>
  );
}
