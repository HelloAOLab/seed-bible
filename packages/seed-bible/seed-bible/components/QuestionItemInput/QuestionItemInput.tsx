import "./QuestionItemInput.css";
import { useImperativeHandle, useState } from "preact/hooks";
import { forwardRef } from "preact/compat";
import { useI18n } from "../../i18n/I18nManager";
import type { PlaylistItemData } from "../../managers/PlaylistManager";

interface QuestionItemInputProps {
  onAdd: (item: PlaylistItemData) => void;
  /** The question the fields start with, e.g. when editing an item. */
  initialItem?: {
    title?: string;
    prompt: string;
    answer?: string;
    shareable?: boolean;
  };
  /** Overrides the submit button label (defaults to "Add item"). */
  submitLabel?: string;
}

/** Imperative handle so a parent can check for / commit an in-progress draft. */
export interface QuestionItemInputHandle {
  /**
   * Whether the question differs from what the fields started with: an
   * un-added draft when adding, unsaved changes when editing.
   */
  isDirty: () => boolean;
  /** Submits the current input, same as clicking "Add". Returns whether it
   * actually added an item (false when there is no prompt). */
  commit: () => boolean;
}

/**
 * Adds a question step: something readers are asked to respond to as the
 * playlist plays. A title is optional; the prompt is the question itself.
 * The author's own answer is optional too: a question without one is for a
 * group to discuss, one with it lets a reader alone compare their answer.
 * Readers in a group session can share their answers when the author allows.
 */
export const QuestionItemInput = forwardRef<
  QuestionItemInputHandle,
  QuestionItemInputProps
>(function QuestionItemInput(props, ref) {
  const { onAdd, initialItem, submitLabel } = props;
  const { t } = useI18n();
  const [title, setTitle] = useState(initialItem?.title ?? "");
  const [prompt, setPrompt] = useState(initialItem?.prompt ?? "");
  const [answer, setAnswer] = useState(initialItem?.answer ?? "");
  const [shareable, setShareable] = useState(initialItem?.shareable ?? true);

  const handleAdd = (): boolean => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      return false;
    }
    const trimmedTitle = title.trim();
    const trimmedAnswer = answer.trim();
    onAdd({
      type: "question",
      prompt: trimmedPrompt,
      title: trimmedTitle || undefined,
      ...(trimmedAnswer ? { answer: trimmedAnswer } : {}),
      shareable,
    });
    setTitle("");
    setPrompt("");
    setAnswer("");
    setShareable(true);
    return true;
  };

  useImperativeHandle(
    ref,
    () => ({
      isDirty: () =>
        title.trim() !== (initialItem?.title ?? "").trim() ||
        prompt.trim() !== (initialItem?.prompt ?? "").trim() ||
        answer.trim() !== (initialItem?.answer ?? "").trim() ||
        shareable !== (initialItem?.shareable ?? true),
      commit: handleAdd,
    }),
    [title, prompt, answer, shareable, initialItem]
  );

  return (
    <>
      <input
        className="sb-settings-text-input sb-playlist-input sb-playlist-add-title-input"
        type="text"
        value={title}
        dir="auto"
        placeholder={t("playlist-item-title-placeholder", {
          defaultValue: "Title (optional)",
        })}
        onInput={(event: Event) => {
          setTitle((event.currentTarget as HTMLInputElement).value);
        }}
      />
      <div className="sb-playlist-add-row sb-playlist-add-text-row">
        <textarea
          className="sb-settings-text-input sb-playlist-input sb-question-prompt-input"
          rows={3}
          value={prompt}
          dir="auto"
          placeholder={t("playlist-question-placeholder", {
            defaultValue: "What do you want readers to think about?",
          })}
          aria-label={t("playlist-question-label", {
            defaultValue: "Question for readers",
          })}
          onInput={(event: Event) => {
            setPrompt((event.currentTarget as HTMLTextAreaElement).value);
          }}
        />
        <textarea
          className="sb-settings-text-input sb-playlist-input sb-question-answer-input"
          rows={2}
          value={answer}
          dir="auto"
          placeholder={t("playlist-question-answer-placeholder", {
            defaultValue:
              "Your answer (optional). Readers on their own can show it after answering.",
          })}
          aria-label={t("playlist-question-answer-label", {
            defaultValue: "Your answer (optional)",
          })}
          onInput={(event: Event) => {
            setAnswer((event.currentTarget as HTMLTextAreaElement).value);
          }}
        />
        <label className="sb-playlist-embed-toggle sb-question-shareable">
          <input
            type="checkbox"
            checked={shareable}
            onChange={(event: Event) => {
              setShareable((event.currentTarget as HTMLInputElement).checked);
            }}
          />
          <span>
            {t("playlist-question-shareable", {
              defaultValue: "Readers can share answers in group sessions",
            })}
          </span>
        </label>
        <button
          type="button"
          className="sb-settings-save-button"
          onClick={handleAdd}
          disabled={!prompt.trim()}
        >
          {submitLabel ??
            t("playlist-add-button", { defaultValue: "Add item" })}
        </button>
      </div>
    </>
  );
});
