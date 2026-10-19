import { useI18n } from "../../i18n/I18nManager";
import type { ModalManager } from "../../managers/ModalManager";
import type { PlaylistItemPreviewOptions } from "../playlistItemPreview";
import { QuestionStepContent } from "./PlaylistStepContent";

const STEP_QUESTION_MODAL_ID = "playlist-step-question";

/**
 * The question an author attached to a passage, as the player shows it
 * beside the note: the prompt and a way to answer it.
 */
export function StepQuestion(props: { prompt: string; onAnswer: () => void }) {
  const { t } = useI18n();
  return (
    <div className="sb-step-question-card" dir="auto">
      <p className="sb-step-question-card-eyebrow">
        {t("playlist-question-for-readers", {
          defaultValue: "Question for readers",
        })}
      </p>
      <p className="sb-step-question-card-prompt">{props.prompt}</p>
      <button
        type="button"
        className="sb-step-question-card-answer"
        onClick={props.onAnswer}
      >
        {t("playlist-question-answer", { defaultValue: "Answer" })}
      </button>
    </div>
  );
}

/**
 * Opens the answer box for a passage's question in the app's modal, with
 * the reader's earlier answer and the means to save a new one, as a
 * question step gets.
 */
export function openStepQuestion(
  modals: ModalManager,
  question: { prompt: string; shareable?: boolean },
  options: PlaylistItemPreviewOptions,
  t: ReturnType<typeof useI18n>["t"]
) {
  modals.openModal({
    id: STEP_QUESTION_MODAL_ID,
    title: t("playlist-question-for-readers", {
      defaultValue: "Question for readers",
    }),
    content: () => (
      <QuestionStepContent
        item={{
          type: "question",
          prompt: question.prompt,
          shareable: question.shareable,
        }}
        authorName={options.authorName}
        initialResponse={options.questionResponse}
        inSession={options.inSession}
        onSave={options.onSaveQuestionResponse}
      />
    ),
  });
}
