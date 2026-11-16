import "./WordStudy.css";
import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import {
  MaterialIcon,
  Skeleton,
  SkeletonContainer,
} from "seed-bible/components";
import { useI18n } from "seed-bible/i18n";
import type { InterlinearWord } from "seed-bible/managers";
import type { VerseRef } from "@packages/seed-bible/seed-bible/managers/BibleDataManager";
import { LexiconCard } from "./LexiconCard";
import type { VerseWordsResult, WordStudyProvider } from "./provider";
import { parseStrongsId } from "./strongs";
import {
  formatStudiedReference,
  formatStudiedVerse,
  isRightToLeft,
  languageTag,
  sortWords,
  type StudiedVerse,
  type WordOrder,
  type WordStudyState,
} from "./wordStudyState";

/**
 * The pane header's title: "Word Study" and the reference, or "Lexicon" while
 * a lexicon card is open.
 */
export function WordStudyPaneTitle(props: { state: WordStudyState }) {
  const { state } = props;
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

  const reference = formatStudiedReference(state.verses.value);
  return (
    <div className="sb-word-study-title-row">
      <span className="sb-word-study-title">
        {t("word-study", { defaultValue: "Word Study" })}
      </span>
      {reference && (
        <span className="sb-word-study-reference" dir="auto">
          {reference}
        </span>
      )}
    </div>
  );
}

/**
 * The back button, shown at the start of the pane header while a lexicon card
 * is open. Back steps through the entries opened, then to the word list.
 */
export function WordStudyPaneLeading(props: { state: WordStudyState }) {
  const { state } = props;
  const { t } = useI18n("word-study-extension");

  if (state.lexiconStack.value.length === 0) {
    return null;
  }

  return (
    <button
      type="button"
      className="sb-pane-header-button"
      aria-label={t("back", { defaultValue: "Back" })}
      title={t("back", { defaultValue: "Back" })}
      onClick={() => state.back()}
    >
      <MaterialIcon>arrow_back</MaterialIcon>
    </button>
  );
}

export interface WordStudyPaneProps {
  provider: WordStudyProvider;
  state: WordStudyState;
  /** Navigates the reader to a reference tapped in a definition. */
  onReferenceClick: (ref: VerseRef) => void;
}

/**
 * The pane body: the selected verses' original words, with the lexicon card
 * for the word last tapped on top of them.
 */
export function WordStudyPane(props: WordStudyPaneProps) {
  const { provider, state, onReferenceClick } = props;
  const { t } = useI18n("word-study-extension");
  const stack = state.lexiconStack.value;
  const openEntry = stack[stack.length - 1];

  return (
    <div className="sb-word-study-pane">
      {/* Hidden rather than unmounted under a card, so Back returns to the
          same scroll position without reloading anything. */}
      <div className="sb-word-study-scroll" hidden={openEntry !== undefined}>
        <WordOrderToggle state={state} />
        {state.verses.value.map((verse) => (
          <VerseWords
            key={`${verse.bookId}-${verse.chapter}-${verse.verse}`}
            provider={provider}
            verse={verse}
            order={state.order.value}
            onOpenEntry={(strongsId) => state.openLexicon(strongsId)}
          />
        ))}
        <p className="sb-word-study-attribution">
          {t("interlinear-attribution", {
            defaultValue:
              "Interlinear data: Berean Standard Bible (public domain)",
          })}
        </p>
      </div>
      {openEntry !== undefined && (
        <div className="sb-word-study-scroll">
          <LexiconCard
            // Keyed by depth too, so opening the same entry twice in a row
            // still starts a fresh card scrolled to the top.
            key={`${stack.length}-${openEntry}`}
            provider={provider}
            strongsId={openEntry}
            onOpenStrongs={(strongsId) => state.openLexicon(strongsId)}
            onReferenceClick={onReferenceClick}
          />
        </div>
      )}
    </div>
  );
}

function WordOrderToggle(props: { state: WordStudyState }) {
  const { state } = props;
  const { t } = useI18n("word-study-extension");
  const current = state.order.value;

  const option = (order: WordOrder, label: string) => (
    <button
      type="button"
      className="sb-word-study-order-option"
      aria-pressed={current === order}
      onClick={() => {
        state.order.value = order;
      }}
    >
      {label}
    </button>
  );

  return (
    <div
      className="sb-word-study-order"
      role="group"
      aria-label={t("word-order", { defaultValue: "Word order" })}
    >
      {option(
        "original",
        t("original-order", { defaultValue: "Original order" })
      )}
      {option("english", t("english-order", { defaultValue: "English order" }))}
    </div>
  );
}

