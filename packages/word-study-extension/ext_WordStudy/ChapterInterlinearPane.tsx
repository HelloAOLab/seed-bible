import "./WordStudy.css";
import { useSignal, type ReadonlySignal } from "@preact/signals";
import { memo } from "preact/compat";
import { useCallback, useEffect, useMemo, useRef } from "preact/hooks";
import { Skeleton, SkeletonContainer } from "seed-bible/components";
import { useI18n } from "seed-bible/i18n";
import type { InterlinearVerse, InterlinearWord } from "seed-bible/managers";
import type { VerseRef } from "@packages/seed-bible/seed-bible/managers/BibleDataManager";
import {
  chapterDirection,
  chapterLanguage,
  INTERLINEAR_LINES,
  type ChapterInterlinearState,
  type ChapterPosition,
  type InterlinearLine,
  type InterlinearLines,
} from "./chapterInterlinear";
import { LexiconCard } from "./LexiconCard";
import type { ChapterWordsResult, WordStudyProvider } from "./provider";
import { parseStrongsId } from "./strongs";
import { WordOrderToggle } from "./WordStudyPane";
import {
  isRightToLeft,
  languageTag,
  sortWords,
  type WordOrder,
} from "./wordStudyState";

/** "Interlinear" and the chapter, or "Lexicon" while a lexicon card is open. */
export function ChapterInterlinearTitle(props: {
  state: ChapterInterlinearState;
  position: ReadonlySignal<ChapterPosition | null>;
}) {
  const { state, position } = props;
  const { t } = useI18n("word-study-extension");

  if (state.lexiconStack.value.length > 0) {
    return (
      <div className="sb-word-study-title-row">
        <span className="sb-word-study-title">
          {t("lexicon", { defaultValue: "Lexicon" })}
        </span>
      </div>
    );
  }

  const current = position.value;
  return (
    <div className="sb-word-study-title-row">
      <span className="sb-word-study-title">
        {t("interlinear", { defaultValue: "Interlinear" })}
      </span>
      {current && (
        <span className="sb-word-study-reference" dir="auto">
          {`${current.bookName} ${current.chapter}`}
        </span>
      )}
    </div>
  );
}

export interface ChapterInterlinearPaneProps {
  provider: WordStudyProvider;
  state: ChapterInterlinearState;
  /** The reader's chapter. The view follows it as the reader moves on. */
  position: ReadonlySignal<ChapterPosition | null>;
  lines: InterlinearLines;
  onReferenceClick: (ref: VerseRef) => void;
}

/**
 * A whole chapter in the original language, each word a block of its
 * original, transliteration, gloss, Strong's number and parsing. Tapping a
 * word opens its lexicon card on top.
 */
export function ChapterInterlinearPane(props: ChapterInterlinearPaneProps) {
  const { provider, state, position, lines, onReferenceClick } = props;
  const { t } = useI18n("word-study-extension");
  const stack = state.lexiconStack.value;
  const openEntry = stack[stack.length - 1];

  return (
    <div className="sb-word-study-pane">
      {/* Hidden rather than unmounted under a card, so Back returns to the
          same place in the chapter without reloading it. */}
      <ChapterWords
        provider={provider}
        state={state}
        position={position.value}
        lines={lines}
        hidden={openEntry !== undefined}
      />
      {openEntry !== undefined && (
        <div className="sb-word-study-scroll">
          <LexiconCard
            key={`${stack.length}-${openEntry}`}
            provider={provider}
            strongsId={openEntry}
            onOpenStrongs={(strongsId) => state.openLexicon(strongsId)}
            onReferenceClick={onReferenceClick}
          />
        </div>
      )}
      {openEntry === undefined && position.value === null && (
        <p className="sb-word-study-message sb-interlinear-no-chapter">
          {t("no-chapter", {
            defaultValue: "Open a chapter to read it in the original language.",
          })}
        </p>
      )}
    </div>
  );
}

