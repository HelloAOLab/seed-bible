import type { LexiconSense } from "seed-bible/managers";

/** A Strong's number, split into the lexicon entry it names and the sense, if any. */
export interface StrongsId {
  /** The plain, zero-padded number the lexicon files are named by, such as "H0430". */
  entryId: string;
  /**
   * The ID as given, normalized, such as "H0430G". The same as `entryId` when
   * no sense letter was given.
   */
  fullId: string;
}

const STRONGS_PATTERN = /^([HG])0*(\d{1,4})([A-Z]?)$/;

/**
 * Reads a Strong's number such as "G3056", "H430" or the extended "H0430G".
 *
 * Extended IDs add a letter naming one sense within an entry; the lexicon is
 * published one file per entry, so the letter is dropped to find the file but
 * kept to pick the sense.
 */
export function parseStrongsId(id: string): StrongsId | null {
  const match = STRONGS_PATTERN.exec(id.trim().toUpperCase());
  if (!match) {
    return null;
  }
  const [, language = "", digits = "", sense = ""] = match;
  const entryId = `${language}${digits.padStart(4, "0")}`;
  return { entryId, fullId: `${entryId}${sense}` };
}

/**
 * The senses with the one `fullId` names first, the rest in the lexicon's
 * order. A plain ID (no sense letter) matches only a sense with that same
 * plain ID, which is how single-sense entries such as G3056 are published.
 */
export function orderSenses(
  senses: LexiconSense[],
  fullId: string | undefined
): LexiconSense[] {
  const index = fullId
    ? senses.findIndex((sense) => sense.id.toUpperCase() === fullId)
    : -1;
  if (index <= 0) {
    return senses;
  }
  return [
    senses[index]!,
    ...senses.slice(0, index),
    ...senses.slice(index + 1),
  ];
}

/** Matches Strong's numbers written inside a definition, such as "H3068G" or "G1722". */
export const STRONGS_IN_TEXT_PATTERN = /\b[HG]\d{4}[A-Z]?\b/g;
