import * as z from "zod/v4";
import type { LoginManager } from "../managers/LoginManager";
import { type Signal } from "@preact/signals";
import type { CasualOSManager } from "./OsManager";
/**
 * Zod schema for a highlighted verse target.
 *
 * A highlight can target either:
 * - a single verse number (for example `5`), or
 * - an inclusive range tuple `[start, end]` (for example `[5, 9]`).
 */
declare const verseSchema: z.ZodUnion<
  readonly [z.ZodNumber, z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>]
>;
/** Schema for one chapter highlight entry. */
export declare const chapterHighlightSchema: z.ZodObject<
  {
    colorId: z.ZodString;
    verse: z.ZodUnion<
      readonly [z.ZodNumber, z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>]
    >;
    customColor: z.ZodOptional<z.ZodString>;
    customFontColor: z.ZodOptional<z.ZodString>;
  },
  z.core.$strip
>;
/** Schema for persisted chapter highlights payload. */
export declare const chapterHighlightsSchema: z.ZodObject<
  {
    highlights: z.ZodArray<
      z.ZodObject<
        {
          colorId: z.ZodString;
          verse: z.ZodUnion<
            readonly [z.ZodNumber, z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>]
          >;
          customColor: z.ZodOptional<z.ZodString>;
          customFontColor: z.ZodOptional<z.ZodString>;
        },
        z.core.$strip
      >
    >;
  },
  z.core.$strip
>;
/** Single verse target or inclusive verse range tuple. */
export type Verse = z.infer<typeof verseSchema>;
/** Highlight entry with style + verse targeting data. */
export type ChapterHighlight = z.infer<typeof chapterHighlightSchema>;
/** Container payload used in storage and reactive signals. */
export type ChapterHighlights = z.infer<typeof chapterHighlightsSchema>;
/**
 * Returns whether a highlight range includes the given verse number.
 */
export declare function highlightContainsVerse(
  highlight: ChapterHighlight,
  verseNumber: number
): boolean;
/**
 * Reactive API for reading and mutating chapter highlights.
 *
 * Highlights are keyed by `translationId/bookId/chapterNumber`, cached in
 * signals, normalized for overlap/merge correctness, and persisted per user.
 */
export interface HighlightsManager {
  /**
   * Gets a reactive signal for one chapter's highlights.
   *
   * If unauthenticated, returns an empty signal value.
   */
  getChapterHighlights: (
    translationId: string,
    bookId: string,
    chapterNumber: number
  ) => Signal<ChapterHighlights>;
  /**
   * Replaces and persists highlights for a chapter.
   *
   * Input highlights are normalized before being cached/stored.
   */
  saveChapterHighlights: (
    translationId: string,
    bookId: string,
    chapterNumber: number,
    highlights: ChapterHighlight[]
  ) => Promise<void>;
  /**
   * Adds or updates highlight styling for a single verse or range.
   */
  highlightVerse: (
    translationId: string,
    bookId: string,
    chapterNumber: number,
    highlightDetails: ChapterHighlight
  ) => Promise<void>;
  /**
   * Adds or updates highlight styling for a set of verse numbers.
   */
  highlightVerses: (
    translationId: string,
    bookId: string,
    chapterNumber: number,
    verseNumbers: number[],
    highlightDetails: Omit<ChapterHighlight, "verse">
  ) => Promise<void>;
  /**
   * Removes highlights from a single verse or range.
   */
  unhighlightVerse: (
    translationId: string,
    bookId: string,
    chapterNumber: number,
    verseDetails: Verse
  ) => Promise<void>;
  /**
   * Removes highlights from a set of verse numbers.
   */
  unhighlightVerses: (
    translationId: string,
    bookId: string,
    chapterNumber: number,
    verseNumbers: number[]
  ) => Promise<void>;
}
/**
 * Creates the highlights manager.
 *
 * Behavior summary:
 * - Caches chapter highlights in reactive signals.
 * - Loads chapter data lazily on first access per address.
 * - Normalizes overlapping highlight ranges to deterministic output.
 * - Persists highlights under user-scoped storage keys.
 */
export declare function createHighlightsManager(
  os: CasualOSManager,
  login: LoginManager
): HighlightsManager;
export {};
