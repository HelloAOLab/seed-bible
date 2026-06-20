import { bcv_parser } from "https://cdn.jsdelivr.net/npm/bible-passage-reference-parser@3.2.0/esm/bcv_parser.js/+esm";
import * as enLang from "https://cdn.jsdelivr.net/npm/bible-passage-reference-parser@3.2.0/esm/lang/en.js/+esm";
import type { RefType } from "ext_AI_Transcript.main.types";
import {
  parseOsisId,
  refIdFromParsed,
  refTypeFromParsed,
  type ParsedOsis,
} from "ext_AI_Transcript.main.osis";

interface OsisAndIndices {
  osis: string;
  indices: number[];
  translations: string[];
}

// The constructor reads grammar_options/regexps/translations off the language
// module namespace.
const bcv = new bcv_parser(enLang);

export interface ExplicitMatch {
  ref: string;
  type: RefType;
  bookId: string;
  chapter?: number;
  verse?: number;
  /** Character offsets into the parsed text. */
  start: number;
  end: number;
}

/** Expand a single OSIS id or range (e.g. "Gen.1.1-Gen.1.3") into ParsedOsis[]. */
function expandOsis(osisPiece: string): ParsedOsis[] {
  const [aRaw, bRaw] = osisPiece.split("-");
  const a = parseOsisId(aRaw);
  if (!a) return [];
  if (!bRaw) return [a];

  const b = parseOsisId(bRaw);
  if (!b) return [a];

  // Verse range within one chapter: emit each verse.
  if (
    a.bookId === b.bookId &&
    a.chapter != null &&
    a.chapter === b.chapter &&
    a.verse != null &&
    b.verse != null &&
    b.verse >= a.verse
  ) {
    const out: ParsedOsis[] = [];
    for (let v = a.verse; v <= b.verse; v++) {
      out.push({ bookId: a.bookId, chapter: a.chapter, verse: v });
    }
    return out;
  }

  // Chapter range within one book: emit each chapter.
  if (
    a.bookId === b.bookId &&
    a.verse == null &&
    b.verse == null &&
    a.chapter != null &&
    b.chapter != null &&
    b.chapter >= a.chapter
  ) {
    const out: ParsedOsis[] = [];
    for (let c = a.chapter; c <= b.chapter; c++) {
      out.push({ bookId: a.bookId, chapter: c });
    }
    return out;
  }

  // Anything more complex (cross-book / cross-chapter verse range): keep the
  // two endpoints rather than guessing at the span.
  return [a, b];
}

/** Extract explicit references from text, with their character spans. */
export function extractExplicitRefs(text: string): ExplicitMatch[] {
  if (!text.trim()) return [];

  let results: OsisAndIndices[];
  try {
    bcv.parse(text);
    results = bcv.osis_and_indices() as OsisAndIndices[];
  } catch {
    return [];
  }

  const matches: ExplicitMatch[] = [];
  for (const r of results) {
    const [start, end] = r.indices ?? [0, 0];
    // A single result's osis can be comma-separated and/or contain ranges.
    for (const piece of r.osis.split(",")) {
      if (!piece) continue;
      for (const parsed of expandOsis(piece)) {
        matches.push({
          ref: refIdFromParsed(parsed),
          type: refTypeFromParsed(parsed),
          bookId: parsed.bookId,
          chapter: parsed.chapter,
          verse: parsed.verse,
          start,
          end,
        });
      }
    }
  }
  return matches;
}
