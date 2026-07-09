import "./ScriptureItemInput.css";
import { useState } from "preact/hooks";
import { useI18n } from "../../i18n/I18nManager";
import type {
  PlaylistItemData,
  VerseRef,
} from "../../managers/PlaylistManager";
import type { TranslationBook } from "../../managers/FreeUseBibleAPI";
import { computeSuggestions } from "./scriptureSuggestions";

interface ScriptureItemInputProps {
  books: TranslationBook[];
  onAdd: (item: PlaylistItemData) => void;
  /** Reference text the field starts with, e.g. when editing an item. */
  initialValue?: string;
  /** Overrides the submit button label (defaults to "Add item"). */
  submitLabel?: string;
}

/**
 * Adds a scripture reference (bible-verse item) to the playlist. As the user
 * types, a dropdown offers matching books (by name or id prefix) with their
 * chapters as buttons; clicking a chapter adds it, and Enter adds the first
 * option in the list.
 */
export function ScriptureItemInput(props: ScriptureItemInputProps) {
  const { books, onAdd, initialValue, submitLabel } = props;
  const { t } = useI18n();
  const [value, setValue] = useState(initialValue ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  const suggestions = computeSuggestions(value, books);
  const firstOption = suggestions[0]?.options[0] ?? null;
  const showSuggestions = isFocused && suggestions.length > 0;

  const addRef = (ref: VerseRef) => {
    onAdd({ type: "bible-verse", ref });
    setValue("");
    setError(null);
  };

  const handleSubmit = () => {
    if (!value.trim()) {
      return;
    }
    if (!firstOption) {
      setError(
        t("playlist-add-scripture-error", {
          defaultValue: "Couldn't find that reference",
        })
      );
      return;
    }
    addRef(firstOption.ref);
  };

  return (
    <>
      <div className="sb-scripture-input">
        <div className="sb-playlist-add-row">
          <input
            className="sb-settings-text-input sb-playlist-input"
            type="text"
            value={value}
            dir="auto"
            placeholder={t("playlist-add-scripture-placeholder", {
              defaultValue: "e.g. John 3 or John 3:16",
            })}
            onInput={(event: Event) => {
              setValue((event.currentTarget as HTMLInputElement).value);
              setError(null);
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={(event: KeyboardEvent) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleSubmit();
              } else if (event.key === "Escape") {
                setIsFocused(false);
              }
            }}
          />
          <button
            type="button"
            className="sb-settings-save-button"
            onClick={handleSubmit}
            disabled={!value.trim()}
          >
            {submitLabel ??
              t("playlist-add-button", { defaultValue: "Add item" })}
          </button>
        </div>

        {showSuggestions ? (
          <ul className="sb-scripture-suggestions" role="listbox">
            {suggestions.map((suggestion) => (
              <li key={suggestion.book.id} className="sb-scripture-suggestion">
                <span className="sb-scripture-suggestion-book" dir="auto">
                  {suggestion.book.commonName || suggestion.book.name}
                </span>
                <div className="sb-scripture-chapter-list">
                  {suggestion.options.map((option) => (
                    <button
                      key={option.label}
                      type="button"
                      role="option"
                      aria-selected={option === firstOption}
                      className={`sb-scripture-chapter-button${
                        option === firstOption
                          ? " sb-scripture-chapter-button--first"
                          : ""
                      }`}
                      // mousedown (not click) so the option is added before the
                      // input's blur can hide the list out from under the tap.
                      onMouseDown={(event: MouseEvent) => {
                        event.preventDefault();
                        addRef(option.ref);
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {error ? <div className="sb-playlist-add-error">{error}</div> : null}
    </>
  );
}
