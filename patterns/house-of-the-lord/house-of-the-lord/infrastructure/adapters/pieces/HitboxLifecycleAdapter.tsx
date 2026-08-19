import type {
  HitboxSpawnerPort,
  HitboxProviderPort,
} from "../../../application/ports/out/hitboxLifecycle";
import type { HitboxData, Hitbox } from "../../../domain/models/hitbox";
import type { Piece } from "../../../domain/models/piece";
import type { HitboxMapper } from "../../mappers/HitboxMapper";
import type { HitboxBot, HitboxBotTags } from "../../models/casualos";

interface AdapterParams {
  getDimension: () => string;
  hitboxProviderPort: HitboxProviderPort;
  hitboxMapperPort: HitboxMapper;
}

export class HitboxLifecycleAdapter implements HitboxSpawnerPort {
  #getDimension: AdapterParams["getDimension"];
  #hitboxProvider: HitboxProviderPort;
  #hitboxMapper: HitboxMapper;

  constructor({
    getDimension,
    hitboxProviderPort: hitboxProvider,
    hitboxMapperPort: hitboxMapper,
  }: AdapterParams) {
    this.#getDimension = getDimension;
    this.#hitboxProvider = hitboxProvider;
    this.#hitboxMapper = hitboxMapper;
  }

  spawn({ data, piece }: { data: HitboxData; piece: Piece }): Hitbox {
    const dimension = this.#getDimension();
    const { position, ...rest } = data;
    const mod: Partial<HitboxBotTags> = {
      anchorPoint: this.#hitboxProvider.getAnchorPoint(),
      draggable: this.#hitboxProvider.isDraggable(),
      color: this.#hitboxProvider.getColor(),
      pointable: this.#hitboxProvider.isPointable(),
      ...rest,
      [dimension as keyof HitboxBotTags]: true,
      [`${dimension}X` as keyof HitboxBotTags]: position.x,
      [`${dimension}Y` as keyof HitboxBotTags]: position.y,
      [`${dimension}Z` as keyof HitboxBotTags]: position.z,
      transformer: piece.id,
      pieceId: piece.id,
      pieceKey: piece.key,
    };
    const hitboxBot = create(mod) as HitboxBot;

    os.addBotListener(hitboxBot, "onClick", () => {
      // TODO: Call an OnHitboxClicked event or get the hitbox's piece and handle a click for it
      //   @import { piecesInteractionController } from "house-of-the-lord.infrastructure.di.bootstrap";
      // piecesInteractionController?.handlePieceClick(links.piece.tags.key);
    });

    return this.#hitboxMapper.toDomain(hitboxBot);
  }
}
