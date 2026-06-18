import { batch, useSignal, useSignalEffect } from "@preact/signals";
import { useRef } from "preact/hooks";
import type { LoginRequestSuccess } from "@casual-simulation/aux-records";
import type { CasualOSManager } from "../managers/OsManager";
import { useI18n } from "../i18n/I18nManager";
import SeedBibleTitleIcon from "../img/SeedBibleLogoWithTitleBlack.png";

type LoginStep = "email" | "code";

// Placeholder asset/links. Replace `LOGO_SRC` with the real Seed Bible logo and
// point the legal links at their real destinations when available.
const LOGO_SRC = SeedBibleTitleIcon;
const TERMS_OF_SERVICE_URL = "./?terms=open";
const PRIVACY_POLICY_URL = "/?privacy=open";
const CODE_OF_CONDUCT_URL = "#";

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
export function LoginModal({ os }: { os: CasualOSManager }) {
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

  const isOpen = os.isLoginOpen.value;

  // Reset to a clean state every time the modal is (re)opened so a previous,
  // abandoned attempt doesn't leak into the next one.
  useSignalEffect(() => {
    const open = os.isLoginOpen.value;
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
    if (!os.isLoginOpen.value) {
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
    void os.cancelLogin();
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
      const result = await os.requestLoginByEmail(address);
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
      const result = await os.submitEmailCode(value, request);
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

  const onCode = step.value === "code";
  const title = t("login-account-title", {
    defaultValue: "Login to your account",
  });
  const subtitle = onCode
    ? t("login-code-description", {
        email: email.value.trim(),
        defaultValue: `We sent a code to ${email.value.trim()}.`,
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
          </div>

          {onCode ? (
            <form className="sb-login-form" onSubmit={submitCode}>
              <div className="sb-login-field">
                <label className="sb-login-label" htmlFor="sb-login-code">
                  {t("login-code-label", { defaultValue: "Login code" })}
                </label>
                <input
                  ref={codeInputRef}
                  id="sb-login-code"
                  className="sb-settings-text-input sb-login-input"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code.value}
                  disabled={isSubmitting.value}
                  placeholder={t("login-code-placeholder", {
                    defaultValue: "Enter code",
                  })}
                  onInput={(event: Event) => {
                    code.value = (
                      event.currentTarget as HTMLInputElement
                    ).value;
                  }}
                />
              </div>

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
                    ? t("login-verifying", { defaultValue: "Verifying…" })
                    : t("login-verify", { defaultValue: "Verify" })}
                </button>
                <button
                  type="button"
                  className="sb-login-secondary"
                  onClick={backToEmail}
                  disabled={isSubmitting.value}
                >
                  {t("login-use-different-email", {
                    defaultValue: "Use a different email",
                  })}
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
                    href={TERMS_OF_SERVICE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
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

          <div className="sb-login-legal">
            <a
              className="sb-login-link"
              href={PRIVACY_POLICY_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event: MouseEvent) => event.stopPropagation()}
            >
              {t("privacy-policy", { defaultValue: "Privacy policy" })}
            </a>
            <a
              className="sb-login-link"
              href={CODE_OF_CONDUCT_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event: MouseEvent) => event.stopPropagation()}
            >
              {t("code-of-conduct", { defaultValue: "Code of conduct" })}
            </a>
            <a
              className="sb-login-link"
              href={TERMS_OF_SERVICE_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event: MouseEvent) => event.stopPropagation()}
            >
              {t("terms-of-service", { defaultValue: "Terms of service" })}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
