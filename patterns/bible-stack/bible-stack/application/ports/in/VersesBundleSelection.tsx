import type { VersesBundleData } from "../../../domain/entities/VersesBundleData";

export interface VersesBundleSelectionServicePort {
  selectBundle(data: VersesBundleData): void;
  deselectBundle(data: VersesBundleData): void;
}
