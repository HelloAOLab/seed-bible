import type { HitboxMapperPort } from "tabernacle.infrastructure.ports.in.hitboxMapper";
import type { HitboxBot } from "tabernacle.infrastructure.models.casualos";
import type { Hitbox } from "tabernacle.domain.models.hitbox";

export class HitboxMapper implements HitboxMapperPort {
  toDomain(bot: HitboxBot): Hitbox {
    return {
      id: bot.id,
      pieceId: bot.tags.pieceId,
      pieceKey: bot.tags.pieceKey,
    };
  }
}
