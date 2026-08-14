import { useSignal } from "@preact/signals";
import { Avatar } from "../Avatar/Avatar";
import { getUserAnimalVisual } from "../../managers/SessionsManager";
import type { UserProfile } from "../../managers/LoginManager";
import { useI18n } from "../../i18n/I18nManager";
import "./FollowPrompt.css";

/**
 * Confirmation shown when a `?follow=<userId>` link is opened.
 *
 * Following from a link is never automatic: the link could come from anywhere,
 * and the user should see whose account they are about to follow before it is
 * written to their record.
 */
export function FollowPrompt(props: {
  userId: string;
  profile: UserProfile | null;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const isSaving = useSignal(false);
  const error = useSignal<string | null>(null);

  const displayName =
    props.profile?.name?.trim() ||
    t("follow-unnamed-user", {
      id: props.userId.slice(0, 8),
      defaultValue: "User {{id}}",
    });

  const confirm = async () => {
    if (isSaving.value) {
      return;
    }
    isSaving.value = true;
    error.value = null;
    try {
      await props.onConfirm();
    } catch (err) {
      console.error("Failed to follow user:", err);
      error.value = t("follow-failed", {
        defaultValue: "Couldn't follow this account. Please try again.",
      });
      isSaving.value = false;
    }
  };

  return (
    <div className="sb-follow-prompt">
      <div className="sb-follow-prompt-user">
        <Avatar
          imageUrl={props.profile?.pictureUrl ?? null}
          visual={getUserAnimalVisual(props.userId)}
          title={displayName}
        />
        <div className="sb-follow-prompt-details">
          <span className="sb-follow-prompt-name">{displayName}</span>
          {props.profile?.location && (
            <span className="sb-follow-prompt-location">
              {props.profile.location}
            </span>
          )}
        </div>
      </div>

      <p className="sb-follow-prompt-description">
        {t("follow-prompt-description", {
          name: displayName,
          defaultValue:
            "Following {{name}} lets you see their highlights, playlists, and reading activity. They aren't notified, and you can unfollow at any time.",
        })}
      </p>

      {error.value && (
        <p className="sb-follow-prompt-error" role="alert">
          {error.value}
        </p>
      )}

      <div className="sb-follow-prompt-actions">
        <button
          type="button"
          className="sb-follow-prompt-secondary"
          onClick={props.onCancel}
          disabled={isSaving.value}
        >
          {t("cancel", { defaultValue: "Cancel" })}
        </button>
        <button
          type="button"
          className="sb-follow-prompt-primary"
          onClick={() => void confirm()}
          disabled={isSaving.value}
        >
          {isSaving.value
            ? t("following-in-progress", { defaultValue: "Following…" })
            : t("follow", { defaultValue: "Follow" })}
        </button>
      </div>
    </div>
  );
}
