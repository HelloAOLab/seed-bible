import "./FriendPlaylistsSection.css";
import { useI18n } from "../../i18n/I18nManager";
import type { Playlist, PlaylistManager } from "../../managers/PlaylistManager";
import type { ModalManager } from "../../managers/ModalManager";
import type { Friend, FriendsManager } from "../../managers/FriendsManager";
import { getUserAnimalVisual } from "../../managers/SessionsManager";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import { displayNameOf } from "../../managers/Utils";
import { Avatar } from "../Avatar/Avatar";
import { DiscoverSection } from "./DiscoverSection";
import { PlaylistRow } from "./PlaylistRow";

export interface FriendPlaylistGroupData {
  friend: Friend;
  playlists: Playlist[];
}

/**
 * Each friend with at least one playlist, alongside those playlists. Reading
 * each friend's view here (rather than only `friendIds`) subscribes the
 * caller's render to their playlists arriving.
 */
export function friendPlaylistGroups(
  friends: FriendsManager,
  playlists: PlaylistManager
): FriendPlaylistGroupData[] {
  return friends.friends.value
    .map((friend) => ({
      friend,
      playlists: playlists.getUserPlaylists(friend.userId).value,
    }))
    .filter((group) => group.playlists.length > 0);
}

/**
 * Friends' playlists, sectioned per friend (name + avatar header) rather than
 * merged into `PlaylistSection`'s own list — these rows can only ever be
 * someone else's playlist, so there's no "own vs. friend's" ambiguity to guard
 * against the way `AnnotationGroupSection` has to for merged annotations.
 * Renders nothing when no friend has any playlists, since (unlike "My
 * Playlists") there's no create-one call-to-action to fall back on for an
 * empty state.
 */
export function FriendPlaylistsSection(props: {
  friends: FriendsManager;
  playlists: PlaylistManager;
  modals: ModalManager;
  toast: SeedBibleState["app"]["toast"];
}) {
  const { friends, playlists, modals, toast } = props;
  const { t } = useI18n();

  const groups = friendPlaylistGroups(friends, playlists);

  if (groups.length === 0) {
    return null;
  }

  return (
    <DiscoverSection
      title={t("friends-playlists", {
        defaultValue: "Playlists from your friends",
      })}
    >
      <ul className="sb-friend-playlists-groups">
        {groups.map((group) => (
          <FriendPlaylistGroup
            key={group.friend.userId}
            friend={group.friend}
            playlists={group.playlists}
            playlistsManager={playlists}
            modals={modals}
            toast={toast}
          />
        ))}
      </ul>
    </DiscoverSection>
  );
}

/** One friend's playlists: an avatar/name header plus its rows. */
function FriendPlaylistGroup(props: {
  friend: Friend;
  playlists: Playlist[];
  playlistsManager: PlaylistManager;
  modals: ModalManager;
  toast: SeedBibleState["app"]["toast"];
}) {
  const { friend, playlists, playlistsManager, modals, toast } = props;
  const { t } = useI18n();

  const displayName = displayNameOf(friend, t);

  return (
    <li className="sb-friend-playlists-group">
      <div className="sb-friend-playlists-group-header">
        <Avatar
          imageUrl={friend.pictureUrl}
          visual={getUserAnimalVisual(friend.userId)}
          title={displayName}
        />
        <span className="sb-friend-playlists-group-name">{displayName}</span>
      </div>
      <ul className="sb-discover-list">
        {playlists.map((playlist) => (
          <PlaylistRow
            key={playlist.id}
            playlist={playlist}
            playlists={playlistsManager}
            modals={modals}
            toast={toast}
            readOnly
          />
        ))}
      </ul>
    </li>
  );
}
