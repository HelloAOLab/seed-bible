import type { HitboxBot } from "../models/casualos";
import type { Hitbox } from "../../domain/models/hitbox";

export class HitboxMapper {
  toDomain(bot: HitboxBot): Hitbox {
    return {
      id: bot.id,
      pieceId: bot.tags.pieceId,
      pieceKey: bot.tags.pieceKey,
    };
  }
}
