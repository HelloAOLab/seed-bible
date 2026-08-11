import "./TextItemInput.css";
import { useImperativeHandle, useRef, useState } from "preact/hooks";
import { forwardRef, lazy, Suspense } from "preact/compat";
import { useI18n } from "../../i18n/I18nManager";
import type { PlaylistItemData } from "../../managers/PlaylistManager";
import { sanitize } from "../../managers/Sanitization";
import type { Editor } from "@tiptap/core";

// Load TipTap lazily so its (sizeable) bundle is only fetched when the user
// actually opens the text editor; Suspense shows a placeholder meanwhile.
const TipTapEditor = lazy(() => import("../TipTapEditor/TipTapEditor"));

interface TextItemInputProps {
  onAdd: (item: PlaylistItemData) => void;
  /** HTML and title the fields start with, e.g. when editing an item. */
  initialItem?: { html: string; title?: string };
  /** Overrides the submit button label (defaults to "Add item"). */
  submitLabel?: string;
}

/** Imperative handle so a parent can check for / commit an in-progress draft. */
export interface TextItemInputHandle {
  /** Whether the user has typed text/a title that hasn't been added yet. */
  isDirty: () => boolean;
  /** Submits the current input, same as clicking "Add". Returns whether it
   * actually added an item (false if the editor is empty). */
  commit: () => Promise<boolean>;
}

/**
 * Adds free rich text (html item) to the playlist. Owns the TipTap editor
 * instance and its empty state; the HTML is serialized only on submit.
 */
export const TextItemInput = forwardRef<
  TextItemInputHandle,
  TextItemInputProps
>(function TextItemInput(props, ref) {
  const { onAdd, initialItem, submitLabel } = props;
  const { t } = useI18n();
  const editorRef = useRef<Editor | null>(null);
  // Seeded content counts as non-empty so the submit button starts enabled.
  const [editorEmpty, setEditorEmpty] = useState(!initialItem?.html);
  const [title, setTitle] = useState(initialItem?.title ?? "");

  /** Submits the current input. Returns whether it actually added an item. */
  const handleAdd = async (): Promise<boolean> => {
    const editor = editorRef.current;
    if (!editor || editor.isEmpty) {
      return false;
    }
    const trimmedTitle = title.trim();
    const html = editor.getHTML();
    const sanitizedHtml = await sanitize(html);

    // Serialize the contents only now, on submit, rather than on every keystroke.
    onAdd({
      type: "html",
      html: sanitizedHtml,
      title: trimmedTitle || undefined,
    });
    editor.commands.clearContent();
    setEditorEmpty(true);
    setTitle("");
    return true;
  };

  useImperativeHandle(
    ref,
    () => ({
      isDirty: () => !editorEmpty || title.trim() !== "",
      commit: handleAdd,
    }),
    [editorEmpty, title]
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
        <Suspense
          fallback={
            <div
              className="sb-settings-text-input sb-playlist-input sb-playlist-add-editor sb-playlist-add-editor--loading"
              aria-busy="true"
            />
          }
        >
          <TipTapEditor
            className="sb-settings-text-input sb-playlist-input sb-playlist-add-editor"
            initialContent={initialItem?.html}
            onEditor={(editor) => {
              editorRef.current = editor;
            }}
            onEmptyChange={setEditorEmpty}
          />
        </Suspense>
        <button
          type="button"
          className="sb-settings-save-button"
          onClick={handleAdd}
          disabled={editorEmpty}
        >
          {submitLabel ??
            t("playlist-add-button", { defaultValue: "Add item" })}
        </button>
      </div>
    </>
  );
});
