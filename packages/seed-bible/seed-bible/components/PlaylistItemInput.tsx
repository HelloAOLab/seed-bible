import { useState } from "preact/hooks";
import { useI18n } from "../i18n/I18nManager";
import type { PlaylistItemData } from "../managers/PlaylistManager";
import type { TranslationBook } from "../managers/FreeUseBibleAPI";
import { DiscoverSection } from "./DiscoverSection";
import { ScriptureItemInput } from "./ScriptureItemInput";
import { TextItemInput } from "./TextItemInput";
import { LinkItemInput } from "./LinkItemInput";

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
 * Input section for adding an item to the currently-edited playlist. Owns only
 * the selected mode; each mode is a self-contained component that tracks its
 * own input state (see `ScriptureItemInput`, `TextItemInput`, `LinkItemInput`).
 * Switching modes unmounts the previous one, so its state resets naturally.
 */
export function PlaylistItemInput(props: PlaylistItemInputProps) {
  const { books, onAdd } = props;
  const { t } = useI18n();
  const [mode, setMode] = useState<AddMode>("scripture");

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
            onClick={() => setMode(option.mode)}
          >
            {t(option.labelKey, { defaultValue: option.defaultLabel })}
          </button>
        ))}
      </div>

      {mode === "scripture" ? (
        <ScriptureItemInput books={books} onAdd={onAdd} />
      ) : mode === "text" ? (
        <TextItemInput onAdd={onAdd} />
      ) : (
        <LinkItemInput onAdd={onAdd} />
      )}
    </DiscoverSection>
  );
}
