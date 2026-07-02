import { useRef, useState } from "preact/hooks";
import { useI18n } from "../i18n/I18nManager";
import type { PlaylistItemData } from "../managers/PlaylistManager";
import type { TranslationBook } from "../managers/FreeUseBibleAPI";
import { parseVerseReference } from "../managers/parseVerseReference";
import { sanitize } from "../managers/Sanitization";
import { DiscoverSection } from "./DiscoverSection";
import { RichTextEditor } from "./RichTextEditor";
import type { RichTextEditorHandle } from "./RichTextEditor";

interface PlaylistItemInputProps {
  books: TranslationBook[];
  /** Called with the playlist item the user assembled and chose to add. */
  onAdd: (item: PlaylistItemData) => void;
}

type AddMode = "scripture" | "text" | "link";

const MODES: { mode: AddMode; labelKey: string; defaultLabel: string }[] = [
  {
    mode: "scripture",
    labelKey: "playlist-add-mode-scripture",
    defaultLabel: "Scripture",
  },
  { mode: "text", labelKey: "playlist-add-mode-text", defaultLabel: "Text" },
  { mode: "link", labelKey: "playlist-add-mode-link", defaultLabel: "Link" },
];

/**
 * Input section for adding an item to the currently-edited playlist. Supports
 * three modes: a scripture reference (bible-verse item), free text (html item),
 * and a URL (link item).
 */
export function PlaylistItemInput(props: PlaylistItemInputProps) {
  const { books, onAdd } = props;
  const { t } = useI18n();
  const [mode, setMode] = useState<AddMode>("scripture");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Text mode is driven by the rich-text editor rather than `value`; track its
  // empty state separately so we can enable/disable the add button.
  const [editorEmpty, setEditorEmpty] = useState(true);
  const editorRef = useRef<RichTextEditorHandle>(null);

  const switchMode = (next: AddMode) => {
    setMode(next);
    setValue("");
    setEditorEmpty(true);
    setError(null);
  };

  const handleAdd = async () => {
    if (mode === "text") {
      // Serialize the editor contents only now, on submit, rather than on every
      // keystroke.
      const html = editorRef.current?.getHTML() ?? "";
      if (!html.trim()) {
        return;
      }
      onAdd({
        type: "html",
        html: await sanitize(html),
      });
      editorRef.current?.clear();
      setError(null);
      return;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }

    if (mode === "scripture") {
      const ref = parseVerseReference(trimmed, books);
      if (!ref) {
        setError(
          t("playlist-add-scripture-error", {
            defaultValue: "Couldn't find that reference",
          })
        );
        return;
      }
      onAdd({ type: "bible-verse", ref });
    } else {
      let url: string;
      try {
        url = new URL(trimmed).toString();
      } catch {
        setError(
          t("playlist-add-link-error", { defaultValue: "Enter a valid URL" })
        );
        return;
      }
      onAdd({ type: "link", url });
    }

    setValue("");
    setError(null);
  };

  const placeholder =
    mode === "scripture"
      ? t("playlist-add-scripture-placeholder", {
          defaultValue: "e.g. John 3:16",
        })
      : mode === "text"
        ? t("playlist-add-text-placeholder", { defaultValue: "Enter text" })
        : t("playlist-add-link-placeholder", {
            defaultValue: "https://example.com",
          });

  return (
    <DiscoverSection
      title={t("playlist-add-item", { defaultValue: "Add item" })}
    >
      <div className="sb-playlist-add-modes" role="tablist">
        {MODES.map((option) => (
          <button
            key={option.mode}
            type="button"
            role="tab"
            aria-selected={mode === option.mode}
            className={
              "sb-playlist-add-mode" +
              (mode === option.mode ? " sb-playlist-add-mode--active" : "")
            }
            onClick={() => switchMode(option.mode)}
          >
            {t(option.labelKey, { defaultValue: option.defaultLabel })}
          </button>
        ))}
      </div>

      <div className="sb-playlist-add-row">
        {mode === "text" ? (
          <RichTextEditor
            ref={editorRef}
            className="sb-discover-title-input sb-playlist-add-editor"
            onEmptyChange={(isEmpty) => {
              setEditorEmpty(isEmpty);
              setError(null);
            }}
          />
        ) : (
          <input
            className="sb-discover-title-input"
            type={mode === "link" ? "url" : "text"}
            value={value}
            dir="auto"
            placeholder={placeholder}
            onInput={(event: Event) => {
              setValue((event.currentTarget as HTMLInputElement).value);
              setError(null);
            }}
            onKeyDown={(event: KeyboardEvent) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleAdd();
              }
            }}
          />
        )}
        <button
          type="button"
          className="sb-settings-save-button"
          onClick={handleAdd}
          disabled={mode === "text" ? editorEmpty : !value.trim()}
        >
          {t("playlist-add-button", { defaultValue: "Add item" })}
        </button>
      </div>

      {error ? <div className="sb-playlist-add-error">{error}</div> : null}
    </DiscoverSection>
  );
}
