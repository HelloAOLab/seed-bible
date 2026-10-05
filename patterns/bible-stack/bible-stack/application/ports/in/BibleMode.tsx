import type { StackBibleData } from "../../../domain/entities/StackBibleData";

export interface BibleModeServicePort {
  tryToggleMode(bibleData: StackBibleData): Promise<void>;
  tryStopToggle(bibleData: StackBibleData): Promise<void>;
}
