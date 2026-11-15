import "../Onboarding/Onboarding.css";
import "./DisplayNamePrompt.css";
import { useSignal } from "@preact/signals";
import { useI18n } from "../../i18n/I18nManager";
import type { LoginManager } from "../../managers/LoginManager";
import type { OnboardingManager } from "../../managers/OnboardingManager";
import { getUserAnimalVisual } from "../../managers/SessionsManager";
import { visualAnonymousLabel } from "../../managers/Utils";
import { Avatar } from "../Avatar/Avatar";
import { Button } from "../Button/Button";

/**
 * First-login name prompt: shown once when a brand-new account gets a blank
 * profile. Offers the Color + Icon default (matching their avatar) or a name
 * they type. Kept behind onboarding so it doesn't stack on the install card.
 *
 * Keeping the default leaves `name` empty — display surfaces resolve the
 * Color + Icon at render time — so the label stays in sync with the avatar
 * key and the user's language.
 */
export function DisplayNamePrompt({
  login,
  onboarding,
  className = "",
}: {
  login: Pick<
    LoginManager,
    | "userId"
    | "profile"
    | "needsDisplayNamePrompt"
    | "dismissDisplayNamePrompt"
    | "updateProfile"
  >;
  onboarding: Pick<OnboardingManager, "step">;
  className?: string;
}) {
  const { t } = useI18n();
  const draftName = useSignal("");

  const userId = login.userId.value;
  if (
    !userId ||
    !login.needsDisplayNamePrompt.value ||
    onboarding.step.value !== "done"
  ) {
    return null;
  }

  const visual = getUserAnimalVisual(userId);
  const defaultName = visualAnonymousLabel(visual, t);

  const keepDefault = () => {
    login.dismissDisplayNamePrompt();
  };

  const saveName = () => {
    const name = draftName.value.trim();
    if (!name) {
      keepDefault();
      return;
    }
    login.updateProfile({ name });
  };

  return (
    <div className={`sb-onboarding-overlay ${className}`}>
      <div
        className="sb-onboarding-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sb-display-name-prompt-title"
        onClick={(event: MouseEvent) => event.stopPropagation()}
      >
        <h2 className="sb-onboarding-title" id="sb-display-name-prompt-title">
          {t("display-name-prompt-title", {
            defaultValue: "Choose a display name",
          })}
        </h2>
        <p className="sb-onboarding-body">
          {t("display-name-prompt-body", {
            defaultValue:
              "Others will see this name in sessions. You can keep the default from your avatar, or pick your own.",
          })}
        </p>

        <div className="sb-display-name-prompt-preview">
          <Avatar imageUrl={null} visual={visual} title={defaultName} />
          <span className="sb-display-name-prompt-default">{defaultName}</span>
        </div>

        <label
          className="sb-display-name-prompt-label"
          htmlFor="sb-display-name-input"
        >
          {t("display-name-prompt-input-label", {
            defaultValue: "Your name",
          })}
        </label>
        <input
          id="sb-display-name-input"
          className="sb-display-name-prompt-input"
          type="text"
          maxLength={100}
          value={draftName.value}
          placeholder={defaultName}
          onInput={(event: Event) => {
            draftName.value = (event.currentTarget as HTMLInputElement).value;
          }}
        />

        <div className="sb-onboarding-actions">
          <Button variant="ghost" onClick={keepDefault}>
            {t("display-name-prompt-keep-default", {
              defaultValue: "Keep default",
            })}
          </Button>
          <Button variant="primary" onClick={saveName}>
            {t("display-name-prompt-save", {
              defaultValue: "Save name",
            })}
          </Button>
        </div>
      </div>
    </div>
  );
}
