import "./CompareItemInput.css";
import { useImperativeHandle, useState } from "preact/hooks";
import { forwardRef } from "preact/compat";
import { useI18n } from "../../i18n/I18nManager";
import type {
  PlaylistItemData,
  VerseRef,
} from "../../managers/PlaylistManager";
import type { TranslationBook } from "../../managers/FreeUseBibleAPI";
import { resolveTypedReference } from "../ScriptureItemInput/scriptureSuggestions";
import { verseRefLabel } from "../playlistItemLabel";

interface CompareItemInputProps {
  books: TranslationBook[];
  onAdd: (item: PlaylistItemData) => void;
  /** The comparison the fields start with, e.g. when editing an item. */
  initialItem?: { title?: string; refs: VerseRef[]; description?: string };
  /** Overrides the submit button label (defaults to "Add item"). */
  submitLabel?: string;
}

/** Imperative handle so a parent can check for / commit an in-progress draft. */
export interface CompareItemInputHandle {
  /**
   * Whether the comparison differs from what the fields started with: an
   * un-added draft when adding, unsaved changes when editing.
   */
  isDirty: () => boolean;
  /** Submits the current input, same as clicking "Add". Returns whether it
   * actually added an item (false when a reference is missing or unknown). */
  commit: () => boolean;
}

export { resolveTypedReference };

/**
 * Adds a compare step: two passages shown side by side, with a title and a
 * line saying what to look for. Each passage is typed as a reference, "Gen
 * 16:7-13" or "Exodus 3", and read the way the scripture field reads one.
 */
export const CompareItemInput = forwardRef<
  CompareItemInputHandle,
  CompareItemInputProps
>(function CompareItemInput(props, ref) {
  const { books, onAdd, initialItem, submitLabel } = props;
  const { t } = useI18n();
  const resolveBookName = (bookId: string) => {
    const book = books.find((b) => b.id === bookId);
    return book?.name ?? book?.commonName ?? bookId;
  };
  const initialTexts = [0, 1].map((index) => {
    const initialRef = initialItem?.refs[index];
    return initialRef ? verseRefLabel(initialRef, resolveBookName) : "";
  });
  const [title, setTitle] = useState(initialItem?.title ?? "");
  const [texts, setTexts] = useState<string[]>(initialTexts);
  const [description, setDescription] = useState(
    initialItem?.description ?? ""
  );
  const [error, setError] = useState<string | null>(null);

  const refs = texts.map((text) => resolveTypedReference(text, books));
  const complete = texts.every((text) => text.trim());

  const handleAdd = (): boolean => {
    if (!complete) {
      return false;
    }
    if (refs.some((resolved) => !resolved)) {
      setError(
        t("playlist-add-scripture-error", {
          defaultValue: "Couldn't find that reference",
        })
      );
      return false;
    }
    onAdd({
      type: "compare",
      title: title.trim() || undefined,
      refs: refs as VerseRef[],
      description: description.trim() || undefined,
    });
    setTitle("");
    setTexts(["", ""]);
    setDescription("");
    setError(null);
    return true;
  };

  useImperativeHandle(
    ref,
    () => ({
      isDirty: () =>
        title.trim() !== (initialItem?.title ?? "").trim() ||
        description.trim() !== (initialItem?.description ?? "").trim() ||
        texts.some((text, index) => text.trim() !== initialTexts[index]),
      commit: handleAdd,
    }),
    [title, description, texts, initialItem]
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
      <div className="sb-compare-refs">
        {texts.map((text, index) => (
          <input
            key={index}
            className="sb-settings-text-input sb-playlist-input"
            type="text"
            value={text}
            dir="auto"
            placeholder={t("playlist-add-scripture-placeholder", {
              defaultValue: "e.g. John 3 or John 3:16",
            })}
            aria-label={t("playlist-compare-passage-label", {
              defaultValue: "Passage {{number}}",
              number: index + 1,
            })}
            onInput={(event: Event) => {
              const value = (event.currentTarget as HTMLInputElement).value;
              setTexts((current) =>
                current.map((existing, i) => (i === index ? value : existing))
              );
              setError(null);
            }}
          />
        ))}
      </div>
      <div className="sb-playlist-add-row sb-playlist-add-text-row">
        <textarea
          className="sb-settings-text-input sb-playlist-input sb-compare-description-input"
          rows={2}
          value={description}
          dir="auto"
          placeholder={t("playlist-compare-description-placeholder", {
            defaultValue: "What should readers look for? (optional)",
          })}
          aria-label={t("playlist-compare-description-label", {
            defaultValue: "What to look for",
          })}
          onInput={(event: Event) => {
            setDescription((event.currentTarget as HTMLTextAreaElement).value);
          }}
        />
        <button
          type="button"
          className="sb-settings-save-button"
          onClick={handleAdd}
          disabled={!complete}
        >
          {submitLabel ??
            t("playlist-add-button", { defaultValue: "Add item" })}
        </button>
      </div>
      {error ? <div className="sb-playlist-add-error">{error}</div> : null}
    </>
  );
});
