import type {
  HitboxSpawnerPort,
  HitboxProviderPort,
} from "../../../application/ports/out/hitboxLifecycle";
import type { HitboxData, Hitbox } from "../../../domain/models/hitbox";
import type { Piece } from "../../../domain/models/piece";
import type { BaseEventManager } from "../../../application/services/BaseEventManager";
import type { InfrastructureEventMap } from "../../models/events";
import type { HitboxMapper } from "../../mappers/HitboxMapper";
import type { HitboxBot, HitboxBotTags } from "../../models/casualos";

interface AdapterParams {
  getDimension: () => string;
  hitboxProviderPort: HitboxProviderPort;
  hitboxMapperPort: HitboxMapper;
  eventManager: BaseEventManager<InfrastructureEventMap>;
}

export class HitboxLifecycleAdapter implements HitboxSpawnerPort {
  #getDimension: AdapterParams["getDimension"];
  #hitboxProvider: HitboxProviderPort;
  #hitboxMapper: HitboxMapper;
  #eventManager: AdapterParams["eventManager"];

  constructor({
    getDimension,
    hitboxProviderPort: hitboxProvider,
    hitboxMapperPort: hitboxMapper,
    eventManager,
  }: AdapterParams) {
    this.#getDimension = getDimension;
    this.#hitboxProvider = hitboxProvider;
    this.#hitboxMapper = hitboxMapper;
    this.#eventManager = eventManager;
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
      this.#eventManager.emit("OnHitboxClicked", hitboxBot.tags.pieceKey);
    });

    return this.#hitboxMapper.toDomain(hitboxBot);
  }
}
