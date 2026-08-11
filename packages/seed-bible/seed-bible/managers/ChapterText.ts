/**
 * Pure, IO-free helpers for turning chapter content into plain text suitable
 * for a search-result snippet.
 *
 * Everything here is deterministic so the tricky parts — flattening the verse
 * content union, and cutting text short without mangling it in any of the 77
 * locales the app ships — can be tested without a simulation or a network.
 */
import type { ChapterContent, ChapterVerse } from "./FreeUseBibleAPI";

/**
 * How much of a chapter to put in `<meta name="description">`.
 *
 * Counted in grapheme clusters (what a reader sees as one character), not code
 * units. Pointed Hebrew runs ~1.7 code units per visible glyph, so a budget
 * measured in code units would hand Hebrew readers about 60% of the snippet
 * Latin readers get.
 *
 * Google truncates snippets on pixel width (~920px on desktop) rather than
 * character count, and CJK glyphs are full-width — so 155 graphemes of Chinese
 * is roughly twice as wide as 155 of Latin. Estimating pixels is out of scope;
 * this is a character budget that errs on the side of being slightly long.
 */
export const META_DESCRIPTION_MAX_GRAPHEMES = 155;

/**
 * Below this fraction of the budget, a word boundary is worse than no word
 * boundary: it means the text has one enormous unbroken token, and honoring
 * the boundary would throw most of the snippet away.
 */
const MIN_WORD_BOUNDARY_RATIO = 0.6;

/**
 * Scripts that don't put spaces between words. A space in front of one of these
 * reads as a defect, so they get joined flush.
 */
const NO_LEADING_SPACE =
  /^[\p{sc=Han}\p{sc=Hiragana}\p{sc=Katakana}\p{sc=Thai}\p{sc=Lao}\p{sc=Khmer}\p{sc=Myanmar}\u3000-\u303F\uFF00-\uFFEF]/u;

/**
 * Appends `next` to `text`, inserting a space only where the script wants one.
 *
 * Used for both the parts within a verse and the joins between verses. Both need
 * it: a verse's content array is split by every footnote reference, inline
 * heading, line break and `wordsOfJesus` span, and red-letter Gospel text splits
 * constantly \u2014 so joining a Chinese verse's own parts with a space is just as
 * wrong as doing it between two verses.
 */
function appendText(text: string, next: string): string {
  if (!text) {
    return next;
  }
  return NO_LEADING_SPACE.test(next) ? text + next : `${text} ${next}`;
}

/** Trailing characters that read wrong immediately before an ellipsis. */
const TRAILING_SEPARATORS = /[\s\p{Pd},;:،؛、，]+$/u;

/**
 * A cut landing here is already a finished sentence, so it needs no ellipsis —
 * "…the surface of the deep." reads as complete, "…the deep.…" reads as a bug.
 */
const SENTENCE_END = /[.!?。！？؟۔][)\]"”’»]?$/u;

const ELLIPSIS = "…";

// Constructed on first use, never at module scope: a missing `Intl.Segmenter`
// would otherwise throw at import time and take the whole bundle down with it.
let graphemeSegmenter: Intl.Segmenter | undefined;
let wordSegmenter: Intl.Segmenter | undefined;

/**
 * Both segmenters are built with an undefined locale on purpose. ICU picks its
 * word dictionary by script, so Chinese, Japanese and Thai segment correctly
 * without a hint — and `Translation.language` is ISO 639-3 ("eng", "cmn"),
 * which `Intl.Segmenter` would reject outright.
 */
function getGraphemeSegmenter(): Intl.Segmenter {
  graphemeSegmenter ??= new Intl.Segmenter(undefined, {
    granularity: "grapheme",
  });
  return graphemeSegmenter;
}

function getWordSegmenter(): Intl.Segmenter {
  wordSegmenter ??= new Intl.Segmenter(undefined, { granularity: "word" });
  return wordSegmenter;
}

/** Counts what a reader sees as one character. */
export function countGraphemes(text: string): number {
  return [...getGraphemeSegmenter().segment(text)].length;
}

/**
 * Flattens a verse's content into prose.
 *
 * Only `FormattedText` carries a `text` field, so inline headings, line breaks
 * and footnote references contribute nothing — which is what a snippet wants.
 */
export function extractContentText(
  parts: readonly ChapterVerse["content"][number][]
): string {
  let text = "";
  for (const part of parts) {
    let value = "";
    if (typeof part === "string") {
      value = part;
    } else if (part && typeof part === "object" && "text" in part) {
      value = part.text;
    }

    if (value) {
      text = appendText(text, value);
    }
  }

  return text
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?’”)\]])/g, "$1")
    .trim();
}

/**
 * Concatenates a chapter's verses into prose, reading only as far as
 * `minGraphemes` requires.
 *
 * The early stop is load-bearing rather than an optimization: Psalm 119 is
 * ~5,000 characters and a snippet can never use more than a couple hundred.
 *
 * Headings and Hebrew subtitles are skipped. Both are publisher apparatus
 * rather than scripture, and leading with one costs the snippet the words a
 * searcher actually typed — Psalm 51 would open "For the choirmaster. A Psalm
 * of David" instead of "Have mercy on me, O God".
 */
export function buildChapterExcerpt(
  content: readonly ChapterContent[] | undefined,
  minGraphemes: number
): string {
  if (!Array.isArray(content)) {
    return "";
  }

  let excerpt = "";
  for (const item of content) {
    if (item?.type !== "verse") {
      continue;
    }

    // Verse numbers live on `ChapterVerse.number`, never inside `content`, so
    // a snippet reading "1 In the beginning 2 And the earth" is structurally
    // impossible here. Keep it that way.
    const text = extractContentText(item.content);
    if (!text) {
      continue;
    }

    excerpt = appendText(excerpt, text);

    if (countGraphemes(excerpt) >= minGraphemes) {
      break;
    }
  }

  return excerpt;
}

/**
 * Shortens `text` to at most `maxGraphemes` grapheme clusters, breaking on a
 * word boundary where a usable one exists.
 *
 * Segmenting by grapheme rather than slicing by index is what keeps a vowel
 * point attached to its Hebrew letter and a surrogate pair intact.
 */
export function truncateForMeta(text: string, maxGraphemes: number): string {
  const trimmed = text.trim();
  if (maxGraphemes <= 0) {
    return "";
  }

  const graphemes = [...getGraphemeSegmenter().segment(trimmed)];
  if (graphemes.length <= maxGraphemes) {
    return trimmed;
  }

  // Leave one grapheme of room for the ellipsis.
  const cut = graphemes[maxGraphemes - 1]!.index;

  let boundary = 0;
  for (const segment of getWordSegmenter().segment(trimmed)) {
    if (segment.index >= cut) {
      break;
    }
    const end = segment.index + segment.segment.length;
    if (end > cut) {
      break;
    }
    boundary = end;
  }

  // A boundary this early means one unbroken token longer than the whole
  // budget — a dictionary miss, or a URL-shaped string. Cutting mid-token
  // beats returning almost nothing.
  const end =
    boundary >= Math.floor(cut * MIN_WORD_BOUNDARY_RATIO) ? boundary : cut;

  const shortened = trimmed.slice(0, end).replace(TRAILING_SEPARATORS, "");
  if (!shortened) {
    return "";
  }

  return SENTENCE_END.test(shortened) ? shortened : `${shortened}${ELLIPSIS}`;
}
