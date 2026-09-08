import type { HitboxSpawnerPort as PiecesHitboxSpawnerPort } from "../ports/in/hitboxLifecycle";
import type {
  HitboxProviderPort,
  PiecesProviderPort,
  HitboxSpawnerPort,
} from "../ports/out/hitboxLifecycle";
import type { Hitbox } from "../../domain/models/hitbox";
import type { ExperienceKey } from "../../domain/models/experience";

interface ServiceParams {
  piecesProviderPort: PiecesProviderPort;
  hitboxProviderPort: HitboxProviderPort;
  hitboxSpawnerPort: HitboxSpawnerPort;
}

export class HitboxLifecycleService implements PiecesHitboxSpawnerPort {
  #piecesProviderPort: ServiceParams["piecesProviderPort"];
  #hitboxProviderPort: ServiceParams["hitboxProviderPort"];
  #hitboxSpawnerPort: ServiceParams["hitboxSpawnerPort"];

  constructor({
    piecesProviderPort,
    hitboxProviderPort,
    hitboxSpawnerPort,
  }: ServiceParams) {
    this.#piecesProviderPort = piecesProviderPort;
    this.#hitboxProviderPort = hitboxProviderPort;
    this.#hitboxSpawnerPort = hitboxSpawnerPort;
  }

  spawnPiecesHitbox(experience: ExperienceKey): Hitbox[] {
    const hitboxes: Hitbox[] = [];
    const pieces = this.#piecesProviderPort.getPieces(experience);

    for (const piece of pieces) {
      const dataList = this.#hitboxProviderPort.getHitboxData(
        experience,
        piece.key
      );
      for (const data of dataList) {
        hitboxes.push(this.#hitboxSpawnerPort.spawn({ data, piece }));
      }
    }

    return hitboxes;
  }
}
