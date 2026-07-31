import type { HitboxBot } from "tabernacle.infrastructure.models.casualos";
import type { Hitbox } from "tabernacle.domain.models.hitbox";

export interface HitboxMapperPort {
  toDomain(bot: HitboxBot): Hitbox;
}
