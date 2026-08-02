import { Editor } from "@tiptap/core";
import "./TipTapEditor.css";
interface TipTapEditorProps {
  className?: string;
  /** HTML the editor starts with, e.g. when editing an existing item. */
  initialContent?: string;
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
export default function TipTapEditor(
  props: TipTapEditorProps
): import("preact").JSX.Element;
export {};
