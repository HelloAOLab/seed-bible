import { useEffect, useRef } from "preact/hooks";
import { forwardRef, useImperativeHandle } from "preact/compat";
import type { Editor } from "@tiptap/core";

export interface RichTextEditorHandle {
  /**
   * Serialize the current contents to an HTML string, or an empty string when
   * the editor is blank. This is a heavy operation, so callers should only
   * invoke it when they actually need the value (e.g. on submit).
   */
  getHTML: () => string;
  /** Reset the editor to an empty document. */
  clear: () => void;
}

interface RichTextEditorProps {
  className?: string;
  /**
   * Called when the editor transitions between empty and non-empty. Lets the
   * parent drive UI (e.g. enabling a submit button) without paying the cost of
   * serializing the document on every keystroke.
   */
  onEmptyChange?: (isEmpty: boolean) => void;
}

/**
 * A rich-text editor backed by TipTap. TipTap is imported dynamically so it's
 * only loaded when the editor is actually shown. The contents are exposed
 * imperatively via a `RichTextEditorHandle` rather than emitted on every
 * change; callers are responsible for sanitizing the HTML before rendering or
 * persisting it (see `managers/Sanitization`).
 */
export const RichTextEditor = forwardRef<
  RichTextEditorHandle,
  RichTextEditorProps
>(function RichTextEditor(props, ref) {
  const { className, onEmptyChange } = props;
  const elementRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);

  // Keep the latest callback in a ref so the once-mounted editor always calls
  // through to the current prop without needing to re-create the editor.
  const onEmptyChangeRef = useRef(onEmptyChange);
  onEmptyChangeRef.current = onEmptyChange;

  // The app is server-rendered, so mount the editor on the client only. Loading
  // TipTap lazily here keeps it out of the initial bundle and avoids a
  // hydration mismatch (the server renders an empty container).
  useEffect(() => {
    let cancelled = false;

    Promise.all([import("@tiptap/core"), import("@tiptap/starter-kit")]).then(
      ([{ Editor }, { default: StarterKit }]) => {
        if (cancelled || !elementRef.current) {
          return;
        }
        editorRef.current = new Editor({
          element: elementRef.current,
          extensions: [StarterKit],
          onUpdate: ({ editor }) => onEmptyChangeRef.current?.(editor.isEmpty),
        });
      }
    );

    return () => {
      cancelled = true;
      editorRef.current?.destroy();
      editorRef.current = null;
    };
  }, []);

  useImperativeHandle(ref, () => ({
    getHTML: () => {
      const editor = editorRef.current;
      return editor && !editor.isEmpty ? editor.getHTML() : "";
    },
    clear: () => {
      editorRef.current?.commands.clearContent();
      onEmptyChangeRef.current?.(true);
    },
  }));

  return <div ref={elementRef} className={className} />;
});
