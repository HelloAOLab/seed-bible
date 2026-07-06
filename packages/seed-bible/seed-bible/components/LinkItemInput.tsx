import { useState } from "preact/hooks";
import { useI18n } from "../i18n/I18nManager";
import type { PlaylistItemData } from "../managers/PlaylistManager";

interface LinkItemInputProps {
  onAdd: (item: PlaylistItemData) => void;
}

/**
 * Adds a URL (link item) to the playlist. Tracks the in-progress URL text and
 * any validation error.
 */
export function LinkItemInput(props: LinkItemInputProps) {
  const { onAdd } = props;
  const { t } = useI18n();
  const [value, setValue] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleAdd = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    let url: string;
    try {
      url = new URL(trimmed).toString();
    } catch {
      setError(
        t("playlist-add-link-error", { defaultValue: "Enter a valid URL" })
      );
      return;
    }
    const trimmedTitle = title.trim();
    onAdd({ type: "link", url, title: trimmedTitle || undefined });
    setValue("");
    setTitle("");
    setError(null);
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
        onKeyDown={(event: KeyboardEvent) => {
          if (event.key === "Enter") {
            event.preventDefault();
            handleAdd();
          }
        }}
      />
      <div className="sb-playlist-add-row">
        <input
          className="sb-discover-title-input"
          type="url"
          value={value}
          dir="auto"
          placeholder={t("playlist-add-link-placeholder", {
            defaultValue: "https://example.com",
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
