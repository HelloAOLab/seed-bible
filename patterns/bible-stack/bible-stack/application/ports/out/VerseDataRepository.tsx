import type { VerseData } from "../../../domain/entities/VerseData";

export interface VerseDataRepositoryPort {
  addVerseData(data: VerseData): void;
  removeVerseData(data: VerseData): void;
  clearVersesData(): VerseData[];
  getVerseDataById(id: VerseData["id"]): VerseData | undefined;
  getAllVersesData(): VerseData[];
  getVerseData(piece: NonNullable<VerseData["piece"]>): VerseData | undefined;
}
