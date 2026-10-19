import "./PlaylistStepContent.css";
import { useEffect, useState } from "preact/hooks";
import { useI18n } from "../../i18n/I18nManager";
import type {
  PlayingState,
  PlaylistItemData,
} from "../../managers/PlaylistManager";
import {
  ScripturePreview,
  compareRefItem,
  type ScriptureChapterLoader,
} from "../PlaylistItemInlinePreview/PlaylistItemInlinePreview";
import { verseRefLabel } from "../playlistItemLabel";

type QuestionItem = Extract<PlaylistItemData, { type: "question" }>;
type CompareItem = Extract<PlaylistItemData, { type: "compare" }>;

/** Who may see a reader's answer to a question step. */
export type QuestionResponseVisibility = "private" | "session";

/**
 * A question step as it plays: the author's question, a box for the reader's
 * answer, and, when the author allows and the reader is in a group session,
 * the choice to share it with the group. The answer is handed to `onSave`
 * when the reader saves it; `initialResponse` is what they wrote before.
 */
export function QuestionStepContent(props: {
  item: QuestionItem;
  authorName?: string | null;
  initialResponse?: { text: string; visibility: QuestionResponseVisibility };
  /** Whether the reader is in a group session the answer could be shared with. */
  inSession?: boolean;
  onSave?: (
    text: string,
    visibility: QuestionResponseVisibility
  ) => Promise<void> | void;
}) {
  const { item, authorName, initialResponse, inSession, onSave } = props;
  const { t } = useI18n();
  const [text, setText] = useState(initialResponse?.text ?? "");
  const [visibility, setVisibility] = useState<QuestionResponseVisibility>(
    initialResponse?.visibility ?? "private"
  );
  const [saved, setSaved] = useState<"saving" | "saved" | "failed" | null>(
    null
  );

  useEffect(() => {
    setText(initialResponse?.text ?? "");
    setVisibility(initialResponse?.visibility ?? "private");
    setSaved(null);
  }, [item, initialResponse?.text, initialResponse?.visibility]);

  const canShare = !!item.shareable && !!inSession;
  const dirty =
    text.trim() !== (initialResponse?.text ?? "").trim() ||
    visibility !== (initialResponse?.visibility ?? "private");

  const save = async () => {
    if (!onSave) {
      return;
    }
    setSaved("saving");
    try {
      await onSave(text.trim(), canShare ? visibility : "private");
      setSaved("saved");
    } catch (error) {
      console.error("Failed to save the answer:", error);
      setSaved("failed");
    }
  };

  return (
    <div className="sb-step-question" dir="auto">
      <p className="sb-step-question-asks">
        {authorName
          ? t("playlist-question-asks", {
              defaultValue: "{{author}} asks",
              author: authorName,
            })
          : t("playlist-question-for-readers", {
              defaultValue: "Question for readers",
            })}
      </p>
      <h3 className="sb-step-question-prompt">{item.prompt}</h3>
      <label className="sb-step-question-response">
        <span className="sb-step-question-response-label">
          {t("playlist-question-your-response", {
            defaultValue: "Your response",
          })}
        </span>
        <textarea
          className="sb-settings-text-input sb-step-question-response-input"
          rows={4}
          value={text}
          dir="auto"
          onInput={(event: Event) => {
            setText((event.currentTarget as HTMLTextAreaElement).value);
            setSaved(null);
          }}
        />
      </label>
      {canShare ? (
        <fieldset className="sb-step-question-visibility">
          <legend>
            {t("playlist-question-who-can-see", {
              defaultValue: "Who can see this",
            })}
          </legend>
          {(["private", "session"] as const).map((choice) => (
            <label
              key={choice}
              className={`sb-step-question-visibility-choice${
                visibility === choice
                  ? " sb-step-question-visibility-choice--selected"
                  : ""
              }`}
            >
              <input
                type="radio"
                name="sb-step-question-visibility"
                value={choice}
                checked={visibility === choice}
                onChange={() => {
                  setVisibility(choice);
                  setSaved(null);
                }}
              />
              {choice === "private"
                ? t("playlist-question-only-me", { defaultValue: "Only me" })
                : t("playlist-question-session", { defaultValue: "Session" })}
            </label>
          ))}
        </fieldset>
      ) : null}
      {onSave ? (
        <div className="sb-step-question-actions">
          <span className="sb-step-question-status" role="status">
            {saved === "saved"
              ? t("playlist-question-saved", {
                  defaultValue: "Saved to your profile.",
                })
              : saved === "failed"
                ? t("playlist-question-save-failed", {
                    defaultValue: "Couldn't save your response.",
                  })
                : null}
          </span>
          <button
            type="button"
            className="sb-settings-save-button"
            disabled={!dirty || !text.trim() || saved === "saving"}
            onClick={() => void save()}
          >
            {saved === "saving"
              ? t("saving", { defaultValue: "Saving…" })
              : t("playlist-question-save", { defaultValue: "Save response" })}
          </button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * A compare step as it plays: the author's framing line, a legend for the
 * words and phrases marked in the passages, then each passage in its own
 * column with who it is about, and a way to open it in a tab of its own.
 */
export function CompareStepContent(props: {
  item: CompareItem;
  loadChapter?: ScriptureChapterLoader;
  resolveBookName: (bookId: string) => string;
  /** Opens one of the passages in the reader, when there is a reader to open it in. */
  onOpenPassage?: (ref: CompareItem["refs"][number]) => void;
  playing?: PlayingState;
}) {
  const { item, loadChapter, resolveBookName, onOpenPassage } = props;
  const { t } = useI18n();

  const terms = (item.terms ?? []).filter((term) => term.text.trim());
  const hasPhrases = item.refs.some((ref) => ref.phrases?.length);

  return (
    <div className="sb-step-compare" dir="auto">
      {item.description ? (
        <p className="sb-step-compare-description">{item.description}</p>
      ) : null}
      {terms.length > 0 || (hasPhrases && item.phraseLabel) ? (
        <ul className="sb-step-compare-legend">
          {terms.map((term) => (
            <li key={term.text} className="sb-step-compare-legend-item">
              <mark className="sb-item-inline-preview-term">{term.text}</mark>{" "}
              {term.label}
            </li>
          ))}
          {hasPhrases && item.phraseLabel ? (
            <li className="sb-step-compare-legend-item">
              <mark className="sb-item-inline-preview-phrase">
                {item.phraseLabel.split(" ")[0]}
              </mark>{" "}
              {item.phraseLabel.split(" ").slice(1).join(" ")}
            </li>
          ) : null}
        </ul>
      ) : null}
      <div className="sb-step-compare-columns">
        {item.refs.map((ref, index) => (
          <section
            key={index}
            className="sb-step-compare-column"
            aria-label={verseRefLabel(ref, resolveBookName)}
          >
            <h3 className="sb-step-compare-heading">
              {verseRefLabel(
                { ...ref, verse: undefined, endVerse: undefined },
                resolveBookName
              )}
              {ref.label?.trim() ? (
                <span className="sb-step-compare-chip">{ref.label.trim()}</span>
              ) : null}
            </h3>
            <div className="sb-step-compare-passage">
              <ScripturePreview
                item={compareRefItem(ref, item.translationId)}
                loadChapter={loadChapter}
                phrases={ref.phrases}
                terms={terms.map((term) => term.text)}
              />
            </div>
            {onOpenPassage ? (
              <button
                type="button"
                className="sb-step-compare-open"
                onClick={() => onOpenPassage(ref)}
              >
                {t("playlist-compare-open-tab", {
                  defaultValue: "Open {{passage}} in a tab",
                  passage: verseRefLabel(
                    { ...ref, verse: undefined, endVerse: undefined },
                    resolveBookName
                  ),
                })}
              </button>
            ) : null}
          </section>
        ))}
      </div>
    </div>
  );
}
