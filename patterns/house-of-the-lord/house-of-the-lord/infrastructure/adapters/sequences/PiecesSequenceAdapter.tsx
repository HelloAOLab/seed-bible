import type { PiecesSequencePort } from "../../../application/ports/out/experience";
import type { PieceStateAdapter } from "../pieces/PieceStateAdapter";
import type { LayerConfigProvider } from "../../config/layers/LayerConfigProvider";
import type {
  ExperienceKey,
  ExperienceKeyMap,
} from "../../../domain/models/experience";
import { PIECE_VISIBILITY_STATES } from "../../../domain/models/piece";
import type { PiecesProvider } from "../pieces/PiecesProvider";

const STAGGER_MS = 200;

interface AdapterParams {
  pieceState: PieceStateAdapter;
  layerProvider: LayerConfigProvider;
  piecesProvider: PiecesProvider;
}

export class PiecesSequenceAdapter implements PiecesSequencePort {
  #pieceState: AdapterParams["pieceState"];
  #layerProvider: AdapterParams["layerProvider"];
  #piecesProvider: AdapterParams["piecesProvider"];
  #dropSequenceId = 0;
  #currentDrop: {
    experience: ExperienceKey;
    keys: ExperienceKeyMap[ExperienceKey][];
    abort: () => void;
  } | null = null;

  constructor({ pieceState, layerProvider, piecesProvider }: AdapterParams) {
    this.#pieceState = pieceState;
    this.#layerProvider = layerProvider;
    this.#piecesProvider = piecesProvider;
  }

  async displayDropSequence(experience: ExperienceKey): Promise<void> {
    const sequenceId = ++this.#dropSequenceId;
    const orderedKeys = this.#layerProvider.getAllLayers(experience).flat();
    const launched: ExperienceKeyMap[ExperienceKey][] = [];
    let abort: () => void = () => {};
    const aborted = new Promise<void>((resolve) => {
      abort = resolve;
    });
    this.#currentDrop = { experience, keys: launched, abort };

    const animations: Promise<void>[] = [];
    for (const key of orderedKeys) {
      if (this.#dropSequenceId !== sequenceId) break;
      launched.push(key);
      animations.push(
        this.#pieceState.applyMeshState({
          experience,
          key,
          state: PIECE_VISIBILITY_STATES.SHOWN,
        })
      );
      await Promise.race([os.sleep(STAGGER_MS), aborted]);
    }

    await Promise.allSettled(animations);
    if (this.#dropSequenceId === sequenceId) {
      this.#currentDrop = null;
    }
  }

  async displayClearSequence(experience: ExperienceKey): Promise<void> {
    const pieces = this.#piecesProvider.getPieces(experience);

    await Promise.all(
      pieces.map((piece) =>
        this.#pieceState.applyMeshState({
          experience,
          key: piece.key,
          state: PIECE_VISIBILITY_STATES.HIDDEN,
        })
      )
    );
  }

  tryAbortCurrentDropSequence(): void {
    this.#dropSequenceId++;
    const drop = this.#currentDrop;
    this.#currentDrop = null;
    if (!drop) {
      return;
    }
    drop.abort();
    for (const key of drop.keys) {
      this.#pieceState.clearMeshStateAnimations({
        experience: drop.experience,
        key,
      });
    }
  }
}
