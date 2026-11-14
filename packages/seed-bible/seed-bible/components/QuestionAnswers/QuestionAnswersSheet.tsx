import "../ScriptureNote/ScriptureNote.css";
import "./QuestionAnswersSheet.css";
import { useState } from "preact/hooks";
import { useI18n } from "../../i18n/I18nManager";
import type { PlayingState } from "../../managers/PlaylistManager";
import {
  MAX_QUESTION_ANSWER_LENGTH,
  questionAnswerStepKey,
  type BibleReadingSession,
  type SessionQuestionAnswer,
} from "../../managers/SessionsManager";
import { Avatar } from "../Avatar/Avatar";
import { MaterialIcon } from "../icons";
import { Button } from "../Button/Button";

/** How many answerers' avatars the closed sheet shows. */
const MAX_BAR_AVATARS = 3;

/**
 * The playing question step's answers in a shared session, in a sheet that
 * rides on the chapter pill as a scripture step's note does. Closed, it says
 * how many have answered; open, it lists the answers with a box at its foot
 * for this participant's own, which sharing again replaces.
 */
export function QuestionAnswersSheet(props: {
  session: BibleReadingSession;
  playing: PlayingState;
  /** Desktop stacks it above the toolbar rather than on the chapter pill. */
  docked?: boolean;
}) {
  const { session, playing } = props;
  const item = playing.currentItem.value;
  if (item?.type !== "html" || !item.question) {
    return null;
  }
  const stepKey = questionAnswerStepKey(
    playing.playlists.value[0]?.id,
    playing.currentIndex.value
  );
  return (
    <QuestionAnswersSheetBody
      key={stepKey}
      session={session}
      stepKey={stepKey}
      docked={props.docked ?? false}
    />
  );
}

function QuestionAnswersSheetBody(props: {
  session: BibleReadingSession;
  stepKey: string;
  docked: boolean;
}) {
  const { session, stepKey, docked } = props;
  const { t, isRtl } = useI18n();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const selfId = session.localSessionId.value;
  const answers = session.questionAnswers.value.filter(
    (answer) => answer.stepKey === stepKey
  );
  const mine = answers.find((answer) => answer.authorId === selfId) ?? null;

  const share = () => {
    if (!draft.trim()) {
      return;
    }
    session.setQuestionAnswer(stepKey, draft);
    setDraft("");
  };

  return (
    <section
      dir={isRtl ? "rtl" : "ltr"}
      className={`sb-scripture-note-sheet sb-question-answers${
        open ? "" : " sb-scripture-note-sheet--collapsed"
      }${docked ? " sb-question-answers--docked" : ""}`}
      aria-label={t("question-answers-aria", {
        defaultValue: "Answers to this question",
      })}
    >
      <div className="sb-scripture-note-sheet-bar">
        <button
          type="button"
          className="sb-scripture-note-sheet-header"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <MaterialIcon className="sb-scripture-note-sheet-icon">
            forum
          </MaterialIcon>
          <span className="sb-question-answers-count">
            {answers.length > 0
              ? t("question-answers-count", {
                  count: answers.length,
                  defaultValue: "{{count}} answers",
                })
              : t("question-answers-none", { defaultValue: "Answers" })}
          </span>
          {answers.length > 0 ? (
            <span className="sb-question-answers-avatars" aria-hidden="true">
              {answers.slice(-MAX_BAR_AVATARS).map((answer) => (
                <AnswerAvatar key={answer.authorId} answer={answer} />
              ))}
            </span>
          ) : null}
          {!mine ? (
            <span className="sb-question-answers-add">
              {t("question-answers-add", { defaultValue: "Add yours" })}
            </span>
          ) : null}
          <MaterialIcon className="sb-scripture-note-sheet-chevron">
            {open ? "expand_more" : "expand_less"}
          </MaterialIcon>
        </button>
      </div>
      {open ? (
        <>
          <div className="sb-scripture-note-body sb-question-answers-list">
            {answers.length === 0 ? (
              <p className="sb-question-answers-empty">
                {t("question-answers-empty", {
                  defaultValue: "No one has answered yet. Be the first.",
                })}
              </p>
            ) : (
              <ul>
                {answers.map((answer) => {
                  const isSelf = answer.authorId === selfId;
                  return (
                    <li key={answer.authorId} className="sb-question-answer">
                      <AnswerAvatar answer={answer} />
                      <div className="sb-question-answer-main">
                        <div className="sb-question-answer-head">
                          <span className="sb-question-answer-name">
                            {isSelf
                              ? t("you", { defaultValue: "You" })
                              : answer.name}
                          </span>
                          {isSelf ? (
                            <span className="sb-question-answer-actions">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDraft(answer.text)}
                              >
                                {t("question-answers-edit", {
                                  defaultValue: "Edit",
                                })}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                tone="danger"
                                onClick={() =>
                                  session.setQuestionAnswer(stepKey, "")
                                }
                              >
                                {t("question-answers-remove", {
                                  defaultValue: "Remove",
                                })}
                              </Button>
                            </span>
                          ) : null}
                        </div>
                        <p className="sb-question-answer-text" dir="auto">
                          {answer.text}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <form
            className="sb-question-answers-compose"
            onSubmit={(event) => {
              event.preventDefault();
              share();
            }}
          >
            <label
              className="sr-only"
              htmlFor={`sb-question-answer-${stepKey}`}
            >
              {t("question-answers-yours", { defaultValue: "Your answer" })}
            </label>
            <textarea
              id={`sb-question-answer-${stepKey}`}
              rows={2}
              dir="auto"
              maxLength={MAX_QUESTION_ANSWER_LENGTH}
              value={draft}
              placeholder={
                mine
                  ? t("question-answers-update-placeholder", {
                      defaultValue: "Change your answer…",
                    })
                  : t("question-answers-placeholder", {
                      defaultValue: "Write your answer…",
                    })
              }
              onInput={(event) => setDraft(event.currentTarget.value)}
            />
            <button
              type="submit"
              className="sb-question-answers-share"
              disabled={!draft.trim()}
              aria-label={t("question-answers-share", {
                defaultValue: "Share with group",
              })}
              title={t("question-answers-share", {
                defaultValue: "Share with group",
              })}
            >
              <MaterialIcon>
                {isRtl ? "arrow_back" : "arrow_forward"}
              </MaterialIcon>
            </button>
          </form>
        </>
      ) : null}
    </section>
  );
}

function AnswerAvatar(props: { answer: SessionQuestionAnswer }) {
  const { answer } = props;
  return (
    <Avatar
      imageUrl={answer.pictureUrl}
      visual={answer.visual}
      title={answer.name}
    />
  );
}
