import "./Onboarding.css";
import type { ComponentChildren } from "preact";
import {
  isRightToLeftLanguage,
  getBrandedAppText,
  useI18n,
} from "../../i18n/I18nManager";
import { LANG_META } from "../../i18n/languageMeta";
import { InstallAppsIcon, SafariIcon } from "../../components/icons";
import type { OnboardingManager } from "../../managers/OnboardingManager";
import type { CasualOSManager } from "../../managers/OsManager";
import { useAppConfig } from "../../app/appConfig";

/**
 * First-run onboarding modal: a device-aware prompt to install the app / add it
 * to the home screen.
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

  // step === "install" — but never prompt someone who already has the app
  // (standalone session, or just finished installing this page load).
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

/**
 * Offers to move the interface to the language of a Bible translation the user
 * just picked (e.g. picking a Spanish translation while reading an English
 * UI).
 *
 * Written in the language being offered, not the current one — the person most
 * likely to want this is the one who can't read the current UI language.
 */
export function UiLanguageSwitchModal({
  className = "",
}: {
  className?: string;
}) {
  const {
    uiLanguageSwitchPrompt,
    confirmUiLanguageSwitch,
    dismissUiLanguageSwitch,
    neverAskUiLanguageSwitch,
  } = useI18n();
  const prompt = uiLanguageSwitchPrompt.value;

  if (!prompt) {
    return null;
  }

  const { t: translate, targetLanguage } = prompt;
  const nativeLanguageName =
    LANG_META[targetLanguage]?.display ?? targetLanguage;

  return (
    <div className={`sb-onboarding-overlay ${className}`}>
      <div
        className="sb-onboarding-card"
        role="dialog"
        aria-modal="true"
        // The card's text is in `targetLanguage`, which may not run in the same
        // direction as the surrounding UI.
        dir={isRightToLeftLanguage(targetLanguage) ? "rtl" : "ltr"}
        onClick={(event: MouseEvent) => event.stopPropagation()}
      >
        <h2 className="sb-onboarding-title">
          {translate("switch-language-title", {
            defaultValue: "Switch language?",
          })}
        </h2>
        <p className="sb-onboarding-body">
          {translate("switch-language-body", {
            defaultValue:
              "Do you want to switch your language to {{nativeLanguageName}}?",
            nativeLanguageName,
          })}
        </p>
        <div className="sb-onboarding-actions">
          <button
            type="button"
            className="sb-onboarding-btn sb-onboarding-btn-primary"
            onClick={() => {
              void confirmUiLanguageSwitch();
            }}
          >
            {translate("switch-language-confirm", { defaultValue: "Switch" })}
          </button>
          <button
            type="button"
            className="sb-onboarding-btn sb-onboarding-btn-secondary"
            onClick={() => {
              dismissUiLanguageSwitch();
            }}
          >
            {translate("switch-language-dismiss", {
              defaultValue: "Don't Switch",
            })}
          </button>
          <button
            type="button"
            className="sb-onboarding-btn sb-onboarding-btn-tertiary"
            onClick={() => {
              neverAskUiLanguageSwitch();
            }}
          >
            {translate("switch-language-never", {
              defaultValue: "Never Ask Again",
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
  const { branding } = useAppConfig();
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
        // Hide install UI for this session; not persisted (uninstall can't be
        // detected later via storage).
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
        {getBrandedAppText(
          t("onboarding.installBodyPre", {
            defaultValue: "Add Seed Bible to your ",
          }),
          t,
          branding
        )}
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
