import { useI18n } from "../../i18n";
import type { NotificationsManager } from "../../managers/NotificationsManager";

/** Larger counts show as "99+", so the badge never grows wider than the bell. */
const MAX_BADGE_COUNT = 99;

/**
 * The bell on Today. Opens the notifications list; its badge counts what's
 * arrived since the list was last opened.
 */
export function NotificationsButton(props: {
  notifications: NotificationsManager;
}) {
  const { t } = useI18n();
  const count = props.notifications.unreadCount.value;
  const title = t("notifications", { defaultValue: "Notifications" });
  return (
    <button
      type="button"
      className="sb-today-notifications-button"
      onClick={() => props.notifications.openFeed()}
      aria-label={
        count > 0
          ? t("notifications-unread", {
              count,
              defaultValue_one: "Notifications, {{count}} unread",
              defaultValue_other: "Notifications, {{count}} unread",
            })
          : title
      }
      title={title}
    >
      <span className="material-symbols-outlined" aria-hidden="true">
        notifications
      </span>
      {count > 0 ? (
        // The label already says how many, so the badge isn't read out too.
        <span className="sb-today-notifications-badge" aria-hidden="true">
          {count > MAX_BADGE_COUNT ? `${MAX_BADGE_COUNT}+` : count}
        </span>
      ) : null}
    </button>
  );
}
