import type { Signal } from "@preact/signals";

export interface GameStep {
  hint: string;
}

export interface TargetVerse {
  bookId: string;
  chapterNumber: number;
  verseNumber: number;
  /** The verse text, if available at selection time. Empty string when not available. */
  verseText: string;
}

export interface SavedGame {
  id: string;
  targetVerse: TargetVerse;
  steps: GameStep[];
  createdAtMs: number;
}

export interface VersePosition {
  bookId: string;
  chapterNumber: number;
  verseNumber: number;
}

export type GuessResult =
  | { kind: "wrong_book"; direction: "before" | "after" }
  | { kind: "wrong_chapter"; direction: "before" | "after" }
  | { kind: "wrong_verse"; direction: "before" | "after" }
  | { kind: "correct" };

export interface GameSignals {
  phase: Signal<"idle" | "creating" | "playing">;
  /** Set while a saved game is open in the creator or the player. */
  currentGameId: Signal<string | null>;
  /** Shown in the panel when loading, saving, or deleting fails. */
  notice: Signal<string | null>;
  /** Games persisted to the user's profile. */
  savedGames: Signal<SavedGame[]>;
  /** The secret verse the creator chose. */
  targetVerse: Signal<TargetVerse | null>;
  /** One entry per chance; each may have an optional hint. */
  steps: Signal<GameStep[]>;
  /** True while waiting for the creator to tap a verse in the reader. */
  selectingViaToolbar: Signal<boolean>;
  /**
   * Bumped whenever a new reference lookup starts, or the draft target is
   * replaced. A chapter download that finishes late compares against this
   * and does nothing when it is no longer the latest lookup.
   */
  verseLookup: Signal<number>;
  /** Number of guesses used (never decrements). */
  guessCount: Signal<number>;
  /** Feedback from the most recent guess. */
  lastResult: Signal<GuessResult | null>;
  won: Signal<boolean>;
  /** True once the full verse has been revealed. */
  revealed: Signal<boolean>;
  /** Partial word reveal text, set when the player clicks Reveal. */
  partialRevealText: Signal<string>;
}
