import type { PieceKey } from "../models/piece";
import type { HitboxData } from "../models/hitbox";

export interface HitboxProviderPort {
  getHitboxData(key: PieceKey): HitboxData | null;
}
