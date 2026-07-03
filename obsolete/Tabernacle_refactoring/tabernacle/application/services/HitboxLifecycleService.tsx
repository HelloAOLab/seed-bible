import type { HitboxSpawnerPort as PiecesHitboxSpawnerPort } from "tabernacle.application.ports.in.hitboxLifecycle";
import type {
  HitboxProviderPort,
  PiecesProviderPort,
  HitboxSpawnerPort,
  DimensionProvider,
} from "tabernacle.application.ports.out.hitboxLifecycle";
import type { Hitbox } from "../../domain/models/hitbox";

interface ServiceParams {
  piecesProviderPort: PiecesProviderPort;
  hitboxProviderPort: HitboxProviderPort;
  hitboxSpawnerPort: HitboxSpawnerPort;
  dimensionProvider: DimensionProvider;
}

export class HitboxLifecycleService implements PiecesHitboxSpawnerPort {
  #piecesProviderPort: ServiceParams["piecesProviderPort"];
  #hitboxProviderPort: ServiceParams["hitboxProviderPort"];
  #hitboxSpawnerPort: ServiceParams["hitboxSpawnerPort"];
  #dimensionProvider: ServiceParams["dimensionProvider"];

  constructor({
    piecesProviderPort,
    hitboxProviderPort,
    hitboxSpawnerPort,
    dimensionProvider,
  }: ServiceParams) {
    this.#piecesProviderPort = piecesProviderPort;
    this.#hitboxProviderPort = hitboxProviderPort;
    this.#hitboxSpawnerPort = hitboxSpawnerPort;
    this.#dimensionProvider = dimensionProvider;
  }

  spawnPiecesHitbox(): Hitbox[] {
    const hitboxes: Hitbox[] = [];
    const pieces = this.#piecesProviderPort.getAllPieces();
    const dimension = this.#dimensionProvider.getDimension();

    for (const piece of pieces) {
      const data = this.#hitboxProviderPort.getHitboxData(piece.key);
      if (!data) continue;
      const hitbox = this.#hitboxSpawnerPort.spawn({ data, piece, dimension });
      hitboxes.push(hitbox);
    }

    return hitboxes;
  }
}
