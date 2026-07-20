import type { VerseData } from "../../../domain/entities/VerseData";

export interface PieceLifecycleConfigProviderPort {
  getVersesPerBundle(): number;
}

export interface VerseDataRepositoryPort {
  addVerseData(data: VerseData): void;
  removeVerseData(data: VerseData): void;
}
