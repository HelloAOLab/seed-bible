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
import { PassagePicker } from "../PassagePicker/PassagePicker";
import type { ScriptureChapterLoader } from "../PlaylistItemInlinePreview/PlaylistItemInlinePreview";

type CompareItem = Extract<PlaylistItemData, { type: "compare" }>;
type CompareRef = CompareItem["refs"][number];

interface CompareItemInputProps {
  books: TranslationBook[];
  /** Loads a chapter's text, for choosing a passage's verses. */
  loadChapter?: ScriptureChapterLoader;
  onAdd: (item: PlaylistItemData) => void;
  /** The comparison the fields start with, e.g. when editing an item. */
  initialItem?: Omit<CompareItem, "type">;
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
   * actually added an item (false while a passage is missing). */
  commit: () => boolean;
}

export { resolveTypedReference };

/** A compared passage as the picker knows it, without its label and phrases. */
function plainRef(ref: CompareRef | undefined): VerseRef | null {
  if (!ref) {
    return null;
  }
  const { label: _label, phrases: _phrases, ...plain } = ref;
  return plain;
}

/**
 * Adds a compare step: two passages shown side by side, with a title and a
 * line saying what to look for. Each passage is chosen with the same picker
 * as a scripture step (a typed reference, or a book, chapter and verses), one
 * passage at a time behind a tab. Editing keeps what the fields don't show:
 * each passage's label, the phrases marked in an unchanged passage, the
 * marked terms and the step's translation.
 */
export const CompareItemInput = forwardRef<
  CompareItemInputHandle,
  CompareItemInputProps
>(function CompareItemInput(props, ref) {
  const { books, loadChapter, onAdd, initialItem, submitLabel } = props;
  const { t } = useI18n();
  const resolveBookName = (bookId: string) => {
    const book = books.find((b) => b.id === bookId);
    return book?.name ?? book?.commonName ?? bookId;
  };
  const initialRefs = [0, 1].map((index) => plainRef(initialItem?.refs[index]));
  const [title, setTitle] = useState(initialItem?.title ?? "");
  const [refs, setRefs] = useState<(VerseRef | null)[]>(initialRefs);
  const [active, setActive] = useState(0);
  const [description, setDescription] = useState(
    initialItem?.description ?? ""
  );
  const [error, setError] = useState<string | null>(null);

  const complete = refs.every(Boolean);

  const handleAdd = (): boolean => {
    if (!complete) {
      setError(
        t("playlist-compare-missing", {
          defaultValue: "Choose both passages to compare",
        })
      );
      setActive(refs[0] ? 1 : 0);
      return false;
    }
    const {
      title: _title,
      description: _description,
      refs: _refs,
      ...rest
    } = initialItem ?? {};
    onAdd({
      ...rest,
      type: "compare",
      title: title.trim() || undefined,
      refs: (refs as VerseRef[]).map((chosen, index) => {
        const before = initialItem?.refs[index];
        const unchanged =
          JSON.stringify(chosen) === JSON.stringify(initialRefs[index]);
        return {
          ...chosen,
          ...(before?.label ? { label: before.label } : {}),
          ...(unchanged && before?.phrases ? { phrases: before.phrases } : {}),
        };
      }),
      description: description.trim() || undefined,
    });
    setTitle("");
    setRefs([null, null]);
    setActive(0);
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
        JSON.stringify(refs) !== JSON.stringify(initialRefs),
      commit: handleAdd,
    }),
    [title, description, refs, initialItem]
  );

  return (
    <div className="sb-compare-input">
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
      <div
        className="sb-compare-tabs"
        role="tablist"
        aria-label={t("playlist-compare-passages", {
          defaultValue: "Passages",
        })}
      >
        {refs.map((chosen, index) => (
          <button
            key={index}
            type="button"
            role="tab"
            aria-selected={active === index}
            className={`sb-compare-tab${
              active === index ? " sb-compare-tab--on" : ""
            }`}
            onClick={() => setActive(index)}
          >
            <span className="sb-compare-tab-label">
              {t("playlist-compare-passage-label", {
                defaultValue: "Passage {{number}}",
                number: index + 1,
              })}
            </span>
            <span className="sb-compare-tab-ref" dir="auto">
              {chosen
                ? verseRefLabel(chosen, resolveBookName)
                : t("playlist-passage-none", {
                    defaultValue: "No passage yet",
                  })}
            </span>
          </button>
        ))}
      </div>
      <PassagePicker
        // A picker per passage, so switching tabs shows that one's reference.
        key={active}
        books={books}
        loadChapter={loadChapter}
        value={refs[active] ?? null}
        onChange={(next) => {
          setRefs((current) =>
            current.map((existing, i) => (i === active ? next : existing))
          );
          setError(null);
        }}
      />
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
      {error ? (
        <div className="sb-playlist-add-error" role="alert">
          {error}
        </div>
      ) : null}
    </div>
  );
});
