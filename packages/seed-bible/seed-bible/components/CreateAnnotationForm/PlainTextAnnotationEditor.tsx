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

// Quotes need no escaping in text content, and leaving them alone keeps the
// output identical to TipTap's for plain paragraphs (see `isPlainTextHtml`).
function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/** One `<p>` per line, matching how TipTap stores plain paragraphs. */
export function plainTextToHtml(text: string): string {
  return text
    .split("\n")
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");
}

/** Blocks that hold a line of text, so an empty one is still a blank line. */
const TEXT_BLOCKS = new Set(["P", "H1", "H2", "H3", "H4", "H5", "H6", "PRE"]);
const BLOCKS = new Set([
  ...TEXT_BLOCKS,
  "LI",
  "UL",
  "OL",
  "BLOCKQUOTE",
  "DIV",
  "HR",
]);

/**
 * Flattens saved annotation HTML to text: one line per paragraph, heading or
 * list item (prefixed `- `, indented when nested), and `<br>` as a line break.
 */
export function htmlToPlainText(html: string | undefined): string {
  if (!html || typeof DOMParser === "undefined") {
    return "";
  }
  // DOMParser builds an inert document, so markup in saved HTML can't run.
  const body = new DOMParser().parseFromString(html, "text/html").body;
  const lines: string[] = [];
  let line: string | null = null;
  let pendingPrefix = "";

  const append = (text: string) => {
    if (line === null) {
      line = pendingPrefix;
      pendingPrefix = "";
    }
    line += text;
  };
  const endLine = () => {
    if (line !== null) {
      lines.push(line);
      line = null;
    }
  };

  const walk = (node: Node, listDepth: number) => {
    if (node.nodeType === Node.TEXT_NODE) {
      append(node.textContent ?? "");
      return;
    }
    if (!(node instanceof Element)) {
      return;
    }
    if (node.tagName === "BR") {
      append("");
      endLine();
      return;
    }
    if (!BLOCKS.has(node.tagName)) {
      node.childNodes.forEach((child) => walk(child, listDepth));
      return;
    }
    endLine();
    const before = lines.length;
    const isList = node.tagName === "UL" || node.tagName === "OL";
    if (node.tagName === "LI") {
      pendingPrefix = `${"  ".repeat(Math.max(listDepth - 1, 0))}- `;
    }
    node.childNodes.forEach((child) =>
      walk(child, isList ? listDepth + 1 : listDepth)
    );
    endLine();
    if (lines.length === before && TEXT_BLOCKS.has(node.tagName)) {
      lines.push(pendingPrefix);
    }
    pendingPrefix = "";
  };

  body.childNodes.forEach((child) => walk(child, 0));
  endLine();
  return lines.join("\n");
}

function normalizeHtml(html: string): string {
  return new DOMParser().parseFromString(html, "text/html").body.innerHTML;
}

/**
 * True when the note survives a trip through the textarea unchanged: only
 * plain paragraphs, no lists, line breaks, links, marks or alignment. Saving
 * anything else from the textarea would strip it, so it opens read-only.
 */
export function isPlainTextHtml(html: string | undefined): boolean {
  if (!html?.trim() || typeof DOMParser === "undefined") {
    return true;
  }
  return (
    normalizeHtml(plainTextToHtml(htmlToPlainText(html))) ===
    normalizeHtml(html)
  );
}

/**
 * Stand-in for `TipTapEditor` when its lazily-loaded bundle can't be fetched
 * (typically because the user is offline), so an annotation can still be
 * written. An existing note with formatting opens read-only instead, since
 * saving it from here would strip that formatting for good.
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
  const [readOnly] = useState(() => !isPlainTextHtml(initialContent));
  const [value, setValue] = useState(() => htmlToPlainText(initialContent));
  const valueRef = useRef(value);
  valueRef.current = value;
  const onEditorRef = useRef(onEditor);
  onEditorRef.current = onEditor;
  const onEmptyChangeRef = useRef(onEmptyChange);
  onEmptyChangeRef.current = onEmptyChange;

  useEffect(() => {
    if (readOnly) {
      // No handle and "empty" keep Save disabled and make the form's save a
      // no-op, so the formatted original is never overwritten.
      onEmptyChangeRef.current(true);
      return;
    }
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
    <>
      <p className="sb-annotation-editor-offline-notice" role="status">
        {readOnly
          ? t("annotation-editor-unavailable-read-only", {
              defaultValue:
                "The formatting editor couldn't load. This note has formatting that would be lost, so it can't be edited until you reconnect.",
            })
          : t("annotation-editor-unavailable", {
              defaultValue:
                "The formatting editor couldn't load, so this note will be saved as plain text.",
            })}
      </p>
      <div className={className}>
        <textarea
          ref={textareaRef}
          className="sb-annotation-editor-textarea"
          rows={6}
          value={value}
          readOnly={readOnly}
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
    </>
  );
}
