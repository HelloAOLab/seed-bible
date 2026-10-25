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
  /** What players see until someone chooses Show reference. */
  name: string;
  targetVerse: TargetVerse;
  steps: GameStep[];
  createdAtMs: number;
}

export type GameDraft = Pick<SavedGame, "name" | "targetVerse" | "steps">;

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

/**
 * One spot in Bible order. Book index is canonical order, then chapter, then verse.
 */
export interface BibleSpot {
  bookIndex: number;
  chapterNumber: number;
  verseNumber: number;
}

/**
 * The stretch still in play. The answer is strictly after `after` and strictly
 * before `before`. Either end stays null until a guess sets it.
 */
export interface SearchWindow {
  after: BibleSpot | null;
  before: BibleSpot | null;
}

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
  /** Label for the round. Shown in place of the reference until it is revealed. */
  name: Signal<string>;
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
  /**
   * What a guess has ruled out. Reset when the round ends so the next game
   * does not keep the previous grey books and verses.
   */
  searchWindow: Signal<SearchWindow>;
  won: Signal<boolean>;
  /** True once the full verse has been revealed. */
  revealed: Signal<boolean>;
  /** Partial word reveal text, set when the player clicks Reveal. */
  partialRevealText: Signal<string>;
  /**
   * Which chance's hint is showing, shared by the panel and the reader bar.
   * Cleared when the round ends so the next game starts on the ? button.
   */
  hintOpenFor: Signal<number | null>;
  /**
   * Bumped when a round ends. A reveal still waiting on the chapter compares
   * against this and does nothing if a later round has started.
   */
  playRound: Signal<number>;
}
