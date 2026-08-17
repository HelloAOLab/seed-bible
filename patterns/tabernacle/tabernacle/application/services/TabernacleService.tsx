import type { TabernacleVisualizerPort } from "../../domain/ports/visualizer";
import type { TabernacleScriptureDataPort } from "../../domain/ports/scriptureData";
import type { TabernacleReadingStatePort } from "../../domain/ports/readingState";
import type { LayerProviderPort } from "../ports/out/tabernacle";
import type { PieceKey } from "../../domain/models/piece";
import { PIECE_VISIBILITY_STATES } from "../../domain/models/piece";
import type { ExperienceKey } from "../../domain/models/experience";

interface TabernacleServiceParams {
  visualizer: TabernacleVisualizerPort;
  scriptureData: TabernacleScriptureDataPort;
  readingState: TabernacleReadingStatePort;
  layerProvider: LayerProviderPort;
  getExperienceKey: () => ExperienceKey;
}

export class TabernacleService {
  #visualizer: TabernacleVisualizerPort;
  #scriptureData: TabernacleScriptureDataPort;
  #readingState: TabernacleReadingStatePort;
  #layerProvider: LayerProviderPort;
  #getExperienceKey: () => ExperienceKey;

  constructor({
    visualizer,
    scriptureData,
    readingState,
    layerProvider,
    getExperienceKey,
  }: TabernacleServiceParams) {
    this.#visualizer = visualizer;
    this.#scriptureData = scriptureData;
    this.#readingState = readingState;
    this.#layerProvider = layerProvider;
    this.#getExperienceKey = getExperienceKey;
  }

  updateVisualsForChapter(bookId: string, chapter: number): void {
    const experience = this.#getExperienceKey();
    const pieceStates = this.#scriptureData.getPieceStatesForChapter(
      bookId,
      chapter
    );
    for (const [key, state] of pieceStates) {
      this.#visualizer.applyMeshState({ experience, key, state });
    }
  }

  handlePieceClick(key: PieceKey): void {
    const experience = this.#getExperienceKey();
    const reading = this.#readingState.getCurrentReading();
    const { inChapter, inOtherChapters } =
      this.#scriptureData.getVersesForPiece(
        key,
        reading?.bookId ?? "",
        reading?.chapterNumber ?? 0
      );

    this.#visualizer.highlightPiece(experience, key);

    // Occlusion by layer: the highlighted piece's layer and everything below it
    // stay shown; the layer right above becomes translucent; everything further
    // above is hidden, leaving the piece visually unobstructed.
    const layer = this.#layerProvider.getLayerNumber(experience, key);
    const layers = this.#layerProvider.getAllLayers(experience);
    for (let i = 0; i < layers.length; i++) {
      const state =
        i <= layer
          ? PIECE_VISIBILITY_STATES.SHOWN
          : i === layer + 1
            ? PIECE_VISIBILITY_STATES.TRANSLUCENT
            : PIECE_VISIBILITY_STATES.HIDDEN;
      for (const relatedKey of layers[i] ?? []) {
        this.#visualizer.applyMeshState({ experience, key: relatedKey, state });
      }
    }

    this.#visualizer.toggleContextMenu(
      experience,
      key,
      inChapter,
      inOtherChapters
    );
  }

  handleGridClick(): void {
    this.#visualizer.stopHighlight();
    this.#visualizer.hideContextMenu();
  }
}
