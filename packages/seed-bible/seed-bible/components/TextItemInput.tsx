import { useRef, useState } from "preact/hooks";
import { lazy, Suspense } from "preact/compat";
import { useI18n } from "../i18n/I18nManager";
import type { PlaylistItemData } from "../managers/PlaylistManager";
import { sanitize } from "../managers/Sanitization";
import type { Editor } from "@tiptap/core";

// Load TipTap lazily so its (sizeable) bundle is only fetched when the user
// actually opens the text editor; Suspense shows a placeholder meanwhile.
const TipTapEditor = lazy(() => import("./TipTapEditor"));

interface TextItemInputProps {
  onAdd: (item: PlaylistItemData) => void;
  /** HTML and title the fields start with, e.g. when editing an item. */
  initialItem?: { html: string; title?: string };
  /** Overrides the submit button label (defaults to "Add item"). */
  submitLabel?: string;
}

/**
 * Adds free rich text (html item) to the playlist. Owns the TipTap editor
 * instance and its empty state; the HTML is serialized only on submit.
 */
export function TextItemInput(props: TextItemInputProps) {
  const { onAdd, initialItem, submitLabel } = props;
  const { t } = useI18n();
  const editorRef = useRef<Editor | null>(null);
  // Seeded content counts as non-empty so the submit button starts enabled.
  const [editorEmpty, setEditorEmpty] = useState(!initialItem?.html);
  const [title, setTitle] = useState(initialItem?.title ?? "");

  const handleAdd = async () => {
    const editor = editorRef.current;
    if (!editor || editor.isEmpty) {
      return;
    }
    const trimmedTitle = title.trim();
    // Serialize the contents only now, on submit, rather than on every keystroke.
    onAdd({
      type: "html",
      html: await sanitize(editor.getHTML()),
      title: trimmedTitle || undefined,
    });
    editor.commands.clearContent();
    setEditorEmpty(true);
    setTitle("");
  };

  return (
    <>
      <input
        className="sb-discover-title-input"
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
      <div className="sb-playlist-add-row">
        <Suspense
          fallback={
            <div
              className="sb-discover-title-input sb-playlist-add-editor sb-playlist-add-editor--loading"
              aria-busy="true"
            />
          }
        >
          <TipTapEditor
            className="sb-discover-title-input sb-playlist-add-editor"
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
}
