import type {
  PieceStatePort,
  PieceStateConfigProviderPort,
} from "../ports/out/PieceState";
import type { ReadingStatePort } from "../ports/in/readingState";
import type { PieceStatePort as PieceStateServicePort } from "../ports/in/PieceState";
import {
  EXPERIENCE_PIECE_KEYS,
  type ExperienceKey,
} from "../../domain/models/experience";
import { PIECE_VISIBILITY_STATES } from "../../domain/models/piece";

interface PieceStateServiceParams {
  pieceState: PieceStatePort;
  pieceStateConfigProviderPort: PieceStateConfigProviderPort;
  readingState: ReadingStatePort;
  getExperienceKey: () => ExperienceKey;
}

export class PieceStateService implements PieceStateServicePort {
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

  async showAll() {
    const experience = this.#getExperienceKey();
    const keys = EXPERIENCE_PIECE_KEYS[experience];
    await Promise.all(
      keys.map((key) =>
        this.#pieceState.applyMeshState({
          experience,
          key,
          state: PIECE_VISIBILITY_STATES.SHOWN,
        })
      )
    );
  }
}
