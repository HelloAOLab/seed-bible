import "./Avatar.css";
import {
  isSessionHost,
  type ConnectedSessionUser,
  type ConnectionSessionUserVisual,
  type SessionOptions,
} from "../../managers/SessionsManager";

/** Session leadership role for a connected user, shown as an avatar badge. */
export type SessionRole = "host" | "co-host";

export function getUserDisplayName(user: ConnectedSessionUser): string {
  return (
    user.profile?.name ??
    `User ${(user.userId ?? user.connectionId).slice(0, 8)}`
  );
}

/**
 * Leadership role of a connected user within a session, or null for a plain
 * participant. Shared by the sidebar tab avatar row, the collapsed-sidebar
 * presence dots, and the mobile reader participants stack so every surface
 * agrees on who's a host / co-host.
 */
export function getUserSessionRole(
  options: SessionOptions,
  user: ConnectedSessionUser
): SessionRole | null {
  if (
    options.hostUserId === user.userId ||
    options.hostUserId === user.connectionId
  ) {
    return "host";
  }
  if (
    isSessionHost(options, user.userId) ||
    isSessionHost(options, user.connectionId)
  ) {
    return "co-host";
  }
  return null;
}

/** Host first, then co-hosts, then everyone else. */
export function sessionRoleRank(role: SessionRole | null): number {
  return role === "host" ? 0 : role === "co-host" ? 1 : 2;
}

/** Material icon shown when there is no profile picture and nobody else to tell apart. */
export const GENERIC_AVATAR_ICON = "account_circle";

export function Avatar({
  imageUrl,
  visual,
  title,
  isSelf,
  genericFallback,
}: {
  imageUrl: string | null;
  visual: ConnectionSessionUserVisual;
  title: string;
  isSelf?: boolean;
  /**
   * When there is no profile picture, show a generic account icon instead of
   * the animal+color combo. Used when the current user is alone, so the
   * control reads as "account / sign in" rather than a random identity.
   */
  genericFallback?: boolean;
}) {
  const selfClass = isSelf ? " sb-tab-user-icon-self" : "";

  if (imageUrl) {
    return (
      <span
        className={`sb-tab-user-icon sb-tab-user-icon-has-image${selfClass}`}
        title={title}
        style={{
          borderColor: visual.color,
          backgroundImage: `url(${imageUrl})`,
        }}
      />
    );
  }

  if (genericFallback) {
    return (
      <span
        className={`sb-tab-user-icon sb-tab-user-icon-generic${selfClass}`}
        title={title}
      >
        <span className="material-symbols-outlined">{GENERIC_AVATAR_ICON}</span>
      </span>
    );
  }

  return (
    <span
      className={`sb-tab-user-icon sb-tab-user-icon-animal${selfClass}`}
      title={title}
      style={{
        borderColor: visual.color,
        backgroundColor: visual.color,
      }}
    >
      <span className="material-symbols-outlined">{visual.defaultIcon}</span>
    </span>
  );
}

export function SessionUserAvatar({
  user,
  role,
  roleLabel,
}: {
  user: ConnectedSessionUser;
  role?: SessionRole | null;
  roleLabel?: string;
}) {
  return (
    <span className="sb-tab-user">
      <Avatar
        imageUrl={user.profile?.pictureUrl ?? null}
        visual={user.visual}
        title={
          roleLabel
            ? `${getUserDisplayName(user)} · ${roleLabel}`
            : getUserDisplayName(user)
        }
        isSelf={user.isSelf}
      />
      {role && roleLabel && (
        <span
          className={`sb-tab-user-role sb-tab-user-role-${role === "co-host" ? "cohost" : "host"}`}
        >
          {roleLabel}
        </span>
      )}
    </span>
  );
}
