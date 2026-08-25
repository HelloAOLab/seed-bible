import type {
  PieceStatePort,
  PieceStateConfigProviderPort,
} from "../ports/out/PieceState";
import type { ReadingStatePort } from "../ports/in/readingState";
import type { ExperienceKey } from "../../domain/models/experience";

interface PieceStateServiceParams {
  pieceState: PieceStatePort;
  pieceStateConfigProviderPort: PieceStateConfigProviderPort;
  readingState: ReadingStatePort;
  getExperienceKey: () => ExperienceKey;
}

export class PieceStateService {
  #pieceState: PieceStatePort;
  #pieceStateConfigProviderPort: PieceStateConfigProviderPort;
  #readingState: ReadingStatePort;
  #getExperienceKey: () => ExperienceKey;

  constructor({
    pieceState,
    pieceStateConfigProviderPort,
    readingState,
    getExperienceKey,
  }: PieceStateServiceParams) {
    this.#pieceState = pieceState;
    this.#pieceStateConfigProviderPort = pieceStateConfigProviderPort;
    this.#readingState = readingState;
    this.#getExperienceKey = getExperienceKey;
  }

  updatePiecesState(): void {
    const reading = this.#readingState.getCurrentReading();
    if (!reading) return;

    const experience = this.#getExperienceKey();
    const pieceStates =
      this.#pieceStateConfigProviderPort.getPiecesChapterState({
        experienceKey: experience,
        bookId: reading.bookId,
        chapter: reading.chapterNumber,
      });
    for (const key of Object.keys(
      pieceStates
    ) as (keyof typeof pieceStates)[]) {
      const state = pieceStates[key]!;
      this.#pieceState.applyMeshState({ experience, key, state });
    }
  }
}
