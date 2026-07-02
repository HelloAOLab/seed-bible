import { useState } from "preact/hooks";
import { useI18n } from "../i18n/I18nManager";
import type { PlaylistItemData } from "../managers/PlaylistManager";
import type { TranslationBook } from "../managers/FreeUseBibleAPI";
import { parseVerseReference } from "../managers/parseVerseReference";

interface ScriptureItemInputProps {
  books: TranslationBook[];
  onAdd: (item: PlaylistItemData) => void;
}

/**
 * Adds a scripture reference (bible-verse item) to the playlist. Tracks the
 * in-progress reference text and any parse error.
 */
export function ScriptureItemInput(props: ScriptureItemInputProps) {
  const { books, onAdd } = props;
  const { t } = useI18n();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleAdd = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
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
    setValue("");
    setError(null);
  };

  return (
    <>
      <div className="sb-playlist-add-row">
        <input
          className="sb-discover-title-input"
          type="text"
          value={value}
          dir="auto"
          placeholder={t("playlist-add-scripture-placeholder", {
            defaultValue: "e.g. John 3:16",
          })}
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
        <button
          type="button"
          className="sb-settings-save-button"
          onClick={handleAdd}
          disabled={!value.trim()}
        >
          {t("playlist-add-button", { defaultValue: "Add item" })}
        </button>
      </div>
      {error ? <div className="sb-playlist-add-error">{error}</div> : null}
    </>
  );
}
