import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef } from "preact/hooks";

interface TipTapEditorProps {
  className?: string;
  /** Receives the editor instance once it's ready, and null when torn down. */
  onEditor: (editor: Editor | null) => void;
  /** Called whenever the editor transitions between empty and non-empty. */
  onEmptyChange: (isEmpty: boolean) => void;
}

/**
 * The TipTap editor itself, built directly on `@tiptap/core`. It's loaded
 * lazily (see `TextItemInput`) so the TipTap bundle stays out of the initial
 * download and only arrives when the user actually opens the text editor. The
 * editor instance is handed up to the parent, which owns reading and clearing
 * its contents.
 */
export default function TipTapEditor(props: TipTapEditorProps) {
  const { className, onEditor, onEmptyChange } = props;
  const elementRef = useRef<HTMLDivElement>(null);

  // Keep the latest callbacks in refs so the editor — created once on mount —
  // always calls through to the current props without being re-created.
  const onEditorRef = useRef(onEditor);
  onEditorRef.current = onEditor;
  const onEmptyChangeRef = useRef(onEmptyChange);
  onEmptyChangeRef.current = onEmptyChange;

  // Mount the editor on the client only; the server renders an empty container,
  // so there's no DOM to hydrate and no mismatch.
  useEffect(() => {
    if (!elementRef.current) {
      return;
    }
    const editor = new Editor({
      element: elementRef.current,
      extensions: [StarterKit],
      onUpdate: ({ editor }) => onEmptyChangeRef.current(editor.isEmpty),
    });
    onEditorRef.current(editor);
    return () => {
      onEditorRef.current(null);
      editor.destroy();
    };
  }, []);

  return <div ref={elementRef} className={className} />;
}
