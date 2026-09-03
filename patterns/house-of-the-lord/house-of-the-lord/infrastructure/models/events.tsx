import type { PieceKey } from "../../domain/models/piece";
import type { BaseEventManager } from "../../application/services/BaseEventManager";

export interface InfrastructureEventMap {
  OnHitboxClicked: PieceKey;
  OnThemeChanged: { css: string };
}

export type InfrastructureEventPort = BaseEventManager<InfrastructureEventMap>;
