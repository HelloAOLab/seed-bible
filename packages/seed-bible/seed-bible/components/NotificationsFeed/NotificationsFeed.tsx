import "./NotificationsFeed.css";
import { useEffect } from "preact/hooks";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import {
  describeNotification,
  type AppNotification,
  type AppUpdateNotification,
  type FriendRequestNotification,
  type NotificationItem,
} from "../../managers/NotificationsManager";
import { useI18n } from "../../i18n/I18nManager";
import { MaterialIcon } from "../icons";
import { FriendRequestActions } from "../FriendsPane/FriendsPane";
import { PersonButton } from "../FriendsPane/PersonCard";
import { formatFeedTime } from "../TodayPane/SocialSection";
import { PushNotificationsCard } from "./PushNotificationsCard";

export const NOTIFICATIONS_MODAL_ID = "notifications";

/**
 * The notifications list, opened from the bell on Today and shown in a modal
 * (see docs/notifications.md). Newest first; what was unread when it opened
 * stays marked as new until it's closed.
 */
export function NotificationsFeed(props: { state: SeedBibleState }) {
  const { state } = props;
  const { notifications, login, modals } = state;
  const { t } = useI18n();

  // The modal host doesn't close modals on Escape, so the list does it for
  // itself — but only while it's on top, so Escape over a profile opened from
  // it doesn't close the list underneath.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === "Escape" &&
        modals.modals.peek().at(-1)?.id === NOTIFICATIONS_MODAL_ID
      ) {
        notifications.closeFeed();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const items = notifications.items.value;

  return (
    <div className="sb-notifications-feed">
      <PushNotificationsCard push={state.pushNotifications} />
      {items.length > 1 ? (
        <div className="sb-notifications-feed-actions">
          <button
            type="button"
            className="sb-notifications-text-button"
            onClick={() => notifications.dismissAll()}
          >
            {t("notifications-dismiss-all", { defaultValue: "Dismiss all" })}
          </button>
        </div>
      ) : null}
      {items.length > 0 ? (
        <ul className="sb-notifications-list">
          {items.map((item) => (
            <NotificationRow
              key={item.notification.id}
              item={item}
              state={state}
            />
          ))}
        </ul>
      ) : (
        <p className="sb-notifications-empty">
          <MaterialIcon aria-hidden="true">notifications</MaterialIcon>
          {t("notifications-empty", { defaultValue: "You're all caught up." })}
        </p>
      )}
      {login.userId.value ? null : (
        <div className="sb-notifications-sign-in">
          <p>
            {t("notifications-signed-out", {
              defaultValue: "Sign in to see friend requests here.",
            })}
          </p>
          <button
            type="button"
            className="sb-friends-button sb-friends-button--primary"
            onClick={() => void login.login()}
          >
            {t("log-in", { defaultValue: "Log in" })}
          </button>
        </div>
      )}
    </div>
  );
}

function NotificationRow(props: {
  item: NotificationItem;
  state: SeedBibleState;
}) {
  const { item, state } = props;
  const { notification, isUnread } = item;
  const { t } = useI18n();

  return (
    <li
      className={
        isUnread
          ? "sb-notifications-row sb-notifications-row--unread"
          : "sb-notifications-row"
      }
    >
      {/* The dot that marks it is decoration; this says it out loud. */}
      {isUnread ? (
        <span className="sr-only">
          {t("notification-new", { defaultValue: "New" })}
        </span>
      ) : null}
      <div className="sb-notifications-row-body">
        <NotificationBody notification={notification} state={state} />
      </div>
      <button
        type="button"
        className="sb-notifications-dismiss"
        aria-label={t("dismiss-notification", {
          notification: describeNotification(notification, t),
          defaultValue: "Dismiss notification: {{notification}}",
        })}
        title={t("dismiss", { defaultValue: "Dismiss" })}
        onClick={() => state.notifications.dismiss(notification.id)}
      >
        <MaterialIcon aria-hidden="true">close</MaterialIcon>
      </button>
    </li>
  );
}

function NotificationBody(props: {
  notification: AppNotification;
  state: SeedBibleState;
}) {
  const { notification, state } = props;
  switch (notification.kind) {
    case "friendRequest":
      return <FriendRequestBody notification={notification} state={state} />;
    case "appUpdate":
      return <AppUpdateBody notification={notification} />;
  }
}

/** When it happened, the way the Community feed on Today says it. */
function NotificationTime(props: { timeMs: number; className?: string }) {
  const { t, language } = useI18n();
  return (
    <time
      className={props.className}
      dateTime={new Date(props.timeMs).toISOString()}
    >
      {formatFeedTime(props.timeMs, language, t, Date.now())}
    </time>
  );
}

function FriendRequestBody(props: {
  notification: FriendRequestNotification;
  state: SeedBibleState;
}) {
  const { notification, state } = props;
  const { t } = useI18n();
  return (
    <>
      <PersonButton
        deps={state}
        person={notification.request}
        subtitle={
          <>
            {t("notification-friend-request-subtitle", {
              defaultValue: "Sent you a friend request",
            })}
            {" · "}
            <NotificationTime timeMs={notification.createdAtMs} />
          </>
        }
      />
      <FriendRequestActions
        request={notification.request}
        friends={state.friends}
        toast={state.app.toast}
      />
    </>
  );
}

function AppUpdateBody(props: { notification: AppUpdateNotification }) {
  const { notification } = props;
  const { t } = useI18n();
  return (
    <>
      <span className="sb-notifications-summary">
        <MaterialIcon className="sb-notifications-icon" aria-hidden="true">
          new_releases
        </MaterialIcon>
        <span className="sb-notifications-text">
          <span className="sb-notifications-title">
            {describeNotification(notification, t)}
          </span>
          <NotificationTime
            className="sb-notifications-time"
            timeMs={notification.createdAtMs}
          />
        </span>
      </span>
      <span className="sb-friends-row-actions">
        <a
          className="sb-friends-button sb-notifications-link"
          href={notification.releaseNotesUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("notification-see-whats-new", { defaultValue: "See what's new" })}
          <MaterialIcon aria-hidden="true">open_in_new</MaterialIcon>
        </a>
      </span>
    </>
  );
}
