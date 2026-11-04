import "./SessionGroupBar.css";
import type { BibleReadingSession } from "../../managers/SessionsManager";
import { useI18n } from "../../i18n/I18nManager";
import {
  Avatar,
  getUserDisplayName,
  getUserSessionRole,
  sessionRoleRank,
} from "../Avatar/Avatar";
import { MaterialIcon } from "../icons";

/** How many of the people leading the group are shown beside the label. */
const MAX_LEADER_AVATARS = 2;

/**
 * Row along the top of the reader toolbar, shown to someone who may not move
 * the group and has wandered off to another chapter: says where the group is
 * and takes them back there. Renders nothing while they're with the group.
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
  const options = session.options.value;

  const leaders = session.connectedUsers.value
    .filter(
      (user) =>
        !user.isSelf &&
        (session.userCanNavigate(user.connectionId) ||
          (user.userId !== null && session.userCanNavigate(user.userId)))
    )
    .sort(
      (a, b) =>
        sessionRoleRank(getUserSessionRole(options, a)) -
        sessionRoleRank(getUserSessionRole(options, b))
    )
    .slice(0, MAX_LEADER_AVATARS);

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
      <button
        type="button"
        className="sb-session-group-bar-rejoin"
        aria-label={t("session-rejoin-group-label", {
          defaultValue: "Rejoin the group at {{passage}}",
          passage,
        })}
        onClick={() => {
          void session.rejoinGroup();
        }}
      >
        <MaterialIcon
          className="sb-session-group-bar-rejoin-icon rtl-mirror"
          aria-hidden="true"
        >
          undo
        </MaterialIcon>
        {t("session-rejoin-group", { defaultValue: "Rejoin" })}
      </button>
    </div>
  );
}
