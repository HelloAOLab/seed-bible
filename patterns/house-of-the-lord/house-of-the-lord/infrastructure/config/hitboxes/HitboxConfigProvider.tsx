import type { HitboxData } from "../../../domain/models/hitbox";
import type { HitboxProviderPort } from "../../../application/ports/out/hitboxLifecycle";
import type {
  ExperienceKey,
  ExperienceKeyMap,
} from "../../../domain/models/experience";
import { HITBOX_MAP } from "./hitboxMap";

export class HitboxConfigProvider implements HitboxProviderPort {
  getAnchorPoint(): string {
    return "center";
  }
  isDraggable(): boolean {
    return false;
  }
  getColor(): string {
    return "clear";
  }
  isPointable(): boolean {
    return true;
  }

  getHitboxData<E extends ExperienceKey>(
    experienceKey: E,
    pieceKey: ExperienceKeyMap[E]
  ): HitboxData | null {
    return HITBOX_MAP[experienceKey][pieceKey] ?? null;
  }
}
