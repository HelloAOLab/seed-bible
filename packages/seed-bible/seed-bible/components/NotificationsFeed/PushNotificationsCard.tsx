import "./PushNotificationsCard.css";
import type { ComponentChildren } from "preact";
import { useI18n } from "../../i18n/I18nManager";
import type { PushNotificationsManager } from "../../managers/PushNotificationsManager";
import { BusyButton } from "../FriendsPane/FriendsPane";
import { MaterialIcon } from "../icons";

function Card(props: {
  icon: string;
  title: string;
  children: ComponentChildren;
  action?: ComponentChildren;
  error?: string | null;
}) {
  return (
    <div className="sb-push-card">
      <MaterialIcon className="sb-push-card-icon" aria-hidden="true">
        {props.icon}
      </MaterialIcon>
      <div className="sb-push-card-text">
        <p className="sb-push-card-title">{props.title}</p>
        {props.children}
        {props.error ? (
          <p className="sb-push-card-error" role="alert">
            {props.error}
          </p>
        ) : null}
      </div>
      {props.action ? (
        <div className="sb-push-card-action">{props.action}</div>
      ) : null}
    </div>
  );
}

/**
 * Offers push notifications on this device, at the top of the notifications
 * list, or explains why they can't be turned on here. Shows nothing where
 * there's nothing the person can do (a browser without push, push not set up
 * on the server, or signed out).
 */
export function PushNotificationsCard(props: {
  push: PushNotificationsManager;
}) {
  const { push } = props;
  const { t } = useI18n();
  const status = push.status.value;
  const error = push.error.value;
  const busy = push.isBusy.value;

  switch (status) {
    case "off":
      return (
        <Card
          icon="notifications_active"
          title={t("push-notifications-offer-title", {
            defaultValue: "Get notifications on this device",
          })}
          error={
            error === "dismissed"
              ? t("push-notifications-dismissed", {
                  defaultValue:
                    "Notifications weren't turned on. Tap Turn on to try again.",
                })
              : error
                ? t("push-notifications-enable-failed", {
                    defaultValue: "Couldn't turn on notifications. Try again.",
                  })
                : null
          }
          action={
            <BusyButton
              busy={busy}
              className="sb-friends-button sb-friends-button--primary"
              onClick={() => void push.enable()}
            >
              {t("push-notifications-turn-on", { defaultValue: "Turn on" })}
            </BusyButton>
          }
        >
          <p className="sb-push-card-body">
            {t("push-notifications-offer-body", {
              defaultValue:
                "Hear about friend requests straight away, even when Seed Bible is closed.",
            })}
          </p>
        </Card>
      );

    case "on":
      return (
        <Card
          icon="notifications_active"
          title={t("push-notifications-on-title", {
            defaultValue: "Notifications are on for this device",
          })}
          error={
            error
              ? t("push-notifications-disable-failed", {
                  defaultValue: "Couldn't turn off notifications. Try again.",
                })
              : null
          }
          action={
            <BusyButton
              busy={busy}
              className="sb-friends-button"
              onClick={() => void push.disable()}
            >
              {t("push-notifications-turn-off", { defaultValue: "Turn off" })}
            </BusyButton>
          }
        >
          <p className="sb-push-card-body">
            {t("push-notifications-on-body", {
              defaultValue:
                "Friend requests reach you here even when Seed Bible is closed.",
            })}
          </p>
        </Card>
      );

    case "needs-install":
      return (
        <Card
          icon="add_to_home_screen"
          title={t("push-notifications-offer-title", {
            defaultValue: "Get notifications on this device",
          })}
        >
          <p className="sb-push-card-body">
            {t("push-notifications-install-body", {
              defaultValue:
                "On iPhone and iPad, notifications work once Seed Bible is on your Home Screen.",
            })}
          </p>
          <p className="sb-push-card-body">
            {t("onboarding.iosStepsPre", { defaultValue: "Tap " })}
            <MaterialIcon
              className="sb-push-card-inline-icon"
              aria-hidden="true"
            >
              ios_share
            </MaterialIcon>
            <span className="sr-only">
              {t("push-notifications-share-button", { defaultValue: "Share" })}
            </span>
            {t("onboarding.iosStepsPost", {
              defaultValue:
                " in the toolbar, then choose “Add to Home Screen”.",
            })}{" "}
            {t("push-notifications-install-then", {
              defaultValue:
                "Then open Seed Bible from your Home Screen and turn notifications on here.",
            })}
          </p>
        </Card>
      );

    case "denied":
      return (
        <Card
          icon="notifications_off"
          title={t("push-notifications-blocked-title", {
            defaultValue: "Notifications are blocked",
          })}
        >
          <p className="sb-push-card-body">
            {t("push-notifications-blocked-body", {
              defaultValue:
                "To get them on this device, allow notifications for this site in your browser's settings.",
            })}
          </p>
        </Card>
      );

    case "unconfigured":
      // Only reached from "off" when CasualOS turned out not to send pushes,
      // so the tap gets an answer rather than the card just vanishing.
      return error === "unavailable" ? (
        <Card
          icon="notifications_off"
          title={t("push-notifications-offer-title", {
            defaultValue: "Get notifications on this device",
          })}
        >
          <p className="sb-push-card-body">
            {t("push-notifications-unavailable", {
              defaultValue: "Notifications aren't available right now.",
            })}
          </p>
        </Card>
      ) : null;

    default:
      return null;
  }
}
