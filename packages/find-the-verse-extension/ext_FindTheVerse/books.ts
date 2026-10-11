export interface BibleBook {
  id: string;
  name: string;
  abbr: string[];
}

export const BOOKS: BibleBook[] = [
  { id: "GEN", name: "Genesis", abbr: ["gen", "ge"] },
  { id: "EXO", name: "Exodus", abbr: ["exo", "ex", "exod"] },
  { id: "LEV", name: "Leviticus", abbr: ["lev", "le"] },
  { id: "NUM", name: "Numbers", abbr: ["num", "nu", "nb"] },
  { id: "DEU", name: "Deuteronomy", abbr: ["deu", "dt", "deut"] },
  { id: "JOS", name: "Joshua", abbr: ["jos", "josh"] },
  { id: "JDG", name: "Judges", abbr: ["jdg", "jg", "judg"] },
  { id: "RUT", name: "Ruth", abbr: ["rut", "ru"] },
  { id: "1SA", name: "1 Samuel", abbr: ["1sa", "1sa", "1sam", "1 sam"] },
  { id: "2SA", name: "2 Samuel", abbr: ["2sa", "2sam", "2 sam"] },
  {
    id: "1KI",
    name: "1 Kings",
    abbr: ["1ki", "1kgs", "1 kgs", "1kings", "1 kings"],
  },
  {
    id: "2KI",
    name: "2 Kings",
    abbr: ["2ki", "2kgs", "2 kgs", "2kings", "2 kings"],
  },
  { id: "1CH", name: "1 Chronicles", abbr: ["1ch", "1chr", "1chron", "1 chr"] },
  { id: "2CH", name: "2 Chronicles", abbr: ["2ch", "2chr", "2chron", "2 chr"] },
  { id: "EZR", name: "Ezra", abbr: ["ezr", "ezra"] },
  { id: "NEH", name: "Nehemiah", abbr: ["neh"] },
  { id: "EST", name: "Esther", abbr: ["est", "esth"] },
  { id: "JOB", name: "Job", abbr: ["job", "jb"] },
  { id: "PSA", name: "Psalms", abbr: ["psa", "ps", "psalm", "psalms"] },
  { id: "PRO", name: "Proverbs", abbr: ["pro", "pr", "prov"] },
  { id: "ECC", name: "Ecclesiastes", abbr: ["ecc", "eccl", "qoh"] },
  {
    id: "SNG",
    name: "Song of Solomon",
    abbr: ["sng", "song", "ss", "sos", "cant"],
  },
  { id: "ISA", name: "Isaiah", abbr: ["isa"] },
  { id: "JER", name: "Jeremiah", abbr: ["jer"] },
  { id: "LAM", name: "Lamentations", abbr: ["lam"] },
  { id: "EZK", name: "Ezekiel", abbr: ["ezk", "eze", "ezek"] },
  { id: "DAN", name: "Daniel", abbr: ["dan", "da"] },
  { id: "HOS", name: "Hosea", abbr: ["hos", "ho"] },
  { id: "JOL", name: "Joel", abbr: ["jol", "joe", "jl"] },
  { id: "AMO", name: "Amos", abbr: ["amo", "am"] },
  { id: "OBA", name: "Obadiah", abbr: ["oba", "ob"] },
  { id: "JON", name: "Jonah", abbr: ["jon"] },
  { id: "MIC", name: "Micah", abbr: ["mic"] },
  { id: "NAH", name: "Nahum", abbr: ["nah", "na"] },
  { id: "HAB", name: "Habakkuk", abbr: ["hab"] },
  { id: "ZEP", name: "Zephaniah", abbr: ["zep", "zeph"] },
  { id: "HAG", name: "Haggai", abbr: ["hag"] },
  { id: "ZEC", name: "Zechariah", abbr: ["zec", "zech"] },
  { id: "MAL", name: "Malachi", abbr: ["mal"] },
  { id: "MAT", name: "Matthew", abbr: ["mat", "mt", "matt"] },
  { id: "MRK", name: "Mark", abbr: ["mrk", "mk", "mar"] },
  { id: "LUK", name: "Luke", abbr: ["luk", "lk", "lu"] },
  { id: "JHN", name: "John", abbr: ["jhn", "jn", "joh"] },
  { id: "ACT", name: "Acts", abbr: ["act", "ac"] },
  { id: "ROM", name: "Romans", abbr: ["rom", "ro", "rm"] },
  { id: "1CO", name: "1 Corinthians", abbr: ["1co", "1cor", "1 cor"] },
  { id: "2CO", name: "2 Corinthians", abbr: ["2co", "2cor", "2 cor"] },
  { id: "GAL", name: "Galatians", abbr: ["gal"] },
  { id: "EPH", name: "Ephesians", abbr: ["eph"] },
  { id: "PHP", name: "Philippians", abbr: ["php", "phil", "phl"] },
  { id: "COL", name: "Colossians", abbr: ["col"] },
  {
    id: "1TH",
    name: "1 Thessalonians",
    abbr: ["1th", "1thes", "1thess", "1 thes"],
  },
  {
    id: "2TH",
    name: "2 Thessalonians",
    abbr: ["2th", "2thes", "2thess", "2 thes"],
  },
  { id: "1TI", name: "1 Timothy", abbr: ["1ti", "1tim", "1 tim"] },
  { id: "2TI", name: "2 Timothy", abbr: ["2ti", "2tim", "2 tim"] },
  { id: "TIT", name: "Titus", abbr: ["tit"] },
  { id: "PHM", name: "Philemon", abbr: ["phm", "phlm"] },
  { id: "HEB", name: "Hebrews", abbr: ["heb"] },
  { id: "JAS", name: "James", abbr: ["jas", "jm"] },
  { id: "1PE", name: "1 Peter", abbr: ["1pe", "1pet", "1 pet"] },
  { id: "2PE", name: "2 Peter", abbr: ["2pe", "2pet", "2 pet"] },
  { id: "1JN", name: "1 John", abbr: ["1jn", "1joh", "1 jn"] },
  { id: "2JN", name: "2 John", abbr: ["2jn", "2joh", "2 jn"] },
  { id: "3JN", name: "3 John", abbr: ["3jn", "3joh", "3 jn"] },
  { id: "JUD", name: "Jude", abbr: ["jud", "jude"] },
  { id: "REV", name: "Revelation", abbr: ["rev", "re", "apoc"] },
];

/** Index of a book in canonical order, -1 if unknown. */
export const BOOK_ORDER = new Map<string, number>(
  BOOKS.map((b, i) => [b.id, i])
);

/** Human-readable display name for a book ID. */
export const BOOK_DISPLAY_NAMES = new Map<string, string>(
  BOOKS.map((b) => [b.id, b.name])
);

/** All name/abbreviation aliases (lowercase) → book ID, for reference parsing. */
export const BOOK_ALIASES = new Map<string, string>();
for (const book of BOOKS) {
  BOOK_ALIASES.set(book.name.toLowerCase(), book.id);
  for (const abbr of book.abbr) {
    BOOK_ALIASES.set(abbr.toLowerCase(), book.id);
  }
}

export function bookOrderIndex(bookId: string): number {
  return BOOK_ORDER.get(bookId) ?? -1;
}

export function bookDisplayName(bookId: string): string {
  return BOOK_DISPLAY_NAMES.get(bookId) ?? bookId;
}
