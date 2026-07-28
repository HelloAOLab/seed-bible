import type { VersesBundleData } from "../../../domain/entities/VersesBundleData";

export interface VersesBundleSelectionServicePort {
  selectBundle(data: VersesBundleData): Promise<void>;
}
