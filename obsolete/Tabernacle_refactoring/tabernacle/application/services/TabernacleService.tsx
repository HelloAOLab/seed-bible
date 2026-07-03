import type { TabernacleVisualizerPort } from "../../domain/ports/visualizer";
import type { TabernacleScriptureDataPort } from "../../domain/ports/scriptureData";
import type { TabernaclePieceConfigPort } from "../../domain/ports/pieceConfig";
import type { TabernacleReadingStatePort } from "../../domain/ports/readingState";
import type { PieceKey } from "../../domain/models/piece";

interface TabernacleServiceParams {
  visualizer: TabernacleVisualizerPort;
  scriptureData: TabernacleScriptureDataPort;
  pieceConfig: TabernaclePieceConfigPort;
  readingState: TabernacleReadingStatePort;
}

export class TabernacleService {
  #visualizer: TabernacleVisualizerPort;
  #scriptureData: TabernacleScriptureDataPort;
  #pieceConfig: TabernaclePieceConfigPort;
  #readingState: TabernacleReadingStatePort;

  constructor({
    visualizer,
    scriptureData,
    pieceConfig,
    readingState,
  }: TabernacleServiceParams) {
    this.#visualizer = visualizer;
    this.#scriptureData = scriptureData;
    this.#pieceConfig = pieceConfig;
    this.#readingState = readingState;
  }

  initialize(): void {
    this.#visualizer.initialize();
  }

  updateVisualsForChapter(bookId: string, chapter: number): void {
    const pieceStates = this.#scriptureData.getPieceStatesForChapter(
      bookId,
      chapter
    );
    for (const [key, state] of pieceStates) {
      this.#visualizer.applyMeshState(key, state);
    }
  }

  handlePieceClick(key: PieceKey): void {
    const reading = this.#readingState.getCurrentReading();
    const { inChapter, inOtherChapters } =
      this.#scriptureData.getVersesForPiece(
        key,
        reading?.bookId ?? "",
        reading?.chapterNumber ?? 0
      );

    this.#visualizer.highlightPiece(key);

    const highlightStates = this.#pieceConfig.getHighlightStates(key);
    for (const { key: relatedKey, state } of highlightStates) {
      this.#visualizer.applyMeshState(relatedKey, state);
    }

    this.#visualizer.toggleContextMenu(key, inChapter, inOtherChapters);
  }

  handleGridClick(): void {
    this.#visualizer.stopHighlight();
    this.#visualizer.hideContextMenu();
  }
}
