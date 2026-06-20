// OSIS book code -> uppercase USFM code mapping.
//
// bcv_parser emits OSIS references like "Gen.1.1" / "1Cor.13" / "Ps.23". The
// helloao corpus keys books by USFM code (GEN, EXO, 1CO, PSA, ...). This module
// is intentionally dependency-free so it can be unit-tested in isolation.

const OSIS_TO_USFM: Record<string, string> = {
  Gen: "GEN",
  Exod: "EXO",
  Lev: "LEV",
  Num: "NUM",
  Deut: "DEU",
  Josh: "JOS",
  Judg: "JDG",
  Ruth: "RUT",
  "1Sam": "1SA",
  "2Sam": "2SA",
  "1Kgs": "1KI",
  "2Kgs": "2KI",
  "1Chr": "1CH",
  "2Chr": "2CH",
  Ezra: "EZR",
  Neh: "NEH",
  Esth: "EST",
  Job: "JOB",
  Ps: "PSA",
  Prov: "PRO",
  Eccl: "ECC",
  Song: "SNG",
  Isa: "ISA",
  Jer: "JER",
  Lam: "LAM",
  Ezek: "EZK",
  Dan: "DAN",
  Hos: "HOS",
  Joel: "JOL",
  Amos: "AMO",
  Obad: "OBA",
  Jonah: "JON",
  Mic: "MIC",
  Nah: "NAM",
  Hab: "HAB",
  Zeph: "ZEP",
  Hag: "HAG",
  Zech: "ZEC",
  Mal: "MAL",
  Matt: "MAT",
  Mark: "MRK",
  Luke: "LUK",
  John: "JHN",
  Acts: "ACT",
  Rom: "ROM",
  "1Cor": "1CO",
  "2Cor": "2CO",
  Gal: "GAL",
  Eph: "EPH",
  Phil: "PHP",
  Col: "COL",
  "1Thess": "1TH",
  "2Thess": "2TH",
  "1Tim": "1TI",
  "2Tim": "2TI",
  Titus: "TIT",
  Phlm: "PHM",
  Heb: "HEB",
  Jas: "JAS",
  "1Pet": "1PE",
  "2Pet": "2PE",
  "1John": "1JN",
  "2John": "2JN",
  "3John": "3JN",
  Jude: "JUD",
  Rev: "REV",
};

/** Map a single OSIS book code to USFM, or null if unknown. */
export function osisBookToUsfm(osisBook: string): string | null {
  return OSIS_TO_USFM[osisBook] ?? null;
}

export interface ParsedOsis {
  bookId: string;
  chapter?: number;
  verse?: number;
}

/**
 * Parse a single OSIS id (e.g. "Gen", "Gen.1", "Gen.1.3") into a USFM-keyed
 * structure. Returns null if the book is unknown.
 */
export function parseOsisId(osisId: string): ParsedOsis | null {
  const parts = osisId.split(".");
  const bookId = osisBookToUsfm(parts[0]);
  if (!bookId) return null;
  const out: ParsedOsis = { bookId };
  if (parts.length >= 2) out.chapter = Number(parts[1]);
  if (parts.length >= 3) out.verse = Number(parts[2]);
  return out;
}

/** Build the colon-separated ref id ("GEN", "GEN:1", "GEN:1:3"). */
export function refIdFromParsed(p: ParsedOsis): string {
  if (p.verse != null) return `${p.bookId}:${p.chapter}:${p.verse}`;
  if (p.chapter != null) return `${p.bookId}:${p.chapter}`;
  return p.bookId;
}

export function refTypeFromParsed(p: ParsedOsis): "book" | "chapter" | "verse" {
  if (p.verse != null) return "verse";
  if (p.chapter != null) return "chapter";
  return "book";
}
