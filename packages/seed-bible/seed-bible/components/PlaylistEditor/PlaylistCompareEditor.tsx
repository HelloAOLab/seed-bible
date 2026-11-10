import "../PlaylistStepPage/PlaylistStepPage.css";
import "../PlaylistCompareStep/PlaylistCompareStep.css";
import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import { useI18n } from "../../i18n/I18nManager";
import { extractContentText } from "../../managers/ChapterText";
import type { TranslationBookChapter } from "../../managers/FreeUseBibleAPI";
import {
  passageVerses,
  type PlaylistItemData,
  type VerseRef,
} from "../../managers/PlaylistManager";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import { MaterialIcon } from "../icons";
import type { ScriptureChapterLoader } from "../PlaylistItemInlinePreview/PlaylistItemInlinePreview";
import { passageLabel, playlistItemLabel } from "../playlistItemLabel";
import { PlaylistStepNoteSheet } from "./PlaylistStepNoteSheet";

type ScriptureItem = Extract<PlaylistItemData, { type: "bible-verse" }>;
type Which = "first" | "second";

/** How many verses either side of a passage show, faded, to extend it into. */
const CONTEXT_VERSES = 2;
/** How many more each "Earlier verses" or "Later verses" shows. */
const MORE_VERSES = 5;

/**
 * A compare step's editor: the page readers see when it plays (its title,
 * then each passage under its reference), made editable. A passage's
 * reference opens the book selector for a new chapter; tapping its first and
 * last verse sets which verses it covers, as in a scripture step. The note
 * rides along the bottom, as a scripture step's does.
 */
export function PlaylistCompareEditor(props: {
  state: SeedBibleState;
  index: number;
  item: ScriptureItem;
  loadChapter: ScriptureChapterLoader;
  resolveBookName: (bookId: string) => string;
  compact: boolean;
}) {
  const { state, index, item, loadChapter, resolveBookName, compact } = props;
  const { playlists } = state;
  const { t } = useI18n();
  // The first verse tapped, until the last is: they make the new passage.
  const [pick, setPick] = useState<{ which: Which; verse: number } | null>(
    null
  );
  const compare = item.compare ?? { ref: item.ref };
  const refOf = (which: Which) => (which === "first" ? item.ref : compare.ref);

  const setPassage = (which: Which, ref: VerseRef) => {
    playlists.updateEditingPlaylistItem(
      index,
      which === "first"
        ? { ...item, ref }
        : { ...item, compare: { ...compare, ref } }
    );
  };
  const choose = (which: Which, from: number, to: number) => {
    const ref = refOf(which);
    const start = Math.min(from, to);
    const end = Math.max(from, to);
    setPassage(which, {
      bookId: ref.bookId,
      chapter: ref.chapter,
      verse: start,
      ...(end > start ? { endVerse: end } : {}),
    });
    setPick(null);
  };
  const tapVerse = (which: Which, verse: number) => {
    if (pick?.which === which) {
      choose(which, pick.verse, verse);
    } else {
      setPick({ which, verse });
    }
  };

  const passage = (which: Which) => {
    const ref = refOf(which);
    const label = passageLabel(ref, resolveBookName);
    return (
      <section key={which} className="sb-playlist-compare-column">
        <h3 className="sb-playlist-compare-passage" dir="auto">
          <button
            type="button"
            className="sb-pe-compare-reference"
            aria-label={t("playlist-editor-compare-change-chapter", {
              passage: label,
              defaultValue: "{{passage}}: choose a different chapter",
            })}
            onClick={() => {
              setPick(null);
              playlists.pickEditorComparePassage(index, which);
            }}
          >
            {label}
            <MaterialIcon className="sb-pe-compare-reference-icon">
              expand_more
            </MaterialIcon>
          </button>
        </h3>
        <PassageVerses
          // A new chapter starts with the usual few verses around it.
          key={`${ref.bookId}-${ref.chapter}`}
          passage={ref}
          translationId={item.translationId}
          loadChapter={loadChapter}
          firstPicked={pick?.which === which ? pick.verse : null}
          onVerse={(verse) => tapVerse(which, verse)}
        />
      </section>
    );
  };

  const picking = pick
    ? {
        ...pick,
        reference: passageLabel(
          {
            bookId: refOf(pick.which).bookId,
            chapter: refOf(pick.which).chapter,
            verse: pick.verse,
          },
          resolveBookName
        ),
      }
    : null;

  return (
    <div
      className={`sb-pe-compare-editor${
        compact ? " sb-pe-compare-editor--mobile" : ""
      }`}
    >
      <div className="sb-pe-compare-scroll">
        <article className="sb-playlist-step-page sb-playlist-compare sb-pe-compare-page">
          <h2 className="sb-playlist-step-page-title" dir="auto">
            {playlistItemLabel(item, t, resolveBookName)}
          </h2>
          <p className="sb-pe sb-pe-compare-hint">
            {t("playlist-editor-compare-hint", {
              defaultValue:
                "Tap a passage's first verse, then its last, to choose it. Its reference opens the book selector.",
            })}
          </p>
          <div className="sb-playlist-compare-columns">
            {passage("first")}
            {passage("second")}
          </div>
        </article>
      </div>
      <div className="sb-pe-compare-dock">
        {picking ? (
          <ComparePickBar
            reference={picking.reference}
            onCancel={() => setPick(null)}
            onJustThis={() =>
              choose(picking.which, picking.verse, picking.verse)
            }
          />
        ) : null}
        <PlaylistStepNoteSheet
          key={index}
          state={state}
          index={index}
          item={item}
          resolveBookName={resolveBookName}
        />
      </div>
    </div>
  );
}

