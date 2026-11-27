import { useI18n } from "../../i18n/I18nManager";
import type { AnnotationsManager } from "../../managers/AnnotationsManager";
import type { LoginManager } from "../../managers/LoginManager";
import { Button } from "../Button/Button";

interface LocalSaveNoticeProps {
  annotations: AnnotationsManager;
  login: LoginManager;
}

/**
 * Tells the user when the note they're writing will stay on this device, and
 * why: not signed in, offline, or both. Signing in is offered only when it can
 * work, which is while signed out with a connection.
 */
export function LocalSaveNotice(props: LocalSaveNoticeProps) {
  const { annotations, login } = props;
  const { t } = useI18n();
  const reason = annotations.localSaveReason.value;

  if (!reason) {
    return null;
  }

  const message =
    reason === "signed-out"
      ? t("annotation-local-save-signed-out", {
          defaultValue:
            "You're not signed in, so this note is only saved on this device. Sign in to keep it in your account and on your other devices.",
        })
      : reason === "offline"
        ? annotations.isDraftingNewAnnotation.value
          ? t("annotation-local-save-offline", {
              defaultValue:
                "You're offline, so this note is saved on this device for now. It will be added to your account when you're back online.",
            })
          : t("annotation-local-save-offline-edit", {
              defaultValue:
                "You're offline, so your changes are saved on this device for now. They'll sync to your account when you're back online.",
            })
        : t("annotation-local-save-signed-out-offline", {
            defaultValue:
              "You're offline and not signed in, so this note is only saved on this device. Once you're back online, you can sign in to keep it in your account.",
          });

  return (
    <div className="sb-annotation-local-save-notice">
      <p className="sb-annotation-local-save-notice-text" role="status">
        {message}
      </p>
      {reason === "signed-out" ? (
        <Button
          size="sm"
          className="sb-annotation-local-save-notice-button"
          onClick={() => {
            login.login().catch((err: unknown) => {
              console.warn("Sign-in from the annotation editor failed.", err);
            });
          }}
        >
          {t("log-in", { defaultValue: "Log in" })}
        </Button>
      ) : null}
    </div>
  );
}
