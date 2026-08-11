import {
  type SeedBibleState,
  type Translation,
  extractContentText,
} from "seed-bible/managers";
import { Skeleton, SkeletonContainer } from "seed-bible/components";
import { useI18n } from "seed-bible/i18n";
import {
  chapterCacheKey,
  versesFromChapter,
  type CompareChapterState,
  type CompareOrderEntry,
  type CompareSnapshot,
  type CompareState,
} from "./compareState";
// import { extractContentText } from "@packages/seed-bible/seed-bible/managers/ChapterText";

/**
 * Placeholder line widths, as percentages. Fixed rather than random so a
 * re-render doesn't reshuffle the shimmer under the reader's eyes.
 */
const SKELETON_LINE_WIDTHS = ["100%", "94%", "72%"];

function TranslationBlockSkeleton() {
  const { t } = useI18n("compare-extension");
  return (
    <SkeletonContainer
      label={t("loading-comparison", { defaultValue: "Loading comparison" })}
      className="sb-compare-block"
    >
      <div className="sb-compare-block-header">
        <Skeleton shape="line" width="4rem" />
        <Skeleton shape="line" width="40%" />
      </div>
      <div className="sb-compare-block-body">
        {SKELETON_LINE_WIDTHS.map((width) => (
          <Skeleton key={width} shape="line" width={width} />
        ))}
      </div>
    </SkeletonContainer>
  );
}

function TranslationBlockHeader(props: {
  translation: Translation | null;
  translationId: string;
  isCurrent: boolean;
  onRead: (translationId: string) => void;
}) {
  const { translation, translationId, isCurrent, onRead } = props;
  const { t } = useI18n("compare-extension");

  const name = translation?.name ?? translation?.englishName ?? "";
  const label = t("read-translation", {
    defaultValue: "Read {{translation}}",
    translation: name || translationId,
  });

  const content = (
    <>
      <span className="sb-compare-block-abbreviation" dir="auto">
        {translation?.shortName ?? translationId}
      </span>
      <span className="sb-compare-block-name" dir="auto">
        {name}
      </span>
    </>
  );

  // The header takes the translation's own direction, so an RTL translation
  // mirrors it: abbreviation on the right, full name on the left. The DOM
  // order is unchanged — `space-between` and `text-align: end` resolve
  // against `dir`, so the reversal falls out of the same markup.
  const dir = translation?.textDirection ?? "auto";

  // The one being read is already the reader's translation, so there is
  // nowhere for it to switch to — it stays plain text.
  if (isCurrent) {
    return (
      <div className="sb-compare-block-header" dir={dir}>
        {content}
        <span className="sr-only">
          {t("currently-reading", { defaultValue: "Currently reading" })}
        </span>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="sb-compare-block-header sb-compare-block-header--switch"
      dir={dir}
      aria-label={label}
      title={label}
      onClick={() => onRead(translationId)}
    >
      {content}
    </button>
  );
}

/**
 * One translation's copy of the snapshotted verses. Each block loads on its own,
 * so a slow translation never holds up the ones that already arrived.
 */
function TranslationBlock(props: {
  state: CompareState;
  entry: CompareOrderEntry;
  snapshot: CompareSnapshot;
  translation: Translation | null;
}) {
  const { state, entry, snapshot, translation } = props;
  const { t } = useI18n("compare-extension");
  const cache = state.chapters.value;

  const chapterStates: CompareChapterState[] = snapshot.groups.map(
    (group) =>
      cache.get(
        chapterCacheKey(entry.id, group.bookId, group.chapterNumber)
      ) ?? { status: "loading" }
  );

  if (chapterStates.some((chapter) => chapter.status === "loading")) {
    return <TranslationBlockSkeleton />;
  }

  if (chapterStates.every((chapter) => chapter.status === "error")) {
    return (
      <div className="sb-compare-block">
        <TranslationBlockHeader
          translation={translation}
          translationId={entry.id}
          isCurrent={entry.isCurrent}
          onRead={state.readTranslation}
        />
        <div className="sb-compare-block-body">
          <p className="sb-compare-block-message">
            {t("comparison-load-failed", {
              defaultValue: "Could not load this translation.",
            })}
          </p>
          <button
            type="button"
            className="sb-compare-retry"
            onClick={() => state.retryTranslation(entry.id)}
          >
            {t("retry", { defaultValue: "Retry" })}
          </button>
        </div>
      </div>
    );
  }

  // Keyed by chapter, not just verse number — a selection spanning two
  // chapters (e.g. John 1:51 + John 2:1) would otherwise put two verses under
  // the same key.
  const verses = snapshot.groups.flatMap((group, index) => {
    const chapter = chapterStates[index];
    if (chapter?.status !== "loaded") {
      return [];
    }
    const chapterKey = chapterCacheKey(
      entry.id,
      group.bookId,
      group.chapterNumber
    );
    return versesFromChapter(chapter.chapter, group.verseNumbers).map(
      (verse) => ({ verse, key: `${chapterKey}|${verse.number}` })
    );
  });

  return (
    <div className="sb-compare-block">
      <TranslationBlockHeader
        translation={translation}
        translationId={entry.id}
        isCurrent={entry.isCurrent}
        onRead={state.readTranslation}
      />
      <div className="sb-compare-block-body">
        {verses.length === 0 ? (
          // Versification differs between translations, so a selected verse
          // number may simply not exist in this one.
          <p className="sb-compare-block-message">
            {t("verse-not-available", {
              defaultValue:
                "These verses are not available in this translation.",
            })}
          </p>
        ) : (
          <p
            className="sb-compare-block-text"
            dir={translation?.textDirection ?? "auto"}
          >
            {verses.map(({ verse, key }) => (
              <span key={key} className="sb-compare-verse">
                <span className="sb-compare-verse-number">{verse.number}</span>{" "}
                {extractContentText(verse.content)}{" "}
              </span>
            ))}
          </p>
        )}
      </div>
    </div>
  );
}

/** The stack of translation blocks, in `state.order`. */
export function CompareVerses(props: {
  context: SeedBibleState;
  state: CompareState;
}) {
  const { context, state } = props;
  const snapshot = state.snapshot.value;
  const translations = context.bibleData.availableTranslations.value;

  if (!snapshot) {
    return null;
  }

  return (
    <div className="sb-compare-blocks">
      {state.order.value.map((entry) => (
        <TranslationBlock
          key={entry.id}
          state={state}
          entry={entry}
          snapshot={snapshot}
          translation={
            translations.find((translation) => translation.id === entry.id) ??
            null
          }
        />
      ))}
    </div>
  );
}
