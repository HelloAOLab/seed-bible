import { useI18n } from "../../i18n";
import type { NotificationsManager } from "../../managers/NotificationsManager";
import { MaterialIcon } from "../icons";
import { IconButton } from "../IconButton/IconButton";

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
  return (
    <IconButton
      className="sb-today-notifications-button"
      size="lg"
      look="tinted"
      onClick={() => props.notifications.openFeed()}
      label={
        count > 0
          ? t("notifications-unread", {
              count,
              defaultValue_one: "Notifications, {{count}} unread",
              defaultValue_other: "Notifications, {{count}} unread",
            })
          : t("notifications", { defaultValue: "Notifications" })
      }
      icon={
        <>
          <MaterialIcon>notifications</MaterialIcon>
          {count > 0 ? (
            <span className="sb-today-notifications-badge">
              {count > MAX_BADGE_COUNT ? `${MAX_BADGE_COUNT}+` : count}
            </span>
          ) : null}
        </>
      }
    />
  );
}
