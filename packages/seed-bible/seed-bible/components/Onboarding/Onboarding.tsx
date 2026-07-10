import "./Onboarding.css";
import type { ComponentChildren } from "preact";
import { useI18n } from "../../i18n/I18nManager";
import { LANG_META } from "../../i18n/languageMeta";
import {
  SeedBibleWordmark,
  InstallAppsIcon,
  SafariIcon,
} from "../../components/icons";
import type { OnboardingManager } from "../../managers/OnboardingManager";
import type { CasualOSManager } from "../../managers/OsManager";

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
  toast,
  className = "",
}: {
  onboarding: OnboardingManager;
  os: CasualOSManager;
  toast: (message: string) => void;
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

  return card(<InstallContent onboarding={onboarding} os={os} toast={toast} />);
}

/**
 * Warns when the chosen UI language has no Bible text and offers the nearest
 * available translation (e.g. Gujarati UI → Hindi Bible). UI language stays put.
 */
export function LanguageUnavailableModal({
  className = "",
}: {
  className?: string;
}) {
  const {
    t,
    languageFallbackPrompt,
    confirmLanguageFallback,
    cancelLanguageFallback,
  } = useI18n();
  const prompt = languageFallbackPrompt.value;

  if (!prompt) {
    return null;
  }

  const fallbackDisplay =
    LANG_META[prompt.fallbackLanguage]?.display ?? prompt.fallbackLanguage;

  return (
    <div className={`sb-onboarding-overlay ${className}`}>
      <div
        className="sb-onboarding-card"
        role="dialog"
        aria-modal="true"
        onClick={(event: MouseEvent) => event.stopPropagation()}
      >
        <h2 className="sb-onboarding-title">
          {t("languageUnavailable.title", {
            defaultValue: "Language Unavailable",
          })}
        </h2>
        <p className="sb-onboarding-body">
          {t("languageUnavailable.body", {
            defaultValue:
              "We don't currently have a Bible translation for this language, but we do support {{fallback}}. Would you like to switch the Bible text to {{fallback}} instead?",
            fallback: fallbackDisplay,
          })}
        </p>
        <div className="sb-onboarding-actions">
          <button
            type="button"
            className="sb-onboarding-btn sb-onboarding-btn-primary"
            onClick={() => {
              void confirmLanguageFallback();
            }}
          >
            {t("languageUnavailable.yesContinue", {
              defaultValue: "Yes, Continue",
            })}
          </button>
          <button
            type="button"
            className="sb-onboarding-btn sb-onboarding-btn-secondary"
            onClick={() => {
              void cancelLanguageFallback();
            }}
          >
            {t("languageUnavailable.noGoBack", {
              defaultValue: "No, Go back",
            })}
          </button>
        </div>
      </div>
    </div>
  );
}

function InstallContent({
  onboarding,
  os,
  toast,
}: {
  onboarding: OnboardingManager;
  os: CasualOSManager;
  toast: (message: string) => void;
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

        toast(
          t("onboarding.installThanks", {
            defaultValue: "Thanks for installing!",
          })
        );
      } else {
        toast(
          t("onboarding.installMaybe", { defaultValue: "Maybe next time!" })
        );
      }
    } catch (error) {
      toast(
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
