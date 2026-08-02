import type { TranslatableTitle } from "../managers/BibleToolsManager";
/**
 * Translates a TranslatableTitle using the provided translation function.
 * @param t The translation function.
 * @param title The title to translate.
 * @returns The translated title string.
 */
export declare const translateTitle: (
  t: (key: string, options?: Record<string, unknown>) => string,
  title: TranslatableTitle
) => string;
/**
 * Renders an instant relative to now — "3 minutes ago", "in 2 days".
 *
 * Picks the largest unit that the gap fills at least once and truncates toward
 * zero, so 90 minutes reads as "1 hour ago" rather than "2 hours ago". Years
 * and months are counted on the calendar; everything below them uses
 * fixed-length units.
 *
 * @param timeMs The instant to describe.
 * @param locale The BCP 47 locale to render in.
 * @param nowMs The instant to compare against. Defaults to now; pass a value
 *              to keep tests deterministic.
 */
export declare const formatRelativeTime: (
  timeMs: number,
  locale: string,
  nowMs?: number
) => string;
export declare const download: (blob: Blob, filename: string) => void;
