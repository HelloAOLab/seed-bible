import type { ExperienceKey } from "../../../domain/models/experience";

export interface HitboxSpawnerPort {
  spawnPiecesHitbox(experience: ExperienceKey): void;
  despawnPiecesHitbox(experience: ExperienceKey): void;
}
