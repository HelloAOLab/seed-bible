import {
  type ConnectedSessionUser,
  type ConnectionSessionUserVisual,
} from "../managers/SessionsManager";

/** Session leadership role for a connected user, shown as an avatar badge. */
export type SessionRole = "host" | "co-host";

export function getUserDisplayName(user: ConnectedSessionUser): string {
  return (
    user.profile?.name ??
    `User ${(user.userId ?? user.connectionId).slice(0, 8)}`
  );
}

export function Avatar({
  imageUrl,
  visual,
  title,
  isSelf,
}: {
  imageUrl: string | null;
  visual: ConnectionSessionUserVisual;
  title: string;
  isSelf?: boolean;
}) {
  if (imageUrl) {
    return (
      <span
        className={`sb-tab-user-icon sb-tab-user-icon-has-image${isSelf ? " sb-tab-user-icon-self" : ""}`}
        title={title}
        style={{
          borderColor: visual.color,
          backgroundImage: `url(${imageUrl})`,
        }}
      />
    );
  }

  return (
    <span
      className={`sb-tab-user-icon sb-tab-user-icon-animal${isSelf ? " sb-tab-user-icon-self" : ""}`}
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