/**
 * Asks for the last verse of the passage being picked. On one line where it
 * fits; where it doesn't (a long reference, a narrow phone), the instruction
 * centred over its two buttons, side by side.
 */
function ComparePickBar(props: {
  reference: string;
  onCancel: () => void;
  onJustThis: () => void;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const [stacked, setStacked] = useState(false);

  // Whether it fits on one line can only be measured, by laying it out on one.
  useLayoutEffect(() => {
    const bar = ref.current;
    if (!bar || typeof ResizeObserver === "undefined") {
      return;
    }
    const measure = () => {
      bar.classList.remove(STACKED_PICKBAR);
      const overflows = bar.scrollWidth > bar.clientWidth;
      // Set here as well as by the render, which only writes it on a change.
      bar.classList.toggle(STACKED_PICKBAR, overflows);
      setStacked(overflows);
    };
    measure();
    // The dock, not the bar, whose own height changes with its layout.
    const observer = new ResizeObserver(measure);
    observer.observe(bar.parentElement ?? bar);
    return () => observer.disconnect();
  }, [props.reference]);

  return (
    <div
      ref={ref}
      className={`sb-pe sb-pe-pickbar sb-pe-compare-pickbar${
        stacked ? ` ${STACKED_PICKBAR}` : ""
      }`}
      role="status"
    >
      <span>
        {t("playlist-editor-compare-pick-last", {
          defaultValue: "Now tap the last verse",
        })}
      </span>
      <button
        type="button"
        className="sb-pe-pickbar-cancel"
        onClick={props.onCancel}
      >
        {t("cancel", { defaultValue: "Cancel" })}
      </button>
      <button
        type="button"
        className="sb-pe-pickbar-apply"
        onClick={props.onJustThis}
      >
        {t("playlist-editor-compare-just", {
          reference: props.reference,
          defaultValue: "Just {{reference}}",
        })}
      </button>
    </div>
  );
}

const STACKED_PICKBAR = "sb-pe-compare-pickbar--stacked";

/**
 * A passage's verses, with a few either side of it faded: tapping any of them
 * is how the passage is changed. A whole-chapter passage shows the chapter.
 */
function PassageVerses(props: {
  passage: VerseRef;
  translationId: string | undefined;
  loadChapter: ScriptureChapterLoader;
  firstPicked: number | null;
  onVerse: (verse: number) => void;
}) {
  const { passage, translationId, firstPicked, onVerse } = props;
  const { t } = useI18n();
  const [chapter, setChapter] = useState<
    TranslationBookChapter | "error" | null
  >(null);
  const [extra, setExtra] = useState({ before: 0, after: 0 });
  // The loader is a new function on every render; the chapter only needs
  // loading again when the passage moves to another one.
  const loadRef = useRef(props.loadChapter);
  loadRef.current = props.loadChapter;

  useEffect(() => {
    let cancelled = false;
    setChapter(null);
    loadRef
      .current(translationId, passage.bookId, passage.chapter)
      .then((loaded) => {
        if (!cancelled) setChapter(loaded);
      })
      .catch(() => {
        if (!cancelled) setChapter("error");
      });
    return () => {
      cancelled = true;
    };
  }, [translationId, passage.bookId, passage.chapter]);

  if (chapter === "error") {
    return (
      <p className="sb-pe-compare-status">
        {t("playlist-editor-passage-failed", {
          defaultValue: "This passage couldn't be loaded.",
        })}
      </p>
    );
  }
  if (!chapter) {
    return (
      <p className="sb-pe-compare-status">
        {t("loading", { defaultValue: "Loading…" })}
      </p>
    );
  }

  const verses = chapter.chapter.content.flatMap((entry) =>
    entry.type === "verse"
      ? [{ number: entry.number, text: extractContentText(entry.content) }]
      : []
  );
  const lastVerse = verses[verses.length - 1]?.number ?? 0;
  const span = passageVerses(passage, {
    bookId: chapter.book.id,
    chapter: chapter.chapter.number,
    numberOfVerses: chapter.numberOfVerses,
  }) ?? { start: 1, end: lastVerse };
  const from = Math.max(1, span.start - CONTEXT_VERSES - extra.before);
  const to = Math.min(lastVerse, span.end + CONTEXT_VERSES + extra.after);
  const shown = verses.filter((v) => v.number >= from && v.number <= to);

  return (
    <div className="sb-pe-compare-verses">
      {from > 1 ? (
        <button
          type="button"
          className="sb-pe sb-pe-compare-more"
          onClick={() =>
            setExtra({ ...extra, before: extra.before + MORE_VERSES })
          }
        >
          {t("playlist-editor-compare-earlier", {
            defaultValue: "Earlier verses",
          })}
        </button>
      ) : null}
      <p className="sb-pe-compare-text" dir="auto">
        {shown.map((verse) => {
          const inPassage =
            verse.number >= span.start && verse.number <= span.end;
          return (
            <span
              key={verse.number}
              role="button"
              tabIndex={0}
              aria-pressed={inPassage}
              className={`sb-pe-compare-verse${
                inPassage ? "" : " sb-pe-compare-verse--outside"
              }${verse.number === firstPicked ? " sb-pe-compare-verse--picked" : ""}`}
              onClick={() => onVerse(verse.number)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onVerse(verse.number);
                }
              }}
            >
              <sup className="sb-pe-compare-verse-number">{verse.number}</sup>
              {verse.text}{" "}
            </span>
          );
        })}
      </p>
      {to < lastVerse ? (
        <button
          type="button"
          className="sb-pe sb-pe-compare-more"
          onClick={() =>
            setExtra({ ...extra, after: extra.after + MORE_VERSES })
          }
        >
          {t("playlist-editor-compare-later", {
            defaultValue: "Later verses",
          })}
        </button>
      ) : null}
    </div>
  );
}
