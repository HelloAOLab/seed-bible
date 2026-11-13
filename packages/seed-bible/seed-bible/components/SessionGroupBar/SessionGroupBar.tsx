import "./SessionGroupBar.css";
import type { BibleReadingSession } from "../../managers/SessionsManager";
import { useI18n } from "../../i18n/I18nManager";
import { Avatar, getUserDisplayName, sortUsersByRole } from "../Avatar/Avatar";
import { MaterialIcon } from "../icons";
import { Button } from "../Button/Button";

/** How many of the people leading the group are shown beside the label. */
const MAX_LEADER_AVATARS = 2;

/**
 * Row along the top of the reader toolbar, shown to someone who may not move
 * the group and has wandered off to another chapter: says where the group is
 * and takes them back there. When a host has asked them to come back, it
 * grows into that request until they answer it. Renders nothing while they're
 * with the group.
 */
export function SessionGroupBar({
  session,
  resolveBookName,
  layout,
}: {
  session: BibleReadingSession;
  resolveBookName: (bookId: string | null | undefined) => string;
  layout: "mobile" | "desktop";
}) {
  const { t, isRtl } = useI18n();

  if (!session.isAwayFromGroup.value) {
    return null;
  }

  const group = session.groupPosition.value;
  const passage = `${resolveBookName(group.bookId)} ${group.chapterNumber}`;
  const leaders = sortUsersByRole(
    session.connectedUsers.value.filter(
      (user) =>
        !user.isSelf &&
        (session.userCanNavigate(user.connectionId) ||
          (user.userId !== null && session.userCanNavigate(user.userId)))
    ),
    session.options.value
  ).slice(0, MAX_LEADER_AVATARS);

  const rejoinIcon = <MaterialIcon className="rtl-mirror">undo</MaterialIcon>;

  const request = session.incomingComeBackRequest.value;
  if (request) {
    const sender = session.connectedUsers.value.find(
      (user) => user.connectionId === request.fromConnectionId
    );
    const senderName = sender
      ? getUserDisplayName(sender)
      : t("host", { defaultValue: "Host" });
    return (
      <div
        className={`sb-session-group-bar sb-session-group-bar-${layout} sb-session-group-bar-request`}
        dir={isRtl ? "rtl" : "ltr"}
        role="alert"
      >
        <span className="sb-session-group-bar-request-info">
          {sender && (
            <span
              className="sb-session-group-bar-leader sb-session-group-bar-sender"
              aria-hidden="true"
            >
              <Avatar
                imageUrl={sender.profile?.pictureUrl ?? null}
                visual={sender.visual}
                title={senderName}
              />
            </span>
          )}
          <span className="sb-session-group-bar-request-text">
            <span className="sb-session-group-bar-request-title">
              {t("session-asked-you-to-come-back", {
                defaultValue: "{{name}} asked you to come back",
                name: senderName,
              })}
            </span>
            <span className="sb-session-group-bar-request-subtitle">
              {t("session-group-is-reading", {
                defaultValue: "The group is reading {{passage}}",
                passage,
              })}
            </span>
          </span>
        </span>
        <span className="sb-session-group-bar-request-actions">
          <Button
            variant="secondary"
            size="lg"
            shape="pill"
            className="sb-session-group-bar-not-now"
            onClick={() => session.dismissComeBackRequest()}
          >
            {t("not-now", { defaultValue: "Not now" })}
          </Button>
          <Button
            variant="primary"
            size="lg"
            shape="pill"
            icon={rejoinIcon}
            className="sb-session-group-bar-rejoin"
            aria-label={t("session-rejoin-group-label", {
              defaultValue: "Rejoin the group at {{passage}}",
              passage,
            })}
            onClick={() => {
              void session.rejoinGroup();
            }}
          >
            {t("session-rejoin-the-group", { defaultValue: "Rejoin group" })}
          </Button>
        </span>
      </div>
    );
  }

  return (
    <div
      className={`sb-session-group-bar sb-session-group-bar-${layout}`}
      dir={isRtl ? "rtl" : "ltr"}
    >
      {leaders.length > 0 && (
        <span className="sb-session-group-bar-leaders" aria-hidden="true">
          {leaders.map((user) => (
            <span
              key={user.connectionId}
              className="sb-session-group-bar-leader"
            >
              <Avatar
                imageUrl={user.profile?.pictureUrl ?? null}
                visual={user.visual}
                title={getUserDisplayName(user)}
              />
            </span>
          ))}
        </span>
      )}
      <span className="sb-session-group-bar-label">
        {t("session-group-is-on", {
          defaultValue: "Group is on {{passage}}",
          passage,
        })}
      </span>
      <Button
        variant="secondary"
        shape="pill"
        icon={rejoinIcon}
        className="sb-session-group-bar-rejoin"
        aria-label={t("session-rejoin-group-label", {
          defaultValue: "Rejoin the group at {{passage}}",
          passage,
        })}
        onClick={() => {
          void session.rejoinGroup();
        }}
      >
        {t("session-rejoin-group", { defaultValue: "Rejoin" })}
      </Button>
    </div>
  );
}
