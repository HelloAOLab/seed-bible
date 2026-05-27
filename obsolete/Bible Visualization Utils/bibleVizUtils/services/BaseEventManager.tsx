export type EventCallback<TPayload = any> = (payload?: TPayload) => void;

export class BaseEventManager<TEvent extends string> {
  #listeners: Map<TEvent, Set<EventCallback>>;

  constructor() {
    this.#listeners = new Map();
  }

  subscribe(eventName: TEvent, callback: EventCallback): () => void {
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

  emit(eventName: TEvent, payload?: any): void {
    const eventListeners = this.#listeners.get(eventName);

    if (eventListeners) {
      eventListeners.forEach((callback) => {
        try {
          callback(payload);
        } catch (error) {
          console.error(
            `Error executing listener for event "${eventName}":`,
            error
          );
        }
      });
    }
  }
}
