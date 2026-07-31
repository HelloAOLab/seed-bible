import type {
  HitboxSpawnerPort,
  HitboxProviderPort,
} from "tabernacle.application.ports.out.hitboxLifecycle";
import type { HitboxData, Hitbox } from "tabernacle.domain.models.hitbox";
import type { Piece } from "tabernacle.domain.models.piece";
import type { HitboxMapperPort } from "tabernacle.infrastructure.ports.in.hitboxMapper";
import type { HitboxBot } from "tabernacle.infrastructure.models.casualos";

interface AdapterParams {
  hitboxProviderPort: HitboxProviderPort;
  hitboxMapperPort: HitboxMapperPort;
}

export class HitboxLifecycleAdapter implements HitboxSpawnerPort {
  #hitboxProvider: HitboxProviderPort;
  #hitboxMapper: HitboxMapperPort;

  constructor({
    hitboxProviderPort: hitboxProvider,
    hitboxMapperPort: hitboxMapper,
  }: AdapterParams) {
    this.#hitboxProvider = hitboxProvider;
    this.#hitboxMapper = hitboxMapper;
  }

  spawn({
    data,
    piece,
    dimension,
  }: {
    data: HitboxData;
    piece: Piece;
    dimension: string;
  }): Hitbox {
    const { position, ...rest } = data;
    const hitboxBot = create({
      anchorPoint: this.#hitboxProvider.getAnchorPoint(),
      draggable: this.#hitboxProvider.isDraggable(),
      color: this.#hitboxProvider.getColor(),
      pointable: this.#hitboxProvider.isPointable(),
      ...rest,
      [dimension]: true,
      [`${dimension}X`]: position.x,
      [`${dimension}Y`]: position.y,
      [`${dimension}Z`]: position.z,
      transformer: piece.id,
      pieceId: piece.id,
      pieceKey: piece.key,
    }) as HitboxBot;

    return this.#hitboxMapper.toDomain(hitboxBot);
  }
}
