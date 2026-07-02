import { useRef, useState } from "preact/hooks";
import { useI18n } from "../i18n/I18nManager";
import type { PlaylistItemData } from "../managers/PlaylistManager";
import { sanitize } from "../managers/Sanitization";
import { RichTextEditor } from "./RichTextEditor";
import type { RichTextEditorHandle } from "./RichTextEditor";

interface TextItemInputProps {
  onAdd: (item: PlaylistItemData) => void;
}

/**
 * Adds free rich text (html item) to the playlist. Contents live in the
 * TipTap editor; we only track its empty state (to toggle the add button) and
 * serialize the HTML on submit.
 */
export function TextItemInput(props: TextItemInputProps) {
  const { onAdd } = props;
  const { t } = useI18n();
  const [editorEmpty, setEditorEmpty] = useState(true);
  const editorRef = useRef<RichTextEditorHandle>(null);

  const handleAdd = async () => {
    // Serialize the editor contents only now, on submit, rather than on every
    // keystroke.
    const html = editorRef.current?.getHTML() ?? "";
    if (!html.trim()) {
      return;
    }
    onAdd({ type: "html", html: await sanitize(html) });
    editorRef.current?.clear();
  };

  return (
    <div className="sb-playlist-add-row">
      <RichTextEditor
        ref={editorRef}
        className="sb-discover-title-input sb-playlist-add-editor"
        onEmptyChange={setEditorEmpty}
      />
      <button
        type="button"
        className="sb-settings-save-button"
        onClick={handleAdd}
        disabled={editorEmpty}
      >
        {t("playlist-add-button", { defaultValue: "Add item" })}
      </button>
    </div>
  );
}
