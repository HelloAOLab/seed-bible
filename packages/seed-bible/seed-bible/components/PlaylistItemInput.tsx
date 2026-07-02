import { useState } from "preact/hooks";
import { useI18n } from "../i18n/I18nManager";
import type { PlaylistManager } from "../managers/PlaylistManager";
import type { TranslationBook } from "../managers/FreeUseBibleAPI";
import { parseVerseReference } from "../managers/parseVerseReference";
import { DiscoverSection } from "./DiscoverSection";

interface PlaylistItemInputProps {
  playlists: PlaylistManager;
  books: TranslationBook[];
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

/** Escapes HTML special characters so typed text renders literally. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Input section for adding an item to the currently-edited playlist. Supports
 * three modes: a scripture reference (bible-verse item), free text (html item),
 * and a URL (link item).
 */
export function PlaylistItemInput(props: PlaylistItemInputProps) {
  const { playlists, books } = props;
  const { t } = useI18n();
  const [mode, setMode] = useState<AddMode>("scripture");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const switchMode = (next: AddMode) => {
    setMode(next);
    setValue("");
    setError(null);
  };

  const handleAdd = () => {
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
      playlists.addEditingPlaylistItem({ type: "bible-verse", ref });
    } else if (mode === "text") {
      playlists.addEditingPlaylistItem({
        type: "html",
        html: escapeHtml(trimmed),
      });
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
      playlists.addEditingPlaylistItem({ type: "link", url });
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
          <textarea
            className="sb-discover-title-input sb-playlist-add-textarea"
            value={value}
            dir="auto"
            rows={3}
            placeholder={placeholder}
            onInput={(event: Event) => {
              setValue((event.currentTarget as HTMLTextAreaElement).value);
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
          disabled={!value.trim()}
        >
          {t("playlist-add-button", { defaultValue: "Add item" })}
        </button>
      </div>

      {error ? <div className="sb-playlist-add-error">{error}</div> : null}
    </DiscoverSection>
  );
}
