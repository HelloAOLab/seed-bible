import type { PiecesSetUpPort } from "../ports/in/piecesSetUp";
import type { UpdatePiecesPositionPort } from "../ports/in/piecePosition";
import type { HitboxSpawnerPort } from "../ports/in/hitboxLifecycle";
import type { PiecesRenderOrderPort } from "../ports/out/piecesSetUp";
import type { ExperienceKey } from "../../domain/models/experience";

interface ServiceParams {
  updatePiecesPositionPort: UpdatePiecesPositionPort;
  hitboxSpawnerPort: HitboxSpawnerPort;
  piecesRenderOrderPort: PiecesRenderOrderPort;
}

export class PiecesSetUpService implements PiecesSetUpPort {
  #updatePiecesPositionPort: ServiceParams["updatePiecesPositionPort"];
  #hitboxSpawnerPort: ServiceParams["hitboxSpawnerPort"];
  #piecesRenderOrderPort: ServiceParams["piecesRenderOrderPort"];

  constructor({
    updatePiecesPositionPort,
    hitboxSpawnerPort,
    piecesRenderOrderPort,
  }: ServiceParams) {
    this.#updatePiecesPositionPort = updatePiecesPositionPort;
    this.#hitboxSpawnerPort = hitboxSpawnerPort;
    this.#piecesRenderOrderPort = piecesRenderOrderPort;
  }

  setUpPieces(experience: ExperienceKey): void {
    this.#updatePiecesPositionPort.updatePositions(experience);
    this.#piecesRenderOrderPort.setOrder(experience);
    this.#hitboxSpawnerPort.spawnPiecesHitbox(experience);
  }
}
