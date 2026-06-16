import { batch, useSignal, useSignalEffect } from "@preact/signals";
import { useRef } from "preact/hooks";
import type { LoginRequestSuccess } from "@casual-simulation/aux-records";
import type { CasualOSManager } from "../managers/OsManager";
import { useI18n } from "../i18n/I18nManager";

type LoginStep = "email" | "code";

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
  const title = onCode
    ? t("login-code-title", {
        defaultValue: "Enter the code sent to your email",
      })
    : t("login-email-title", { defaultValue: "Enter your email address" });

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
        <div className="sb-footnote-modal-header">
          <h3 className="sb-footnote-modal-title">{title}</h3>
          <button
            type="button"
            className="sb-footnote-modal-close"
            aria-label={t("close", { defaultValue: "Close" })}
            onClick={cancel}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="sb-footnote-modal-content sb-login-modal-body">
          {onCode ? (
            <form className="sb-login-form" onSubmit={submitCode}>
              <p className="sb-login-description">
                {t("login-code-description", {
                  email: email.value.trim(),
                  defaultValue: `We sent a code to ${email.value.trim()}.`,
                })}
              </p>

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
              <p className="sb-login-description">
                {t("login-email-description", {
                  defaultValue: "We'll send a login code to this address.",
                })}
              </p>

              <div className="sb-login-field">
                <label className="sb-login-label" htmlFor="sb-login-email">
                  {t("login-email-label", { defaultValue: "Email address" })}
                </label>
                <input
                  ref={emailInputRef}
                  id="sb-login-email"
                  className="sb-settings-text-input sb-login-input"
                  type="email"
                  autoComplete="email"
                  value={email.value}
                  disabled={isSubmitting.value}
                  placeholder={t("login-email-placeholder", {
                    defaultValue: "you@example.com",
                  })}
                  onInput={(event: Event) => {
                    email.value = (
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
                    ? t("login-sending", { defaultValue: "Sending…" })
                    : t("login-continue", { defaultValue: "Continue" })}
                </button>
                <button
                  type="button"
                  className="sb-login-secondary"
                  onClick={cancel}
                  disabled={isSubmitting.value}
                >
                  {t("cancel", { defaultValue: "Cancel" })}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
