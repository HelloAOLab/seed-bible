import { Editor, Extension, type FocusPosition } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "./TextAlign";
import VerseReferenceMark from "./VerseReferenceMark";
import StepLinkMark from "./StepLinkMark";
import ScriptureEmbedNode from "./ScriptureEmbedNode";
import type { TranslationBook } from "../../managers/FreeUseBibleAPI";
import { resolveTypedReference } from "../ScriptureItemInput/scriptureSuggestions";
import { verseRefLabel } from "../playlistItemLabel";
import "./TipTapEditor.css";
import { useEffect, useRef, useState } from "preact/hooks";
import { useI18n } from "../../i18n/I18nManager";
import { MaterialIcon } from "../icons";

export interface TipTapEditorProps {
  className?: string;
  /** HTML the editor starts with, e.g. when editing an existing item. */
  initialContent?: string;
  /** Receives the editor instance once it's ready, and null when torn down. */
  onEditor: (editor: Editor | null) => void;
  /** Called whenever the editor transitions between empty and non-empty. */
  onEmptyChange: (isEmpty: boolean) => void;
  /**
   * Cmd+Enter on Mac / Ctrl+Enter on Windows and Linux. Enter alone still
   * inserts a new line (TipTap's default). Unset in editors that should ignore
   * the shortcut, such as the playlist text item composer.
   */
  onModEnter?: () => void;
  /**
   * Where to put the caret when the editor mounts. Unset (or false) leaves
   * it unfocused so a nearby field, such as a playlist item title, can keep
   * focus.
   */
  autofocus?: FocusPosition;
  /**
   * The books of the reader's translation, for the "Embed passage" control:
   * a typed reference is read the way the scripture field reads one. Without
   * them the control isn't offered.
   */
  books?: TranslationBook[];
  /**
   * The playlist's other steps, for the "Link to step" control. Without them
   * the control isn't offered.
   */
  steps?: StepLinkTarget[];
}

/** A step a text item or note can link to, as the editor numbers them. */
export interface StepLinkTarget {
  number: number;
  label: string;
}

/**
 * The TipTap editor itself, built directly on `@tiptap/core`. It's loaded
 * lazily (see `TextItemInput`) so the TipTap bundle stays out of the initial
 * download and only arrives when the user actually opens the text editor. The
 * editor instance is handed up to the parent, which owns reading and clearing
 * its contents.
 */
