export type EventCallback<TPayload> = (payload: TPayload) => void;

export class BaseEventManager<TEventMap extends Record<string, any>> {
  #listeners: Map<keyof TEventMap, Set<EventCallback<any>>>;

  constructor() {
    this.#listeners = new Map();
  }

  subscribe<K extends keyof TEventMap>(
    eventName: K,
    callback: EventCallback<TEventMap[K]>
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

  emit<K extends keyof TEventMap>(
    eventName: K,
    ...args: TEventMap[K] extends undefined | void
      ? [payload?: TEventMap[K]]
      : [payload: TEventMap[K]]
  ): void {
    const payload = args[0];
    const eventListeners = this.#listeners.get(eventName);

    if (eventListeners) {
      eventListeners.forEach((callback) => {
        try {
          callback(payload);
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
