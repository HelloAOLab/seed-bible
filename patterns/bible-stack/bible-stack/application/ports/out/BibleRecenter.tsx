import type { StackBibleData } from "../../../domain/entities/StackBibleData";

export interface BibleRecenterPort {
  isBibleOffScreen(bible: StackBibleData): Promise<boolean>;
  recenter(bible: StackBibleData): Promise<void>;
}