export default function TipTapEditor(props: TipTapEditorProps) {
  const {
    className,
    initialContent,
    onEditor,
    onEmptyChange,
    onModEnter,
    autofocus = false,
    books,
    steps,
  } = props;
  const elementRef = useRef<HTMLDivElement>(null);
  // Captured once so the mount-only effect starts the editor with this content
  // without re-creating it if the prop identity changes.
  const initialContentRef = useRef(initialContent);
  const autofocusRef = useRef(autofocus);
  // Rendered so the menu bar can appear once the editor is ready; the parent
  // still receives the instance through `onEditor`.
  const [editor, setEditor] = useState<Editor | null>(null);

  // Keep the latest callbacks in refs so the editor — created once on mount —
  // always calls through to the current props without being re-created.
  const onEditorRef = useRef(onEditor);
  onEditorRef.current = onEditor;
  const onEmptyChangeRef = useRef(onEmptyChange);
  onEmptyChangeRef.current = onEmptyChange;
  const onModEnterRef = useRef(onModEnter);
  onModEnterRef.current = onModEnter;

  // Mount the editor on the client only; the server renders an empty container,
  // so there's no DOM to hydrate and no mismatch.
  useEffect(() => {
    if (!elementRef.current) {
      return;
    }
    const editor = new Editor({
      element: elementRef.current,
      content: initialContentRef.current,
      extensions: [
        StarterKit,
        Underline,
        TextAlign.configure({ types: ["heading", "paragraph"] }),
        VerseReferenceMark,
        StepLinkMark,
        ScriptureEmbedNode,
        Extension.create({
          name: "modEnter",
          addKeyboardShortcuts() {
            return {
              // TipTap's `Mod` is Cmd on Apple platforms and Ctrl elsewhere.
              "Mod-Enter": () => {
                const handler = onModEnterRef.current;
                if (!handler) {
                  return false;
                }
                handler();
                return true;
              },
            };
          },
        }),
      ],
      onUpdate: ({ editor }) => onEmptyChangeRef.current(editor.isEmpty),
    });
    const autofocusPosition = autofocusRef.current;
    if (autofocusPosition !== false && autofocusPosition != null) {
      editor.commands.focus(autofocusPosition, { scrollIntoView: false });
    }
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
      <EditorMenuBar editor={editor} books={books} steps={steps} />
      <div ref={elementRef} className="sb-editor-content" />
    </div>
  );
}

/**
 * Formatting toolbar for the editor. Re-renders on every editor transaction so
 * each button reflects the current selection's active marks and alignment.
 */
function EditorMenuBar({
  editor,
  books,
  steps,
}: {
  editor: Editor | null;
  books?: TranslationBook[];
  steps?: StepLinkTarget[];
}) {
  const { t } = useI18n();
  // Bump on each transaction to re-read `isActive` for the current selection.
  const [, setVersion] = useState(0);
  const [embedOpen, setEmbedOpen] = useState(false);
  const [embedText, setEmbedText] = useState("");
  const [embedError, setEmbedError] = useState(false);

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
      {steps?.length || books ? (
        <div className="sb-editor-toolbar-group sb-editor-toolbar-inserts">
          {steps?.length ? (
            <select
              className="sb-editor-toolbar-select"
              aria-label={t("editor-link-to-step", {
                defaultValue: "Link to step",
              })}
              value=""
              // Keep focus in the editor so the link lands on the selection.
              onMouseDown={(event) => event.stopPropagation()}
              onChange={(event: Event) => {
                const select = event.currentTarget as HTMLSelectElement;
                const step = Number(select.value);
                select.value = "";
                const target = steps.find((s) => s.number === step);
                if (!target) {
                  return;
                }
                editor
                  .chain()
                  .focus()
                  .setStepLink(
                    target.number,
                    t("editor-step-link-text", {
                      defaultValue: "Step {{number}} · {{label}}",
                      number: target.number,
                      label: target.label,
                    })
                  )
                  .run();
              }}
            >
              <option value="">
                {t("editor-link-to-step", { defaultValue: "Link to step" })}
              </option>
              {steps.map((step) => (
                <option key={step.number} value={step.number}>
                  {step.number} · {step.label}
                </option>
              ))}
            </select>
          ) : null}
          {editor.isActive("stepLink") ? (
            <MenuButton
              icon="link_off"
              label={t("editor-unlink-step", {
                defaultValue: "Remove step link",
              })}
              active={false}
              onClick={() => editor.chain().focus().unsetStepLink().run()}
            />
          ) : null}
          {books ? (
            <MenuButton
              icon="menu_book"
              label={t("editor-embed-passage", {
                defaultValue: "Embed passage",
              })}
              active={embedOpen}
              onClick={() => {
                setEmbedOpen((open) => !open);
                setEmbedError(false);
              }}
            />
          ) : null}
          {embedOpen && books ? (
            <form
              className="sb-editor-embed-form"
              onSubmit={(event: Event) => {
                event.preventDefault();
                const ref = resolveTypedReference(embedText, books);
                if (!ref) {
                  setEmbedError(true);
                  return;
                }
                const label = verseRefLabel(ref, (bookId) => {
                  const book = books.find((b) => b.id === bookId);
                  return book?.name ?? book?.commonName ?? bookId;
                });
                editor.chain().focus().insertScriptureEmbed(label).run();
                setEmbedText("");
                setEmbedError(false);
                setEmbedOpen(false);
              }}
            >
              <input
                className="sb-settings-text-input sb-editor-embed-input"
                type="text"
                value={embedText}
                dir="auto"
                placeholder={t("playlist-add-scripture-placeholder", {
                  defaultValue: "e.g. John 3 or John 3:16",
                })}
                aria-label={t("editor-embed-passage", {
                  defaultValue: "Embed passage",
                })}
                aria-invalid={embedError}
                onInput={(event: Event) => {
                  setEmbedText((event.currentTarget as HTMLInputElement).value);
                  setEmbedError(false);
                }}
              />
              <button
                type="submit"
                className="sb-settings-save-button sb-editor-embed-submit"
                disabled={!embedText.trim()}
              >
                {t("editor-embed", { defaultValue: "Embed" })}
              </button>
              {embedError ? (
                <span className="sb-playlist-add-error" role="alert">
                  {t("playlist-add-scripture-error", {
                    defaultValue: "Couldn't find that reference",
                  })}
                </span>
              ) : null}
            </form>
          ) : null}
        </div>
      ) : null}
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
