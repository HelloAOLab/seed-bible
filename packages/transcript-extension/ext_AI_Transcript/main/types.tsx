// Shared interfaces and the per-file output schema.

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
