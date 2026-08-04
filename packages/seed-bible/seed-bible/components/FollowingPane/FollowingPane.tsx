import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { Avatar } from "../Avatar/Avatar";
import { getUserAnimalVisual } from "../../managers/SessionsManager";
import type {
  FollowedUser,
  FollowsManager,
} from "../../managers/FollowsManager";
import type { LoginManager } from "../../managers/LoginManager";
import { useI18n } from "../../i18n/I18nManager";
import "./FollowingPane.css";

/**
 * Builds the shareable link that lets someone follow the given account.
 * Mirrors the `?playlist=` locator links produced by `PlaylistManager`.
 */
export function getFollowUrl(userId: string, origin?: string): string {
  const base =
    origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/?follow=${encodeURIComponent(userId)}`;
}

function FollowRow(props: {
  user: FollowedUser;
  onUnfollow: (userId: string) => Promise<void>;
}) {
  const { t } = useI18n();
  const isRemoving = useSignal(false);

  const displayName =
    props.user.name?.trim() ||
    t("follow-unnamed-user", {
      id: props.user.userId.slice(0, 8),
      defaultValue: "User {{id}}",
    });

  return (
    <li className="sb-following-row">
      <Avatar
        imageUrl={props.user.pictureUrl ?? null}
        visual={getUserAnimalVisual(props.user.userId)}
        title={displayName}
      />
      <span className="sb-following-name">{displayName}</span>
      <button
        type="button"
        className="sb-following-unfollow"
        disabled={isRemoving.value}
        aria-label={t("unfollow-user", {
          name: displayName,
          defaultValue: "Unfollow {{name}}",
        })}
        onClick={() => {
          isRemoving.value = true;
          void props.onUnfollow(props.user.userId).finally(() => {
            isRemoving.value = false;
          });
        }}
      >
        {t("unfollow", { defaultValue: "Unfollow" })}
      </button>
    </li>
  );
}

export function FollowingPane(props: {
  follows: FollowsManager;
  login: LoginManager;
}) {
  const { t } = useI18n();
  const copied = useSignal(false);

  // Profile snapshots stored alongside each follow go stale as people rename
  // themselves or change their picture. Refresh once when the pane opens —
  // this is the only surface that shows the whole list at once.
  useEffect(() => {
    void props.follows.refreshProfiles();
  }, []);

  const userId = props.login.userId.value;
  const following = props.follows.following.value;

  const copyMyLink = async () => {
    if (!userId) {
      return;
    }
    try {
      await navigator.clipboard.writeText(getFollowUrl(userId));
      copied.value = true;
      setTimeout(() => {
        copied.value = false;
      }, 2000);
    } catch (err) {
      console.error("Failed to copy the follow link:", err);
    }
  };

  return (
    <div className="sb-following-pane">
      {userId && (
        <div className="sb-following-share">
          <p className="sb-following-share-text">
            {t("following-share-description", {
              defaultValue:
                "Share this link so other people can follow you and see your highlights, playlists, and reading activity.",
            })}
          </p>
          <button
            type="button"
            className="sb-following-share-button"
            onClick={() => void copyMyLink()}
          >
            {copied.value
              ? t("copied", { defaultValue: "Copied" })
              : t("following-copy-my-link", {
                  defaultValue: "Copy my follow link",
                })}
          </button>
        </div>
      )}

      {!userId ? (
        <p className="sb-following-empty">
          {t("following-signed-out", {
            defaultValue: "Sign in to follow other people.",
          })}
        </p>
      ) : props.follows.isLoading.value && following.length === 0 ? (
        <p className="sb-following-empty">
          {t("loading", { defaultValue: "Loading…" })}
        </p>
      ) : following.length === 0 ? (
        <p className="sb-following-empty">
          {t("following-empty", {
            defaultValue:
              "You aren't following anyone yet. Open someone's follow link, or follow people you're reading with in a shared session.",
          })}
        </p>
      ) : (
        <ul className="sb-following-list">
          {following.map((user) => (
            <FollowRow
              key={user.userId}
              user={user}
              onUnfollow={props.follows.unfollow}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
