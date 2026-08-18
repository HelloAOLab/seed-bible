import type { PieceStatePort } from "../../domain/ports/pieceState";
import type { TabernacleScriptureDataPort } from "../../domain/ports/scriptureData";
import type { ReadingStatePort } from "../ports/in/readingState";
import type { ExperienceKey } from "../../domain/models/experience";

interface PieceStateServiceParams {
  pieceState: PieceStatePort;
  scriptureData: TabernacleScriptureDataPort;
  readingState: ReadingStatePort;
  getExperienceKey: () => ExperienceKey;
}

export class PieceStateService {
  #pieceState: PieceStatePort;
  #scriptureData: TabernacleScriptureDataPort;
  #readingState: ReadingStatePort;
  #getExperienceKey: () => ExperienceKey;

  constructor({
    pieceState,
    scriptureData,
    readingState,
    getExperienceKey,
  }: PieceStateServiceParams) {
    this.#pieceState = pieceState;
    this.#scriptureData = scriptureData;
    this.#readingState = readingState;
    this.#getExperienceKey = getExperienceKey;
  }

  updatePiecesState(): void {
    const reading = this.#readingState.getCurrentReading();
    if (!reading) return;

    const experience = this.#getExperienceKey();
    const pieceStates = this.#scriptureData.getPieceStatesForChapter(
      reading.bookId,
      reading.chapterNumber
    );
    for (const [key, state] of pieceStates) {
      this.#pieceState.applyMeshState({ experience, key, state });
    }
  }
}
