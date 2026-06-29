import {
  type ConnectedSessionUser,
  type ConnectionSessionUserVisual,
} from "../managers/SessionsManager";

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

export function SessionUserAvatar({ user }: { user: ConnectedSessionUser }) {
  return (
    <Avatar
      imageUrl={user.profile?.pictureUrl ?? null}
      visual={user.visual}
      title={getUserDisplayName(user)}
      isSelf={user.isSelf}
    />
  );
}
