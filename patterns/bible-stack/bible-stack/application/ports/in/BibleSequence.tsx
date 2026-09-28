import type { StackBibleData } from "../../../domain/entities/StackBibleData";
import type { StackPresenceNavigationPacing } from "../../../domain/models/userPresence";

export interface BibleSequenceParams {
  bibleData: StackBibleData;
  pacing?: StackPresenceNavigationPacing;
}

export interface BibleSequenceServicePort {
  resetBible(params: BibleSequenceParams): Promise<void>;
  closeBible(params: BibleSequenceParams): Promise<void>;
  openBible(params: BibleSequenceParams): Promise<void>;
  crackOpenBible(bibleData: StackBibleData): Promise<void>;
}
