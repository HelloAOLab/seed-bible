// Shared interfaces and the per-file output schema.

/** Lifecycle of the in-browser Bible corpus. Inference is gated on "ready". */
export type CorpusStatus =
  | "idle"
  | "downloading"
  | "indexing"
  | "ready"
  | "error";

/** A single verse, slimmed for matching + display. This is what we cache. */
export interface VerseIndexEntry {
  /** e.g. "GEN:1:3" (uppercase USFM book code, colon separated). */
  ref: string;
  /** Uppercase USFM book code, e.g. "GEN". */
  bookId: string;
  chapter: number;
  verse: number;
  /** Human-readable verse text. */
  text: string;
  /** Lowercased, punctuation-stripped, whitespace-collapsed text used for matching. */
  normalizedText: string;
}

/** Small metadata record kept alongside the cached index for invalidation. */
export interface CorpusMeta {
  translation: string;
  /** From the translation listing; changes when the corpus content changes. */
  sha256: string;
  /** Bumped when our index *shape* changes, forcing a rebuild. */
  version: number;
  builtAt: number;
}

export type RefType = "book" | "chapter" | "verse";

/** Per-file processing lifecycle. */
export type FileStatus =
  | "queued"
  | "decoding"
  | "connecting"
  | "streaming"
  | "inferring"
  | "done"
  | "error";

/** An item in the processing queue. */
export interface QueuedFile {
  id: string;
  file: File;
  name: string;
  status: FileStatus;
  /** 0..1 for the current phase (or overall while streaming). */
  progress: number;
  error?: string;
  durationSec?: number;
}

/** One transcript segment in the output. */
export interface OutputSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  /** Reference ids attached to this segment (e.g. ["JHN:3:16"]). */
  references: string[];
}

/** One detected reference in the output. */
export interface OutputReference {
  /** "GEN" | "GEN:1" | "GEN:1:3" */
  ref: string;
  type: RefType;
  /** true = spoken/stated; false = inferred from a quote. */
  explicit: boolean;
  confidence: number;
  start: number | null;
  end: number | null;
  /** Present for inferred refs: the transcript text that matched. */
  quotedText?: string;
}

/** The output JSON produced per media file. */
export interface TranscriptionResult {
  file: string;
  durationSec: number;
  language: string;
  model: string;
  translation: string;
  timestampGranularity: "segment";
  segments: OutputSegment[];
  references: OutputReference[];
}
