import "./shareModal.css";
import { useEffect } from "preact/hooks";
import { useI18n } from "../../i18n/I18nManager";
import type { AppState } from "../../managers/SeedBibleStateManager";
import { type BibleReadingSession } from "../../managers/SessionsManager";

export interface ShareModalProps {
  /** Called when the sheet should close (Cancel or Escape). */
  onClose?: () => void;
  /** Copy a shareable link to the clipboard. */
  onShareLink?: () => void;
  /** Open the device's native share sheet. */
  onShareVia?: () => void;
  app: AppState;
  hideShareLink?: boolean;
  /** The session to share, or null. */
  session: BibleReadingSession | null;
}

export const ShareModal = (props: ShareModalProps) => {
  const { t } = useI18n();

  const sessionActive = props.session !== null;

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

  const canShareVia =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  const copySessionLink = async (session: BibleReadingSession) => {
    try {
      const url = getSessionUrl(session);
      await navigator.clipboard.writeText(url.href);
      props.app.toast(
        t("link-to-join-shared-session-copied", {
          defaultValue:
            "A link to join the shared session was copied to your clipboard",
        })
      );
    } catch (error) {
      console.error("Failed to copy the shared session link.", error);
    } finally {
      props.onClose?.();
    }
  };

  const actions = [
    {
      key: "link",
      icon: "link",
      title: t("share-link", { defaultValue: "Share a link" }),
      subtitle: t("share-link-subtitle", { defaultValue: "Copy to clipboard" }),
      onClick: () => props.onShareLink?.(),
    },
    canShareVia
      ? {
          key: "via",
          icon: "ios_share",
          title: t("share-via", { defaultValue: "Share via…" }),
          subtitle: t("share-via-subtitle", {
            defaultValue: "Use your device share sheet",
          }),
          onClick: () => props.onShareVia?.(),
        }
      : null,
    sessionActive
      ? {
          key: "session",
          icon: "group",
          title: t("share-current-session", {
            defaultValue: "Share current session",
          }),
          subtitle: t("share-current-session-subtitle", {
            defaultValue: "Copy a link to invite others to read along live",
          }),
          onClick: () => {
            const session = props.session;
            if (!session) return;
            void copySessionLink(session);
          },
        }
      : {
          key: "session",
          icon: "group",
          title: t("start-share-session", {
            defaultValue: "Start and share session",
          }),
          subtitle: t("start-share-session-subtitle", {
            defaultValue: "Invite others to read along live",
          }),
          onClick: async () => {
            try {
              const session = await props.app.createSharedSession();
              await copySessionLink(session);
            } catch (error) {
              console.error("Failed to start and share a session.", error);
              props.onClose?.();
            }
          },
        },
  ].filter(
    (action): action is NonNullable<typeof action> =>
      action !== null && !(props.hideShareLink && action.key === "link")
  );

  return (
    <div className="sb-share">
      <div className="sb-share-actions">
        {actions.map((action) => (
          <button
            key={action.key}
            type="button"
            className="sb-share-action"
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
