import { batch, useSignal, useSignalEffect } from "@preact/signals";
import { useRef } from "preact/hooks";
import type { LoginRequestSuccess } from "@casual-simulation/aux-records";
import { useI18n } from "../i18n/I18nManager";
import SeedBibleTitleIcon from "../img/SeedBibleLogoWithTitleBlack.png";
import { MaterialIcon } from "./icons";
import type { NavigationManager } from "../managers/NavigationManager";
import type { LoginManager } from "../managers/LoginManager";

type LoginStep = "email" | "code";

// Placeholder asset/links. Replace `LOGO_SRC` with the real Seed Bible logo and
// point the legal links at their real destinations when available.
const LOGO_SRC = SeedBibleTitleIcon;

/**
 * Guided login flow shown when {@link CasualOSManager.isLoginOpen} is set.
 *
 * Walks the user through two screens:
 *  1. Enter an email address (sends a login code).
 *  2. Enter the code that was emailed to them (completes the login).
 *
 * The flow is driven entirely by the OS manager: requesting a code, submitting
 * it, and cancelling all delegate to {@link CasualOSManager}. When the login
 * resolves, the manager flips `isLoginOpen` back to `false` and this component
 * unmounts itself.
 */
export function LoginModal({
  login,
  navigation,
}: {
  login: LoginManager;
  navigation: NavigationManager;
}) {
  const { t } = useI18n();

  const step = useSignal<LoginStep>("email");
  const email = useSignal("");
  const code = useSignal("");
  const agreed = useSignal(false);
  const error = useSignal<string | null>(null);
  const isSubmitting = useSignal(false);

  // The login request returned by `requestLoginByEmail`. Needed to complete the
  // login on the code screen. Kept in a ref because it's not rendered directly.
  const requestRef = useRef<LoginRequestSuccess | null>(null);
  const wasOpenRef = useRef(false);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);

  const termsOfServiceLink = navigation.linkToQuery({
    terms: "open",
    privacy: null,
    conduct: null,
  });
  const privacyPolicyLink = navigation.linkToQuery({
    privacy: "open",
    terms: null,
    conduct: null,
  });
  const codeOfConductLink = navigation.linkToQuery({
    conduct: "open",
    privacy: null,
    terms: null,
  });

  const isOpen = login.isLoginOpen.value;

  // Reset to a clean state every time the modal is (re)opened so a previous,
  // abandoned attempt doesn't leak into the next one.
  useSignalEffect(() => {
    const open = login.isLoginOpen.value;
    if (open && !wasOpenRef.current) {
      batch(() => {
        step.value = "email";
        code.value = "";
        agreed.value = false;
        error.value = null;
        isSubmitting.value = false;
      });
      requestRef.current = null;
    }
    wasOpenRef.current = open;
  });

  // Move focus to the relevant input as each screen appears.
  useSignalEffect(() => {
    if (!login.isLoginOpen.value) {
      return;
    }
    const target =
      step.value === "email" ? emailInputRef.current : codeInputRef.current;
    target?.focus();
  });

  if (!isOpen) {
    return null;
  }

  const cancel = () => {
    void login.cancelLogin();
  };

  const submitEmail = async (event: Event) => {
    event.preventDefault();
    if (isSubmitting.value) {
      return;
    }

    const address = email.value.trim();
    if (!address) {
      error.value = t("login-error-email-required", {
        defaultValue: "Please enter your email address.",
      });
      return;
    }

    if (!agreed.value) {
      error.value = t("login-error-terms-required", {
        defaultValue: "Please agree to the terms of service to continue.",
      });
      return;
    }

    error.value = null;
    isSubmitting.value = true;
    try {
      const result = await login.requestLoginByEmail(address);
      if (result.success) {
        requestRef.current = result;
        batch(() => {
          code.value = "";
          step.value = "code";
        });
      } else {
        error.value =
          result.errorMessage ||
          t("login-error-generic", {
            defaultValue: "Something went wrong. Please try again.",
          });
      }
    } catch (err) {
      console.error("Failed to request login code.", err);
      error.value = t("login-error-generic", {
        defaultValue: "Something went wrong. Please try again.",
      });
    } finally {
      isSubmitting.value = false;
    }
  };

  const submitCode = async (event: Event) => {
    event.preventDefault();
    if (isSubmitting.value) {
      return;
    }

    const request = requestRef.current;
    if (!request) {
      step.value = "email";
      return;
    }

    const value = code.value.trim();
    if (!value) {
      error.value = t("login-error-code-required", {
        defaultValue: "Please enter the code from your email.",
      });
      return;
    }

    error.value = null;
    isSubmitting.value = true;
    try {
      const result = await login.submitLoginCode(value, request);
      // On success the OS manager loads the user info and closes the login UI,
      // which unmounts this component — nothing more to do here.
      if (!result.success) {
        error.value =
          result.errorMessage ||
          t("login-error-generic", {
            defaultValue: "Something went wrong. Please try again.",
          });
      }
    } catch (err) {
      console.error("Failed to submit login code.", err);
      error.value = t("login-error-generic", {
        defaultValue: "Something went wrong. Please try again.",
      });
    } finally {
      isSubmitting.value = false;
    }
  };

  const backToEmail = () => {
    batch(() => {
      error.value = null;
      code.value = "";
      step.value = "email";
    });
    requestRef.current = null;
  };

  const resendCode = async () => {
    if (isSubmitting.value) {
      return;
    }

    const address = email.value.trim();
    if (!address) {
      step.value = "email";
      return;
    }

    error.value = null;
    isSubmitting.value = true;
    try {
      const result = await login.requestLoginByEmail(address);
      if (result.success) {
        requestRef.current = result;
        code.value = "";
        codeInputRef.current?.focus();
      } else {
        error.value =
          result.errorMessage ||
          t("login-error-generic", {
            defaultValue: "Something went wrong. Please try again.",
          });
      }
    } catch (err) {
      console.error("Failed to resend login code.", err);
      error.value = t("login-error-generic", {
        defaultValue: "Something went wrong. Please try again.",
      });
    } finally {
      isSubmitting.value = false;
    }
  };

  const onCode = step.value === "code";
  const title = onCode
    ? t("login-code-title", { defaultValue: "Enter the login code" })
    : t("login-account-title", { defaultValue: "Login to your account" });
  const subtitle = onCode
    ? t("login-code-description", {
        email: email.value.trim(),
        defaultValue: `We sent a login code to "${email.value.trim()}".`,
      })
    : t("login-account-subtitle", {
        defaultValue: "Enter the email address you want to login with",
      });

  return (
    <div
      className="sb-footnote-modal-overlay"
      onClick={cancel}
      onKeyDown={(event: KeyboardEvent) => {
        if (event.key === "Escape") {
          event.preventDefault();
          cancel();
        }
      }}
    >
      <div
        className="sb-footnote-modal sb-login-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event: MouseEvent) => event.stopPropagation()}
      >
        <div className="sb-login-modal-body">
          <div className="sb-login-header">
            <img
              className="sb-login-logo"
              src={LOGO_SRC}
              alt={t("login-account-title", {
                defaultValue: "Login to your account",
              })}
            />
            <h3 className="sb-login-title">{title}</h3>
            <p className="sb-login-subtitle">{subtitle}</p>
            {onCode && (
              <button
                type="button"
                className="sb-login-link sb-login-change-email"
                onClick={backToEmail}
                disabled={isSubmitting.value}
              >
                {t("login-change-email", {
                  defaultValue: "Change email address",
                })}
              </button>
            )}
          </div>

          {onCode ? (
            <form className="sb-login-form" onSubmit={submitCode}>
              <div className="sb-login-field">
                <div className="sb-login-code-row">
                  <input
                    ref={codeInputRef}
                    id="sb-login-code"
                    className="sb-settings-text-input sb-login-input sb-login-code-input"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={code.value}
                    disabled={isSubmitting.value}
                    placeholder={t("login-code-placeholder", {
                      defaultValue: "Enter login code here",
                    })}
                    onInput={(event: Event) => {
                      code.value = (
                        event.currentTarget as HTMLInputElement
                      ).value;
                    }}
                  />
                  <button
                    type="button"
                    className="sb-login-resend"
                    onClick={resendCode}
                    disabled={isSubmitting.value}
                  >
                    <MaterialIcon className="sb-login-resend-icon">
                      refresh
                    </MaterialIcon>
                    {t("login-resend-code", { defaultValue: "Resend code" })}
                  </button>
                </div>
              </div>

              {error.value && (
                <p className="sb-login-error" role="alert">
                  {error.value}
                </p>
              )}

              <div className="sb-login-actions sb-login-actions-row">
                <button
                  type="button"
                  className="sb-login-secondary"
                  onClick={cancel}
                  disabled={isSubmitting.value}
                >
                  {t("cancel", { defaultValue: "Cancel" })}
                </button>
                <button
                  type="submit"
                  className="sb-login-submit"
                  disabled={isSubmitting.value}
                >
                  {isSubmitting.value
                    ? t("login-verifying", { defaultValue: "Verifying…" })
                    : t("login-confirm-code", { defaultValue: "Confirm code" })}
                </button>
              </div>
            </form>
          ) : (
            <form className="sb-login-form" onSubmit={submitEmail}>
              <div className="sb-login-field">
                <input
                  ref={emailInputRef}
                  id="sb-login-email"
                  className="sb-settings-text-input sb-login-input"
                  type="email"
                  autoComplete="email"
                  value={email.value}
                  disabled={isSubmitting.value}
                  placeholder={t("login-email-title", {
                    defaultValue: "Enter your email address",
                  })}
                  onInput={(event: Event) => {
                    email.value = (
                      event.currentTarget as HTMLInputElement
                    ).value;
                  }}
                />
              </div>

              <label className="sb-login-terms" htmlFor="sb-login-terms">
                <input
                  id="sb-login-terms"
                  className="sb-login-terms-checkbox"
                  type="checkbox"
                  checked={agreed.value}
                  disabled={isSubmitting.value}
                  onChange={(event: Event) => {
                    agreed.value = (
                      event.currentTarget as HTMLInputElement
                    ).checked;
                  }}
                />
                <span className="sb-login-terms-text">
                  {t("login-agree-prefix", { defaultValue: "I agree to the" })}{" "}
                  <a
                    className="sb-login-link"
                    href={termsOfServiceLink}
                    onClick={(event: MouseEvent) => event.stopPropagation()}
                  >
                    {t("terms-of-service", {
                      defaultValue: "Terms of service",
                    })}
                  </a>
                </span>
              </label>

              {error.value && (
                <p className="sb-login-error" role="alert">
                  {error.value}
                </p>
              )}

              <div className="sb-login-actions">
                <button
                  type="submit"
                  className="sb-login-submit"
                  disabled={isSubmitting.value}
                >
                  {isSubmitting.value
                    ? t("login-sending", { defaultValue: "Sending…" })
                    : t("log-in", { defaultValue: "Log in" })}
                </button>
              </div>
            </form>
          )}

          {!onCode && (
            <div className="sb-login-legal">
              <a className="sb-login-link" href={privacyPolicyLink}>
                {t("privacy-policy", { defaultValue: "Privacy policy" })}
              </a>
              <a
                className="sb-login-link"
                href={codeOfConductLink}
                onClick={(event: MouseEvent) => event.stopPropagation()}
              >
                {t("code-of-conduct", { defaultValue: "Code of conduct" })}
              </a>
              <a
                className="sb-login-link"
                href={termsOfServiceLink}
                onClick={(event: MouseEvent) => event.stopPropagation()}
              >
                {t("terms-of-service", { defaultValue: "Terms of service" })}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
