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

/**
 * The group's state while a playlist plays in a shared session: who's
 * leading, who has said they're ready to move on from the step, and the
 * answers participants shared to the step's question. The leader moves
 * everyone on; everyone else says when they're ready.
 */
export function PlaylistPartyPanel(props: {
  session: BibleReadingSession;
  playing: PlayingState;
  /** Whether this client leads the session (host or co-host). */
  isLeader: boolean;
  resolveBookName: (bookId: string) => string;
}) {
  const { session, playing, isLeader, resolveBookName } = props;
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

  return (
    <section
      className="sb-party"
      aria-label={t("party-live", { defaultValue: "Live" })}
      dir="auto"
    >
      <p className="sb-party-live">
        <span className="sb-party-live-dot" aria-hidden="true" />
        {isLeader
          ? t("party-live-leading", { defaultValue: "Live · You're leading" })
          : host
            ? t("party-live-following", {
                defaultValue: "Live · Following {{host}}",
                host: getUserDisplayName(host),
              })
            : t("party-live", { defaultValue: "Live" })}
      </p>

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
            <button
              type="button"
              className="sb-party-move"
              disabled={!playing.canPressNext.value}
              onClick={() => void playing.next()}
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
          ) : (
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
    </section>
  );
}
