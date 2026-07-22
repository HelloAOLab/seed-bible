import "./shareModal.css";
import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { useI18n } from "../../i18n/I18nManager";
import type { AppState } from "../../managers/SeedBibleStateManager";
import { type BibleReadingSession } from "../../managers/SessionsManager";
export type ShareScope = "verse" | "chapter";

export interface ShareModalProps {
  /** Called when the sheet should close (Cancel or Escape). */
  onClose?: () => void;
  onShareLink?: () => void;
  onShareVia?: () => void;
  app: AppState;
  hideShareLink?: boolean;
}

export const ShareModal = (props: ShareModalProps) => {
  const { t } = useI18n();

  const sessionActive = useSignal(false);

  const close = () => props.onClose?.();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (props.app.currentReadingState.value?.tab.sharedSession?.id) {
      sessionActive.value = true;
    }
  }, [props.app.currentReadingState.value?.tab.sharedSession?.id]);

  const actions = [
    {
      key: "link",
      icon: "link",
      title: t("share-link", { defaultValue: "Share a link" }),
      subtitle: t("share-link-subtitle", { defaultValue: "Copy to clipboard" }),
      onClick: () => props.onShareLink?.(),
    },
    {
      key: "via",
      icon: "ios_share",
      title: t("share-via", { defaultValue: "Share via…" }),
      subtitle: t("share-via-subtitle", {
        defaultValue: "Use your device share sheet",
      }),
      onClick: () => props.onShareVia?.(),
    },
    sessionActive.value
      ? {
          key: "session",
          icon: "group",
          active: false,
          title: t("share-current-session", {
            defaultValue: "Share current session",
          }),
          subtitle: t("share-current-session-subtitle", {
            defaultValue: "Copy a link to invite others to read along live",
          }),
          onClick: () => {
            const session =
              props.app.currentReadingState.value?.tab.sharedSession;
            if (!session) return;
            const url = getSessionUrl(session);
            navigator.clipboard.writeText(url.href);
            props.app.toast(
              t("link-to-join-shared-session-copied", {
                defaultValue:
                  "A link to join the shared session was copied to your clipboard",
              })
            );
            props.onClose?.();
          },
        }
      : {
          key: "session",
          icon: "group",
          active: false,
          title: t("start-share-session", {
            defaultValue: "Start and share session",
          }),
          subtitle: t("start-share-session-subtitle", {
            defaultValue: "Invite others to read along live",
          }),
          onClick: async () => {
            const session = await props.app.createSharedSession();
            const url = getSessionUrl(session);

            navigator.clipboard.writeText(url.href);
            props.app.toast(
              t("link-to-join-shared-session-copied", {
                defaultValue:
                  "A link to join the shared session was copied to your clipboard",
              })
            );
            props.onClose?.();
          },
        },
  ].filter((action) => !(props.hideShareLink && action.key === "link"));

  return (
    <div className="sb-share">
      <div className="sb-share-actions">
        {actions.map((action) => (
          <button
            key={action.key}
            type="button"
            className={
              "sb-share-action" +
              ("active" in action && action.active
                ? " sb-share-action--active"
                : "")
            }
            onClick={action.onClick}
          >
            <span className="sb-share-action-icon material-symbols-outlined">
              {action.icon}
            </span>
            <span className="sb-share-action-text">
              <span className="sb-share-action-title">{action.title}</span>
              <span className="sb-share-action-subtitle">
                {action.subtitle}
              </span>
            </span>
            <span className="sb-share-action-chevron material-symbols-outlined">
              chevron_right
            </span>
          </button>
        ))}
      </div>

      <button type="button" className="sb-share-cancel" onClick={close}>
        {t("cancel", { defaultValue: "Cancel" })}
      </button>
    </div>
  );
};

function getSessionUrl(session: BibleReadingSession) {
  const url = new URL(window.location.href);
  const pattern = url.searchParams.get("pattern");
  url.search = "";
  url.searchParams.set("sessionId", session.id);
  if (pattern) {
    url.searchParams.set("pattern", pattern);
  }
  return url;
}
