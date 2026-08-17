import type { PiecesSequencePort } from "../../../application/ports/out/experience";
import type { TabernacleVisualizerPort } from "../../../domain/ports/visualizer";
import type { LayerConfigProvider } from "../../config/layers/LayerConfigProvider";
import type { ExperienceKey } from "../../../domain/models/experience";
import { PIECE_VISIBILITY_STATES } from "../../../domain/models/piece";

const STAGGER_MS = 200;

interface AdapterParams {
  visualizer: TabernacleVisualizerPort;
  layerProvider: LayerConfigProvider;
}

export class PiecesSequenceAdapter implements PiecesSequencePort {
  #visualizer: AdapterParams["visualizer"];
  #layerProvider: AdapterParams["layerProvider"];

  constructor({ visualizer, layerProvider }: AdapterParams) {
    this.#visualizer = visualizer;
    this.#layerProvider = layerProvider;
  }

  async displayDropSequence(experience: ExperienceKey): Promise<void> {
    const orderedKeys = this.#layerProvider.getAllLayers(experience).flat();

    const animations: Promise<void>[] = [];
    for (const key of orderedKeys) {
      animations.push(
        this.#visualizer.applyMeshState({
          experience,
          key,
          state: PIECE_VISIBILITY_STATES.SHOWN,
        })
      );
      await os.sleep(STAGGER_MS);
    }

    await Promise.allSettled(animations);
  }
}
