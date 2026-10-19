import "./PlaylistPartyPanel.css";
import { useI18n } from "../../i18n/I18nManager";
import type {
  BibleReadingSession,
  ConnectedSessionUser,
  ParticipantReadingPosition,
} from "../../managers/SessionsManager";
import type { PlayingState } from "../../managers/PlaylistManager";
import {
  getUserDisplayName,
  getUserSessionRole,
  SessionUserAvatar,
} from "../Avatar/Avatar";
import { MaterialIcon } from "../icons";
import { playlistItemLabel } from "../playlistItemLabel";

/**
 * The group's state while a playlist plays in a shared session: who has
 * said they're ready to move on from the step, where the rest are, and the
 * answers participants shared to the step's question. The leader moves
 * everyone on (and the chat hears about it); everyone else says when
 * they're ready. `compact` is the phone's sheet: one line and the buttons.
 */
export function PlaylistPartyPanel(props: {
  session: BibleReadingSession;
  playing: PlayingState;
  /** Whether this client leads the session (host or co-host). */
  isLeader: boolean;
  resolveBookName: (bookId: string) => string;
  compact?: boolean;
  /** Opens the session's chat, offered beside the buttons when compact. */
  onOpenChat?: () => void;
}) {
  const { session, playing, isLeader, resolveBookName, compact, onOpenChat } =
    props;
  const { t } = useI18n();
  const options = session.options.value;
  const users = session.connectedUsers.value;
  const step = playing.currentIndex.value;
  const total = playing.queue.value.length;
  const currentItem = playing.currentItem.value;
  const readiness = session.playlistReadiness.value;
  const positions = session.participantPositions.value;
  const self = session.currentUser.value;
  const host = users.find(
    (user) => getUserSessionRole(options, user) === "host"
  );
  const hostName = host
    ? getUserDisplayName(host)
    : t("party-the-leader", { defaultValue: "The leader" });

  const isReady = (user: ConnectedSessionUser) =>
    readiness.get(user.connectionId)?.step === step;
  const readyCount = users.filter(isReady).length;
  const selfReady = !!self && isReady(self);
  const nextStep = step + 2;
  const hasNext = step < total - 1;

  const positionLabel = (position: ParticipantReadingPosition | undefined) => {
    if (!position) {
      return t("party-reading", { defaultValue: "reading" });
    }
    const passage =
      position.firstVerse != null
        ? `${resolveBookName(position.bookId)} ${position.chapterNumber}:${position.firstVerse}`
        : `${resolveBookName(position.bookId)} ${position.chapterNumber}`;
    return t("party-still-reading", {
      defaultValue: "still reading {{passage}}",
      passage,
    });
  };

  const answers =
    currentItem?.type === "question"
      ? session.questionAnswers.value.filter(
          (answer) => answer.prompt === currentItem.prompt
        )
      : [];

  // The chat hears the group being moved on, by whoever leads.
  const moveEveryone = async () => {
    const target = playing.queue.peek()[step + 1] ?? null;
    await playing.next();
    const chat = playing.tab?.sharedChat;
    if (!chat || !target) {
      return;
    }
    const name =
      self?.profile?.name ??
      t("party-the-leader", { defaultValue: "The leader" });
    void chat.sendMessage({
      type: "text",
      text: t("party-moved-everyone", {
        defaultValue: "{{name}} moved everyone to step {{step}} · {{title}}",
        name,
        step: nextStep,
        title: playlistItemLabel(target, t, resolveBookName),
      }),
      event: { kind: "moved" },
    });
  };

  const moveButton = (
    <button
      type="button"
      className="sb-party-move"
      disabled={!playing.canPressNext.value}
      onClick={() => void moveEveryone()}
    >
      {hasNext
        ? t("party-move-everyone", {
            defaultValue: "Move everyone to step {{step}}",
            step: nextStep,
          })
        : t("party-finish-together", {
            defaultValue: "Finish the playlist",
          })}
      <MaterialIcon>arrow_forward</MaterialIcon>
    </button>
  );
  const readyButton = (
    <button
      type="button"
      className={`sb-party-ready-toggle${
        selfReady ? " sb-party-ready-toggle--ready" : ""
      }`}
      aria-pressed={selfReady}
      onClick={() => session.setPlaylistReady(selfReady ? null : step)}
    >
      <MaterialIcon>check</MaterialIcon>
      {selfReady
        ? t("party-ready-taken-back", { defaultValue: "Not ready yet" })
        : t("party-im-ready", { defaultValue: "I'm ready" })}
    </button>
  );
  const chatButton = onOpenChat ? (
    <button type="button" className="sb-party-chat" onClick={onOpenChat}>
      {t("chat", { defaultValue: "Chat" })}
    </button>
  ) : null;

  if (compact) {
    return (
      <section
        className="sb-party sb-party--compact"
        aria-label={t("party-live", { defaultValue: "Live" })}
        dir="auto"
      >
        <p className="sb-party-compact-line">
          <span>
            {isLeader
              ? t("party-compact-leading", {
                  defaultValue: "Everyone follows you",
                })
              : t("party-compact-following", {
                  defaultValue:
                    "{{host}} moves the group on when everyone's ready",
                  host: hostName,
                })}
          </span>
          <span className="sb-party-ready-count">
            {t("party-ready-count-of", {
              defaultValue: "{{ready}} of {{total}} ready",
              ready: readyCount,
              total: users.length,
            })}
          </span>
        </p>
        <div className="sb-party-actions">
          {chatButton}
          {isLeader ? moveButton : readyButton}
        </div>
      </section>
    );
  }

  return (
    <section
      className="sb-party"
      aria-label={t("party-live", { defaultValue: "Live" })}
      dir="auto"
    >
      <div className="sb-party-ready">
        <div className="sb-party-ready-head">
          <span>
            {t("party-ready-heading", {
              defaultValue: "Ready for the next step",
            })}
          </span>
          <span className="sb-party-ready-count">
            {t("party-ready-count", {
              defaultValue: "{{ready}} of {{total}}",
              ready: readyCount,
              total: users.length,
            })}
          </span>
        </div>
        <ul className="sb-party-people">
          {users.map((user) => {
            const ready = isReady(user);
            return (
              <li
                key={user.connectionId}
                className={`sb-party-person${ready ? " sb-party-person--ready" : ""}`}
              >
                <SessionUserAvatar
                  user={user}
                  role={getUserSessionRole(options, user)}
                />
                <span className="sb-party-person-name">
                  {getUserDisplayName(user)}
                </span>
                <span className="sb-party-person-state">
                  {ready ? (
                    <MaterialIcon
                      aria-label={t("party-ready", { defaultValue: "ready" })}
                    >
                      check
                    </MaterialIcon>
                  ) : (
                    positionLabel(positions.get(user.connectionId))
                  )}
                </span>
              </li>
            );
          })}
        </ul>
        <div className="sb-party-actions">
          {isLeader ? (
            <>
              <button
                type="button"
                className="sb-party-back"
                disabled={!playing.hasPrevious.value}
                aria-label={t("party-move-back", {
                  defaultValue: "Move everyone back a step",
                })}
                onClick={() => void playing.previous()}
              >
                <MaterialIcon>arrow_back</MaterialIcon>
              </button>
              {moveButton}
            </>
          ) : (
            readyButton
          )}
        </div>
      </div>

      {currentItem?.type === "question" ? (
        <div className="sb-party-answers">
          <div className="sb-party-ready-head">
            <span>
              {t("party-group-answers", { defaultValue: "Group answers" })}
            </span>
            <span className="sb-party-ready-count">
              {t("party-answers-shared", {
                defaultValue: "{{count}} shared",
                count: answers.length,
              })}
            </span>
          </div>
          {answers.length === 0 ? (
            <p className="sb-party-empty">
              {t("party-no-answers", {
                defaultValue: "No answers shared yet.",
              })}
            </p>
          ) : (
            <ul className="sb-party-answer-list">
              {answers.map((answer) => (
                <li
                  key={`${answer.connectionId}|${answer.atMs}`}
                  className="sb-party-answer"
                >
                  <span className="sb-party-answer-name">
                    {answer.name ??
                      users.find((u) => u.connectionId === answer.connectionId)
                        ?.profile?.name ??
                      t("party-someone", { defaultValue: "Someone" })}
                  </span>
                  <span className="sb-party-answer-text">{answer.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      <p className="sb-party-foot">
        {isLeader
          ? t("party-foot-leading", {
              defaultValue: "Everyone in the session follows your steps",
            })
          : t("party-foot-following", {
              defaultValue: "Following {{host}} · step {{step}} of {{total}}",
              host: hostName,
              step: step + 1,
              total,
            })}
      </p>
    </section>
  );
}