function VerseWords(props: {
  provider: WordStudyProvider;
  verse: StudiedVerse;
  order: WordOrder;
  onOpenEntry: (strongsId: string) => void;
}) {
  const { provider, verse, order, onOpenEntry } = props;
  const { t } = useI18n("word-study-extension");
  const result = useSignal<VerseWordsResult | null>(null);
  const attempt = useSignal(0);
  const attemptNumber = attempt.value;

  useEffect(() => {
    let isCurrent = true;
    result.value = null;
    provider
      .getVerseWords(verse.bookId, verse.chapter, verse.verse)
      .catch((error: unknown): VerseWordsResult => ({ status: "error", error }))
      .then((loaded) => {
        if (isCurrent) {
          result.value = loaded;
        }
      });
    return () => {
      isCurrent = false;
    };
  }, [provider, verse.bookId, verse.chapter, verse.verse, attemptNumber]);

  const loaded = result.value;
  let body;
  if (!loaded) {
    body = (
      <SkeletonContainer
        label={t("loading-words", {
          defaultValue: "Loading the original words",
        })}
        className="sb-word-study-skeleton"
      >
        <Skeleton shape="line" width="90%" />
        <Skeleton shape="line" width="75%" />
        <Skeleton shape="line" width="82%" />
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
  } else if (loaded.status === "verse-unavailable") {
    body = (
      <p className="sb-word-study-message">
        {t("verse-unavailable", {
          defaultValue: "Word study isn't available for this verse.",
        })}
      </p>
    );
  } else if (loaded.status === "error") {
    body = (
      <div className="sb-word-study-message" role="alert">
        <p>
          {t("words-load-failed", {
            defaultValue:
              "Couldn't load the original words. Check your connection and try again.",
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
    body = (
      <ol className="sb-word-study-words">
        {sortWords(loaded.words, order).map((word) => (
          <WordRow key={word.pos} word={word} onOpenEntry={onOpenEntry} />
        ))}
      </ol>
    );
  }

  return (
    <section className="sb-word-study-verse">
      <h3 className="sb-word-study-verse-heading" dir="auto">
        {formatStudiedVerse(verse)}
      </h3>
      {body}
    </section>
  );
}

function WordRow(props: {
  word: InterlinearWord;
  onOpenEntry: (strongsId: string) => void;
}) {
  const { word, onOpenEntry } = props;
  const { t } = useI18n("word-study-extension");
  const isGrammarShown = useSignal(false);
  const strongs = word.strongs ? parseStrongsId(word.strongs) : null;

  const details = (
    <>
      <span
        className="sb-word-study-original"
        dir={isRightToLeft(word.language) ? "rtl" : "ltr"}
        lang={languageTag(word.language)}
      >
        {word.text}
      </span>
      <span className="sb-word-study-transliteration">
        {word.transliteration}
      </span>
      <span className="sb-word-study-gloss">{word.gloss ?? "—"}</span>
      {strongs && (
        <span className="sb-word-study-strongs">{strongs.fullId}</span>
      )}
    </>
  );

  return (
    <li className="sb-word-study-word">
      {strongs ? (
        <button
          type="button"
          className="sb-word-study-word-main sb-word-study-word-main--link"
          title={t("open-entry", {
            defaultValue: "Open the lexicon entry for {{word}}",
            word: word.text,
          })}
          onClick={() => onOpenEntry(strongs.fullId)}
        >
          {details}
        </button>
      ) : (
        <div
          className="sb-word-study-word-main"
          title={t("no-strongs", {
            defaultValue:
              "This word has no Strong's number, so it has no lexicon entry.",
          })}
        >
          {details}
        </div>
      )}
      <div className="sb-word-study-grammar">
        <button
          type="button"
          className="sb-word-study-parsing"
          aria-expanded={isGrammarShown.value}
          title={word.parsingFull}
          onClick={() => {
            isGrammarShown.value = !isGrammarShown.value;
          }}
        >
          <span className="sr-only">
            {isGrammarShown.value
              ? t("hide-grammar", { defaultValue: "Hide grammar" })
              : t("show-grammar", { defaultValue: "Show grammar" })}
          </span>
          <span>{word.parsing}</span>
          <MaterialIcon>
            {isGrammarShown.value ? "expand_less" : "expand_more"}
          </MaterialIcon>
        </button>
        {isGrammarShown.value && (
          <p className="sb-word-study-parsing-full">{word.parsingFull}</p>
        )}
      </div>
    </li>
  );
}
