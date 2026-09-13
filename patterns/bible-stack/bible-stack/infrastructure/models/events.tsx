import type { BotListenerParametersMap, PieceBot } from "./casualos";
import type {
  UserPresence,
  UserIdentityMap,
} from "../../domain/models/userPresence";
import type { BaseEventManager } from "../../application/services/BaseEventManager";

/**
 * Infrastructure-only event map for the listen-tag bus. Pooled objects emit one
 * of these per native listen-tag event; controllers subscribe and narrow `bot`
 * to their specific type. `bot` is the generic `PieceBot` because the bus stores
 * a single, widened payload type — the specific piece type is recovered by the
 * subscriber via `bot.tags.type`.
 */
export type ListenTagEventMap = {
  [K in keyof BotListenerParametersMap<PieceBot>]: {
    bot: PieceBot;
    params: BotListenerParametersMap<PieceBot>[K];
  };
};

export interface BibleStackInfrastructureEvents {
  OnPieceBotReleased: { pieceBot: PieceBot };
  OnUserPresenceChangedMessage: { presence: UserPresence };
  OnUserIdentityChangedMessage: { identity: UserIdentityMap };
  UserColorStoreChanged: void;
  OnUserIdentityChanged: void;
}

export type BibleStackInfrastructureEvent =
  keyof BibleStackInfrastructureEvents;

export const MESSAGE_TO_EVENT_MAP: Record<
  string,
  keyof BibleStackInfrastructureEvents
> = {
  OnUserPresenceChanged: "OnUserPresenceChangedMessage",
  OnUserIdentityChanged: "OnUserIdentityChangedMessage",
};

export type InfrastructureEventManager =
  BaseEventManager<BibleStackInfrastructureEvents>;