function ChapterWords(props: {
  provider: WordStudyProvider;
  state: ChapterInterlinearState;
  position: ChapterPosition | null;
  lines: InterlinearLines;
  hidden: boolean;
}) {
  const { provider, state, position, lines, hidden } = props;
  const { t } = useI18n("word-study-extension");
  const result = useSignal<ChapterWordsResult | null>(null);
  const attempt = useSignal(0);
  const attemptNumber = attempt.value;
  const scrollRef = useRef<HTMLDivElement>(null);
  const bookId = position?.bookId;
  const chapter = position?.chapter;

  // Read once here, and handed down as values that only change when they do,
  // so the memoized verses skip re-rendering when a lexicon card opens or
  // closes. A long chapter (Psalm 119) has thousands of word blocks.
  const showTransliteration = lines.isShown("transliteration");
  const showGloss = lines.isShown("gloss");
  const showStrongs = lines.isShown("strongs");
  const showParsing = lines.isShown("parsing");
  const shown = useMemo<ShownLines>(
    () => ({
      transliteration: showTransliteration,
      gloss: showGloss,
      strongs: showStrongs,
      parsing: showParsing,
    }),
    [showTransliteration, showGloss, showStrongs, showParsing]
  );
  const openEntry = useCallback(
    (strongsId: string) => state.openLexicon(strongsId),
    [state]
  );

  useEffect(() => {
    if (!bookId || !chapter) {
      result.value = null;
      return;
    }
    let isCurrent = true;
    result.value = null;
    provider
      .getChapterWords(bookId, chapter)
      .catch(
        (error: unknown): ChapterWordsResult => ({ status: "error", error })
      )
      .then((loaded) => {
        if (isCurrent) {
          result.value = loaded;
        }
      });
    return () => {
      isCurrent = false;
    };
  }, [provider, bookId, chapter, attemptNumber]);

  const loaded = result.value;
  const scrollToVerse = state.scrollToVerse.value;

  // A new chapter starts at its top, unless the view just opened on a verse.
  useEffect(() => {
    if (scrollRef.current && state.scrollToVerse.peek() === null) {
      scrollRef.current.scrollTop = 0;
    }
  }, [bookId, chapter]);

  useEffect(() => {
    if (!loaded || scrollToVerse === null || hidden) {
      return;
    }
    if (loaded.status === "ok") {
      scrollRef.current
        ?.querySelector(`[data-verse="${scrollToVerse}"]`)
        ?.scrollIntoView({ block: "start" });
    }
    // Cleared even when the chapter didn't load, so it can't apply to the
    // next chapter the reader moves to.
    state.scrollToVerse.value = null;
  }, [loaded, scrollToVerse, hidden]);

  if (!position) {
    return null;
  }

  let body;
  if (!loaded) {
    body = (
      <SkeletonContainer
        label={t("loading-chapter", {
          defaultValue: "Loading the chapter's original words",
        })}
        className="sb-word-study-skeleton"
      >
        <Skeleton shape="line" width="95%" />
        <Skeleton shape="line" width="88%" />
        <Skeleton shape="line" width="92%" />
        <Skeleton shape="line" width="70%" />
      </SkeletonContainer>
    );
  } else if (loaded.status === "book-unavailable") {
    body = (
      <p className="sb-word-study-message">
        {t("book-unavailable", {
          defaultValue: "Word study isn't available for this book yet.",
        })}
      </p>
    );
  } else if (loaded.status === "chapter-unavailable") {
    body = (
      <p className="sb-word-study-message">
        {t("chapter-unavailable", {
          defaultValue: "Word study isn't available for this chapter.",
        })}
      </p>
    );
  } else if (loaded.status === "error") {
    body = (
      <div className="sb-word-study-message" role="alert">
        <p>
          {t("chapter-load-failed", {
            defaultValue:
              "Couldn't load this chapter's original words. Check your connection and try again.",
          })}
        </p>
        <button
          type="button"
          className="sb-word-study-retry"
          onClick={() => {
            attempt.value = attemptNumber + 1;
          }}
        >
          {t("retry", { defaultValue: "Retry" })}
        </button>
      </div>
    );
  } else {
    const order = state.order.value;
    body = (
      <div
        className="sb-interlinear-chapter"
        dir={chapterDirection(chapterLanguage(loaded.verses), order)}
      >
        {loaded.verses.map((verse) => (
          <VerseBlocks
            key={verse.verse}
            verse={verse}
            order={order}
            shown={shown}
            onOpenEntry={openEntry}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="sb-word-study-scroll" hidden={hidden} ref={scrollRef}>
      <div className="sb-interlinear-controls">
        <WordOrderToggle order={state.order} />
        <LineToggles lines={lines} />
      </div>
      {body}
      <p className="sb-word-study-attribution">
        {t("interlinear-attribution", {
          defaultValue:
            "Interlinear data: Berean Standard Bible (public domain)",
        })}
      </p>
    </div>
  );
}

function LineToggles(props: { lines: InterlinearLines }) {
  const { lines } = props;
  const { t } = useI18n("word-study-extension");

  const label = (line: InterlinearLine) => {
    switch (line) {
      case "transliteration":
        return t("line-transliteration", { defaultValue: "Transliteration" });
      case "gloss":
        return t("line-gloss", { defaultValue: "Gloss" });
      case "strongs":
        return t("line-strongs", { defaultValue: "Strong's" });
      case "parsing":
        return t("line-parsing", { defaultValue: "Parsing" });
    }
  };

  return (
    <div
      className="sb-interlinear-lines"
      role="group"
      aria-label={t("show-lines", { defaultValue: "Lines to show" })}
    >
      {INTERLINEAR_LINES.map((line) => {
        const isShown = lines.isShown(line);
        return (
          <button
            key={line}
            type="button"
            className="sb-interlinear-line-toggle"
            aria-pressed={isShown}
            onClick={() => {
              void lines.setShown(line, !isShown);
            }}
          >
            {label(line)}
          </button>
        );
      })}
    </div>
  );
}

/** Which of the optional lines show under each word. */
type ShownLines = Record<InterlinearLine, boolean>;

const VerseBlocks = memo(function VerseBlocks(props: {
  verse: InterlinearVerse;
  order: WordOrder;
  shown: ShownLines;
  onOpenEntry: (strongsId: string) => void;
}) {
  const { verse, order, shown, onOpenEntry } = props;
  const { t } = useI18n("word-study-extension");

  return (
    <section
      className="sb-interlinear-verse"
      data-verse={verse.verse}
      aria-label={t("verse-label", {
        defaultValue: "Verse {{verse}}",
        verse: verse.verse,
      })}
    >
      <span className="sb-interlinear-verse-number" aria-hidden="true">
        {verse.verse}
      </span>
      <ol className="sb-interlinear-words">
        {sortWords(verse.words, order).map((word) => (
          <WordBlock
            key={word.pos}
            word={word}
            shown={shown}
            onOpenEntry={onOpenEntry}
          />
        ))}
      </ol>
    </section>
  );
});

const WordBlock = memo(function WordBlock(props: {
  word: InterlinearWord;
  shown: ShownLines;
  onOpenEntry: (strongsId: string) => void;
}) {
  const { word, shown, onOpenEntry } = props;
  const { t } = useI18n("word-study-extension");
  const strongs = word.strongs ? parseStrongsId(word.strongs) : null;

  const content = (
    <>
      <span
        className="sb-interlinear-original"
        dir={isRightToLeft(word.language) ? "rtl" : "ltr"}
        lang={languageTag(word.language)}
      >
        {word.text}
      </span>
      {/* The English lines are set left to right themselves: a Hebrew
          chapter is right to left, and inheriting that would move edge
          punctuation to the wrong end (’ĕ·lō·hîm read as ĕ·lō·hîm’). */}
      {shown.transliteration && (
        <span className="sb-interlinear-transliteration" dir="ltr">
          {word.transliteration}
        </span>
      )}
      {shown.gloss && (
        <span className="sb-interlinear-gloss" dir="ltr">
          {word.gloss ?? "—"}
        </span>
      )}
      {shown.strongs && strongs && (
        <span className="sb-interlinear-strongs" dir="ltr">
          {strongs.fullId}
        </span>
      )}
      {shown.parsing && (
        <span
          className="sb-interlinear-parsing"
          dir="ltr"
          title={word.parsingFull}
        >
          {word.parsing}
        </span>
      )}
    </>
  );

  return (
    <li className="sb-interlinear-word">
      {strongs ? (
        <button
          type="button"
          className="sb-interlinear-word-main sb-interlinear-word-main--link"
          title={t("open-entry", {
            defaultValue: "Open the lexicon entry for {{word}}",
            word: word.text,
          })}
          onClick={() => onOpenEntry(strongs.fullId)}
        >
          {content}
        </button>
      ) : (
        <div
          className="sb-interlinear-word-main"
          title={t("no-strongs", {
            defaultValue:
              "This word has no Strong's number, so it has no lexicon entry.",
          })}
        >
          {content}
        </div>
      )}
    </li>
  );
});
