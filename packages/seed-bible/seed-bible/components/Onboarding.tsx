import type { ComponentChildren } from "preact";
import { useI18n } from "../i18n/I18nManager";
import {
  SeedBibleWordmark,
  InstallAppsIcon,
  SafariIcon,
} from "../components/icons";
import type { OnboardingManager } from "../managers/OnboardingManager";
import type { CasualOSManager } from "../managers/OsManager";

/**
 * First-run onboarding modals: a welcome notice, then a device-aware prompt to
 * install the app / add it to the home screen.
 *
 * The install affordance differs per platform:
 *  - Android / PC: a real "Install App" button that triggers the native PWA
 *    install prompt via `os.promptToInstallPWA()`.
 *  - iOS: Safari can't trigger an install programmatically, so we show the
 *    "Share → Add to Home Screen" instructions instead of a button that
 *    wouldn't do anything.
 */
export function OnboardingModals({
  onboarding,
  os,
  className = "",
}: {
  onboarding: OnboardingManager;
  os: CasualOSManager;
  className?: string;
}) {
  const { t } = useI18n();
  const step = onboarding.step.value;

  if (step === "done") {
    return null;
  }

  const card = (children: ComponentChildren) => (
    <div className={`sb-onboarding-overlay ${className}`}>
      <div
        className="sb-onboarding-card"
        role="dialog"
        aria-modal="true"
        onClick={(event: MouseEvent) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );

  if (step === "welcome") {
    return card(
      <>
        <div className="sb-onboarding-logo">
          <SeedBibleWordmark height={52} />
        </div>
        <h2 className="sb-onboarding-title">
          {t("onboarding.welcomeTitle", { defaultValue: "Welcome!" })}
        </h2>
        {/* <p className="sb-onboarding-body">
          {t("onboarding.welcomeBodyPre", {
            defaultValue: "This scripture session is ",
          })}
          <strong>
            {t("onboarding.welcomeBodyEmphasis", { defaultValue: "temporary" })}
          </strong>
          {t("onboarding.welcomeBodyPost", {
            defaultValue: " and will erase in 12 hours for your privacy.",
          })}
        </p> */}
        <div className="sb-onboarding-actions">
          <button
            type="button"
            className="sb-onboarding-btn sb-onboarding-btn-primary"
            onClick={onboarding.completeWelcome}
          >
            {t("onboarding.continue", { defaultValue: "Continue" })}
          </button>
        </div>
      </>
    );
  }

  // step === "install" — but never prompt someone who already has the app
  // (e.g. the profile loaded after mount and reported it installed).
  if (onboarding.installed.value) {
    return null;
  }

  return card(<InstallContent onboarding={onboarding} os={os} />);
}

function InstallContent({
  onboarding,
  os,
}: {
  onboarding: OnboardingManager;
  os: CasualOSManager;
}) {
  const { t } = useI18n();
  const { platform } = onboarding;
  const isIos = platform === "ios";
  const isDesktop = platform === "pc";

  const target = isDesktop
    ? t("onboarding.installTargetDesktop", { defaultValue: "desktop" })
    : t("onboarding.installTargetMobile", { defaultValue: "home screen" });

  const handleInstall = async () => {
    try {
      const result = await os.promptToInstallPWA();
      if (result.outcome === "accepted") {
        // Record the install on the user's profile (backend) + local cache so
        // the prompt and the Settings entry disappear from now on.
        onboarding.markInstalled();

        os.toast(
          t("onboarding.installThanks", {
            defaultValue: "Thanks for installing!",
          })
        );
      } else {
        os.toast(
          t("onboarding.installMaybe", { defaultValue: "Maybe next time!" })
        );
      }
    } catch (error) {
      os.toast(
        t("onboarding.installUnavailable", {
          defaultValue: "PWA installation is not available",
        }) +
          ": " +
          (error instanceof Error ? error.message : String(error))
      );
    } finally {
      onboarding.dismissInstall();
    }
  };

  return (
    <>
      <div className="sb-onboarding-icon">
        {isIos ? <SafariIcon size={56} /> : <InstallAppsIcon size={56} />}
      </div>

      <p className="sb-onboarding-body">
        {t("onboarding.installBodyPre", {
          defaultValue: "Add Seed Bible to your ",
        })}
        <strong>{target}</strong>
        {t("onboarding.installBodyPost", {
          defaultValue:
            " to return anytime. You can always find this option later in Settings.",
        })}
      </p>

      {isIos ? (
        <>
          <p className="sb-onboarding-ios-steps">
            {t("onboarding.iosStepsPre", { defaultValue: "Tap " })}
            <span className="material-symbols-outlined sb-onboarding-inline-icon">
              ios_share
            </span>
            {t("onboarding.iosStepsPost", {
              defaultValue:
                " in the toolbar, then choose “Add to Home Screen”.",
            })}
          </p>
          <div className="sb-onboarding-actions">
            <button
              type="button"
              className="sb-onboarding-btn sb-onboarding-btn-primary"
              onClick={onboarding.dismissInstall}
            >
              {t("onboarding.gotIt", { defaultValue: "Got it" })}
            </button>
          </div>
        </>
      ) : (
        <div className="sb-onboarding-actions">
          <button
            type="button"
            className="sb-onboarding-btn sb-onboarding-btn-primary"
            onClick={handleInstall}
          >
            {t("onboarding.installApp", { defaultValue: "Install App" })}
          </button>
          <button
            type="button"
            className="sb-onboarding-btn sb-onboarding-btn-secondary"
            onClick={onboarding.dismissInstall}
          >
            {t("onboarding.maybeLater", { defaultValue: "Maybe later" })}
          </button>
        </div>
      )}
    </>
  );
}
