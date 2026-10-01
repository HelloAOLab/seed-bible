import type { Editor } from "@tiptap/core";
import { useEffect, useRef, useState } from "preact/hooks";
import { useI18n } from "../../i18n/I18nManager";
import type { TipTapEditorProps } from "../TipTapEditor/TipTapEditor";

/** The slice of TipTap's `Editor` the annotation form reads from. */
export type AnnotationEditorHandle = Pick<Editor, "isEmpty" | "getHTML">;

export type AnnotationEditorProps = Omit<TipTapEditorProps, "onEditor"> & {
  onEditor: (editor: AnnotationEditorHandle | null) => void;
};

/** TipTap's `Mod` key: Cmd on Apple, Ctrl on Windows/Linux. */
export function isApplePlatform(): boolean {
  return typeof navigator !== "undefined" && /Mac/.test(navigator.platform);
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** One `<p>` per line, matching how TipTap stores plain paragraphs. */
export function plainTextToHtml(text: string): string {
  return text
    .split("\n")
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");
}

/** Flattens saved annotation HTML to text, one line per top-level block. */
export function htmlToPlainText(html: string | undefined): string {
  if (!html || typeof DOMParser === "undefined") {
    return "";
  }
  // DOMParser builds an inert document, so markup in saved HTML can't run.
  const body = new DOMParser().parseFromString(html, "text/html").body;
  if (body.children.length === 0) {
    return body.textContent ?? "";
  }
  return Array.from(body.children)
    .map((child) => child.textContent ?? "")
    .join("\n");
}

/**
 * Stand-in for `TipTapEditor` when its lazily-loaded bundle can't be fetched
 * (typically because the user is offline), so an annotation can still be
 * written. Formatting in an existing annotation is flattened to plain text.
 */
export function PlainTextAnnotationEditor(props: AnnotationEditorProps) {
  const {
    className,
    initialContent,
    onEditor,
    onEmptyChange,
    onModEnter,
    autofocus = false,
  } = props;
  const { t } = useI18n();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState(() => htmlToPlainText(initialContent));
  const valueRef = useRef(value);
  valueRef.current = value;
  const onEditorRef = useRef(onEditor);
  onEditorRef.current = onEditor;
  const onEmptyChangeRef = useRef(onEmptyChange);
  onEmptyChangeRef.current = onEmptyChange;

  useEffect(() => {
    onEditorRef.current({
      get isEmpty() {
        return valueRef.current.trim() === "";
      },
      getHTML: () => plainTextToHtml(valueRef.current),
    });
    // Seeded HTML may flatten to whitespace only, which counts as empty here.
    onEmptyChangeRef.current(valueRef.current.trim() === "");
    const textarea = textareaRef.current;
    if (textarea && autofocus !== false && autofocus != null) {
      textarea.focus({ preventScroll: true });
      const end = autofocus === "start" ? 0 : textarea.value.length;
      textarea.setSelectionRange(end, end);
    }
    return () => onEditorRef.current(null);
  }, []);

  return (
    <div className={className}>
      <p className="sb-annotation-editor-offline-notice" role="status">
        {t("annotation-editor-unavailable", {
          defaultValue:
            "The formatting editor couldn't load, so this note will be saved as plain text.",
        })}
      </p>
      <textarea
        ref={textareaRef}
        className="sb-annotation-editor-textarea"
        rows={6}
        value={value}
        aria-label={t("annotation-text", { defaultValue: "Annotation text" })}
        onInput={(event) => {
          const next = event.currentTarget.value;
          const wasEmpty = valueRef.current.trim() === "";
          const isEmpty = next.trim() === "";
          valueRef.current = next;
          setValue(next);
          if (wasEmpty !== isEmpty) {
            onEmptyChangeRef.current(isEmpty);
          }
        }}
        onKeyDown={(event) => {
          const mod = isApplePlatform() ? event.metaKey : event.ctrlKey;
          if (event.key === "Enter" && mod && onModEnter) {
            event.preventDefault();
            onModEnter();
          }
        }}
      />
    </div>
  );
}
