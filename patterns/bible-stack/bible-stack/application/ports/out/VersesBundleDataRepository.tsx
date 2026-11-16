import type { VersesBundleData } from "../../../domain/entities/VersesBundleData";

export interface VersesBundleDataRepositoryPort {
  addBundleData(data: VersesBundleData): void;
  removeBundleData(data: VersesBundleData): void;
  clearBundlesData(): VersesBundleData[];
  getBundleDataById(id: VersesBundleData["id"]): VersesBundleData | undefined;
  getAllBundlesData(): VersesBundleData[];
  getBundleData(
    piece: NonNullable<VersesBundleData["piece"]>
  ): VersesBundleData | undefined;
}
