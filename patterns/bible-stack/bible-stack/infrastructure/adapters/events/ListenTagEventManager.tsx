import type { BotListenerParametersMap, PieceBot } from "../../models/casualos";
import type { ListenTagEventMap } from "../../models/events";
import type { PieceListeners } from "../../models/objectPooler";

export type EventCallback<TPayload> = (payload: TPayload) => void;

/**
 * The listen-tag bus. A self-contained event manager (it does not extend a base
 * class) so `emit` can carry a per-call generic on the concrete bot type `B`:
 * pooled objects emit with their specific bot (e.g. `TestamentBot`) and stay
 * precisely typed at the call site — no casts.
 *
 * The bus stores one payload type per event, the widened `PieceBot` version, so
 * the single widening cast lives here — encapsulated when dispatching to
 * subscribers — instead of at every emit or in the subscribers. Subscribers get
 * the `PieceBot` payload and re-narrow by `bot.tags.type`.
 */
export class ListenTagEventManager {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  #listeners: Map<keyof ListenTagEventMap, Set<EventCallback<any>>>;

  constructor() {
    this.#listeners = new Map();
  }

  subscribe<K extends keyof ListenTagEventMap>(
    eventName: K,
    callback: EventCallback<ListenTagEventMap[K]>
  ): () => void {
    if (!this.#listeners.has(eventName)) {
      this.#listeners.set(eventName, new Set());
    }

    const eventListeners = this.#listeners.get(eventName)!;
    eventListeners.add(callback);

    return () => {
      const currentListeners = this.#listeners.get(eventName);
      if (currentListeners) {
        currentListeners.delete(callback);
        if (currentListeners.size === 0) {
          this.#listeners.delete(eventName);
        }
      }
    };
  }

  emit<B extends PieceBot, K extends keyof ListenTagEventMap>(
    eventName: K,
    payload: { bot: B; params: BotListenerParametersMap<B>[K] }
  ): void {
    const eventListeners = this.#listeners.get(eventName);

    if (eventListeners) {
      eventListeners.forEach((callback) => {
        try {
          callback(payload as ListenTagEventMap[K]);
        } catch (error) {
          console.error(
            `Error executing listener for event "${String(eventName)}":`,
            error
          );
        }
      });
    }
  }

  removeAllListeners() {
    const events = [...this.#listeners.keys()];
    for (const event of events) {
      const callbacks = this.#listeners.get(event);
      if (callbacks) {
        for (const callback of [...callbacks.values()]) {
          callbacks.delete(callback);
        }
      }
      this.#listeners.delete(event);
    }
  }
}

/**
 * Builds the pooler's listener object for one piece: a forwarder per listen tag
 * that emits the native event onto the bus.
 */
export function makeListeners<B extends PieceBot>(
  tags: (keyof BotListenerParametersMap<B>)[],
  bus: ListenTagEventManager
): PieceListeners<B> {
  const listeners = {} as PieceListeners<B>;

  for (const tag of tags) {
    listeners[tag] = (params, bot) => bus.emit(tag, { bot, params });
  }

  return listeners;
}
