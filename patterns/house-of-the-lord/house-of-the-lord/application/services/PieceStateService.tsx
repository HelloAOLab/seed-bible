import type {
  PieceStatePort,
  PieceStateConfigProviderPort,
} from "../ports/out/PieceState";
import type { ReadingStatePort } from "../ports/in/readingState";
import type { PieceStatePort as PieceStateServicePort } from "../ports/in/PieceState";
import { EXPERIENCE_PIECE_KEYS } from "../../domain/models/experience";
import { PIECE_VISIBILITY_STATES } from "../../domain/models/piece";
import type { ExperienceServicePort } from "../ports/in/experience";

interface PieceStateServiceParams {
  pieceState: PieceStatePort;
  pieceStateConfigProviderPort: PieceStateConfigProviderPort;
  readingState: ReadingStatePort;
  experienceService: ExperienceServicePort;
}

export class PieceStateService implements PieceStateServicePort {
  #pieceState: PieceStatePort;
  #pieceStateConfigProviderPort: PieceStateConfigProviderPort;
  #readingState: ReadingStatePort;
  #experienceService: ExperienceServicePort;

  constructor({
    pieceState,
    pieceStateConfigProviderPort,
    readingState,
    experienceService,
  }: PieceStateServiceParams) {
    this.#pieceState = pieceState;
    this.#pieceStateConfigProviderPort = pieceStateConfigProviderPort;
    this.#readingState = readingState;
    this.#experienceService = experienceService;
  }

  updatePiecesState(): void {
    const reading = this.#readingState.getCurrentReading();
    if (!reading) return;

    const experience = this.#experienceService.experience;
    if (!experience) return;
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
    const experience = this.#experienceService.experience;
    if (!experience) return;
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
