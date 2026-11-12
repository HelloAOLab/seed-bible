import "./FollowNote.css";
import type { BibleReadingSession } from "../../managers/SessionsManager";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import { useI18n } from "../../i18n/I18nManager";
import { Avatar, getUserDisplayName } from "../Avatar/Avatar";

/**
 * Sits above the reader tools and the chapter controls while this reader is
 * following someone. Clicking it asks whether to stop. After scrolling away,
 * the same spot offers to jump back.
 */
export function FollowNote(props: {
  state: SeedBibleState;
  session: BibleReadingSession | null;
}) {
  const { state, session } = props;
  const { t } = useI18n();
  const follow = session?.follow?.value ?? null;
  if (!session || !follow) {
    return null;
  }

  const user =
    session.connectedUsers.value.find(
      (item) => item.connectionId === follow.connectionId
    ) ?? null;
  if (!user) {
    return null;
  }

  const name = getUserDisplayName(user);
  const paused = follow.status === "paused";

  const stop = () => {
    const modalId = `stop-following-${session.id}`;
    state.modals.openModal({
      id: modalId,
      title: {
        key: "stop-following-title",
        defaultValue: "Stop following?",
      },
      content: () => (
        <div className="sb-follow-note-confirm">
          <p>
            {t("stop-following-body", {
              name,
              defaultValue: "You'll stop following {{name}}.",
            })}
          </p>
          <div className="sb-follow-note-confirm-actions">
            <button
              type="button"
              className="sb-follow-note-confirm-cancel"
              onClick={() => state.modals.closeModal(modalId)}
            >
              {t("cancel", { defaultValue: "Cancel" })}
            </button>
            <button
              type="button"
              className="sb-follow-note-confirm-stop"
              onClick={() => {
                session.stopFollowing();
                state.modals.closeModal(modalId);
              }}
            >
              {t("stop-following", { defaultValue: "Stop following" })}
            </button>
          </div>
        </div>
      ),
    });
  };

  return (
    <button
      type="button"
      className={`sb-follow-note${paused ? " sb-follow-note-paused" : ""}`}
      style={{ borderColor: user.visual.color }}
      onClick={() => {
        if (paused) {
          session.resumeFollowing();
          return;
        }
        stop();
      }}
    >
      <Avatar
        imageUrl={user.profile?.pictureUrl ?? null}
        visual={user.visual}
        title={name}
      />
      <span className="sb-follow-note-text">
        {paused
          ? t("stopped-following-resume", {
              name,
              defaultValue:
                "You've stopped following {{name}}. Click to resume",
            })
          : t("following-user", {
              name,
              defaultValue: "Following {{name}}",
            })}
      </span>
    </button>
  );
}
