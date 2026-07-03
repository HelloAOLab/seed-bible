import type { HexString } from "@packages/seed-bible-utils/domain/models/commonTypes";

/**
 * Narrow port over the Bible Visualization Utils reading-history service,
 * exposing only the color-by-reading-time capability the Today screen needs.
 */
export interface ReadingHistoryServicePort {
  getColorByReadingTime(params: {
    baseColor: HexString;
    userColor: HexString;
    readingTimeSeconds: number;
    fullColorTimeSeconds?: number;
    step?: number;
    stepColors?: HexString[];
  }): HexString;
}
