import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { useEffect, useRef, useState } from "preact/hooks";
import { useI18n } from "../i18n/I18nManager";
import { MaterialIcon } from "./icons";

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
  // Rendered so the menu bar can appear once the editor is ready; the parent
  // still receives the instance through `onEditor`.
  const [editor, setEditor] = useState<Editor | null>(null);

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
      extensions: [
        StarterKit,
        Underline,
        TextAlign.configure({ types: ["heading", "paragraph"] }),
      ],
      onUpdate: ({ editor }) => onEmptyChangeRef.current(editor.isEmpty),
    });
    onEditorRef.current(editor);
    setEditor(editor);
    return () => {
      onEditorRef.current(null);
      setEditor(null);
      editor.destroy();
    };
  }, []);

  return (
    <div className={className}>
      <EditorMenuBar editor={editor} />
      <div ref={elementRef} className="sb-editor-content" />
    </div>
  );
}

/**
 * Formatting toolbar for the editor. Re-renders on every editor transaction so
 * each button reflects the current selection's active marks and alignment.
 */
function EditorMenuBar({ editor }: { editor: Editor | null }) {
  const { t } = useI18n();
  // Bump on each transaction to re-read `isActive` for the current selection.
  const [, setVersion] = useState(0);

  useEffect(() => {
    if (!editor) {
      return;
    }
    const update = () => setVersion((version) => version + 1);
    editor.on("transaction", update);
    return () => {
      editor.off("transaction", update);
    };
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="sb-editor-toolbar" role="toolbar">
      <div className="sb-editor-toolbar-group">
        <MenuButton
          icon="format_bold"
          label={t("editor-format-bold", { defaultValue: "Bold" })}
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <MenuButton
          icon="format_italic"
          label={t("editor-format-italic", { defaultValue: "Italic" })}
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <MenuButton
          icon="format_underlined"
          label={t("editor-format-underline", { defaultValue: "Underline" })}
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        />
      </div>
      <div className="sb-editor-toolbar-group">
        <MenuButton
          icon="format_align_left"
          label={t("editor-align-left", { defaultValue: "Align left" })}
          active={editor.isActive({ textAlign: "left" })}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
        />
        <MenuButton
          icon="format_align_center"
          label={t("editor-align-center", { defaultValue: "Align center" })}
          active={editor.isActive({ textAlign: "center" })}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
        />
        <MenuButton
          icon="format_align_right"
          label={t("editor-align-right", { defaultValue: "Align right" })}
          active={editor.isActive({ textAlign: "right" })}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
        />
        <MenuButton
          icon="format_align_justify"
          label={t("editor-align-justify", { defaultValue: "Justify" })}
          active={editor.isActive({ textAlign: "justify" })}
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        />
      </div>
    </div>
  );
}

interface MenuButtonProps {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
}

function MenuButton({ icon, label, active, onClick }: MenuButtonProps) {
  return (
    <button
      type="button"
      className={
        "sb-editor-toolbar-button" +
        (active ? " sb-editor-toolbar-button--active" : "")
      }
      onClick={onClick}
      // Keep focus in the document (the editor) so the command applies to the
      // current selection rather than blurring it away.
      onMouseDown={(event) => event.preventDefault()}
      aria-label={label}
      aria-pressed={active}
      title={label}
    >
      <MaterialIcon>{icon}</MaterialIcon>
    </button>
  );
}
