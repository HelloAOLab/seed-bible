import { useState } from "preact/hooks";
import { useI18n } from "../i18n/I18nManager";
import type { PlaylistItemData } from "../managers/PlaylistManager";

interface LinkItemInputProps {
  onAdd: (item: PlaylistItemData) => void;
  /** URL, title, and embed flag the fields start with, e.g. when editing an item. */
  initialItem?: { url: string; title?: string; embed?: boolean };
  /** Overrides the submit button label (defaults to "Add item"). */
  submitLabel?: string;
}

/**
 * Adds a URL (link item) to the playlist. Tracks the in-progress URL text and
 * any validation error.
 */
export function LinkItemInput(props: LinkItemInputProps) {
  const { onAdd, initialItem, submitLabel } = props;
  const { t } = useI18n();
  const [value, setValue] = useState(initialItem?.url ?? "");
  const [title, setTitle] = useState(initialItem?.title ?? "");
  const [embed, setEmbed] = useState(initialItem?.embed ?? false);
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
    onAdd({
      type: "link",
      url,
      title: trimmedTitle || undefined,
      embed: embed || undefined,
    });
    setValue("");
    setTitle("");
    setEmbed(false);
    setError(null);
  };

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
        onKeyDown={(event: KeyboardEvent) => {
          if (event.key === "Enter") {
            event.preventDefault();
            handleAdd();
          }
        }}
      />
      <div className="sb-playlist-add-row sb-playlist-add-link-row">
        <input
          className="sb-settings-text-input sb-playlist-input"
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
      </div>
      <div className="sb-playlist-add-row sb-playlist-add-link-controls">
        <label className="sb-playlist-embed-toggle">
          <input
            type="checkbox"
            checked={embed}
            onChange={(event: Event) => {
              setEmbed((event.currentTarget as HTMLInputElement).checked);
            }}
          />
          <span>
            {t("playlist-add-link-embed", {
              defaultValue: "Embed this link",
            })}
          </span>
        </label>
        <button
          type="button"
          className="sb-settings-save-button"
          onClick={handleAdd}
          disabled={!value.trim()}
        >
          {submitLabel ??
            t("playlist-add-button", { defaultValue: "Add item" })}
        </button>
      </div>
      {error ? <div className="sb-playlist-add-error">{error}</div> : null}
    </>
  );
}
