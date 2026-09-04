import type { PieceKey } from "../../domain/models/piece";
import type { BaseEventManager } from "../../application/services/BaseEventManager";

export interface InfrastructureEventMap {
  OnHitboxClicked: PieceKey;
  OnThemeChanged: { css: string };
  OnHighlightPieceMessage: { key: string };
  OnThemeChangedMessage: { css: string };
  OnReadingChangedMessage: { bookId: string; chapterNumber: number };
}

export type InfrastructureEventPort = BaseEventManager<InfrastructureEventMap>;

export const MESSAGE_TO_EVENT_MAP: Record<
  string,
  keyof InfrastructureEventMap
> = {
  "highlight-piece": "OnHighlightPieceMessage",
  "theme-changed": "OnThemeChangedMessage",
  "reading-changed": "OnReadingChangedMessage",
};
