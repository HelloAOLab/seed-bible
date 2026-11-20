import { lazy, Suspense } from "preact/compat";
import { useEffect, useRef, useState } from "preact/hooks";
import type { Editor } from "@tiptap/core";
import { useI18n } from "../../i18n/I18nManager";
import { sanitize } from "../../managers/Sanitization";
import { parseVerseReference } from "../../managers/BibleDataManager";
import { PeIcon } from "./editorControls";
import { escapeHtml } from "./playlistSteps";
import { Button } from "../Button/Button";

// TipTap is sizeable and never server-rendered; see `TextItemInput`.
const TipTapEditor = lazy(() =>
  import.meta.env.SSR
    ? Promise.reject(new Error("TipTap is not available in the SSR bundle"))
    : import("../TipTapEditor/TipTapEditor")
);

/** The href a note uses to point at another step of the same playlist. */
export function playlistStepHref(index: number): string {
  return `#playlist-step-${index + 1}`;
}

type InsertMode = "step" | "verse" | "link";

/**
 * A note's text, edited in place: TipTap without its formatting bar, dressed
 * as a plain text area, with the INSERT row under it for linking another
 * step, a verse, or a web page. Every change is sanitized and handed to
 * `onChange` as HTML ("" when the note is empty).
 */
export function PlaylistNoteComposer(props: {
  initialHtml: string;
  placeholder: string;
  onChange: (html: string) => void;
  /** The playlist's other steps, for "Link item", by index. */
  steps: { index: number; label: string }[];
  tall?: boolean;
  /** Text under the field, such as a character count. */
  footer?: (text: string) => string | null;
  autofocus?: boolean;
  /** Puts the field in a bordered box, as in a step card. */
  boxed?: boolean;
  /**
   * Shows TipTap's formatting toolbar (bold, italic, underline, alignment),
   * as the annotation note editor does, in place of the INSERT row.
   */
  formatting?: boolean;
}) {
  const {
    initialHtml,
    placeholder,
    steps,
    tall,
    footer,
    autofocus,
    boxed,
    formatting,
  } = props;
  const { t } = useI18n();
  const editorRef = useRef<Editor | null>(null);
  const [empty, setEmpty] = useState(!initialHtml);
  const [text, setText] = useState("");
  const [inserting, setInserting] = useState<InsertMode | null>(null);
  const [verseText, setVerseText] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const onChangeRef = useRef(props.onChange);
  onChangeRef.current = props.onChange;
  // Sanitizing is async; only the latest edit's result is kept.
  const changeCount = useRef(0);

  const publish = (editor: Editor) => {
    setText(editor.getText());
    const change = ++changeCount.current;
    const html = editor.isEmpty ? "" : editor.getHTML();
    void sanitize(html).then((clean) => {
      if (change === changeCount.current) {
        onChangeRef.current(clean);
      }
    });
  };

  useEffect(() => () => void (changeCount.current += 1), []);

  const insertHtml = (html: string) => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }
    editor.chain().focus().insertContent(html).run();
    setInserting(null);
  };

  const field = (
    <div
      className={`sb-pe-rich-field-inner${tall ? " sb-pe-rich-field--tall" : ""}${
        formatting ? " sb-pe-rich-field-inner--formatting" : ""
      }`}
    >
      {empty ? (
        <span className="sb-pe-rich-placeholder" aria-hidden="true">
          {placeholder}
        </span>
      ) : null}
      <Suspense fallback={<div className="sb-pe-rich" />}>
        <TipTapEditor
          className="sb-pe-rich"
          initialContent={initialHtml}
          autofocus={autofocus ? "end" : false}
          onEditor={(editor) => {
            editorRef.current = editor;
            if (editor) {
              setText(editor.getText());
              editor.on("update", () => publish(editor));
              const element = editor.view.dom as HTMLElement;
              element.setAttribute("aria-label", placeholder);
              element.setAttribute("aria-multiline", "true");
            }
          }}
          onEmptyChange={setEmpty}
        />
      </Suspense>
    </div>
  );

  const parsedVerse = verseText.trim() ? parseVerseReference(verseText) : null;
  const validUrl = URL.canParse(linkUrl.trim()) ? linkUrl.trim() : null;
  const footerText = footer?.(text) ?? null;

  return (
    <>
      {boxed ? (
        <div
          className={`sb-pe-rich-field${tall ? " sb-pe-rich-field--tall" : ""}`}
          onClick={() => editorRef.current?.commands.focus()}
        >
          {field}
        </div>
      ) : (
        field
      )}
      {footerText !== null ? (
        <span className="sb-pe-count">{footerText}</span>
      ) : null}
      {formatting ? null : (
        <>
          <div className="sb-pe-insert">
            <span className="sb-pe-insert-label">
              {t("playlist-editor-insert", { defaultValue: "INSERT" })}
            </span>
            <div className="sb-pe-insert-actions">
              <Button
                size="sm"
                icon={<PeIcon name="arrow-right" />}
                className="sb-pe-insert-action"
                aria-expanded={inserting === "step"}
                disabled={steps.length === 0}
                onClick={() =>
                  setInserting(inserting === "step" ? null : "step")
                }
              >
                {t("playlist-editor-link-item", { defaultValue: "Link item" })}
              </Button>
              <Button
                size="sm"
                icon={<PeIcon name="book-open" />}
                className="sb-pe-insert-action"
                aria-expanded={inserting === "verse"}
                onClick={() =>
                  setInserting(inserting === "verse" ? null : "verse")
                }
              >
                {t("playlist-editor-embed-verse", {
                  defaultValue: "Embed verse",
                })}
              </Button>
              <Button
                size="sm"
                icon={<PeIcon name="link" />}
                className="sb-pe-insert-action"
                aria-expanded={inserting === "link"}
                onClick={() =>
                  setInserting(inserting === "link" ? null : "link")
                }
              >
                {t("playlist-editor-link", { defaultValue: "Link" })}
              </Button>
            </div>
          </div>
          {inserting === "step" ? (
            <div className="sb-pe-insert-picker">
              <ul className="sb-pe-insert-picker-list">
                {steps.map((step) => (
                  <li key={step.index}>
                    <button
                      type="button"
                      onClick={() =>
                        insertHtml(
                          `<a href="${playlistStepHref(step.index)}">${escapeHtml(
                            t("playlist-editor-step-link-text", {
                              step: step.index + 1,
                              label: step.label,
                              defaultValue: "Step {{step}}: {{label}}",
                            })
                          )}</a> `
                        )
                      }
                    >
                      {t("playlist-editor-step-link-text", {
                        step: step.index + 1,
                        label: step.label,
                        defaultValue: "Step {{step}}: {{label}}",
                      })}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {inserting === "verse" ? (
            <form
              className="sb-pe-insert-picker sb-pe-insert-picker-row"
              onSubmit={(event) => {
                event.preventDefault();
                if (parsedVerse) {
                  // Typed as plain text: the editor links references on its own.
                  insertHtml(`${escapeHtml(verseText.trim())} `);
                  setVerseText("");
                }
              }}
            >
              <input
                className="sb-pe-input"
                type="text"
                value={verseText}
                autoFocus
                aria-label={t("playlist-editor-embed-verse", {
                  defaultValue: "Embed verse",
                })}
                placeholder={t("playlist-editor-verse-placeholder", {
                  defaultValue: "e.g. John 3:16",
                })}
                onInput={(event) => setVerseText(event.currentTarget.value)}
              />
              <Button
                type="submit"
                variant="primary"
                size="sm"
                className="sb-pe-insert-picker-go"
                disabled={!parsedVerse}
              >
                {t("playlist-editor-insert-button", { defaultValue: "Insert" })}
              </Button>
            </form>
          ) : null}
          {inserting === "link" ? (
            <form
              className="sb-pe-insert-picker sb-pe-insert-picker-row"
              onSubmit={(event) => {
                event.preventDefault();
                if (validUrl) {
                  insertHtml(
                    `<a href="${escapeHtml(validUrl)}">${escapeHtml(validUrl)}</a> `
                  );
                  setLinkUrl("");
                }
              }}
            >
              <input
                className="sb-pe-input"
                type="url"
                value={linkUrl}
                autoFocus
                aria-label={t("playlist-editor-link", { defaultValue: "Link" })}
                placeholder={t("playlist-editor-link-placeholder", {
                  defaultValue: "https://",
                })}
                onInput={(event) => setLinkUrl(event.currentTarget.value)}
              />
              <Button
                type="submit"
                variant="primary"
                size="sm"
                className="sb-pe-insert-picker-go"
                disabled={!validUrl}
              >
                {t("playlist-editor-insert-button", { defaultValue: "Insert" })}
              </Button>
            </form>
          ) : null}
        </>
      )}
    </>
  );
}
