import type { BotListenerParametersMap, PieceBot } from "./casualos";

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
