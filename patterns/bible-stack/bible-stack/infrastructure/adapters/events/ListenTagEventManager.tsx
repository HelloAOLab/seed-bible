import { BaseEventManager } from "../../../application/services/BaseEventManager";
import type { BotListenerParametersMap, PieceBot } from "../../models/casualos";
import type { ListenTagEventMap } from "../../models/events";
import type { PieceListeners } from "../../models/objectPooler";

/**
 * The listen-tag bus. Extends the generic event manager to give `emit` a
 * per-call generic on the concrete bot type `B`, so pooled objects emit with
 * their specific bot (e.g. `TestamentBot`) and stay precisely typed at the call
 * site — no casts.
 *
 * A shared bus stores one payload type, so it can only hold the widened
 * `PieceBot` version. A piece's tag-key set is wider than `PieceBot`'s, so the
 * specific `onBotChanged.tags` does not up-cast on its own. That single widening
 * cast lives here, encapsulated, instead of at every emit or in the subscribers.
 * Subscribers get the `PieceBot` payload (via the inherited `subscribe`) and
 * re-narrow by `bot.tags.type`.
 */
export class ListenTagEventManager extends BaseEventManager<ListenTagEventMap> {
  // Base-compatible signature: keeps this override assignable to
  // `BaseEventManager.emit` (a contravariant `B` generic alone would not be).
  override emit<K extends keyof ListenTagEventMap>(
    eventName: K,
    payload: ListenTagEventMap[K]
  ): void;
  // Precise signature producers actually hit: emit with the piece's specific
  // bot type, so the call site stays typed without casts.
  override emit<B extends PieceBot, K extends keyof ListenTagEventMap>(
    eventName: K,
    payload: { bot: B; params: BotListenerParametersMap<B>[K] }
  ): void;
  override emit(eventName: keyof ListenTagEventMap, payload: unknown): void {
    super.emit(
      eventName,
      payload as ListenTagEventMap[keyof ListenTagEventMap]
    );
  }
}

/**
 * Builds the pooler's listener object for one piece: a forwarder per listen tag
 * that emits the native event onto the bus. Written once here instead of inline
 * per piece at the composition root.
 */
export const makeListeners = <B extends PieceBot>(
  tags: (keyof BotListenerParametersMap<B>)[],
  bus: ListenTagEventManager
): PieceListeners<B> => {
  const listeners = {} as PieceListeners<B>;

  for (const tag of tags) {
    listeners[tag] = (params, bot) => bus.emit(tag, { bot, params });
  }

  return listeners;
};
